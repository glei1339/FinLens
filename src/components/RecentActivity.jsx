import React, { useMemo } from 'react'
import { ArrowRight, TrendingDown } from 'lucide-react'
import { CATEGORY_COLORS } from '../utils/categorizer'

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Math.abs(n))
}

function parseDate(str) {
  if (!str) return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

function relativeDate(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return dateStr || ''
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CategoryDot({ category }) {
  const color = CATEGORY_COLORS[category] || '#9ca3af'
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
      style={{ background: color }}
    />
  )
}

/** Only expenses: amount < 0 and category not in excluded list */
function getExpenses(transactions, excludedCategories = []) {
  const excluded = new Set((excludedCategories || []).map((c) => (c || '').trim()))
  return (transactions || []).filter((t) => {
    if (t.amount >= 0) return false
    const cat = (t.category || 'Uncategorized').trim()
    return !excluded.has(cat)
  })
}

export default function RecentActivity({ transactions, excludedCategories, onViewAll }) {
  const expenses = useMemo(() => getExpenses(transactions, excludedCategories), [transactions, excludedCategories])

  const recent = useMemo(() => {
    if (!expenses.length) return []
    return [...expenses]
      .filter((t) => t.date && t.description)
      .sort((a, b) => {
        const da = parseDate(a.date)
        const db = parseDate(b.date)
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return db - da
      })
      .slice(0, 8)
  }, [expenses])

  if (!recent.length) {
    return (
      <div className="card overflow-hidden h-full flex flex-col">
        <div className="card-header flex-shrink-0 px-6 py-4">
          <h2 className="dashboard-card-title flex items-center gap-2">
            <TrendingDown className="w-5 h-5 shrink-0" style={{ color: 'var(--danger)' }} />
            Recent expenses
          </h2>
          <p className="card-subtitle mt-0.5">Latest spending</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent expenses.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden animate-fade-up h-full flex flex-col min-h-0">
      <div className="card-header flex-shrink-0 px-6 py-4">
        <div>
          <h2 className="dashboard-card-title flex items-center gap-2">
            <TrendingDown className="w-5 h-5 shrink-0" style={{ color: 'var(--danger)' }} />
            Recent expenses
          </h2>
          <p className="card-subtitle mt-0.5">Latest spending</p>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-2 text-sm font-semibold transition-all rounded-xl px-3 py-2 hover:bg-[var(--accent-light)]"
            style={{ color: 'var(--accent)' }}
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="divide-y flex-1 min-h-0 overflow-auto" style={{ borderColor: 'var(--separator)' }}>
        {recent.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-4 px-6 py-3.5 hover:bg-[var(--border-subtle)]/80 transition-colors"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--danger-light)' }}
            >
              <TrendingDown className="w-4 h-4" style={{ color: 'var(--danger)' }} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }} title={t.description}>
                {t.description}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {t.category && <CategoryDot category={t.category} />}
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {t.category || 'Uncategorized'}
                  {t.date && <span> · {relativeDate(t.date)}</span>}
                </p>
              </div>
            </div>
            <p className="text-sm font-semibold num flex-shrink-0 tabular-nums" style={{ color: 'var(--danger)' }}>
              −{fmt(t.amount)}
            </p>
          </div>
        ))}
      </div>

      {onViewAll && (
        <div className="px-6 py-3.5 border-t flex-shrink-0" style={{ borderColor: 'var(--separator)' }}>
          <button
            type="button"
            onClick={onViewAll}
            className="w-full text-sm font-semibold text-center transition-colors rounded-xl py-2.5 hover:bg-[var(--border-subtle)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            View all {expenses.length} expenses →
          </button>
        </div>
      )}
    </div>
  )
}
