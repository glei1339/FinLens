import Papa from 'papaparse'

/**
 * Detects the bank format from CSV headers and returns a normalizer function.
 * Supports: Chase, Bank of America, Wells Fargo, Capital One, Citi, Generic.
 */
function detectFormat(headers) {
  const h = headers.map((s) => s.toLowerCase().trim())

  // Chase: Date, Description, Amount, Type, Balance
  if (h.includes('transaction date') || (h.includes('date') && h.includes('description') && h.includes('amount') && !h.includes('debit'))) {
    // Could be Chase or generic
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

function normalizeRow(row, format, headers) {
  const h = headers.map((s) => s.toLowerCase().trim())

  const get = (key) => {
    const idx = h.findIndex((c) => c === key)
    return idx >= 0 ? (row[headers[idx]] || '').trim() : ''
  }

  let date = '', description = '', amount = 0, rawAmount = ''

  if (format === 'chase') {
    date = get('date') || get('transaction date')
    description = get('description')
    rawAmount = get('amount')
    amount = parseFloat(rawAmount.replace(/[^0-9.-]/g, '')) || 0
  } else if (format === 'capitalOne') {
    date = get('transaction date')
    description = get('description')
    const debit = parseFloat((get('debit') || '0').replace(/[^0-9.-]/g, '')) || 0
    const credit = parseFloat((get('credit') || '0').replace(/[^0-9.-]/g, '')) || 0
    amount = credit > 0 ? credit : -debit
    rawAmount = debit > 0 ? `-${debit}` : `${credit}`
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
    const descKey = h.find((c) => c.includes('desc') || c.includes('payee') || c.includes('memo') || c.includes('narration') || c.includes('details') || c.includes('particular'))
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

  return { date, description, amount }
}

/**
 * Parses a CSV file (File object) and returns a promise with an array of normalized transactions.
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    let institution = 'Unknown'

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          reject(new Error('No data found in CSV file.'))
          return
        }

        const headers = results.meta.fields || []
        const format = detectFormat(headers)

        institution = formatToInstitution(format)
        if (institution === 'Unknown' && file && typeof file.name === 'string') {
          const lowerName = file.name.toLowerCase()
          if (lowerName.includes('chase')) institution = 'Chase'
          else if (lowerName.includes('bofa') || lowerName.includes('bankofamerica') || lowerName.includes('bank_of_america')) institution = 'Bank of America'
          else if (lowerName.includes('wells')) institution = 'Wells Fargo'
          else if (lowerName.includes('capitalone') || lowerName.includes('capone')) institution = 'Capital One'
          else if (lowerName.includes('citi')) institution = 'Citi'
          else if (lowerName.includes('amex') || lowerName.includes('americanexpress')) institution = 'American Express'
          else if (lowerName.includes('discover')) institution = 'Discover'
        }

        const transactions = results.data
          .map((row, idx) => {
            const norm = normalizeRow(row, format, headers)
            if (!norm.description && !norm.date) return null
            return {
              id: idx,
              date: norm.date,
              description: norm.description,
              amount: norm.amount,
              category: '',
              originalRow: row,
              institution,
            }
          })
          .filter(Boolean)
          .filter((t) => t.description)

        resolve(transactions)
      },
      error: (err) => reject(err),
    })
  })
}
