import React from 'react'
import { DollarSign, Calendar, Receipt } from 'lucide-react'
import { getYearMonthFromDate } from '../utils/dateHelpers'

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(n))
}

function fmtCompact(n) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return '$' + (abs / 1_000_000).toFixed(2) + 'M'
  if (abs >= 1_000) return '$' + (abs / 1_000).toFixed(1) + 'k'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(abs)
}

/** Only expenses: amount < 0 and category not in excluded list */
function getExpenses(transactions, excludedCategories = []) {
  const excluded = new Set((excludedCategories || []).map((c) => (c || '').trim()))
  return (transactions || []).filter((t) => {
    if (t.amount >= 0) return false
    const cat = (t.category || 'Uncategorized').trim()
    return !excluded.has(cat)
  })
}

export default function SummaryCards({ transactions, excludedCategories }) {
  const expenses = getExpenses(transactions, excludedCategories)
  const totalSpent = expenses.reduce((s, t) => s + Math.abs(t.amount), 0)
  const count = expenses.length

  // Average per month: group by year-month, then average
  const byMonth = {}
  for (const t of expenses) {
    const ym = getYearMonthFromDate(t.date)
    if (!ym) continue
    const key = `${ym.year}-${String(ym.month).padStart(2, '0')}`
    byMonth[key] = (byMonth[key] || 0) + Math.abs(t.amount)
  }
  const monthCount = Object.keys(byMonth).length
  const avgPerMonth = monthCount > 0 ? totalSpent / monthCount : 0

  const uncategorized = expenses.filter((t) => t.category === 'Uncategorized').length
  const categorizedPct = count > 0 ? (((count - uncategorized) / count) * 100).toFixed(0) : 100

  if (count === 0) {
    return (
      <div className="mb-10 animate-fade-up">
        <div className="card p-8 text-center">
          <p className="stat-label mb-2">No expenses yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Upload a CSV to see your expense breakdown here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-10 animate-fade-up">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card p-6 transition-all duration-200 hover:shadow-finlens">
          <p className="stat-label flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--danger-light)' }}>
              <DollarSign className="w-4 h-4" style={{ color: 'var(--danger)' }} />
            </span>
            Total spent
          </p>
          <p className="stat-value text-2xl sm:text-3xl" style={{ color: 'var(--danger)' }}>{fmtCompact(totalSpent)}</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Based on selected year above</p>
        </div>

        <div className="card p-6 transition-all duration-200 hover:shadow-finlens">
          <p className="stat-label flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
              <Calendar className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </span>
            Avg per month
          </p>
          <p className="stat-value text-2xl sm:text-3xl" style={{ color: 'var(--accent)' }}>{fmtCompact(avgPerMonth)}</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Across {monthCount} month{monthCount !== 1 ? 's' : ''} with spending</p>
        </div>

        <div className="card p-6 transition-all duration-200 hover:shadow-finlens">
          <p className="stat-label flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--border-subtle)' }}>
              <Receipt className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </span>
            Expenses
          </p>
          <p className="stat-value">{count.toLocaleString()}</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            {uncategorized > 0 ? `${uncategorized} uncategorized` : 'All categorized'}
          </p>
          <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${categorizedPct}%`, background: 'var(--accent)' }}
            />
          </div>
          <p className="text-xs font-medium mt-2" style={{ color: 'var(--text-muted)' }}>
            {categorizedPct}% categorized
          </p>
        </div>
      </div>
    </div>
  )
}
