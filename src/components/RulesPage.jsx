import React from 'react'
import { ArrowLeft } from 'lucide-react'
import RulesPanel from './RulesPanel'

export default function RulesPage({ rules, categories, onChange, onBack }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold mb-6 transition-colors rounded-xl px-3 py-2 -ml-2 hover:bg-[var(--border-subtle)]"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </button>

      <div className="mb-8">
        <h1 className="section-title mb-2">Auto-categorization rules</h1>
        <p className="section-desc">
          Add keyword rules so transactions are auto-categorized. If a transaction description contains the keyword, it gets the category you choose.
        </p>
      </div>

      <RulesPanel
        rules={rules}
        categories={categories}
        onChange={onChange}
      />
    </div>
  )
}

