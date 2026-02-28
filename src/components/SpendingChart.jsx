import React, { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts'
import { CATEGORY_COLORS } from '../utils/categorizer'
import { getYearMonthFromDate, getYearFromDate, getUniqueYears } from '../utils/dateHelpers'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n)
}

function buildCategoryData(transactions) {
  const map = {}
  for (const t of transactions) {
    if (t.amount >= 0) continue
    const cat = t.category || 'Uncategorized'
    map[cat] = (map[cat] || 0) + Math.abs(t.amount)
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

function buildMonthlyData(transactions, activeYear) {
  const years = getUniqueYears(transactions)
  if (activeYear != null) {
    // Single year: by month
    const byMonth = {}
    for (const t of transactions) {
      if (t.amount >= 0) continue
      const ym = getYearMonthFromDate(t.date)
      if (!ym || ym.year !== activeYear) continue
      const m = ym.month
      byMonth[m] = (byMonth[m] || 0) + Math.abs(t.amount)
    }
    return Object.entries(byMonth)
      .map(([m, value]) => ({
        label: MONTH_LABELS[Number(m) - 1] || `M${m}`,
        value: Math.round(value * 100) / 100,
      }))
      .sort((a, b) => MONTH_LABELS.indexOf(a.label) - MONTH_LABELS.indexOf(b.label))
  } else {
    // All years: by year
    const byYear = {}
    for (const t of transactions) {
      if (t.amount >= 0) continue
      const y = getYearFromDate(t.date)
      if (!y) continue
      byYear[y] = (byYear[y] || 0) + Math.abs(t.amount)
    }
    return Object.entries(byYear)
      .map(([y, value]) => ({ label: String(y), value: Math.round(value * 100) / 100 }))
      .sort((a, b) => Number(a.label) - Number(b.label))
  }
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  const color = CATEGORY_COLORS[name] || '#94a3b8'
  return (
    <div className="rounded-xl px-4 py-3 text-sm shadow-finlens border bg-[var(--bg-card)]" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</p>
      </div>
      <p className="font-mono num" style={{ color: 'var(--text-secondary)' }}>{fmt(value)}</p>
    </div>
  )
}

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 text-sm shadow-finlens border bg-[var(--bg-card)]" style={{ borderColor: 'var(--border)' }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
      <p className="font-mono num font-bold" style={{ color: 'var(--danger)' }}>{fmt(payload[0].value)}</p>
    </div>
  )
}

// Custom center label for pie chart
function PieCenterLabel({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} y={cy - 8} fontSize="11" fill="#94a3b8" fontWeight="500" letterSpacing="0.08em">
        TOTAL
      </tspan>
      <tspan x={cx} y={cy + 12} fontSize="16" fill="#0f172a" fontWeight="700">
        {fmt(total)}
      </tspan>
    </text>
  )
}

export default function SpendingChart({ transactions, activeYear }) {
  const [view, setView] = useState('trend')
  const categoryData = useMemo(() => buildCategoryData(transactions), [transactions])
  const monthlyData  = useMemo(() => buildMonthlyData(transactions, activeYear ?? null), [transactions, activeYear])

  if (categoryData.length === 0 && monthlyData.length === 0) return null

  const top   = categoryData.slice(0, 8)
  const total = top.reduce((s, d) => s + d.value, 0)
  const trendMax = monthlyData.reduce((m, d) => Math.max(m, d.value), 0)

  const tabs = [
    { id: 'trend', label: activeYear != null ? 'Monthly' : 'By Year' },
    { id: 'pie',   label: 'Categories' },
    { id: 'bar',   label: 'Bar' },
  ]

  return (
    <div className="card p-6 animate-fade-up h-full flex flex-col min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 flex-shrink-0">
        <div>
          <h2 className="card-title text-lg">Spending overview</h2>
          <p className="card-subtitle mt-0.5">
            {view === 'trend'
              ? activeYear != null
                ? `Month-by-month expenses in ${activeYear}`
                : 'Expenses by year'
              : 'Expenses by category'}
          </p>
        </div>
        <div className="flex gap-1 p-1.5 rounded-xl" style={{ background: 'var(--border-subtle)' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                view === t.id
                  ? 'text-white shadow-sm'
                  : 'hover:opacity-90'
              }`}
              style={view === t.id ? { background: 'var(--accent)' } : { color: 'var(--text-secondary)' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart content (flex-1 for equal height with Recent Activity) ── */}
      <div className="flex-1 min-h-0 flex flex-col">
      {/* ── Trend view ─────────────────────────────────────────── */}
      {view === 'trend' && (
        <div className="flex-1 min-h-0 flex flex-col">
          {monthlyData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              No expense data available
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.04" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                    tick={{ fontSize: 12, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeOpacity: 0.35 }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    fill="url(#trendGradient)"
                    dot={{ fill: 'var(--accent)', strokeWidth: 0, r: 3.5 }}
                    activeDot={{ fill: 'var(--accent-hover)', strokeWidth: 0, r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              {/* Quick stats row — min-height so Total / Average / Peak always show fully */}
              <div className="grid grid-cols-3 gap-3 mt-4 min-h-[88px] flex-shrink-0">
                {[
                  { label: 'Total', value: fmt(monthlyData.reduce((s, d) => s + d.value, 0)) },
                  { label: 'Average', value: fmt(monthlyData.reduce((s, d) => s + d.value, 0) / monthlyData.length) },
                  {
                    label: 'Peak',
                    value: fmt(trendMax),
                    sub: monthlyData.find((d) => d.value === trendMax)?.label,
                  },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="rounded-xl px-4 py-4 text-center flex flex-col justify-center" style={{ background: 'var(--border-subtle)', border: '1px solid var(--border)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className="text-base font-bold num" style={{ color: 'var(--text-primary)' }}>{value}</p>
                    {sub && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Pie view ─────────────────────────────────────────── */}
      {view === 'pie' && (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 items-center">
          <div className="relative" style={{ width: '100%', maxWidth: 280, height: 260 }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={top}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {top.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={CATEGORY_COLORS[entry.name] || '#9ca3af'}
                      strokeWidth={0}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label overlay */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Total</p>
              <p className="text-xl font-bold font-mono num" style={{ color: 'var(--text-primary)' }}>{fmt(total)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 min-w-[200px] w-full lg:w-auto flex-1">
            {top.map((d) => {
              const pct   = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0
              const color = CATEGORY_COLORS[d.name] || '#9ca3af'
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{d.name}</span>
                      <span className="text-sm font-mono ml-2" style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-mono font-semibold w-20 text-right num" style={{ color: 'var(--text-primary)' }}>{fmt(d.value)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Bar view ─────────────────────────────────────────── */}
      {view === 'bar' && (
        <div className="flex-1 min-h-0 flex items-start">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={top} margin={{ top: 4, right: 8, left: 0, bottom: 64 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#475569' }}
              angle={-38}
              textAnchor="end"
              interval={0}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              tick={{ fontSize: 12, fill: '#475569' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {top.map((entry) => (
                <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#9ca3af'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      )}
      </div>
    </div>
  )
}
