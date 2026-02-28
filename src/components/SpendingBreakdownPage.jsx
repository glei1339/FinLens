import React, { useMemo } from 'react'
import { ArrowLeft, TrendingDown, TrendingUp } from 'lucide-react'
import { CATEGORY_COLORS } from '../utils/categorizer'
import { getYearFromDate, getUniqueYears, getYearMonthFromDate } from '../utils/dateHelpers'

function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(n))
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function buildCategoryStats(transactions) {
  const byCategory = {}
  let totalSpent = 0
  let totalIncome = 0

  for (const t of transactions) {
    const cat = t.category || 'Uncategorized'
    if (!byCategory[cat]) {
      byCategory[cat] = { amount: 0, count: 0 }
    }
    byCategory[cat].amount += t.amount
    byCategory[cat].count += 1
    if (t.amount < 0) totalSpent += Math.abs(t.amount)
    else totalIncome += t.amount
  }

  const spending = Object.entries(byCategory)
    .filter(([, v]) => v.amount < 0)
    .map(([name, v]) => ({
      name,
      amount: Math.abs(v.amount),
      count: v.count,
    }))
    .sort((a, b) => b.amount - a.amount)

  const income = Object.entries(byCategory)
    .filter(([, v]) => v.amount > 0)
    .map(([name, v]) => ({
      name,
      amount: v.amount,
      count: v.count,
    }))
    .sort((a, b) => b.amount - a.amount)

  return { spending, income, totalSpent, totalIncome }
}

