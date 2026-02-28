import React from 'react'
import { ArrowLeft, ListFilter } from 'lucide-react'
import CategoryFilter from './CategoryFilter'
import TransactionTable from './TransactionTable'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function TransactionsPage({
  transactions,
  months,
  activeMonth,
  activeCategory,
  onMonthChange,
  onCategoryFilterChange,
  onAddCategory,
  onTransactionCategoryChange,
  onDeleteTransaction,
  allCategories,
  customCategories,
  onAddRuleFromTransaction,
  onBack,
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold mb-6 transition-colors rounded-xl px-3 py-2 -ml-2 hover:bg-[var(--border-subtle)]"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </button>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
            <ListFilter className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </span>
          <h1 className="section-title">All expenses</h1>
        </div>
        <p className="section-desc">
          All your expenses in one list. Filter by year, month, or category. Click a category badge to change it.
        </p>
      </div>

      {months?.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="card-title">Month</h2>
            {activeMonth != null && (
              <button
                type="button"
                onClick={() => onMonthChange(null)}
                className="text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: 'var(--accent)' }}
              >
                All months
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {months.map((m) => {
              const label = MONTH_LABELS[m - 1] || `M${m}`
              const isActive = activeMonth === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onMonthChange(isActive ? null : m)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    isActive ? 'text-white border-transparent' : 'hover:bg-subtle'
                  }`}
                  style={isActive ? { background: 'var(--accent)' } : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <CategoryFilter
        transactions={transactions}
        active={activeCategory}
        onChange={onCategoryFilterChange}
        customCategories={customCategories}
        onAddCategory={onAddCategory}
      />
      <TransactionTable
        transactions={transactions}
        onCategoryChange={onTransactionCategoryChange}
        onDeleteTransaction={onDeleteTransaction}
        activeCategory={activeCategory}
        categories={allCategories}
        customCategories={customCategories}
        onAddRuleFromTransaction={onAddRuleFromTransaction}
      />
    </div>
  )
}
