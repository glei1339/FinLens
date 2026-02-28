/**
 * AI-based classification: determine if each transaction is a DEPOSIT (money in)
 * or PAYMENT (money out) using an LLM. Supports OpenAI and Anthropic (Claude).
 * Key is not stored here; caller passes it.
 */

const BATCH_SIZE = 25

function buildPrompt(batch) {
  const lines = batch.map((t, i) => {
    const desc = (t.description || '').trim().slice(0, 120)
    const amt = t.amount != null ? t.amount : ''
    return `${i + 1}. "${desc}" Amount: ${amt}`
  }).join('\n')

  return `You are a bank transaction classifier. For each transaction below, decide if it is a DEPOSIT (money in: salary, refund, transfer in, interest, etc.) or PAYMENT (money out: purchase, bill, fee, transfer out, etc.). Use the description and amount to decide.

Transactions:
${lines}

Reply with exactly one letter per transaction in order, on a single line with no spaces: D for DEPOSIT, P for PAYMENT. Example: DPPDP`
}

function isClaudeKey(apiKey) {
  return typeof apiKey === 'string' && apiKey.trim().toLowerCase().startsWith('sk-ant-')
}

/**
 * Call Anthropic Claude API to classify a batch.
 */
async function classifyBatchClaude(batch, apiKey, model = 'claude-3-5-haiku-20241022') {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 200,
      messages: [{ role: 'user', content: buildPrompt(batch) }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  const text = (data.content?.[0]?.text || '').trim().toUpperCase()
  const letters = text.replace(/\s/g, '').split('')

  return batch.map((_, i) => {
    const letter = letters[i]
    return letter === 'D' ? 'deposit' : 'payment'
  })
}

/**
 * Call OpenAI (or compatible) API to classify a batch.
 */
async function classifyBatchOpenAI(batch, apiKey, options = {}) {
  const { baseUrl = 'https://api.openai.com/v1', model = 'gpt-4o-mini' } = options
  const url = baseUrl.replace(/\/$/, '') + '/chat/completions'

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: buildPrompt(batch) }],
      max_tokens: 200,
      temperature: 0,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  const text = (data.choices?.[0]?.message?.content || '').trim().toUpperCase()
  const letters = text.replace(/\s/g, '').split('')

  return batch.map((_, i) => {
    const letter = letters[i]
    return letter === 'D' ? 'deposit' : 'payment'
  })
}

async function classifyBatch(batch, apiKey, options = {}) {
  if (isClaudeKey(apiKey)) {
    return classifyBatchClaude(batch, apiKey, options.model || 'claude-3-5-haiku-20241022')
  }
  return classifyBatchOpenAI(batch, apiKey, options)
}

/**
 * Classify all transactions as deposit or payment using the AI.
 * Applies sign correction: deposit => positive amount, payment => negative amount.
 *
 * @param {Array<{ id?: number, description: string, amount: number, [key: string]: any }>} transactions
 * @param {string} apiKey - OpenAI or Anthropic (Claude) API key; auto-detected by key prefix
 * @param {(message: string) => void} [onProgress] - optional callback for progress (e.g. "Analyzing batch 2/5...")
 * @param {{ baseUrl?: string, model?: string }} [options]
 * @returns {Promise<Array<{ ...transaction, amount: number }>>} - transactions with corrected amounts
 */
export async function classifyDepositsAndPayments(transactions, apiKey, onProgress, options = {}) {
  if (!transactions?.length) return transactions
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('API key is required for AI analysis')
  }

  const batches = []
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    batches.push(transactions.slice(i, i + BATCH_SIZE))
  }

  const allResults = []
  for (let b = 0; b < batches.length; b++) {
    if (onProgress && typeof onProgress === 'function') {
      onProgress(`Analyzing transactions ${b * BATCH_SIZE + 1}–${Math.min((b + 1) * BATCH_SIZE, transactions.length)} of ${transactions.length}…`)
    }
    const labels = await classifyBatch(batches[b], apiKey, options)
    allResults.push(...labels)
  }

  return transactions.map((t, i) => {
    const label = allResults[i] || 'payment'
    let amount = t.amount
    if (typeof amount !== 'number') amount = parseFloat(amount) || 0
    const isPositive = amount > 0
    const shouldBeDeposit = label === 'deposit'
    if (shouldBeDeposit && !isPositive && amount !== 0) amount = Math.abs(amount)
    else if (!shouldBeDeposit && isPositive && amount !== 0) amount = -Math.abs(amount)
    return { ...t, amount }
  })
}

