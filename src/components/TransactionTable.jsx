import React, { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronUp, ChevronDown, Download, Tag, Trash2 } from 'lucide-react'
import { CATEGORY_COLORS } from '../utils/categorizer'

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function CategoryBadge({ category, onChange, categories, getColor }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const buttonRef = useRef(null)
  const color = getColor(category)

  useEffect(() => {
    if (!open || !buttonRef.current) {
      if (!open) setPosition(null)
      return
    }
    const rect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropdownHeight = 240
    const openAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight
    setPosition({
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      left: rect.left,
      openAbove,
    })
  }, [open])

  const dropdownContent = open && position && (
    <>
      <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} aria-hidden />
      <div
        className="fixed z-[101] rounded-xl shadow-finlens-lg py-1.5 min-w-[200px] max-h-60 overflow-y-auto animate-scale-in border"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          left: position.left,
          ...(position.openAbove ? { bottom: position.bottom } : { top: position.top }),
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--border-subtle)] text-left transition-colors"
            style={{ color: getColor(cat) || 'var(--text-primary)' }}
            onClick={() => { onChange(cat); setOpen(false) }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getColor(cat) || '#94a3b8' }} />
            {cat}
          </button>
        ))}
      </div>
    </>
  )

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-90 group"
        style={{ background: `${color}22`, color, border: `1px solid ${color}40` }}
        title="Click to change category"
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {category}
        <Tag className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity -ml-0.5" />
      </button>

      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  )
}

export default function TransactionTable({ transactions, onCategoryChange, onDeleteTransaction, activeCategory, categories, customCategories = [], onAddRuleFromTransaction }) {
  const [search, setSearch]   = useState('')
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage]       = useState(1)
  const [transactionToDelete, setTransactionToDelete] = useState(null)
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
    const headers = ['Date', 'Description', 'Amount', 'Category']
    const rows    = filtered.map((t) => [
      t.date,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.amount,
      t.category,
    ])
    const csv  = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'categorized_transactions.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function SortIcon({ col }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-40" style={{ color: 'var(--text-muted)' }} />
    return sortDir === 'asc'
      ? <ChevronUp   className="w-3 h-3" style={{ color: 'var(--accent)' }} />
      : <ChevronDown className="w-3 h-3" style={{ color: 'var(--accent)' }} />
  }

  const showSubcategory = !!activeCategory && activeCategory !== 'Uncategorized'
  const showUncategorizedRuleCTA = activeCategory === 'Uncategorized' && typeof onAddRuleFromTransaction === 'function'

  const COLS = [
    { key: 'date',        label: 'Date',        cls: 'w-28' },
    { key: 'description', label: 'Description', cls: '' },
    { key: 'category',    label: 'Category',    cls: 'w-40' },
    { key: 'amount',      label: 'Amount',      cls: 'w-32' },
    { key: 'action',      label: '',            cls: 'w-12' },
  ]

  return (
    <div className="card overflow-hidden animate-fade-up p-0">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between px-5 py-4 border-b" style={{ background: 'var(--border-subtle)', borderColor: 'var(--border)' }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search transactions…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="input-base pl-10"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{filtered.length} transactions</span>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl btn-primary"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-[var(--bg-card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--border-subtle)', background: 'var(--border-subtle)' }}>
              {COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={col.key === 'action' ? undefined : () => toggleSort(col.key)}
                  className={`px-5 py-3 text-left text-xs font-medium uppercase tracking-wider ${col.key === 'action' ? '' : 'cursor-pointer select-none transition-colors'} ${col.cls}`}
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    {col.key !== 'action' && <SortIcon col={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
              {paged.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} className="px-6 py-20 text-center text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  No transactions match your filter
                </td>
              </tr>
            ) : (
              paged.map((t, i) => (
                <tr
                  key={t.id}
                  className="group transition-colors hover:bg-[var(--border-subtle)]/60"
                  style={{ borderBottom: '1px solid var(--border-subtle)', animationDelay: `${i * 0.01}s` }}
                >
                  <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{t.date || '—'}</td>
                  <td className="px-5 py-3 max-w-xs">
                    <span className="truncate block text-sm" style={{ color: 'var(--text-primary)' }}>{t.description}</span>
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
                          className="self-start text-xs px-2 py-0.5 rounded border border-dashed transition-colors hover:bg-sky-50"
                          style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
                        >
                          Add rule for this
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-sm num" style={{ color: t.amount >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {t.amount >= 0 ? '+' : ''}{fmt(t.amount)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {onDeleteTransaction && (
                      <button
                        type="button"
                        onClick={() => setTransactionToDelete(t)}
                        className="p-2 rounded-lg transition-colors hover:bg-[var(--danger-light)] hover:text-[var(--danger)]"
              style={{ color: 'var(--text-muted)' }}
                        title="Delete transaction"
                        aria-label="Delete transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal — portaled to body so it's never clipped */}
      {transactionToDelete && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={() => setTransactionToDelete(null)} aria-hidden />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md rounded-2xl p-6 shadow-finlens-lg border bg-[var(--bg-card)] animate-scale-in mx-4" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>Delete transaction?</h3>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{transactionToDelete.description || 'No description'}</span>
            </p>
            <p className="text-sm font-mono num mb-4" style={{ color: 'var(--text-muted)' }}>
              {transactionToDelete.amount >= 0 ? '+' : ''}{fmt(transactionToDelete.amount)} · {transactionToDelete.date || '—'}
            </p>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>This cannot be undone.</p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTransactionToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-[var(--border-subtle)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTransaction(transactionToDelete.id)
                  setTransactionToDelete(null)
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 border-t" style={{ background: 'var(--border-subtle)', borderColor: 'var(--border)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {[
              { label: '←', disabled: page === 1,         action: () => setPage((p) => p - 1) },
              { label: '→', disabled: page === totalPages, action: () => setPage((p) => p + 1) },
            ].map(({ label, disabled, action }) => (
              <button
                key={label}
                disabled={disabled}
                onClick={action}
                className="px-4 py-2 text-sm font-semibold rounded-xl border transition-all disabled:opacity-40 hover:bg-[var(--bg-card)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
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
