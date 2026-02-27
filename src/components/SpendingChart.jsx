import React, { useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { CATEGORY_COLORS } from '../utils/categorizer'

function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n)
}

function buildData(transactions) {
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

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  const color = CATEGORY_COLORS[name] || '#9ca3af'
  return (
    <div className="glass rounded-xl px-4 py-3 text-sm shadow-xl">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <p className="font-semibold text-white">{name}</p>
      </div>
      <p className="text-slate-300 font-mono">{fmt(value)}</p>
    </div>
  )
}

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-4 py-3 text-sm shadow-xl">
      <p className="font-semibold text-white mb-1">{label}</p>
      <p className="text-slate-300 font-mono">{fmt(payload[0].value)}</p>
    </div>
  )
}

export default function SpendingChart({ transactions }) {
  const [view, setView] = useState('pie')
  const data = buildData(transactions)
  if (data.length === 0) return null

  const top = data.slice(0, 8)

  return (
    <div
      className="rounded-2xl p-6 mb-6 animate-fade-up"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-semibold text-white text-base">Spending Breakdown</h2>
          <p className="text-xs text-slate-500 mt-0.5">By category (expenses only)</p>
        </div>
        <div className="flex gap-0.5 p-0.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {['pie', 'bar'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                view === v
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === 'pie' ? (
        <div className="flex flex-col lg:flex-row gap-6 items-center">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={top}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={115}
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

          <div className="flex flex-col gap-2.5 min-w-[200px] w-full lg:w-auto">
            {top.map((d) => {
              const total = top.reduce((s, x) => s + x.value, 0)
              const pct   = ((d.value / total) * 100).toFixed(1)
              const color = CATEGORY_COLORS[d.name] || '#9ca3af'
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs text-slate-300 truncate">{d.name}</span>
                      <span className="text-xs text-slate-400 font-mono ml-2">{pct}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-200 w-20 text-right">{fmt(d.value)}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={top} margin={{ top: 4, right: 8, left: 0, bottom: 64 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-38}
              textAnchor="end"
              interval={0}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              tick={{ fontSize: 11, fill: '#64748b' }}
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
      )}
    </div>
  )
}