// --- AI auto-categorization ---
const CATEGORY_BATCH_SIZE = 20

function buildCategoryPrompt(batch, categoryList) {
  const listStr = categoryList.join(', ')
  const lines = batch.map((t, i) => {
    const desc = (t.description || '').trim().slice(0, 100)
    const amt = t.amount != null ? t.amount : ''
    return `${i + 1}. "${desc}" Amount: ${amt}`
  }).join('\n')
  return `Assign exactly one category to each transaction. Use ONLY these categories (copy the name exactly): ${listStr}

Transactions:
${lines}

Reply with exactly one category per line, in order (line 1 = transaction 1, etc.). Use only category names from the list above. If unsure, use "Uncategorized".`
}

async function categorizeBatchWithAPI(batch, categoryList, apiKey, options = {}) {
  const prompt = buildCategoryPrompt(batch, categoryList)
  const categorySet = new Set(categoryList.map((c) => c.trim()))

  if (isClaudeKey(apiKey)) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model || 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Claude API error (${res.status}): ${err}`)
    }
    const data = await res.json()
    const text = (data.content?.[0]?.text || '').trim()
    return parseCategoryResponse(text, batch.length, categorySet, categoryList)
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error (${res.status}): ${err}`)
  }
  const data = await res.json()
  const text = (data.choices?.[0]?.message?.content || '').trim()
  return parseCategoryResponse(text, batch.length, categorySet, categoryList)
}

function parseCategoryResponse(text, expectedCount, categorySet, categoryList) {
  const defaultCat = categoryList.includes('Uncategorized') ? 'Uncategorized' : categoryList[0]
  const lines = text.split(/\n/).map((s) => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
  const result = []
  for (let i = 0; i < expectedCount; i++) {
    const raw = lines[i] || ''
    const match = categoryList.find((c) => raw.toLowerCase() === c.toLowerCase())
    const cat = match || (categorySet.has(raw) ? raw : defaultCat)
    result.push(cat)
  }
  return result
}

/**
 * Use AI to assign a category to each transaction. Categories must be from the provided list.
 *
 * @param {Array<{ description: string, amount: number, [key: string]: any }>} transactions
 * @param {string[]} categoryList - e.g. ['Food & Dining', 'Groceries', ..., 'Uncategorized']
 * @param {string} apiKey
 * @param {(message: string) => void} [onProgress]
 * @returns {Promise<Array<{ ...transaction, category: string }>>}
 */
export async function categorizeTransactionsWithAI(transactions, categoryList, apiKey, onProgress, options = {}) {
  if (!transactions?.length) return transactions
  if (!categoryList?.length) return transactions
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('API key is required for AI categorization')
  }

  const batches = []
  for (let i = 0; i < transactions.length; i += CATEGORY_BATCH_SIZE) {
    batches.push(transactions.slice(i, i + CATEGORY_BATCH_SIZE))
  }

  const allCategories = []
  for (let b = 0; b < batches.length; b++) {
    if (onProgress && typeof onProgress === 'function') {
      onProgress(`AI categorizing ${b * CATEGORY_BATCH_SIZE + 1}–${Math.min((b + 1) * CATEGORY_BATCH_SIZE, transactions.length)} of ${transactions.length}…`)
    }
    const labels = await categorizeBatchWithAPI(batches[b], categoryList, apiKey, options)
    allCategories.push(...labels)
  }

  return transactions.map((t, i) => ({
    ...t,
    category: allCategories[i] || 'Uncategorized',
  }))
}

