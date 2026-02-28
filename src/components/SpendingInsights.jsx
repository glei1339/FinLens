import React, { useMemo } from 'react'
import { Lightbulb, TrendingUp, TrendingDown } from 'lucide-react'
import { getYearMonthFromDate, getYearFromDate } from '../utils/dateHelpers'
import { CATEGORY_COLORS } from '../utils/categorizer'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(n))
}

function getExpenses(transactions, excludedCategories = []) {
  const excluded = new Set((excludedCategories || []).map((c) => (c || '').trim()))
  return (transactions || []).filter((t) => {
    if (t.amount >= 0) return false
    const cat = (t.category || 'Uncategorized').trim()
    return !excluded.has(cat)
  })
}

/** Returns [{ year, month }, ...] sorted descending (most recent first) */
function getUniqueYearMonths(transactions) {
  const set = new Set()
  for (const t of transactions) {
    const ym = getYearMonthFromDate(t.date)
    if (ym) set.add(`${ym.year}-${String(ym.month).padStart(2, '0')}`)
  }
  return [...set]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 2)
    .map((key) => {
      const [y, m] = key.split('-')
      return { year: parseInt(y, 10), month: parseInt(m, 10) }
    })
}

/** Returns unique years from transactions, sorted descending (most recent first) */
function getUniqueYears(transactions) {
  const set = new Set()
  for (const t of transactions) {
    const y = getYearFromDate(t.date)
    if (y != null) set.add(y)
  }
  return [...set].sort((a, b) => b - a)
}

export default function SpendingInsights({ transactions, selectedYear, excludedCategories, customCategories = [] }) {
  const insight = useMemo(() => {
    const expenses = getExpenses(transactions, excludedCategories)
    if (!expenses.length) return null

    const isAllYears = selectedYear == null

    if (isAllYears) {
      // Year-by-year: compare the two most recent years
      const years = getUniqueYears(expenses)
      if (years.length < 2) return null
      const [currentYear, previousYear] = years
      const byCategoryCurrent = {}
      const byCategoryPrevious = {}

      for (const t of expenses) {
        const y = getYearFromDate(t.date)
        if (y == null) continue
        const cat = (t.category || 'Uncategorized').trim()
        const abs = Math.abs(t.amount)
        if (y === currentYear) byCategoryCurrent[cat] = (byCategoryCurrent[cat] || 0) + abs
        else if (y === previousYear) byCategoryPrevious[cat] = (byCategoryPrevious[cat] || 0) + abs
      }

      const allCats = new Set([...Object.keys(byCategoryCurrent), ...Object.keys(byCategoryPrevious)])
      const rows = []
      for (const cat of allCats) {
        const curr = byCategoryCurrent[cat] || 0
        const prev = byCategoryPrevious[cat] || 0
        if (curr === 0 && prev === 0) continue
        const change = curr - prev
        const pctChange = prev > 0 ? ((change / prev) * 100) : (curr > 0 ? 100 : 0)
        rows.push({ category: cat, current: curr, previous: prev, change, pctChange })
      }
      rows.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      return {
        previousLabel: String(previousYear),
        currentLabel: String(currentYear),
        rows,
      }
    }

    // Month-by-month: compare the two most recent months (within selected year)
    const months = getUniqueYearMonths(expenses)
    if (months.length < 2) return null

    const [current, previous] = months
    const byCategoryCurrent = {}
    const byCategoryPrevious = {}

    for (const t of expenses) {
      const ym = getYearMonthFromDate(t.date)
      if (!ym) continue
      const cat = (t.category || 'Uncategorized').trim()
      const abs = Math.abs(t.amount)
      if (ym.year === current.year && ym.month === current.month) {
        byCategoryCurrent[cat] = (byCategoryCurrent[cat] || 0) + abs
      } else if (ym.year === previous.year && ym.month === previous.month) {
        byCategoryPrevious[cat] = (byCategoryPrevious[cat] || 0) + abs
      }
    }

    const allCats = new Set([...Object.keys(byCategoryCurrent), ...Object.keys(byCategoryPrevious)])
    const rows = []
    for (const cat of allCats) {
      const curr = byCategoryCurrent[cat] || 0
      const prev = byCategoryPrevious[cat] || 0
      if (curr === 0 && prev === 0) continue
      const change = curr - prev
      const pctChange = prev > 0 ? ((change / prev) * 100) : (curr > 0 ? 100 : 0)
      rows.push({ category: cat, current: curr, previous: prev, change, pctChange })
    }
    rows.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    return {
      previousLabel: `${MONTH_LABELS[previous.month - 1]} ${previous.year}`,
      currentLabel: `${MONTH_LABELS[current.month - 1]} ${current.year}`,
      rows,
    }
  }, [transactions, selectedYear, excludedCategories])

  const customColorMap = useMemo(
    () => Object.fromEntries((customCategories || []).map((c) => [c.name, c.color])),
    [customCategories]
  )
  const getColor = (cat) => customColorMap[cat] || CATEGORY_COLORS[cat] || '#9ca3af'

  if (!insight || !insight.rows.length) {
    return (
      <div className="card overflow-hidden h-full flex flex-col">
        <div className="card-header flex-shrink-0">
          <h3 className="dashboard-card-title flex items-center gap-2">
            <Lightbulb className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
            Spending insights
          </h3>
          <p className="card-subtitle mt-0.5">Need at least 2 months or 2 years of data to compare.</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No insights yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden h-full flex flex-col min-h-0 mb-0">
      <div className="card-header flex-shrink-0">
        <h3 className="dashboard-card-title flex items-center gap-2">
          <Lightbulb className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
          Spending insights
        </h3>
        <p className="card-subtitle mt-0.5">
          Category change: {insight.previousLabel} → {insight.currentLabel}
        </p>
      </div>
      <div className="divide-y flex-1 min-h-0 overflow-auto" style={{ borderColor: 'var(--border-subtle)' }}>
        {insight.rows.map(({ category, current, previous, change, pctChange }) => {
          const isUp = change > 0
          const isDown = change < 0
          const isFlat = change === 0
          return (
            <div key={category} className="px-6 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: getColor(category) }} />
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{category}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isFlat ? (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No change</span>
                ) : (
                  <>
                    {isUp ? (
                      <TrendingUp className="w-4 h-4 shrink-0" style={{ color: 'var(--danger)' }} aria-hidden />
                    ) : (
                      <TrendingDown className="w-4 h-4 shrink-0" style={{ color: 'var(--success)' }} aria-hidden />
                    )}
                    <span className="text-sm font-semibold tabular-nums" style={{ color: isUp ? 'var(--danger)' : 'var(--success)' }}>
                      {isUp ? '+' : ''}{fmt(change)} {isUp ? 'more' : 'less'}
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      ({isUp ? '+' : ''}{pctChange.toFixed(0)}%)
                    </span>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
