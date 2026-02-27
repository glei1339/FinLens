/**
 * PDF Bank Statement Parser
 *
 * Extracts transactions from text-based PDF bank statements using pdf.js.
 * Works by:
 *  1. Extracting all text items with their x/y page positions
 *  2. Grouping items into rows by y-coordinate proximity
 *  3. Detecting column layout (date / description / debit / credit / balance)
 *     from a header row if one exists
 *  4. Parsing each candidate row for a date and one or more amounts
 *  5. Applying sign (debit = negative, credit = positive) from column context
 *
 * Limitations: scanned / image-only PDFs produce no text and will return an error.
 */

// --- Date patterns tried in order of specificity ---
const DATE_PATTERNS = [
  /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/,    // 01/05/2024  or  1/5/24
  /\b(\d{4}-\d{2}-\d{2})\b/,             // 2024-01-05
  /\b(\d{1,2}-\d{1,2}-\d{2,4})\b/,       // 01-05-2024
  /\b(\d{1,2}\/\d{1,2})\b/,              // 01/05  (no year — many banks omit it)
  /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s*\d{4})\b/i,
  /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\b/i,
]

function tryExtractDate(text) {
  for (const re of DATE_PATTERNS) {
    const m = text.match(re)
    if (m) return m[1]
  }
  return null
}

// --- Amount extraction operating on individual text items (preserves x position) ---
const AMOUNT_ITEM_RE = /(\(\$?(\d{1,3}(?:,\d{3})*\.\d{2})\))|(-?\$?(\d{1,3}(?:,\d{3})*\.\d{2}))/g

function extractAmountsFromItems(items) {
  const amounts = []
  for (const item of items) {
    let m
    AMOUNT_ITEM_RE.lastIndex = 0
    while ((m = AMOUNT_ITEM_RE.exec(item.text)) !== null) {
      if (m[1]) {
        // Parentheses notation → always negative
        amounts.push({ value: -parseFloat(m[2].replace(/,/g, '')), x: item.x, raw: m[1] })
      } else if (m[3]) {
        const numStr = m[4].replace(/,/g, '')
        const isNeg  = m[3].trimStart().startsWith('-')
        amounts.push({ value: isNeg ? -parseFloat(numStr) : parseFloat(numStr), x: item.x, raw: m[3] })
      }
    }
  }
  return amounts.sort((a, b) => a.x - b.x)
}

// --- Group flat list of text items into visual rows by y-coordinate ---
function groupIntoRows(items, yTolerance = 4) {
  const rows = []
  const sorted = [...items].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x)

  for (const item of sorted) {
    const row = rows.find(r => Math.abs(r.y - item.y) <= yTolerance)
    if (row) {
      row.items.push(item)
    } else {
      rows.push({ y: item.y, items: [item] })
    }
  }

  rows.forEach(row => {
    row.items.sort((a, b) => a.x - b.x)
    row.text = row.items.map(i => i.text).join(' ')
  })

  return rows.sort((a, b) => a.y - b.y)
}

// --- Detect column x-positions from a header row ---
const HEADER_WORDS = new Set([
  'date', 'description', 'amount', 'debit', 'credit',
  'withdrawal', 'withdrawals', 'deposit', 'deposits',
  'balance', 'transaction', 'charges', 'payments', 'dr', 'cr',
])

function detectColumns(rows) {
  for (const row of rows.slice(0, 30)) {
    const lower = row.text.toLowerCase()
    const hits  = [...HEADER_WORDS].filter(w => lower.includes(w))
    if (hits.length < 2) continue

    const cols = { debitX: null, creditX: null, amountX: null, balanceX: null }
    for (const item of row.items) {
      const t = item.text.toLowerCase().trim()
      if (/(withdrawal|withdrawals|debit|charge|charges|\bdr\b)/.test(t))    cols.debitX   = item.x
      else if (/(deposit|deposits|credit|\bcr\b|payments)/.test(t))          cols.creditX  = item.x
      else if (/^amount$/i.test(t))                                           cols.amountX  = item.x
      else if (/balance/.test(t))                                             cols.balanceX = item.x
    }

    if (cols.debitX !== null || cols.creditX !== null || cols.amountX !== null) {
      return cols
    }
  }
  return null
}

// --- Parse a single row into a transaction (returns null if not a transaction) ---
const X_TOL = 90 // pt — generous tolerance for column matching

function isDisclaimerOrHeaderRow(text) {
  if (!text || text.length < 10) return false
  const lower = text.toLowerCase()
  return NON_TRANSACTION_PHRASES.some((p) => lower.includes(p))
}

