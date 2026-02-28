import Papa from 'papaparse'

const BOM = '\uFEFF'
function normalizeHeader(s) {
  if (typeof s !== 'string') return ''
  return s.replace(BOM, '').trim().toLowerCase()
}

/**
 * Detects the bank format from CSV headers and returns a normalizer function.
 * Supports: Chase, Bank of America, Wells Fargo, Capital One, Citi, Generic.
 */
function detectFormat(headers) {
  const h = headers.map((s) => normalizeHeader(s))

  // Chase Checking: Details, Posting Date, Description, Amount, Type, Balance, Check or Slip #
  // Must be detected before generic because "details" column looks like a description match
  if (h.includes('posting date') && h.includes('details') && h.includes('description')) return 'chaseChecking'

  // Chase Credit Card: Transaction Date, Post Date, Description, Category, Type, Amount, Memo
  if (h.includes('transaction date') || (h.includes('date') && h.includes('description') && h.includes('amount') && !h.includes('debit'))) {
    // Could be Chase CC or generic
    if (h.includes('type') && h.includes('balance')) return 'chase'
    return 'generic'
  }

  // Capital One: Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit
  if (h.includes('debit') && h.includes('credit') && h.includes('description')) return 'capitalOne'

  // Bank of America: Posted Date, Reference Number, Payee, Address, Amount
  if (h.includes('payee') && h.includes('posted date')) return 'bofa'

  // Wells Fargo: Date, Amount, *, *, Description (no headers, positional)
  if (h.length >= 5 && (h[0] === 'date' || h[0] === '') && h.some((c) => c === '*' || c === '')) return 'wellsFargo'

  return 'generic'
}

function formatToInstitution(format) {
  switch (format) {
    case 'chase':
    case 'chaseChecking':
      return 'Chase'
    case 'capitalOne':
      return 'Capital One'
    case 'bofa':
      return 'Bank of America'
    case 'wellsFargo':
      return 'Wells Fargo'
    default:
      return 'Unknown'
  }
}

/** Extract last 4 digits from a string (e.g. "****1234", "12345678901234" -> "1234"). */
function last4(value) {
  if (!value || typeof value !== 'string') return ''
  const digits = value.replace(/\D/g, '')
  return digits.length >= 4 ? digits.slice(-4) : digits || ''
}

