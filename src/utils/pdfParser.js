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

// --- Amount extraction: support $1,234.56, (1,234.56), 12.50, -12.50, etc. ---
const AMOUNT_ITEM_RE = /(\(\$?([\d,]+\.\d{2})\))|(-?\$?([\d,]+\.\d{2}))/g

function parseAmountRaw(str) {
  if (!str || typeof str !== 'string') return NaN
  const numStr = str.replace(/,/g, '').trim()
  return parseFloat(numStr) || NaN
}

function extractAmountsFromItems(items) {
  const amounts = []
  for (const item of items) {
    let m
    AMOUNT_ITEM_RE.lastIndex = 0
    while ((m = AMOUNT_ITEM_RE.exec(item.text)) !== null) {
      if (m[1]) {
        const val = parseAmountRaw(m[2])
        if (!isNaN(val)) amounts.push({ value: -Math.abs(val), x: item.x, raw: m[1] })
      } else if (m[3]) {
        const val = parseAmountRaw(m[4])
        if (!isNaN(val)) {
          const isNeg = m[3].trimStart().startsWith('-')
          amounts.push({ value: isNeg ? -Math.abs(val) : val, x: item.x, raw: m[3] })
        }
      }
    }
  }
  return amounts.sort((a, b) => a.x - b.x)
}

// --- Group flat list of text items into visual rows by y-coordinate ---
// Use a looser tolerance (8pt) so PDFs with slight vertical variance still group correctly.
function groupIntoRows(items, yTolerance = 8) {
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

  // Many bank statements (e.g. TD Bank) list payments as positive numbers under an
  // "Electronic Payments" or similar section. If the row text clearly indicates a
  // payment/debit/withdrawal, negate a positive amount.
  const rowLower = (row.text || '').toLowerCase()
  const isPaymentRow = amount > 0 && (
    /electronic\s*pmt|pmt-web|ach\s+debit|ccd\s+debit|billpay|withdrawal|withdraw|debit\s+card|payment\s+to\b/i.test(rowLower) ||
    /\bdebit\b.*\b(ach|ccd|pmt)\b/i.test(rowLower)
  )
  if (isPaymentRow) amount = -Math.abs(amount)

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
  // Balance summary lines — not individual transactions
  'ending balance',
  'beginning balance',
  'opening balance',
  'closing balance',
  'starting balance',
  'total balance',
  'account balance',
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

// Order matters: check statement-issuer names first so we don't match a payee in transaction text.
const INSTITUTION_PATTERNS = [
  { name: 'TD Bank',          patterns: [/\btd\s+bank\b/i, /tdbank\.com/i] },
  { name: 'American Express', patterns: [/american\s*express/i, /americanexpress\.com/i, /\bamex\b/i] },
  { name: 'Chase',            patterns: [/jpmorgan chase/i, /\bchase\b/i] },
  { name: 'Bank of America',  patterns: [/bank of america/i, /\bbofa\b/i] },
  { name: 'Wells Fargo',      patterns: [/wells fargo/i] },
  { name: 'Capital One',      patterns: [/capital one/i] },
  { name: 'Citi',             patterns: [/\bciti\s*bank/i, /\bciti\b/i, /citibank/i] },
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
  if (lowerName.includes('tdbank') || lowerName.includes('td bank')) return 'TD Bank'

  return 'Unknown'
}

/** Extract last 4 digits of account/card from statement text. Prefer explicit account # or "Account Ending". */
function detectAccountLast4FromText(fullText) {
  const text = fullText || ''
  // "Primary Account #: 435-9511742", "Account # 435-9511742"
  let accountMatch = text.match(/(?:primary\s+)?account\s*#?\s*[:\s]*([\d\-]+)/i)
  if (!accountMatch) {
    // American Express etc.: "Account Ending 5-42005" → last 4 of 42005 = 2005
    accountMatch = text.match(/account\s+ending\s+[\d\-]+(\d{4,})\b/i) || text.match(/account\s+ending\s+([\d\-]+)/i)
  }
  if (accountMatch) {
    const digits = accountMatch[1].replace(/\D/g, '')
    if (digits.length >= 4) return digits.slice(-4)
  }
  // "ending in 1234", "****1234"
  const m = text.match(/(?:ending\s+in?\s+|[*•·]\s*)(\d{4})\b/) || text.match(/\b(\d{4})\s*(?:\)|$|\s)/)
  if (m) return m[1]
  const last4 = text.match(/(\d{4})/g)
  if (last4 && last4.length > 0) return last4[last4.length - 1]
  return ''
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

  const options = arguments[1] || {}
  const apiKey = options.apiKey && String(options.apiKey).trim()
  const useAiFallback = apiKey && options.useAiFallback !== false

  // When API key is set, use AI first to read the statement (correct institution, account number, transactions).
  if (useAiFallback && allText.trim().length > 0) {
    try {
      const onProgress = options.onProgress
      if (typeof onProgress === 'function') onProgress('AI: Reading statement…')
      const { extractTransactionsFromPDFText } = await import('./aiClassifier.js')
      const aiResult = await extractTransactionsFromPDFText(allText, apiKey)
      const aiTx = aiResult?.transactions
      if (aiTx && aiTx.length > 0) {
        const institution = (aiResult.institution && aiResult.institution.trim()) || detectInstitutionFromText(allText, file.name)
        const accountLast4 = (aiResult.accountLast4 && String(aiResult.accountLast4).replace(/\D/g, '').slice(-4)) || detectAccountLast4FromText(allText)
        aiTx.forEach((t, i) => {
          t.id = i
          t.institution = institution
          if (accountLast4) t.accountLast4 = accountLast4
        })
        return aiTx
      }
    } catch (_) {
      // Fall through to layout parsing
    }
  }

  if (filtered.length === 0) {
    throw new Error(
      'No transactions were found in this PDF. The layout may be unusual or the file may be password-protected.\n\nTip: Try downloading your statement as CSV from your bank\'s website for best results. If you have an API key set and "Use AI" enabled, AI extraction will be tried first.'
    )
  }

  const institution = detectInstitutionFromText(allText, file.name)
  const accountLast4 = detectAccountLast4FromText(allText)
  filtered.forEach(t => {
    t.institution = institution
    if (accountLast4) t.accountLast4 = accountLast4
  })

  // Credit card PDFs list charges as positive and payments as negative —
  // the opposite of what we want. Flip signs only when we detect a CC statement
  // and the PDF didn't use explicit separate debit/credit columns.
  // Do NOT flip when the statement is a bank account with "Electronic Deposits"
  // / "Electronic Payments" (or similar) sections — we already signed those in parseRow.
  const hasBankAccountSections = /electronic\s+deposits|electronic\s+payments|deposits\s+and\s+credits|withdrawals\s+and\s+debits/i.test(allText)
  if (isCreditCardStatement(allText) && !hadDebitCreditCols && !hasBankAccountSections) {
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
