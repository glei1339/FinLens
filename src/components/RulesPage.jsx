import React from 'react'
import { ArrowLeft } from 'lucide-react'
import RulesPanel from './RulesPanel'

export default function RulesPage({ rules, categories, onChange, onBack }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </button>

      <h1 className="text-2xl font-bold text-white mb-2">Auto-categorization rules</h1>
      <p className="text-slate-500 text-sm mb-4">
        Manage all the rules for this profile in one place. Rules look for words in the description
        and automatically set the category when they match.
      </p>

      <RulesPanel
        rules={rules}
        categories={categories}
        onChange={onChange}
      />
    </div>
  )
}

