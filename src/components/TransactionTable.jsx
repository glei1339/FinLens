import React, { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown, Download, Tag } from 'lucide-react'
import { CATEGORY_COLORS } from '../utils/categorizer'

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function SubcategoryCell({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  function commit() {
    const next = draft.trim()
    onChange(next)
    setEditing(false)
  }

  return (
    <div className="min-w-[120px]">
      {editing ? (
        <input
          className="w-full px-2 py-1 rounded-lg bg-slate-900/60 border border-white/10 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setDraft(value || ''); setEditing(false) }
          }}
          placeholder="Add subcategory…"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-dashed border-white/10 transition-colors max-w-[160px] truncate"
          title={value || 'Click to add a subcategory'}
        >
          {value || 'Add subcategory'}
        </button>
      )}
    </div>
  )
}

function CategoryBadge({ category, onChange, categories, getColor }) {
  const [open, setOpen] = useState(false)
  const color = getColor(category)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-90 hover:scale-[1.02] group"
        style={{ background: `${color}20`, color, border: `1px solid ${color}35` }}
        title="Click to change category"
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {category}
        <Tag className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity -ml-0.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 left-0 top-full mt-1.5 rounded-xl shadow-2xl py-1 min-w-[200px] max-h-60 overflow-y-auto animate-scale-in"
            style={{ background: '#1e1f2e', border: '1px solid rgba(255,255,255,0.1)' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-white/5 text-left transition-colors"
                style={{ color: getColor(cat) || '#94a3b8' }}
                onClick={() => { onChange(cat); setOpen(false) }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: getColor(cat) || '#9ca3af' }} />
                {cat}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function TransactionTable({ transactions, onCategoryChange, onSubcategoryChange, activeCategory, categories, customCategories = [], onAddRuleFromTransaction }) {
  const [search, setSearch]   = useState('')
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage]       = useState(1)
  const PAGE_SIZE = 50

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  const filtered = useMemo(() => {
    let rows = transactions
    if (activeCategory) rows = rows.filter((t) => t.category === activeCategory)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((t) =>
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.institution?.toLowerCase().includes(q) ||
        t.date?.includes(q)
      )
    }
    return [...rows].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (sortKey === 'amount') { av = parseFloat(av); bv = parseFloat(bv) }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [transactions, activeCategory, search, sortKey, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const customColorMap = useMemo(
    () => Object.fromEntries((customCategories || []).map((c) => [c.name, c.color])),
    [customCategories]
  )

  const getColor = (cat) => customColorMap[cat] || CATEGORY_COLORS[cat] || '#9ca3af'

  function exportCSV() {
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Subcategory', 'Institution']
    const rows    = filtered.map((t) => [
      t.date,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.amount,
      t.category,
      t.subcategory || '',
      t.institution || '',
    ])
    const csv  = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'categorized_transactions.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function SortIcon({ col }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20" />
    return sortDir === 'asc'
      ? <ChevronUp   className="w-3 h-3 text-indigo-400" />
      : <ChevronDown className="w-3 h-3 text-indigo-400" />
  }

  const showSubcategory = !!activeCategory && activeCategory !== 'Uncategorized'
  const showUncategorizedRuleCTA = activeCategory === 'Uncategorized' && typeof onAddRuleFromTransaction === 'function'

  const COLS = [
    { key: 'date',        label: 'Date',        cls: 'w-28' },
    { key: 'description', label: 'Description', cls: '' },
    { key: 'institution', label: 'Institution', cls: 'w-40' },
    { key: 'category',    label: 'Category',    cls: 'w-40' },
    ...(showSubcategory ? [{ key: 'subcategory', label: 'Subcategory', cls: 'w-48' }] : []),
    { key: 'amount',      label: 'Amount',      cls: 'w-32' },
  ]

  return (
    <div className="rounded-2xl overflow-hidden animate-fade-up" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Toolbar */}
      <div
        className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between px-5 py-4"
        style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search transactions…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{filtered.length} transactions</span>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-all duration-200 hover:bg-indigo-500/20 hover:text-indigo-300"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ background: 'rgba(15,16,26,0.8)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-300 transition-colors ${col.cls}`}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    <SortIcon col={col.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} className="px-5 py-16 text-center text-slate-600 text-sm">
                  No transactions match your filter
                </td>
              </tr>
            ) : (
              paged.map((t, i) => (
                <tr
                  key={t.id}
                  className="group transition-colors"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    animationDelay: `${i * 0.01}s`,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="px-5 py-3 text-slate-500 text-xs font-mono">{t.date || '—'}</td>
                  <td className="px-5 py-3 text-slate-300 max-w-xs">
                    <span className="truncate block text-sm">{t.description}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    {t.institution || '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1.5">
                      <CategoryBadge
                        category={t.category || 'Uncategorized'}
                        onChange={(cat) => onCategoryChange(t.id, cat)}
                        categories={categories}
                        getColor={getColor}
                      />
                      {showUncategorizedRuleCTA && (!t.category || t.category === 'Uncategorized') && (
                        <button
                          type="button"
                          onClick={() => onAddRuleFromTransaction(t)}
                          className="self-start text-[11px] px-2 py-0.5 rounded-md text-indigo-300 hover:text-indigo-100 hover:bg-indigo-500/20 border border-dashed border-indigo-400/60 transition-colors"
                        >
                          Add rule for this
                        </button>
                      )}
                    </div>
                  </td>
                  {showSubcategory && (
                    <td className="px-5 py-3">
                      <SubcategoryCell
                        value={t.subcategory || ''}
                        onChange={(sub) => onSubcategoryChange && onSubcategoryChange(t.id, sub)}
                      />
                    </td>
                  )}
                  <td className={`px-5 py-3 text-right font-mono font-semibold text-sm ${
                    t.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {t.amount >= 0 ? '+' : ''}{fmt(t.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
        >
          <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            {[
              { label: '←', disabled: page === 1,         action: () => setPage((p) => p - 1) },
              { label: '→', disabled: page === totalPages, action: () => setPage((p) => p + 1) },
            ].map(({ label, disabled, action }) => (
              <button
                key={label}
                disabled={disabled}
                onClick={action}
                className="px-3 py-1.5 text-xs rounded-lg transition-all disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
