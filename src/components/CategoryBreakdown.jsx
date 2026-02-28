import React, { useMemo } from 'react'
import { TrendingDown } from 'lucide-react'
import { CATEGORY_COLORS } from '../utils/categorizer'
import { getYearFromDate, getYearMonthFromDate } from '../utils/dateHelpers'

function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(n))
}

function CategoryRow({ rank, name, amount, count, avgPerMonth, monthsWithSpending, pct, color }) {
  return (
    <div className="border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--border-subtle)]/50">
        <span className="text-xs font-mono w-5 text-right flex-shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {String(rank).padStart(2, '0')}
        </span>
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
            <div className="flex items-baseline gap-1.5 flex-shrink-0">
              <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: `${color}22`, color }}>
                {pct}%
              </span>
              <span className="text-sm font-bold num" style={{ color: 'var(--danger)' }}>{fmt(amount)}</span>
            </div>
          </div>
          <div className="h-1 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--progress-track)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{count} txn{count !== 1 ? 's' : ''}</span>
            {monthsWithSpending > 0 && (
              <>
                <span>·</span>
                <span className="font-mono">{fmt(avgPerMonth)}/mo avg</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CategoryBreakdown({
  transactions,
  selectedYear,
  customCategories = [],
  excludedCategories = [],
}) {
  const excludedSet = useMemo(
    () => new Set((excludedCategories || []).map((c) => (c || '').trim())),
    [excludedCategories]
  )

  const filtered = useMemo(() => {
    if (!transactions?.length) return []
    let list = transactions
    if (selectedYear != null) list = list.filter((t) => getYearFromDate(t.date) === selectedYear)
    return list.filter(
      (t) => t.amount < 0 && !excludedSet.has((t.category || 'Uncategorized').trim())
    )
  }, [transactions, selectedYear, excludedSet])

  const { spendingWithAvg, totalSpent } = useMemo(() => {
    const byCategory = {}
    const byCategoryMonths = {}
    let total = 0

    for (const t of filtered) {
      const cat = t.category || 'Uncategorized'
      if (!byCategory[cat]) byCategory[cat] = { amount: 0, count: 0 }
      byCategory[cat].amount += Math.abs(t.amount)
      byCategory[cat].count += 1
      total += Math.abs(t.amount)

      const ym = getYearMonthFromDate(t.date)
      if (ym) {
        if (!byCategoryMonths[cat]) byCategoryMonths[cat] = new Set()
        byCategoryMonths[cat].add(`${ym.year}-${ym.month}`)
      }
    }

    const rows = Object.entries(byCategory)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([name, { amount, count }]) => {
        const monthsWithSpending = (byCategoryMonths[name] || new Set()).size
        return { name, amount, count, monthsWithSpending, avgPerMonth: monthsWithSpending ? amount / monthsWithSpending : 0 }
      })

    return { spendingWithAvg: rows, totalSpent: total }
  }, [filtered])

  const customColorMap = useMemo(
    () => Object.fromEntries((customCategories || []).map((c) => [c.name, c.color])),
    [customCategories]
  )
  const getColor = (name) => customColorMap[name] || CATEGORY_COLORS[name] || '#9ca3af'

  const yearLabel = selectedYear != null ? String(selectedYear) : 'All years'

  if (!spendingWithAvg.length) return null

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="card-title flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-400" />
          {selectedYear != null ? 'Total YTD' : 'Spending by category'}
        </h3>
        <p className="card-subtitle mb-0">
          {spendingWithAvg.length} categor{spendingWithAvg.length !== 1 ? 'ies' : 'y'} · {yearLabel}
        </p>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: '420px' }}>
        {spendingWithAvg.map(({ name, amount, count, monthsWithSpending, avgPerMonth }, idx) => {
          const pct = totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : 0
          return (
            <CategoryRow
              key={name}
              rank={idx + 1}
              name={name}
              amount={amount}
              count={count}
              avgPerMonth={avgPerMonth}
              monthsWithSpending={monthsWithSpending}
              pct={pct}
              color={getColor(name)}
            />
          )
        })}
      </div>
    </div>
  )
}
