import React from 'react'
import { getUniqueYears, getYearFromDate } from '../utils/dateHelpers'

export default function YearFilter({ transactions, activeYear, onChange }) {
  const years = getUniqueYears(transactions)
  if (years.length <= 1) return null

  return (
    <div
      className="rounded-2xl p-4 mb-4 animate-fade-up"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-300">Filter by Year</h2>
        {activeYear != null && (
          <button
            onClick={() => onChange(null)}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Clear filter ×
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onChange(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
            activeYear == null
              ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/25'
              : 'bg-white/5 text-slate-400 border-white/8 hover:border-white/20 hover:text-slate-200'
          }`}
        >
          All years · {transactions.length}
        </button>
        {years.map((year) => {
          const count = transactions.filter((t) => getYearFromDate(t.date) === year).length
          const isActive = activeYear === year
          return (
            <button
              key={year}
              onClick={() => onChange(isActive ? null : year)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
                isActive
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                  : 'bg-white/5 text-slate-400 border-white/8 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              {year} · {count}
            </button>
          )
        })}
      </div>
    </div>
  )
}