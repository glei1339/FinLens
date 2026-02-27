import React, { useState } from 'react'
import { CATEGORY_COLORS } from '../utils/categorizer'

function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(Math.abs(n))
}

export default function CategoryFilter({ transactions, active, onChange, customCategories = [], onAddCategory }) {
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')
  const counts = {}
  const totals = {}
  for (const t of transactions) {
    const c = t.category || 'Uncategorized'
    counts[c] = (counts[c] || 0) + 1
    totals[c] = (totals[c] || 0) + t.amount
  }

  const cats = Object.entries(counts)
    .sort((a, b) => Math.abs(totals[b[0]]) - Math.abs(totals[a[0]]))

  const customColorMap = Object.fromEntries(
    (customCategories || []).map((c) => [c.name, c.color])
  )

  const getColor = (cat) => customColorMap[cat] || CATEGORY_COLORS[cat] || '#9ca3af'

  return (
    <div
      className="rounded-2xl p-4 mb-4 animate-fade-up"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-300">Filter by Category</h2>
        <div className="flex items-center gap-2">
          {onAddCategory && (
            creating ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const name = draft.trim()
                  if (name) onAddCategory(name)
                  setDraft('')
                  setCreating(false)
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-slate-900/70 border border-white/15 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[160px]"
                  placeholder="New category…"
                />
                <button
                  type="submit"
                  className="text-[11px] px-2 py-1 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setDraft('') }}
                  className="text-[11px] px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => { setCreating(true); setDraft('') }}
                className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
              >
                + New
              </button>
            )
          )}
          {active && (
            <button onClick={() => onChange(null)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Clear filter ×
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onChange(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
            !active
              ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/25'
              : 'bg-white/5 text-slate-400 border-white/8 hover:border-white/20 hover:text-slate-200'
          }`}
        >
          All · {transactions.length}
        </button>

        {cats.map(([cat, count]) => {
          const color   = getColor(cat)
          const isActive = active === cat
          return (
            <button
              key={cat}
              onClick={() => onChange(isActive ? null : cat)}
              title={fmt(totals[cat])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border"
              style={
                isActive
                  ? { background: `${color}30`, color, borderColor: `${color}60`, boxShadow: `0 0 16px ${color}20` }
                  : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.08)' }
              }
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = color; e.currentTarget.style.borderColor = `${color}40` }}}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              {cat}
              <span className="opacity-60">· {count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