function parseRow(row, cols) {
  if (isDisclaimerOrHeaderRow(row.text)) return null
  if (looksLikeDisclaimer(row.text)) return null

  const date = tryExtractDate(row.text)
  if (!date) return null

  const amounts = extractAmountsFromItems(row.items)
  if (!amounts.length) return null

  let amount = null

  if (cols) {
    if (cols.debitX !== null || cols.creditX !== null) {
      // Two-column format: separate debit / credit columns
      const debit  = amounts.find(a => cols.debitX  !== null && Math.abs(a.x - cols.debitX)  < X_TOL)
      const credit = amounts.find(a => cols.creditX !== null && Math.abs(a.x - cols.creditX) < X_TOL)
      if (debit)        amount = -Math.abs(debit.value)
      else if (credit)  amount =  Math.abs(credit.value)
    } else if (cols.amountX !== null) {
      // Single signed amount column
      const found = amounts.find(a => Math.abs(a.x - cols.amountX) < X_TOL)
      if (found) amount = found.value
    }

    // If still unresolved, exclude anything in the balance column and take the first remainder
    if (amount === null && cols.balanceX !== null) {
      const nonBal = amounts.filter(a => Math.abs(a.x - cols.balanceX) > X_TOL)
      if (nonBal.length) amount = nonBal[0].value
    }
  }

  // Heuristic fallback when no column info
  if (amount === null) {
    if (amounts.length === 1) {
      amount = amounts[0].value
    } else {
      // Assume rightmost amount is the running balance — skip it
      // Prefer an explicitly negative amount, else take the leftmost
      const candidates = amounts.slice(0, -1)
      const neg = candidates.find(a => a.value < 0)
      amount = neg ? neg.value : candidates[0].value
    }
  }

  // Build description: strip out date tokens and amount tokens
  let desc = row.text
  for (const re of DATE_PATTERNS) {
    desc = desc.replace(new RegExp(re.source, 'gi'), ' ')
  }
  for (const a of amounts) {
    const escaped = a.raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    desc = desc.replace(new RegExp(escaped, 'g'), ' ')
  }
  desc = desc.replace(/\s+/g, ' ').replace(/^[\W_]+|[\W_]+$/g, '').trim()

  if (!desc || desc.length < 2) return null

  const lowerDesc = desc.toLowerCase()
  if (NON_TRANSACTION_PHRASES.some(p => lowerDesc.includes(p))) return null
  if (looksLikeDisclaimer(desc)) return null

  return { date, description: desc, amount }
}

// --- Credit card statement detection ---
// These phrases appear in credit card statements but not bank statements.
const CC_INDICATORS = [
  'credit card', 'statement balance', 'minimum payment', 'payment due',
  'credit limit', 'available credit', 'new balance', 'previous balance',
  'minimum due', 'annual percentage rate', 'cash advance', 'purchases',
  'balance transfer', 'finance charge',
]

// Rows that may contain a date/amount but are clearly not individual transactions
// (disclaimers, column headers, or instructional text). Checked against both raw row
// text and the stripped description so we don't include these in activity.
const NON_TRANSACTION_PHRASES = [
  'concerning this debit should be made before',
  'this date may not be the same date your bank',
  'available pay over time limit',
  'payment due date of',
  'you may have to pay a late fee',
  'payments/credits',
  'you may have to pay',
  'late fee of',
  'minimum payment due',
  'statement closing date',
  'see your agreement for',
  'if you have questions',
  'new balance available',
  'available and pending',
  'pending as of',
  ' and payments/credits',
  'payment due date of ,',
  'same date your bank',
  'as of .',
]

// Words that commonly appear in disclaimer/instruction text rather than in merchant names.
const DISCLAIMER_WORDS = new Set([
  'payment', 'due', 'date', 'balance', 'available', 'pending', 'fee', 'late',
  'your', 'bank', 'same', 'may', 'have', 'this', 'that', 'and', 'the', 'of',
  'if', 'you', 'see', 'agreement', 'for', 'minimum', 'statement', 'closing',
  'pay', 'over', 'time', 'limit', 'concerning', 'debit', 'should', 'made',
  'before', 'not', 'be', 'payments', 'credits',
])

/**
 * Heuristic: does this description look like disclaimer/instruction text rather than
 * a real transaction (merchant, payee, or transfer description)?
 * Real transactions usually have a merchant/payee name; disclaimers are sentence-like.
 */
function looksLikeDisclaimer(desc) {
  if (!desc || desc.length < 15) return false
  const lower = desc.toLowerCase().trim()
  const words = lower.split(/\s+/).filter(Boolean)

  // Sentence fragment: starts with "and", "of", "n .", or single letter + period
  if (/^and\s/.test(lower) || /^of\s/.test(lower) || /^[a-z]\s*\.\s/.test(lower)) return true
  if (/^\.\s*this\s+date/.test(lower) || /\s+\.\s*this\s+date/.test(lower)) return true

  // Ends with trailing fragment (e.g. "date your bank", "pending as of")
  if (/\s+as\s+of\s*\.?\s*$/.test(lower) || /\s+pending\s+as\s+of\s*\.?\s*$/.test(lower)) return true
  if (/your\s+bank\s*\.?\s*$/.test(lower)) return true

  // "X of , you may" or "X of , " pattern (broken disclaimer with comma)
  if (/,\s*you\s+may\s/.test(lower) || /\s+of\s*,\s*/.test(lower)) return true

  // Mostly disclaimer words: if more than half of the words are known disclaimer terms, reject
  const disclaimerCount = words.filter(w => DISCLAIMER_WORDS.has(w.replace(/[^a-z]/g, ''))).length
  if (words.length >= 4 && disclaimerCount >= Math.min(4, Math.ceil(words.length * 0.6))) return true

  // Column-header style: "X and Y" or "X/Y" where both are header labels
  if (/^(new\s+)?balance\s+available\s+and\s+pending/i.test(lower)) return true
  if (/payment\s+due\s+date\s+of\s*,/i.test(lower)) return true

  return false
}

