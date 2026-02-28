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
  // Include custom categories even with 0 transactions so newly added categories show up
  for (const { name } of customCategories || []) {
    if (name && counts[name] === undefined) {
      counts[name] = 0
      totals[name] = 0
    }
  }

  const cats = Object.entries(counts)
    .sort((a, b) => Math.abs(totals[b[0]]) - Math.abs(totals[a[0]]))

  const customColorMap = Object.fromEntries(
    (customCategories || []).map((c) => [c.name, c.color])
  )

  const getColor = (cat) => customColorMap[cat] || CATEGORY_COLORS[cat] || '#9ca3af'

  return (
    <div className="card p-5 mb-6 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="card-title text-lg">Category</h2>
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
                  className="input-base py-2 text-sm max-w-[180px]"
                  placeholder="New category…"
                />
                <button type="submit" className="text-sm px-3 py-2 rounded-xl btn-primary font-semibold">
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setDraft('') }}
                  className="text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-subtle"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => { setCreating(true); setDraft('') }}
                className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-subtle"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                + New
              </button>
            )
          )}
          {active && (
            <button onClick={() => onChange(null)} className="text-xs font-medium transition-colors hover:opacity-80" style={{ color: 'var(--accent)' }}>
              Clear ×
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onChange(null)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
            !active ? 'text-white border-transparent shadow-sm' : 'hover:bg-[var(--border-subtle)]'
          }`}
          style={!active ? { background: 'var(--accent)' } : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          All · {transactions.length}
        </button>
        {cats.map(([cat, count]) => {
          const color = getColor(cat)
          const isActive = active === cat
          return (
            <button
              key={cat}
              onClick={() => onChange(isActive ? null : cat)}
              title={fmt(totals[cat])}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all border"
              style={
                isActive
                  ? { background: `${color}22`, color, borderColor: `${color}50` }
                  : { background: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }
              }
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              {cat}
              <span className="opacity-70">· {count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