// --- AI-powered PDF text extraction (fallback when layout parsing fails) ---
const MAX_PDF_TEXT_CHARS = 80000

/**
 * Send raw PDF statement text to the AI and get back transactions plus statement metadata.
 * When API key is set, use this first so the AI reads institution and account number correctly.
 *
 * @param {string} pdfText - Raw text extracted from the PDF (all pages concatenated)
 * @param {string} apiKey - OpenAI or Claude API key
 * @returns {Promise<{ institution?: string, accountLast4?: string, transactions: Array<{ date: string, description: string, amount: number }> }>}
 */
export async function extractTransactionsFromPDFText(pdfText, apiKey) {
  const empty = { institution: '', accountLast4: '', transactions: [] }
  if (!pdfText || typeof pdfText !== 'string') return empty
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('API key is required for AI PDF extraction')
  }

  const text = pdfText.trim().slice(0, MAX_PDF_TEXT_CHARS)
  const prompt = `Below is raw text from a bank or credit card statement PDF.

1) From the statement header/summary (top of first page, logo area, or account summary), identify:
- institution: the bank or card issuer that produced this statement. Use the exact issuer name (e.g. "American Express", "TD Bank", "Chase", "Bank of America"). Look for the company name, logo text, or website (e.g. americanexpress.com → American Express). Do NOT use merchant/payee names from transactions.
- accountLast4: the last 4 digits of the account/card number only. Look for "Primary Account #: 435-9511742" (→ 1742), "Account # 435-9511742", or "Account Ending 5-42005" (→ last 4 of 42005 = 2005). Use only the statement’s own account identifier; ignore reference numbers, transaction IDs, or other numbers. If unclear, use "".

2) Extract every individual transaction into an array. For each transaction:
- date: transaction date in YYYY-MM-DD or MM/DD/YYYY
- description: merchant or payee name (short)
- amount: number. CRITICAL sign: deposits/credits (money in) = positive; payments/debits/withdrawals (money out) = negative. Sections like "Electronic Payments", "ACH DEBIT", "PMT-WEB", "Bill Pay" = negative amounts.

IMPORTANT — do NOT include these as transactions:
- Beginning Balance, Ending Balance, Opening Balance, Closing Balance, Starting Balance
- Account Summary totals, subtotals, or running balance lines
- Column headers, section headers, or any row that summarises a period rather than describing a single transaction

Reply with a single JSON object only, no other text:
{"institution":"TD Bank","accountLast4":"1742","transactions":[{"date":"2025-12-01","description":"AMAZON","amount":15.54},{"date":"2025-12-01","description":"SANTANDER BILLPAY","amount":-624.59}]}

Statement text:
---
${text}
---`

  if (isClaudeKey(apiKey)) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Claude API error (${res.status}): ${err}`)
    }
    const data = await res.json()
    const raw = (data.content?.[0]?.text || '').trim()
    return parseAIStatementResponse(raw)
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 16000,
      temperature: 0,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error (${res.status}): ${err}`)
  }
  const data = await res.json()
  const raw = (data.choices?.[0]?.message?.content || '').trim()
  return parseAIStatementResponse(raw)
}

function parseAIStatementResponse(raw) {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  let obj
  try {
    obj = JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    obj = match ? JSON.parse(match[0]) : null
  }
  if (!obj || typeof obj !== 'object') {
    return { institution: '', accountLast4: '', transactions: [] }
  }
  const institution = typeof obj.institution === 'string' ? obj.institution.trim() : ''
  const accountLast4 = typeof obj.accountLast4 === 'string' ? obj.accountLast4.replace(/\D/g, '').slice(-4) : ''
  let arr = Array.isArray(obj.transactions) ? obj.transactions : []
  arr = arr
    .filter((t) => t && (t.date || t.description || t.amount != null))
    .map((t, i) => ({
      id: i,
      date: String(t.date || ''),
      description: String(t.description || '').trim() || 'Unknown',
      amount: typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0,
      category: '',
    }))
  return { institution, accountLast4, transactions: arr }
}