function normalizeRow(row, format, headers, rawHeaders) {
  const h = headers.map((s) => normalizeHeader(s))
  const rowKeys = rawHeaders || headers

  const get = (key) => {
    const keyLower = key.toLowerCase()
    const idx = h.findIndex((c) => c === keyLower)
    return idx >= 0 ? (row[rowKeys[idx]] || '').replace(BOM, '').trim() : ''
  }

  const getByHeaderPattern = (predicate) => {
    const idx = headers.findIndex((col) => predicate(normalizeHeader(col)))
    return idx >= 0 ? (row[rowKeys[idx]] || '').replace(BOM, '').trim() : ''
  }

  let date = '', description = '', amount = 0, rawAmount = '', accountLast4 = ''

  if (format === 'chaseChecking') {
    // Chase Checking: Details = CREDIT/DEBIT/DSLIP. App convention: credits = positive, debits = negative.
    date = get('posting date')
    description = get('description')
    rawAmount = get('amount')
    const rawNum = parseFloat(rawAmount.replace(/[^0-9.-]/g, '')) || 0
    const details = get('details').toUpperCase()
    const isCredit = details === 'CREDIT' || details === 'DSLIP'
    amount = isCredit ? Math.abs(rawNum) : -Math.abs(rawNum)
  } else if (format === 'chase') {
    // Chase Credit Card CSV: Amount is positive for purchases (debits), negative for payments (credits).
    // Flip so app convention: expenses = negative, income/credits = positive.
    date = get('date') || get('transaction date')
    description = get('description')
    rawAmount = get('amount')
    const rawNum = parseFloat(rawAmount.replace(/[^0-9.-]/g, '')) || 0
    amount = -rawNum
  } else if (format === 'capitalOne') {
    date = get('transaction date')
    description = get('description')
    const debit = parseFloat((get('debit') || '0').replace(/[^0-9.-]/g, '')) || 0
    const credit = parseFloat((get('credit') || '0').replace(/[^0-9.-]/g, '')) || 0
    amount = credit > 0 ? credit : -debit
    rawAmount = debit > 0 ? `-${debit}` : `${credit}`
    accountLast4 = last4(getByHeaderPattern((c) => c.includes('card') && c.includes('no')))
  } else if (format === 'bofa') {
    date = get('posted date')
    description = get('payee')
    rawAmount = get('amount')
    amount = parseFloat(rawAmount.replace(/[^0-9.-]/g, '')) || 0
  } else if (format === 'wellsFargo') {
    // Positional: [date, amount, ?, ?, description]
    const values = Object.values(row)
    date = values[0] || ''
    rawAmount = values[1] || ''
    amount = parseFloat(rawAmount.replace(/[^0-9.-]/g, '')) || 0
    description = values[4] || values[3] || values[2] || ''
  } else {
    // Generic fallback — scan for likely columns by name patterns
    const dateKey = h.find((c) => c.includes('date'))
    // Prioritise explicit description/payee/memo columns; avoid "details" which is often a
    // transaction-type field (DEBIT/CREDIT) rather than a merchant name.
    const descKey =
      h.find((c) => c === 'description' || c === 'desc' || c === 'payee' || c === 'memo') ||
      h.find((c) => c.includes('desc') || c.includes('payee') || c.includes('memo') || c.includes('narration') || c.includes('particular'))
    const amtKey = h.find((c) => c === 'amount' || c === 'amt' || c.includes('amount'))
    const debitKey = h.find((c) => c.includes('debit') || c.includes('withdrawal') || c.includes('dr'))
    const creditKey = h.find((c) => c.includes('credit') || c.includes('deposit') || c.includes('cr'))

    date = dateKey ? get(dateKey) : ''
    description = descKey ? get(descKey) : ''

    if (amtKey) {
      rawAmount = get(amtKey)
      amount = parseFloat(rawAmount.replace(/[^0-9.-]/g, '')) || 0
    } else if (debitKey || creditKey) {
      const debit = parseFloat((debitKey ? get(debitKey) : '0').replace(/[^0-9.-]/g, '')) || 0
      const credit = parseFloat((creditKey ? get(creditKey) : '0').replace(/[^0-9.-]/g, '')) || 0
      amount = credit > 0 ? credit : -debit
    }
  }

  if (!accountLast4) {
    const acctVal = getByHeaderPattern((c) => c.includes('card no') || c.includes('account number') || (c.includes('account') && c.includes('number')) || c === 'acct' || c.includes('acct no'))
    accountLast4 = last4(acctVal)
  }

  return { date, description, amount, accountLast4: accountLast4 || undefined }
}

function institutionFromFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') return 'Unknown'
  const lower = fileName.toLowerCase()
  if (lower.includes('chase')) return 'Chase'
  if (lower.includes('bofa') || lower.includes('bankofamerica') || lower.includes('bank_of_america')) return 'Bank of America'
  if (lower.includes('wells')) return 'Wells Fargo'
  if (lower.includes('capitalone') || lower.includes('capone')) return 'Capital One'
  if (lower.includes('citi')) return 'Citi'
  if (lower.includes('amex') || lower.includes('americanexpress')) return 'American Express'
  if (lower.includes('discover')) return 'Discover'
  return 'Unknown'
}

function finishParse(results, fileOrName, resolve, reject) {
  if (!results.data || results.data.length === 0) {
    reject(new Error('No data found in CSV file.'))
    return
  }
  const rawHeaders = results.meta.fields || []
  const headers = rawHeaders.map((s) => (typeof s === 'string' ? s.replace(BOM, '').trim() : s))
  const format = detectFormat(headers)
  let institution = formatToInstitution(format)
  if (institution === 'Unknown') {
    const name = typeof fileOrName === 'string' ? fileOrName : (fileOrName && fileOrName.name)
    institution = institutionFromFileName(name)
  }
  const transactions = results.data
    .map((row, idx) => {
      const norm = normalizeRow(row, format, headers, rawHeaders)
      if (!norm.description && !norm.date) return null
      return {
        id: idx,
        date: norm.date,
        description: norm.description,
        amount: norm.amount,
        category: '',
        originalRow: row,
        institution,
        ...(norm.accountLast4 && { accountLast4: norm.accountLast4 }),
      }
    })
    .filter(Boolean)
    .filter((t) => t.description)
  resolve(transactions)
}

/**
 * Parses a CSV file (File object) and returns a promise with an array of normalized transactions.
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => finishParse(results, file, resolve, reject),
      error: (err) => reject(err),
    })
  })
}

/**
 * Parses CSV from a string (e.g. stored file content). Use for re-reading without re-upload.
 * fileName is used for institution hint when format is unknown.
 */
export function parseCSVFromString(csvString, fileName) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => finishParse(results, fileName || '', resolve, reject),
      error: (err) => reject(err),
    })
  })
}
