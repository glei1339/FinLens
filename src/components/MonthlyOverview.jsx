import React, { useMemo } from 'react'
import { getYearMonthFromDate, getYearFromDate } from '../utils/dateHelpers'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtMoney(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(n))
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

export default function MonthlyOverview({ transactions, selectedYear, excludedCategories }) {
  const expenses = useMemo(() => getExpenses(transactions, excludedCategories), [transactions, excludedCategories])
  const isYearlyView = selectedYear == null

  const rows = useMemo(() => {
    if (!expenses.length) return []
    const map = {}
    if (isYearlyView) {
      for (const t of expenses) {
        const y = getYearFromDate(t.date)
        if (!y) continue
        const key = String(y)
        if (!map[key]) map[key] = { year: y, month: null, spent: 0, count: 0 }
        map[key].spent += Math.abs(t.amount)
        map[key].count++
      }
      return Object.entries(map)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([key, v]) => ({ ...v, key, label: String(v.year) }))
    }
    for (const t of expenses) {
      const ym = getYearMonthFromDate(t.date)
      if (!ym || ym.year !== selectedYear) continue
      const key = `${ym.year}-${String(ym.month).padStart(2, '0')}`
      if (!map[key]) map[key] = { year: ym.year, month: ym.month, spent: 0, count: 0 }
      map[key].spent += Math.abs(t.amount)
      map[key].count++
    }
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, v]) => ({ ...v, key, label: MONTH_NAMES[v.month - 1] }))
  }, [expenses, isYearlyView, selectedYear])

  if (!rows.length) return null

  const peak = rows.reduce((m, r) => Math.max(m, r.spent), 0)
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0)
  const totalCount = rows.reduce((s, r) => s + r.count, 0)

  return (
    <div className="card overflow-hidden mb-8 animate-fade-up">
      <div className="card-header px-6 py-4">
        <div>
          <h2 className="card-title text-lg">
            {isYearlyView ? 'Expenses by year' : 'Month by month'}
          </h2>
          <p className="card-subtitle">
            {rows.length} {isYearlyView ? 'year' : 'month'}{rows.length !== 1 ? 's' : ''} · where your money went
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 px-6 py-3.5 border-b font-semibold text-xs uppercase tracking-wider" style={{ borderColor: 'var(--border-subtle)', background: 'var(--border-subtle)' }}>
        <div className="w-16 flex-shrink-0" />
        <div className="flex-1" />
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="w-24 text-sm font-semibold text-right" style={{ color: 'var(--text-secondary)' }}>Spent</span>
          <span className="w-10 text-sm font-semibold text-right" style={{ color: 'var(--text-secondary)' }}>#</span>
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {rows.map((r) => {
          const pct = peak > 0 ? (r.spent / peak) * 100 : 0
          return (
            <div key={r.key} className="flex items-center gap-3 px-6 py-3.5 hover:bg-[var(--border-subtle)]/60 transition-colors">
              <div className="w-16 flex-shrink-0">
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{r.label}</p>
                {!isYearlyView && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{r.year}</p>}
              </div>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0 bg-red-400" />
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                  <div className="h-full rounded-full transition-all duration-500 bg-red-400" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <p className="w-24 text-right text-base num font-semibold" style={{ color: 'var(--danger)' }}>{fmtMoney(r.spent)}</p>
                <p className="w-10 text-right text-sm num font-medium" style={{ color: 'var(--text-secondary)' }}>{r.count}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className="flex items-center gap-3 px-6 py-4 border-t font-semibold"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--border-subtle)' }}
      >
        <div className="w-16 flex-shrink-0">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Total</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4 flex-shrink-0">
          <p className="w-24 text-right text-base num font-bold" style={{ color: 'var(--danger)' }}>{fmtMoney(totalSpent)}</p>
          <p className="w-10 text-right text-sm num font-semibold" style={{ color: 'var(--text-secondary)' }}>{totalCount}</p>
        </div>
      </div>
    </div>
  )
}
