import React from 'react'
import { getUniqueYears, getYearFromDate } from '../utils/dateHelpers'
import { Calendar } from 'lucide-react'

export default function YearFilter({ transactions, activeYear, onChange, compact }) {
  const years = getUniqueYears(transactions)
  if (years.length <= 1) return null

  const pills = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onChange(null)}
        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
          activeYear == null
            ? 'text-white border-transparent shadow-sm'
            : 'hover:bg-[var(--border-subtle)]'
        }`}
        style={activeYear == null ? { background: 'var(--accent)' } : { borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      >
        All years{!compact && ` · ${transactions.length}`}
      </button>
      {years.map((year) => {
        const count = transactions.filter((t) => getYearFromDate(t.date) === year).length
        const isActive = activeYear === year
        return (
          <button
            key={year}
            onClick={() => onChange(isActive ? null : year)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
              isActive
                ? 'border-transparent text-white shadow-sm'
                : 'hover:bg-[var(--border-subtle)]'
            }`}
            style={
              isActive
                ? { background: 'var(--accent)' }
                : { borderColor: 'var(--border)', color: 'var(--text-primary)' }
            }
          >
            {year}{!compact && ` · ${count}`}
          </button>
        )
      })}
    </div>
  )

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <span className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
            <Calendar className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </span>
          Year
        </span>
        {pills}
      </div>
    )
  }

  return (
    <div className="card p-5 mb-6 animate-fade-up">
      <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Filter by year</h2>
      {pills}
    </div>
  )
}
