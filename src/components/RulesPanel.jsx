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
    <section
      className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4 sm:px-5 sm:py-5"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-100">Auto-categorization rules</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Create simple rules like &quot;description contains Uber&quot; → &quot;Transportation&quot;.
            New and existing transactions that match will use this category.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddRule}
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200 hover:bg-indigo-500/20 transition-colors"
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
              className="flex flex-col gap-2 rounded-xl bg-slate-900/70 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3"
            >
              <div className="flex items-center gap-2 text-[11px] text-slate-400 sm:w-1/2">
                <span className="whitespace-nowrap">If description contains</span>
                <input
                  value={rule.text || ''}
                  onChange={(e) => handleUpdateRule(rule.id, { text: e.target.value })}
                  placeholder="e.g. Uber, Netflix, Payroll"
                  className="flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 sm:w-[220px]">
                <span className="whitespace-nowrap">then set category to</span>
                <select
                  value={rule.category || ''}
                  onChange={(e) => handleUpdateRule(rule.id, { category: e.target.value })}
                  className="flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-slate-400 hover:text-slate-100 hover:border-indigo-400 hover:bg-indigo-500/10 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add your first rule
        </button>
      )}
    </section>
  )
}

