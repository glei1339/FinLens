import React, { useMemo, useState } from 'react'
import { TrendingDown, TrendingUp, Calendar, BarChart3 } from 'lucide-react'
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

const isTransfer = (cat) => (cat || '').toLowerCase() === 'transfers'
const isIncomeCategory = (cat) => (cat || '').toLowerCase() === 'income'

function buildCategoryStats(transactions) {
  const byCategory = {}
  let totalSpent = 0
  let totalIncome = 0
  for (const t of transactions) {
    const cat = t.category || 'Uncategorized'
    if (!byCategory[cat]) byCategory[cat] = { amount: 0, count: 0 }
    byCategory[cat].amount += t.amount
    byCategory[cat].count += 1
    if (t.amount < 0 && !isTransfer(cat)) totalSpent += Math.abs(t.amount)
    if (t.amount > 0 && isIncomeCategory(cat)) totalIncome += t.amount
  }
  const spending = Object.entries(byCategory)
    .filter(([name, v]) => v.amount < 0 && !isTransfer(name))
    .map(([name, v]) => ({ name, amount: Math.abs(v.amount), count: v.count }))
    .sort((a, b) => b.amount - a.amount)
  const income = Object.entries(byCategory)
    .filter(([name, v]) => isIncomeCategory(name) && v.amount > 0)
    .map(([name, v]) => ({ name, amount: v.amount, count: v.count }))
    .sort((a, b) => b.amount - a.amount)
  return { spending, income, totalSpent, totalIncome }
}