export default function SpendingBreakdownPage({
  transactions,
  selectedYear,
  onYearChange,
  customCategories = [],
  onBack,
}) {
  const years = useMemo(() => getUniqueYears(transactions), [transactions])
  const filtered = useMemo(() => {
    if (!transactions?.length) return []
    if (selectedYear == null) return transactions
    return transactions.filter((t) => getYearFromDate(t.date) === selectedYear)
  }, [transactions, selectedYear])

  const { spending, income, totalSpent, totalIncome } = useMemo(
    () => buildCategoryStats(filtered),
    [filtered]
  )

  // Per-category: count distinct months with spending, then avg per month for that category.
  const spendingWithAvg = useMemo(() => {
    const byCategoryMonths = {}
    for (const t of filtered) {
      if (t.amount >= 0) continue
      const ym = getYearMonthFromDate(t.date)
      if (!ym) continue
      const key = `${ym.year}-${ym.month}`
      const cat = t.category || 'Uncategorized'
      if (!byCategoryMonths[cat]) byCategoryMonths[cat] = new Set()
      byCategoryMonths[cat].add(key)
    }
    return spending.map(({ name, amount, count }) => {
      const monthsWithSpending = (byCategoryMonths[name] || new Set()).size
      const avgPerMonth = monthsWithSpending ? amount / monthsWithSpending : 0
      return { name, amount, count, monthsWithSpending, avgPerMonth }
    })
  }, [filtered, spending])

  // Monthly spending by category (expenses only, selected year).
  const monthlySpending = useMemo(() => {
    if (!filtered.length || selectedYear == null) return []
    const byMonth = {}
    for (const t of filtered) {
      if (t.amount >= 0) continue
      const ym = getYearMonthFromDate(t.date)
      if (!ym || ym.year !== selectedYear) continue
      const m = ym.month
      const cat = t.category || 'Uncategorized'
      const amt = Math.abs(t.amount)
      if (!byMonth[m]) byMonth[m] = { total: 0, byCategory: {} }
      byMonth[m].total += amt
      if (!byMonth[m].byCategory[cat]) byMonth[m].byCategory[cat] = { amount: 0 }
      byMonth[m].byCategory[cat].amount += amt
    }
    return Object.entries(byMonth)
      .map(([month, data]) => ({
        month: Number(month),
        label: MONTH_LABELS[Number(month) - 1] || `M${month}`,
        amount: data.total,
        byCategory: data.byCategory,
      }))
      .sort((a, b) => a.month - b.month)
  }, [filtered, selectedYear])

  const avgMonthlySpending = monthlySpending.length
    ? totalSpent / monthlySpending.length
    : 0

  // For the \"All years\" view, compute per-year totals and average per active month.
  const yearlyAverages = useMemo(() => {
    if (!transactions?.length || years.length <= 1) return []
    const rows = []
    for (const y of [...years].sort((a, b) => b - a)) {
      const yearTx = transactions.filter((t) => getYearFromDate(t.date) === y)
      if (!yearTx.length) continue
      let yearSpent = 0
      const months = new Set()
      for (const t of yearTx) {
        if (t.amount >= 0) continue
        const ym = getYearMonthFromDate(t.date)
        if (!ym || ym.year !== y) continue
        months.add(ym.month)
        yearSpent += Math.abs(t.amount)
      }
      if (yearSpent <= 0) continue
      const avg = months.size ? yearSpent / months.size : 0
      rows.push({ year: y, totalSpent: yearSpent, avgPerMonth: avg, months: months.size })
    }
    return rows
  }, [transactions, years])

  const customColorMap = useMemo(
    () => Object.fromEntries((customCategories || []).map((c) => [c.name, c.color])),
    [customCategories]
  )

  const getColor = (name) => customColorMap[name] || CATEGORY_COLORS[name] || '#9ca3af'

  const yearLabel = selectedYear != null ? selectedYear : 'All years'

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </button>

        <h1 className="text-2xl font-bold text-white mb-2">Spending by category</h1>
        <p className="text-slate-500 text-sm mb-6">
          See how much you spent on food, gas, and more{selectedYear != null ? ` in ${selectedYear}` : ''}.
        </p>

        {/* Year selector */}
        {years.length > 1 && (
          <div
            className="rounded-2xl p-4 mb-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Year</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onYearChange(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  selectedYear == null
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                All years
              </button>
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => onYearChange(y)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    selectedYear === y
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.08) 100%)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total spent</span>
            </div>
            <p className="text-xl font-bold text-red-300">{fmt(totalSpent)}</p>
            <p className="text-xs text-slate-500 mt-1">{yearLabel}</p>
          </div>
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)',
              border: '1px solid rgba(34,197,94,0.2)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total income</span>
            </div>
            <p className="text-xl font-bold text-emerald-300">{fmt(totalIncome)}</p>
            <p className="text-xs text-slate-500 mt-1">{yearLabel}</p>
          </div>
          {selectedYear != null && (
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(129,140,248,0.15) 0%, rgba(79,70,229,0.08) 100%)',
                border: '1px solid rgba(129,140,248,0.25)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg per month</span>
              </div>
              <p className="text-xl font-bold text-indigo-200">
                {monthlySpending.length ? fmt(avgMonthlySpending) : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {monthlySpending.length
                  ? `${monthlySpending.length} month${monthlySpending.length !== 1 ? 's' : ''} with spending`
                  : 'No spending months in this year'}
              </p>
            </div>
          )}
        </div>

        {/* Spending by category */}
        <div
          className="rounded-2xl overflow-hidden mb-8"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="font-semibold text-white">{selectedYear != null ? 'Total YTD' : 'Spending by category'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">By category · {yearLabel}</p>
          </div>
          <div className="divide-y divide-white/5">
            {spendingWithAvg.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-500 text-sm">No spending in this period.</div>
            ) : (
              spendingWithAvg.map(({ name, amount, count, monthsWithSpending, avgPerMonth }) => {
                const pct = totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : 0
                const color = getColor(name)
                return (
                  <div key={name}>
                    <div
                      className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200">{name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {count} transaction{count !== 1 ? 's' : ''} · {pct}% of spending
                          {monthsWithSpending > 0 && (
                            <> · <span className="text-slate-400">avg {fmt(avgPerMonth)}/mo</span></>
                          )}
                        </p>
                        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden max-w-[200px]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, pct)}%`, background: color }}
                          />
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-semibold text-red-400 font-mono">{fmt(-amount)}</p>
                        {monthsWithSpending > 0 && (
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">avg {fmt(avgPerMonth)}/mo</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Monthly breakdown for the selected year */}
        {selectedYear != null && monthlySpending.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden mb-8"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="font-semibold text-white">Spending by month</h2>
              <p className="text-xs text-slate-500 mt-0.5">Expenses only · {selectedYear} · by category</p>
            </div>
            <div className="divide-y divide-white/5">
              {monthlySpending.map(({ month, label, amount, byCategory }) => {
                const cats = Object.entries(byCategory || {}).sort((a, b) => b[1].amount - a[1].amount)
                return (
                  <div
                    key={month}
                    className="px-5 py-4"
                    style={{ background: 'rgba(15,23,42,0.4)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-200">{label} {selectedYear}</p>
                      <p className="text-sm font-mono font-semibold text-red-400">{fmt(-amount)}</p>
                    </div>
                    <div className="pl-2 space-y-2">
                      {cats.map(([catName, { amount: catAmt }]) => {
                        const color = getColor(catName)
                        return (
                          <div key={catName} className="flex items-center justify-between py-0.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="text-xs text-slate-400 flex-1 ml-2">{catName}</span>
                            <span className="text-xs font-mono text-red-400/90">{fmt(-catAmt)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Income by category (if any) */}
        {income.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="font-semibold text-white">Income</h2>
              <p className="text-xs text-slate-500 mt-0.5">By category · {yearLabel}</p>
            </div>
            <div className="divide-y divide-white/5">
              {income.map(({ name, amount, count }) => {
                const pct = totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : 0
                const color = getColor(name)
                return (
                  <div
                    key={name}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200">{name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {count} transaction{count !== 1 ? 's' : ''} · {pct}% of income
                      </p>
                      <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden max-w-[200px]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, pct)}%`, background: color }}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-emerald-400 font-mono flex-shrink-0">
                      +{fmt(amount)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Yearly averages when looking at all years */}
        {selectedYear == null && yearlyAverages.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden mt-8"
            style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.35)' }}
          >
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="font-semibold text-white">Average spending per year</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Total expenses and average per active month in each year.
              </p>
            </div>
            <div className="divide-y divide-white/5">
              {yearlyAverages.map(({ year, totalSpent: spent, avgPerMonth, months }) => (
                <div
                  key={year}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-16">
                    <p className="text-sm font-semibold text-slate-200">{year}</p>
                    <p className="text-[11px] text-slate-500">{months} month{months !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-4 items-center">
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-0.5">Total spent</p>
                      <p className="text-sm font-mono font-semibold text-red-400">
                        {fmt(spent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-0.5">Avg per month</p>
                      <p className="text-sm font-mono font-semibold text-indigo-200">
                        {fmt(avgPerMonth)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