const INSTITUTION_PATTERNS = [
  { name: 'Chase',            patterns: [/jpmorgan chase/i, /\bchase\b/i] },
  { name: 'Bank of America',  patterns: [/bank of america/i, /\bbofa\b/i] },
  { name: 'Wells Fargo',      patterns: [/wells fargo/i] },
  { name: 'Capital One',      patterns: [/capital one/i] },
  { name: 'Citi',             patterns: [/\bciti\s*bank/i, /\bciti\b/i, /citibank/i] },
  { name: 'American Express', patterns: [/american express/i, /\bamex\b/i] },
  { name: 'Discover',         patterns: [/discover bank/i, /\bdiscover\b/i] },
]

function detectInstitutionFromText(fullText, fileName = '') {
  const text = fullText || ''
  const lowerName = (fileName || '').toLowerCase()

  for (const { name, patterns } of INSTITUTION_PATTERNS) {
    if (patterns.some((re) => re.test(text))) return name
  }

  // Fallback to filename hints when body text doesn't clearly identify the institution
  if (lowerName.includes('chase')) return 'Chase'
  if (lowerName.includes('bofa') || lowerName.includes('bankofamerica') || lowerName.includes('bank_of_america')) return 'Bank of America'
  if (lowerName.includes('wells')) return 'Wells Fargo'
  if (lowerName.includes('capitalone') || lowerName.includes('capone')) return 'Capital One'
  if (lowerName.includes('citi')) return 'Citi'
  if (lowerName.includes('amex') || lowerName.includes('americanexpress')) return 'American Express'
  if (lowerName.includes('discover')) return 'Discover'

  return 'Unknown'
}

function isCreditCardStatement(fullText) {
  const lower = fullText.toLowerCase()
  return CC_INDICATORS.filter(kw => lower.includes(kw)).length >= 2
}

// --- Public API ---
export async function parsePDF(file) {
  // Lazy-load pdf.js so it doesn't bloat the initial bundle
  const [pdfjsLib, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

  const arrayBuffer  = await file.arrayBuffer()
  const loadingTask  = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf          = await loadingTask.promise

  if (pdf.numPages === 0) throw new Error('The PDF appears to be empty.')

  const transactions = []
  let idCounter = 0
  let allText = ''
  let hadDebitCreditCols = false

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page        = await pdf.getPage(pageNum)
    const viewport    = page.getViewport({ scale: 1 })
    const textContent = await page.getTextContent()

    // Convert PDF bottom-up y to screen top-down y
    const items = textContent.items
      .filter(item => item.str && item.str.trim().length > 0)
      .map(item => ({
        text: item.str.trim(),
        x:    Math.round(item.transform[4]),
        y:    Math.round(viewport.height - item.transform[5]),
      }))

    if (!items.length) continue

    const rows = groupIntoRows(items)
    allText += rows.map(r => r.text).join(' ') + ' '

    const cols = detectColumns(rows)
    if (cols && (cols.debitX !== null || cols.creditX !== null)) {
      hadDebitCreditCols = true
    }

    for (const row of rows) {
      const tx = parseRow(row, cols)
      if (tx) {
        transactions.push({ id: idCounter++, date: tx.date, description: tx.description, amount: tx.amount, category: '' })
      }
    }
  }

  // Final pass: drop any row that still looks like disclaimer/header (safety net)
  const filtered = transactions.filter((t) => {
    const d = (t.description || '').toLowerCase()
    if (NON_TRANSACTION_PHRASES.some((p) => d.includes(p))) return false
    if (looksLikeDisclaimer(t.description)) return false
    return true
  })
  filtered.forEach((t, i) => { t.id = i })

  if (filtered.length === 0) {
    throw new Error(
      'No transactions were found in this PDF. The layout may be unusual or the file may be password-protected.\n\nTip: Try downloading your statement as CSV from your bank\'s website for best results.'
    )
  }

  const institution = detectInstitutionFromText(allText, file.name)
  filtered.forEach(t => { t.institution = institution })

  // Credit card PDFs list charges as positive and payments as negative —
  // the opposite of what we want. Flip signs when we detect a CC statement
  // and the PDF didn't use explicit separate debit/credit columns (which
  // already produce correct signs).
  if (isCreditCardStatement(allText) && !hadDebitCreditCols) {
    filtered.forEach(t => { t.amount = -t.amount })
  }

  // Deduplicate rows that were accidentally extracted twice
  const seen = new Set()
  return filtered.filter(t => {
    const key = `${t.date}|${t.description}|${t.amount}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
