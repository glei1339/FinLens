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
  onSubcategoryChange,
  allCategories,
  customCategories,
  onAddRuleFromTransaction,
  onBack,
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </button>

      <div className="flex items-center gap-2 mb-2">
        <ListFilter className="w-5 h-5 text-indigo-400" />
        <h1 className="text-2xl font-bold text-white">Filter & categorize</h1>
      </div>
      <p className="text-slate-500 text-sm mb-6">
        Filter by year at the top, then by month and category here. Edit categories and subcategories in the table.
      </p>

      {months?.length > 0 && (
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300">Filter by month</h2>
            {activeMonth != null && (
              <button
                type="button"
                onClick={() => onMonthChange(null)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/60'
                      : 'bg-white/5 text-slate-400 border-white/8 hover:border-white/20 hover:text-slate-200'
                  }`}
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
        onSubcategoryChange={onSubcategoryChange}
        activeCategory={activeCategory}
        categories={allCategories}
        customCategories={customCategories}
        onAddRuleFromTransaction={onAddRuleFromTransaction}
      />
    </div>
  )
}
