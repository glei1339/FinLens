import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, TrendingDown, TrendingUp, Calendar, BarChart3 } from 'lucide-react'
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

// ── Ranked category row ────────────────────────────────────────────
function CategoryRow({ rank, name, amount, count, avgPerMonth, monthsWithSpending, pct, color }) {
  return (
    <div className="border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-[var(--border-subtle)]/50">
        <span className="text-sm font-mono w-6 text-right pt-0.5 flex-shrink-0 select-none" style={{ color: 'var(--text-secondary)' }}>
          {String(rank).padStart(2, '0')}
        </span>
        <span className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
            </div>
            <div className="flex items-baseline gap-2 flex-shrink-0">
              <span className="text-sm font-mono px-2 py-0.5 rounded-md" style={{ background: `${color}22`, color }}>
                {pct}%
              </span>
              <span className="text-base font-bold num text-red-600">{fmt(-amount)}</span>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{count} transaction{count !== 1 ? 's' : ''}</span>
            {monthsWithSpending > 0 && (
              <>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>·</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>avg <span className="font-mono">{fmt(avgPerMonth)}</span>/mo</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Monthly breakdown ──────────────────────────────────────────────
function MonthlyBreakdown({ monthlySpending, selectedYear, getColor }) {
  const [openMonths, setOpenMonths] = useState(new Set())
  const maxTotal = Math.max(...monthlySpending.map((m) => m.amount), 1)

  function toggle(month) {
    setOpenMonths((prev) => {
      const next = new Set(prev)
      if (next.has(month)) next.delete(month)
      else next.add(month)
      return next
    })
  }

  return (
    <div className="card overflow-hidden mb-6">
      <div className="card-header">
        <div>
          <h3 className="card-title flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            Month by month
          </h3>
          <p className="card-subtitle">Expenses in {selectedYear} · click to expand</p>
        </div>
        <span className="card-subtitle mb-0">{monthlySpending.length} month{monthlySpending.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {monthlySpending.map(({ month, label, amount, byCategory }) => {
          const isOpen = openMonths.has(month)
          const cats = Object.entries(byCategory || {}).sort((a, b) => b[1].amount - a[1].amount)
          const barPct = (amount / maxTotal) * 100

          return (
            <div key={month}>
              <div
                className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-slate-50/80 transition-colors"
                onClick={() => toggle(month)}
              >
                <div className="w-8 flex-shrink-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedYear}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barPct}%`,
                          background: cats.length > 0
                            ? getColor(cats[0][0])
                            : 'rgba(99,102,241,0.6)',
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold num flex-shrink-0 w-20 text-right text-red-600">
                      {fmt(-amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {cats.slice(0, 5).map(([catName]) => (
                      <span
                        key={catName}
                        className="flex items-center gap-1 text-sm px-2 py-0.5 rounded-md"
                        style={{ background: `${getColor(catName)}22`, color: 'var(--text-secondary)' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: getColor(catName) }} />
                        {catName}
                      </span>
                    ))}
                    {cats.length > 5 && (
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>+{cats.length - 5}</span>
                    )}
                  </div>
                </div>
                <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {isOpen
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronRight className="w-3.5 h-3.5" />}
                </span>
              </div>

              {/* Expanded category detail */}
              {isOpen && cats.length > 0 && (
                <div className="mx-4 mb-3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  {cats.map(([catName, { amount: catAmt }]) => {
                    const catPct = amount > 0 ? ((catAmt / amount) * 100).toFixed(0) : 0
                    return (
                      <div key={catName} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 last:border-0">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: getColor(catName) }}
                        />
                        <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{catName}</span>
                        <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{catPct}%</span>
                        <span className="text-base font-mono font-semibold text-red-600 num">{fmt(-catAmt)}</span>
                      </div>
                    )
                  })}
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
          <BarChart3 className="w-4 h-4 text-slate-500" />
          <h3 className="card-title">Year over year</h3>
        </div>
        <p className="card-subtitle mb-0">Total spent &amp; avg per month</p>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {yearlyAverages.map(({ year, totalSpent: spent, avgPerMonth, months }) => {
          const barPct = (spent / maxSpent) * 100
          return (
            <div key={year} className="rounded-lg p-4 bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{year}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{months} month{months !== 1 ? 's' : ''}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barPct}%`, background: 'var(--accent)' }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Total spent</p>
                  <p className="text-sm font-bold num text-red-600">{fmt(spent)}</p>
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
  const yearLabel = selectedYear != null ? String(selectedYear) : 'All years'

  if (!transactions?.length) return null

  return (
    <section className="mt-2">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Where every dollar went</h2>
          <p className="section-desc">
            Expenses by category{selectedYear != null ? ` for ${selectedYear}` : ' (all years)'}
          </p>
        </div>

        {/* Quick stat pills */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-50 border border-red-100">
            <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            <span className="font-semibold num text-red-700">{fmt(totalSpent)}</span>
            <span className="text-red-600/80">spent</span>
          </div>
          {selectedYear != null && monthlySpending.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-sky-50 border border-sky-100">
              <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              <span className="font-semibold num" style={{ color: 'var(--accent)' }}>{fmt(avgMonthlySpending)}</span>
              <span className="opacity-80" style={{ color: 'var(--accent)' }}>avg/mo</span>
            </div>
          )}
        </div>
      </div>

      {/* Year-over-year comparison (all years view) */}
      {selectedYear == null && yearlyAverages.length > 0 && (
        <YearComparison yearlyAverages={yearlyAverages} />
      )}

      {/* Ranked spending categories */}
      {spendingWithAvg.length > 0 ? (
        <div className="card overflow-hidden mb-6">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              Where you spent
            </h3>
            <p className="card-subtitle mb-0">
              {spendingWithAvg.length} categor{spendingWithAvg.length !== 1 ? 'ies' : 'y'} · {yearLabel}
            </p>
          </div>

          {spendingWithAvg.map(({ name, amount, count, monthsWithSpending, avgPerMonth }, idx) => {
            const pct = totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : 0
            const color = getColor(name)
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
                color={color}
              />
            )
          })}
        </div>
      ) : (
        <div className="card px-5 py-10 text-center mb-6">
          <p className="text-slate-500 text-sm">No spending in this period.</p>
        </div>
      )}

      {/* Monthly breakdown (only when a year is selected) */}
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
