/**
 * Extract a 4-digit year from a transaction date string.
 * Handles common formats: 01/05/2024, 1/5/24, 2024-01-05, Jan 5, 2024, etc.
 */
export function getYearFromDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null
  const s = dateStr.trim()
  // ISO or dash: 2024-01-05
  const iso = /^(\d{4})-\d{1,2}-\d{1,2}/.exec(s)
  if (iso) return parseInt(iso[1], 10)
  // US slash with 4-digit year: 01/05/2024
  const slash4 = /\d{1,2}\/\d{1,2}\/(\d{4})/.exec(s)
  if (slash4) return parseInt(slash4[1], 10)
  // US slash with 2-digit year: 01/05/24
  const slash2 = /\d{1,2}\/\d{1,2}\/(\d{2})/.exec(s)
  if (slash2) {
    const y = parseInt(slash2[1], 10)
    return y >= 0 && y <= 99 ? (y < 50 ? 2000 + y : 1900 + y) : null
  }
  // 4-digit year anywhere (e.g. "Jan 5, 2024")
  const any4 = /(20\d{2}|19\d{2})/.exec(s)
  if (any4) return parseInt(any4[1], 10)
  return null
}

/**
 * Extract { year, month } from a date string.
 * month is 1–12. Returns null when parsing fails.
 */
export function getYearMonthFromDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null
  const s = dateStr.trim()

  // ISO: 2024-01-05
  let m = /^(\d{4})-(\d{1,2})-\d{1,2}/.exec(s)
  if (m) {
    const year = parseInt(m[1], 10)
    const month = parseInt(m[2], 10)
    if (month >= 1 && month <= 12) return { year, month }
  }

  // US slash with year: 01/05/2024 or 1/5/24 (assume MM/DD/YYYY)
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s)
  if (m) {
    const month = parseInt(m[1], 10)
    let year = parseInt(m[3], 10)
    if (m[3].length === 2) year = year < 50 ? 2000 + year : 1900 + year
    if (month >= 1 && month <= 12 && year) return { year, month }
  }

  // Dash with year: 01-05-2024 (assume MM-DD-YYYY)
  m = /^(\d{1,2})-(\d{1,2})-(\d{2,4})/.exec(s)
  if (m) {
    const month = parseInt(m[1], 10)
    let year = parseInt(m[3], 10)
    if (m[3].length === 2) year = year < 50 ? 2000 + year : 1900 + year
    if (month >= 1 && month <= 12 && year) return { year, month }
  }

  // Textual month: Jan 5, 2024 or 5 Jan 2024
  const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
  const lower = s.toLowerCase()
  const monthIdx = MONTHS.findIndex(name => lower.includes(name))
  if (monthIdx !== -1) {
    const year = getYearFromDate(s)
    if (year != null) return { year, month: monthIdx + 1 }
  }

  const year = getYearFromDate(s)
  if (year != null) return { year, month: 1 }

  return null
}

/**
 * Return unique years present in transactions, sorted descending (newest first).
 */
export function getUniqueYears(transactions) {
  if (!Array.isArray(transactions) || !transactions.length) return []
  const set = new Set()
  for (const t of transactions) {
    const y = getYearFromDate(t.date)
    if (y != null) set.add(y)
  }
  return [...set].sort((a, b) => b - a)
}
