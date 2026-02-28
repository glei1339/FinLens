import React from 'react'
import { Sparkles, Trash2, Plus } from 'lucide-react'

export default function RulesPanel({ rules = [], categories = [], onChange }) {
  const hasRules = Array.isArray(rules) && rules.length > 0

  function handleAddRule() {
    const baseCategories = categories.length ? categories : ['Uncategorized']
    const next = [
      ...rules,
      {
        id: crypto.randomUUID(),
        text: '',
        category: baseCategories[0],
      },
    ]
    onChange?.(next)
  }

  function handleUpdateRule(id, patch) {
    const next = rules.map((r) => (r.id === id ? { ...r, ...patch } : r))
    onChange?.(next)
  }

  function handleDeleteRule(id) {
    const next = rules.filter((r) => r.id !== id)
    onChange?.(next)
  }

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h3 className="card-title">Rules</h3>
          </div>
          <p className="mt-1 text-sm card-subtitle">
            e.g. description contains &quot;Uber&quot; → Transportation. Matching transactions use this category.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddRule}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium btn-primary"
        >
          <Plus className="w-3 h-3" />
          Add rule
        </button>
      </div>

      {hasRules ? (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-col gap-2 rounded-xl px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 text-sm sm:w-1/2" style={{ color: 'var(--text-muted)' }}>
                <span className="whitespace-nowrap">If description contains</span>
                <input
                  value={rule.text || ''}
                  onChange={(e) => handleUpdateRule(rule.id, { text: e.target.value })}
                  placeholder="e.g. Uber, Netflix, Payroll"
                  className="flex-1 rounded-lg border px-2 py-1.5 text-sm placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-0"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-card)' }}
                />
              </div>
              <div className="flex items-center gap-2 text-sm sm:w-[220px]" style={{ color: 'var(--text-muted)' }}>
                <span className="whitespace-nowrap">then category</span>
                <select
                  value={rule.category || ''}
                  onChange={(e) => handleUpdateRule(rule.id, { category: e.target.value })}
                  className="flex-1 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-card)' }}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleDeleteRule(rule.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-[var(--danger-light)]" style={{ color: 'var(--text-muted)' }}
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleAddRule}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-elevated)] hover:border-[var(--accent)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <Plus className="w-3 h-3" />
          Add your first rule
        </button>
      )}
    </section>
  )
}