// ── Monthly breakdown: all months with category breakdown visible; optional category highlight ─
function MonthlyBreakdown({ monthlySpending, selectedYear, getColor }) {
  const [highlightCategory, setHighlightCategory] = useState(null)
  const yearTotal = monthlySpending.reduce((s, m) => s + m.amount, 0)

  const allCategories = useMemo(() => {
    const set = new Set()
    monthlySpending.forEach(({ byCategory }) => {
      Object.keys(byCategory || {}).forEach((cat) => set.add(cat))
    })
    return [...set].sort()
  }, [monthlySpending])

  return (
    <div className="card overflow-hidden mb-6">
      <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--separator)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}>
            <Calendar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h3 className="dashboard-card-title">Month by month</h3>
            <p className="card-subtitle mt-0.5">
              {selectedYear} · {fmt(-yearTotal)} total
            </p>
          </div>
        </div>
      </div>

      {allCategories.length > 0 && (
        <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--separator)', background: 'var(--bg-subtle)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            Compare category
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setHighlightCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                highlightCategory == null ? 'text-white' : ''
              }`}
              style={
                highlightCategory == null
                  ? { background: 'var(--accent)' }
                  : { color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border)' }
              }
            >
              All
            </button>
            {allCategories.map((cat) => {
              const isActive = highlightCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setHighlightCategory(isActive ? null : cat)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={
                    isActive
                      ? { background: getColor(cat), color: '#fff', border: '1px solid transparent' }
                      : { color: 'var(--text-secondary)', background: 'var(--bg-card)', border: `1px solid var(--border)` }
                  }
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: isActive ? 'rgba(255,255,255,0.8)' : getColor(cat) }} />
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {monthlySpending.map(({ month, label, amount, byCategory }) => {
          const cats = Object.entries(byCategory || {}).sort((a, b) => b[1].amount - a[1].amount)

          return (
            <div
              key={month}
              className="rounded-2xl overflow-hidden border transition-shadow hover:shadow-md"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div
                className="px-5 py-4 flex items-center justify-between gap-4"
                style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--separator)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg font-semibold font-display tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {label}
                  </span>
                  <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>{selectedYear}</span>
                </div>
                <span className="text-lg font-bold font-mono num tabular-nums shrink-0" style={{ color: 'var(--danger)' }}>
                  {fmt(-amount)}
                </span>
              </div>

              {cats.length > 0 ? (
                <div className="divide-y" style={{ borderColor: 'var(--separator)' }}>
                  {cats.map(([catName, { amount: catAmt }]) => {
                    const isHighlighted = highlightCategory != null && catName === highlightCategory
                    return (
                      <div
                        key={catName}
                        className={`flex items-center justify-between gap-4 px-5 py-2.5 transition-colors ${
                          isHighlighted ? 'ring-inset ring-2' : 'hover:bg-[var(--bg-subtle)]/50'
                        }`}
                        style={
                          isHighlighted
                            ? {
                                background: 'var(--accent-light)',
                                boxShadow: 'inset 0 0 0 2px var(--accent)',
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: getColor(catName) }}
                          />
                          <span
                            className={`text-sm truncate ${isHighlighted ? 'font-semibold' : 'font-medium'}`}
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {catName}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-mono num tabular-nums shrink-0 ${isHighlighted ? 'font-bold' : 'font-semibold'}`}
                          style={{ color: 'var(--danger)' }}
                        >
                          {fmt(-catAmt)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No spending this month</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Income section ─────────────────────────────────────────────────
function IncomeSection({ income, totalIncome, yearLabel }) {
  return (
    <div className="card overflow-hidden mb-6 border-emerald-200 bg-emerald-50/30">
      <div className="card-header border-emerald-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <h3 className="card-title">Income</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{yearLabel}</span>
          <span className="text-sm font-bold num text-emerald-700">+{fmt(totalIncome)}</span>
        </div>
      </div>
      <div className="divide-y divide-emerald-100">
        {income.map(({ name, amount, count }) => {
          const pct = totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : 0
          return (
            <div key={name} className="flex items-center gap-4 px-5 py-3.5 hover:bg-emerald-50/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{name}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                      {pct}%
                    </span>
                    <span className="text-sm font-bold num text-emerald-700">+{fmt(amount)}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{count} transaction{count !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Year comparison ────────────────────────────────────────────────
function YearComparison({ yearlyAverages }) {
  const maxSpent = Math.max(...yearlyAverages.map((y) => y.totalSpent), 1)

  return (
    <div className="card overflow-hidden mb-6">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="card-title">Year over year</h3>
        </div>
        <p className="card-subtitle mb-0">Total spent and average per month in each year</p>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {yearlyAverages.map(({ year, totalSpent: spent, avgPerMonth, months }) => {
          const barPct = (spent / maxSpent) * 100
          return (
            <div key={year} className="rounded-lg p-4 border bg-subtle" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{year}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{months} month{months !== 1 ? 's' : ''}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-3 bg-subtle">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barPct}%`, background: 'var(--accent)' }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Total spent</p>
                  <p className="text-sm font-bold num" style={{ color: 'var(--danger)' }}>{fmt(spent)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Avg / month</p>
                  <p className="text-sm font-bold num" style={{ color: 'var(--accent)' }}>{fmt(avgPerMonth)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function SpendingBreakdownSection({
  transactions,
  selectedYear,
  customCategories = [],
  excludedCategories = [],
}) {
  const years = useMemo(() => getUniqueYears(transactions), [transactions])

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

  const { spending, income, totalSpent, totalIncome } = useMemo(
    () => buildCategoryStats(filtered),
    [filtered],
  )

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
        if (excludedSet.has((t.category || 'Uncategorized').trim())) continue
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
  }, [transactions, years, excludedSet])

  const customColorMap = useMemo(
    () => Object.fromEntries((customCategories || []).map((c) => [c.name, c.color])),
    [customCategories],
  )
  const getColor = (name) => customColorMap[name] || CATEGORY_COLORS[name] || '#9ca3af'

  if (!transactions?.length) return null

  return (
    <section className="mt-2">
      <div className="mb-5">
        <h2 className="section-title">Expenses by category</h2>
        <p className="section-desc">
          {selectedYear != null ? `Spending in ${selectedYear} by category` : 'All-time spending by category'}
        </p>
      </div>

      {/* Year-over-year comparison (all years view) */}
      {selectedYear == null && yearlyAverages.length > 0 && (
        <YearComparison yearlyAverages={yearlyAverages} />
      )}

      {/* Month by month (when a year is selected) — moved up to replace old MonthlyOverview */}
      {selectedYear != null && monthlySpending.length > 0 && (
        <MonthlyBreakdown
          monthlySpending={monthlySpending}
          selectedYear={selectedYear}
          getColor={getColor}
        />
      )}

    </section>
  )
}
