import React, { useState } from 'react'
import { ArrowLeft, Settings, Key, Sparkles, Eye, EyeOff, RefreshCw, Filter, Sun, Moon } from 'lucide-react'

export default function SettingsPage({
  openaiApiKey,
  onApiKeyChange,
  useAIAnalysis,
  onUseAIAnalysisChange,
  hasTransactions,
  onReanalyze,
  onBack,
  excludedCategories = [],
  onExcludedCategoriesChange,
  categoriesForExcludedUI = [],
  theme = 'light',
  onThemeChange,
}) {
  const [showApiKey, setShowApiKey] = useState(false)
  const canReanalyze = useAIAnalysis && openaiApiKey?.trim() && hasTransactions

  const excludedSet = new Set((excludedCategories || []).map((c) => (c || '').trim()))
  const toggleExcluded = (category) => {
    const cat = (category || '').trim()
    if (!cat || !onExcludedCategoriesChange) return
    const next = excludedSet.has(cat)
      ? (excludedCategories || []).filter((c) => (c || '').trim() !== cat)
      : [...(excludedCategories || []), cat]
    onExcludedCategoriesChange(next)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
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
          <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--border-subtle)' }}>
            <Settings className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </span>
          <h1 className="section-title">Settings</h1>
        </div>
        <p className="section-desc">
          API keys and AI options. Your key is stored only in this browser and never leaves your device.
        </p>
      </div>

      {onThemeChange && (
        <section className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-subtle" style={{ color: 'var(--text-muted)' }}>
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </span>
            <h2 className="card-title text-lg">Appearance</h2>
          </div>
          <p className="text-sm mb-4 card-subtitle">
            Choose light or dark theme for the app.
          </p>
          <div className="flex gap-2 p-1.5 rounded-xl" style={{ background: 'var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => onThemeChange('light')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                theme === 'light' ? 'text-white shadow-sm' : ''
              }`}
              style={theme === 'light' ? { background: 'var(--accent)' } : { color: 'var(--text-secondary)' }}
            >
              <Sun className="w-4 h-4" />
              Light
            </button>
            <button
              type="button"
              onClick={() => onThemeChange('dark')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                theme === 'dark' ? 'text-white shadow-sm' : ''
              }`}
              style={theme === 'dark' ? { background: 'var(--accent)' } : { color: 'var(--text-secondary)' }}
            >
              <Moon className="w-4 h-4" />
              Dark
            </button>
          </div>
        </section>
      )}

      <section className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
            <Sparkles className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </span>
          <h2 className="card-title text-lg">AI (deposits &amp; payments)</h2>
        </div>
        <p className="text-sm mb-5 card-subtitle">
          Add an OpenAI or Claude API key to read PDFs, classify deposits vs payments, and auto-categorize transactions. The key is saved locally.
        </p>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              <Key className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              API key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={openaiApiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="sk-... (OpenAI) or sk-ant-... (Claude)"
                className="input-base pr-12"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors hover:bg-[var(--border-subtle)]"
                style={{ color: 'var(--text-muted)' }}
                title={showApiKey ? 'Hide key' : 'Show key'}
                aria-label={showApiKey ? 'Hide key' : 'Show key'}
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={useAIAnalysis}
              onChange={(e) => onUseAIAnalysisChange(e.target.checked)}
className="rounded-xl w-4 h-4 focus:ring-[var(--accent)] border"
                style={{ borderColor: 'var(--input-border)', color: 'var(--accent)' }}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Use AI to read PDFs, classify deposits vs payments, and auto-categorize when uploading
            </span>
          </label>
        </div>
        <p className="text-xs mt-4 pt-4 border-t font-medium" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
          Progress messages: AI: Reading statement, AI: Classifying, AI: Categorizing. A confirmation banner appears when done.
        </p>
      </section>

      <section className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--danger-light)' }}>
            <Filter className="w-5 h-5" style={{ color: 'var(--danger)' }} />
          </span>
          <h2 className="card-title text-lg">Excluded from expense tracker</h2>
        </div>
        <p className="text-sm mb-4 card-subtitle">
          Check categories to exclude from expense totals and charts (e.g. Transfers). Those transactions stay in your data but are not counted as spending.
        </p>
        {categoriesForExcludedUI.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Upload a CSV to see categories used in your data.</p>
        ) : (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {categoriesForExcludedUI.map((cat) => {
              const isExcluded = excludedSet.has((cat || '').trim())
              return (
                <label
                  key={cat}
                  className="flex items-center gap-2 cursor-pointer py-1.5 rounded-lg hover:bg-[var(--border-subtle)]/60 px-2 -mx-2 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isExcluded}
                    onChange={() => toggleExcluded(cat)}
                    className="rounded w-4 h-4 focus:ring-[var(--accent)] border-[var(--input-border)]"
                    style={{ color: 'var(--accent)' }}
                  />
                  <span className="text-sm font-medium" style={{ color: isExcluded ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {cat}
                    {isExcluded && <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>(excluded)</span>}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </section>

      {canReanalyze && (
        <section className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
              <RefreshCw className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </span>
            <h2 className="card-title text-lg">Re-analyze with AI</h2>
          </div>
          <p className="text-sm mb-5 card-subtitle">
            Re-classify deposits vs payments and re-categorize existing transactions without re-uploading.
          </p>
          <button
            type="button"
            onClick={onReanalyze}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold btn-primary"
          >
            <RefreshCw className="w-4 h-4" />
            Re-analyze with AI
          </button>
        </section>
      )}
    </div>
  )
}
