import React, { useState, useCallback, useEffect } from 'react'
import { Upload, Sparkles, FileText, AlertTriangle, X } from 'lucide-react'
import UploadZone from './components/UploadZone'
import SummaryCards from './components/SummaryCards'
import SpendingChart from './components/SpendingChart'
import CategoryFilter from './components/CategoryFilter'
import YearFilter from './components/YearFilter'
import TransactionTable from './components/TransactionTable'
import SpendingBreakdownPage from './components/SpendingBreakdownPage'
import FilesPage from './components/FilesPage'
import RulesPage from './components/RulesPage'
import { getYearFromDate } from './utils/dateHelpers'
import ProfileBar from './components/ProfileBar'
import { parseCSV } from './utils/csvParser'
import { parsePDF } from './utils/pdfParser'
import { categorizeAll, needsSignFlip, CATEGORIES, CATEGORY_COLORS } from './utils/categorizer'

const PROFILE_COLORS = [
  '#6366f1', '#22c55e', '#f97316', '#ec4899',
  '#14b8a6', '#f59e0b', '#8b5cf6', '#3b82f6',
]

function applyUserRules(transactions, rules) {
  if (!Array.isArray(transactions) || !transactions.length) return transactions
  if (!Array.isArray(rules) || !rules.length) return transactions

  const normalized = rules
    .map((r) => ({
      ...r,
      text: (r.text || '').toLowerCase().trim(),
    }))
    .filter((r) => r.text && r.category)

  if (!normalized.length) return transactions

  return transactions.map((t) => {
    const desc = (t.description || '').toLowerCase()
    for (const r of normalized) {
      if (desc.includes(r.text)) {
        return { ...t, category: r.category }
      }
    }
    return t
  })
}

function newProfile(name, colorIdx = 0) {
  return {
    id: crypto.randomUUID(),
    name,
    color: PROFILE_COLORS[colorIdx % PROFILE_COLORS.length],
    transactions: null,
    fileNames: [],
    isPdf: false,
    customCategories: [],
    fileFolders: {},
    folders: [],
    rules: [],
  }
}

function initProfiles() {
  try {
    const raw = localStorage.getItem('finlens-profiles')
    if (raw) {
      const saved = JSON.parse(raw)
      if (Array.isArray(saved) && saved.length > 0) return saved
    }
  } catch {}
  return [newProfile('Personal', 0)]
}

function initActiveId(profiles) {
  const saved = localStorage.getItem('finlens-active-id')
  return (saved && profiles.some(p => p.id === saved)) ? saved : profiles[0].id
}

export default function App() {
  const [profiles,       setProfiles]       = useState(initProfiles)
  const [activeId,       setActiveId]       = useState(() => initActiveId(profiles))
  const [loading,        setLoading]        = useState(false)
  const [loadingFile,    setLoadingFile]    = useState('')
  const [error,          setError]          = useState(null)
  const [activeCategory, setActiveCategory]   = useState(null)
  const [activeYear,     setActiveYear]       = useState(null)
  const [view,           setView]             = useState('dashboard') // 'dashboard' | 'breakdown' | 'files' | 'rules'
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [ruleModalOpen,   setRuleModalOpen]   = useState(false)
  const [ruleModalDraft,  setRuleModalDraft]  = useState(null)

  const active = profiles.find(p => p.id === activeId) || profiles[0]
  const {
    transactions,
    fileNames,
    isPdf,
    customCategories = [],
    fileFolders = {},
    folders = [],
    rules = [],
  } = active

  const allCategories = React.useMemo(
    () => [...CATEGORIES, ...customCategories.map((c) => c.name)],
    [customCategories]
  )

  const filteredByYear = !transactions
    ? null
    : activeYear == null
      ? transactions
      : transactions.filter((t) => getYearFromDate(t.date) === activeYear)

  // Persist profiles (including transactions) to localStorage
  useEffect(() => {
    localStorage.setItem('finlens-profiles', JSON.stringify(profiles))
  }, [profiles])

  useEffect(() => {
    localStorage.setItem('finlens-active-id', activeId)
  }, [activeId])

  // ── Profile management ──────────────────────────────────────────────────────

  const handleCreateProfile = (name) => {
    const p = newProfile(name, profiles.length)
    setProfiles(prev => [...prev, p])
    setActiveId(p.id)
    setActiveCategory(null)
    setActiveYear(null)
    setError(null)
  }

  const handleSwitchProfile = (id) => {
    setActiveId(id)
    setActiveCategory(null)
    setActiveYear(null)
    setError(null)
  }

  const handleDeleteProfile = (id) => {
    setProfiles(prev => {
      const next = prev.filter(p => p.id !== id)
      if (id === activeId && next.length > 0) setActiveId(next[0].id)
      return next
    })
  }

  const handleAddCategory = useCallback((rawName) => {
    const input = rawName ?? ''
    const name = input.trim()
    if (!name) return
    setProfiles(prev => prev.map(p => {
      if (p.id !== activeId) return p
      const existingCustom = p.customCategories || []
      if (CATEGORIES.includes(name) || existingCustom.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        return p
      }
      const baseColors = Object.values(CATEGORY_COLORS)
      const color = baseColors[existingCustom.length % baseColors.length] || '#6366f1'
      return {
        ...p,
        customCategories: [...existingCustom, { name, color }],
      }
    }))
  }, [activeId])

  // ── File upload ─────────────────────────────────────────────────────────────

  const handleFiles = useCallback(async (files) => {
    setLoading(true)
    setError(null)
    setActiveCategory(null)

    const names   = files.map(f => f.name)
    const hasPdf  = files.some(f => /\.pdf$/i.test(f.name))
    const parseErrors = []
    let idOffset = 0
    const allTxs = []

    for (const file of files) {
      setLoadingFile(file.name)
      try {
        const isPdfFile = /\.pdf$/i.test(file.name)
        let parsed = isPdfFile ? await parsePDF(file) : await parseCSV(file)
        if (needsSignFlip(parsed)) parsed = parsed.map(t => ({ ...t, amount: -t.amount }))
        parsed.forEach((t, i) => allTxs.push({ ...t, id: idOffset + i, source: file.name }))
        idOffset += parsed.length
      } catch (err) {
        parseErrors.push(`${file.name}: ${err.message}`)
      }
    }

    setLoadingFile('')
    if (parseErrors.length) setError(parseErrors.join('\n'))

    setProfiles(prev => prev.map(p => {
      if (p.id !== activeId) return p
      const base = allTxs.length ? categorizeAll(allTxs) : null
      const withRules = base ? applyUserRules(base, p.rules || []) : null
      return {
        ...p,
        transactions: withRules,
        fileNames: names,
        isPdf: hasPdf,
      }
    }))

    setLoading(false)
  }, [activeId])

  const handleAddFiles = useCallback(async (files) => {
    setUploadModalOpen(false)
    setLoading(true)
    setError(null)
    setActiveCategory(null)

    const names = files.map(f => f.name)
    const hasPdf = files.some(f => /\.pdf$/i.test(f.name))
    const parseErrors = []
    const existing = active?.transactions || []
    let idOffset = existing.length
    const newTxs = []

    for (const file of files) {
      setLoadingFile(file.name)
      try {
        const isPdfFile = /\.pdf$/i.test(file.name)
        let parsed = isPdfFile ? await parsePDF(file) : await parseCSV(file)
        if (needsSignFlip(parsed)) parsed = parsed.map(t => ({ ...t, amount: -t.amount }))
        parsed.forEach((t, i) => newTxs.push({ ...t, id: idOffset + i, source: file.name }))
        idOffset += parsed.length
      } catch (err) {
        parseErrors.push(`${file.name}: ${err.message}`)
      }
    }

    setLoadingFile('')
    if (parseErrors.length) setError(parseErrors.join('\n'))

    const allTxs = existing.length || !newTxs.length ? [...existing, ...newTxs] : newTxs
    const base = categorizeAll(allTxs)
    const allNames = [...(active?.fileNames || []), ...names]

    setProfiles(prev => prev.map(p => {
      if (p.id !== activeId) return p
      const withRules = base ? applyUserRules(base, p.rules || []) : null
      return {
        ...p,
        transactions: withRules && withRules.length ? withRules : null,
        fileNames: allNames,
        isPdf: (p.isPdf || hasPdf),
      }
    }))

    setLoading(false)
  }, [activeId, active])

  const handleRulesChange = useCallback((nextRules) => {
    setProfiles(prev => prev.map(p => {
      if (p.id !== activeId) return p
      const currentTx = p.transactions || null
      const updatedTx = currentTx ? applyUserRules(currentTx, nextRules) : null
      return {
        ...p,
        rules: nextRules,
        transactions: updatedTx,
      }
    }))
  }, [activeId])

  const handleAddRuleFromTransaction = useCallback((tx) => {
    if (!tx) return
    const defaultCategory =
      (tx.category && tx.category !== 'Uncategorized')
        ? tx.category
        : (allCategories[0] || 'Uncategorized')

    setRuleModalDraft({
      text: (tx.description || '').trim(),
      category: defaultCategory,
    })
    setRuleModalOpen(true)
  }, [allCategories])

  const handleConfirmRuleFromModal = useCallback(() => {
    if (!ruleModalDraft) {
      setRuleModalOpen(false)
      return
    }
    const text = (ruleModalDraft.text || '').trim()
    const category = ruleModalDraft.category
    if (!text || !category) {
      setRuleModalOpen(false)
      setRuleModalDraft(null)
      return
    }

    setProfiles(prev => prev.map(p => {
      if (p.id !== activeId) return p
      const existingRules = p.rules || []
      const nextRules = [
        ...existingRules,
        {
          id: crypto.randomUUID(),
          text,
          category,
        },
      ]
      const updatedTx = p.transactions ? applyUserRules(p.transactions, nextRules) : null
      return {
        ...p,
        rules: nextRules,
        transactions: updatedTx,
      }
    }))
    setRuleModalOpen(false)
    setRuleModalDraft(null)
  }, [activeId, ruleModalDraft, setProfiles])

  const handleCancelRuleModal = useCallback(() => {
    setRuleModalOpen(false)
    setRuleModalDraft(null)
  }, [])

  const handleCategoryChange = useCallback((id, newCat) => {
    setProfiles(prev => prev.map(p =>
      p.id === activeId
        ? { ...p, transactions: p.transactions?.map(t => t.id === id ? { ...t, category: newCat } : t) }
        : p
    ))
  }, [activeId])

  const handleSubcategoryChange = useCallback((id, sub) => {
    setProfiles(prev => prev.map(p =>
      p.id === activeId
        ? { ...p, transactions: p.transactions?.map(t => t.id === id ? { ...t, subcategory: sub } : t) }
        : p
    ))
  }, [activeId])

  const handleReset = () => {
    setProfiles(prev => prev.map(p => p.id === activeId
      ? { ...p, transactions: null, fileNames: [], isPdf: false, fileFolders: {}, folders: [] }
      : p
    ))
    setError(null)
    setActiveCategory(null)
    setActiveYear(null)
  }

  const handleRemoveFile = useCallback((fileName) => {
    setProfiles(prev => prev.map(p => {
      if (p.id !== activeId || !p.transactions) return p
      const nextTxs = p.transactions
        .filter(t => t.source !== fileName)
        .map((t, i) => ({ ...t, id: i }))
      const nextNames = (p.fileNames || []).filter(n => n !== fileName)
      const nextIsPdf = nextNames.some(n => /\.pdf$/i.test(n))
      const { [fileName]: _removed, ...restFolders } = p.fileFolders || {}
      return {
        ...p,
        transactions: nextTxs.length ? nextTxs : null,
        fileNames: nextNames,
        isPdf: nextIsPdf,
        fileFolders: restFolders,
      }
    }))
    setActiveCategory(null)
  }, [activeId])

  const handleFileFolderChange = useCallback((fileName, folder) => {
    const clean = folder.trim()
    setProfiles(prev => prev.map(p => {
      if (p.id !== activeId) return p
      const current = p.fileFolders || {}
      const next = { ...current }
      const list = p.folders || []
      let newFolders = list
      if (!clean) {
        delete next[fileName]
      } else {
        next[fileName] = clean
        if (!list.includes(clean)) newFolders = [...list, clean]
      }
      return { ...p, fileFolders: next, folders: newFolders }
    }))
  }, [activeId])

  const handleCreateFolder = useCallback((rawName) => {
    setProfiles(prev => prev.map(p => {
      if (p.id !== activeId) return p
      const list = p.folders || []
      const existing = new Set(list)
      let name = (rawName || '').trim()

      // If no name was provided, fall back to an automatic label
      if (!name) {
        const base = 'Folder '
        let idx = list.length + 1
        name = `${base}${idx}`
        while (existing.has(name)) {
          idx += 1
          name = `${base}${idx}`
        }
      } else if (existing.has(name)) {
        // If the name already exists, make a unique variant like "Taxes (2)"
        let suffix = 2
        let candidate = `${name} (${suffix})`
        while (existing.has(candidate)) {
          suffix += 1
          candidate = `${name} (${suffix})`
        }
        name = candidate
      }

      return { ...p, folders: [...list, name] }
    }))
  }, [activeId])

  const handleDeleteFolder = useCallback((folderName) => {
    setProfiles(prev => prev.map(p => {
      if (p.id !== activeId) return p
      const list = (p.folders || []).filter((f) => f !== folderName)
      const current = p.fileFolders || {}
      const next = { ...current }
      Object.keys(next).forEach((file) => {
        if (next[file] === folderName) delete next[file]
      })
      return { ...p, folders: list, fileFolders: next }
    }))
  }, [activeId])

  const handleRenameFolder = useCallback((oldName, newNameRaw) => {
    const clean = (newNameRaw || '').trim()
    if (!clean || clean === oldName) return
    setProfiles(prev => prev.map(p => {
      if (p.id !== activeId) return p
      const list = p.folders || []
      const currentNames = new Set(list)
      let finalName = clean
      if (currentNames.has(clean) && clean !== oldName) {
        let suffix = 2
        let candidate = `${clean} (${suffix})`
        while (currentNames.has(candidate)) {
          suffix += 1
          candidate = `${clean} (${suffix})`
        }
        finalName = candidate
      }
      const updatedFolders = list.map((f) => (f === oldName ? finalName : f))
      const current = p.fileFolders || {}
      const nextFileFolders = { ...current }
      Object.keys(nextFileFolders).forEach((file) => {
        if (nextFileFolders[file] === oldName) {
          nextFileFolders[file] = finalName
        }
      })
      return { ...p, folders: updatedFolders, fileFolders: nextFileFolders }
    }))
  }, [activeId])

  // ── Loading spinner ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-[3px] border-indigo-500/20 rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-[3px] border-t-indigo-500 rounded-full animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-lg">Parsing transactions…</p>
          {loadingFile ? (
            <p className="text-slate-500 text-sm mt-1 max-w-xs truncate">
              Processing <span className="text-slate-400">{loadingFile}</span>
            </p>
          ) : (
            <p className="text-slate-500 text-sm mt-1">Categorizing automatically…</p>
          )}
        </div>
      </div>
    )
  }

  // ── Upload screen ───────────────────────────────────────────────────────────

  if (!transactions) {
    return (
      <div>
        <header
          className="fixed top-0 left-0 right-0 z-20 px-6 py-3 flex items-center justify-between"
          style={{
            background: 'rgba(8,9,18,0.7)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">FinLens</span>
          </div>
          <ProfileBar
            profiles={profiles}
            activeProfileId={activeId}
            onSwitch={handleSwitchProfile}
            onCreate={handleCreateProfile}
            onDelete={handleDeleteProfile}
          />
        </header>

        <UploadZone onFileSelected={handleFiles} loading={false} hideBrand />

        {error && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-5 py-4 text-sm max-w-lg text-center animate-fade-up whitespace-pre-line">
            {error}
          </div>
        )}
      </div>
    )
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-[30%] w-[600px] h-[300px] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      <header
        className="sticky top-0 z-20 px-6 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(8,9,18,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">FinLens</span>
          {fileNames.length > 0 && (
            <button
              type="button"
              onClick={() => setView(view === 'files' ? 'dashboard' : 'files')}
              className="flex items-center gap-1.5 ml-2 pl-3 border-l border-white/10 text-left rounded-lg px-2 py-1 -m-1 hover:bg-white/5 transition-colors"
              title="View uploaded files"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span className="text-xs text-slate-400">
                {view === 'files' ? 'Dashboard' : `${fileNames.length} file${fileNames.length !== 1 ? 's' : ''}`}
              </span>
              {view !== 'files' && (
                <span className="text-xs text-slate-600">· {transactions.length} tx</span>
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ProfileBar
            profiles={profiles}
            activeProfileId={activeId}
            onSwitch={handleSwitchProfile}
            onCreate={handleCreateProfile}
            onDelete={handleDeleteProfile}
          />
          <div className="flex items-center gap-1 mr-1">
            <button
              type="button"
              onClick={() => setView('dashboard')}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-all duration-200"
              style={
                view === 'dashboard'
                  ? { background: 'rgba(255,255,255,0.16)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.35)' }
                  : { background: 'rgba(15,23,42,0.8)', color: '#9ca3af', border: '1px solid rgba(148,163,184,0.45)' }
              }
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setView('breakdown')}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-all duration-200 hover:bg-white/10"
              style={
                view === 'breakdown'
                  ? { background: 'rgba(129,140,248,0.22)', color: '#e0e7ff', border: '1px solid rgba(129,140,248,0.7)' }
                  : { background: 'rgba(15,23,42,0.8)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.4)' }
              }
            >
              Spending by category
            </button>
            <button
              type="button"
              onClick={() => setView('rules')}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-all duration-200 hover:bg-white/10"
              style={
                view === 'rules'
                  ? { background: 'rgba(129,140,248,0.22)', color: '#e0e7ff', border: '1px solid rgba(129,140,248,0.7)' }
                  : { background: 'rgba(15,23,42,0.8)', color: '#e5e7eb', border: '1px solid rgba(148,163,184,0.4)' }
              }
            >
              Rules
            </button>
          </div>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Upload className="w-3.5 h-3.5" />
            New Upload
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {view === 'files' ? (
          <FilesPage
            fileNames={fileNames}
            transactions={transactions}
            fileFolders={fileFolders}
            folders={folders}
            onFolderChange={handleFileFolderChange}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onRenameFolder={handleRenameFolder}
            onRemoveFile={handleRemoveFile}
            onBack={() => setView('dashboard')}
          />
        ) : view === 'breakdown' ? (
          <SpendingBreakdownPage
            transactions={transactions}
            selectedYear={activeYear}
            onYearChange={setActiveYear}
            customCategories={customCategories}
            onBack={() => setView('dashboard')}
          />
        ) : view === 'rules' ? (
          <RulesPage
            rules={rules}
            categories={allCategories}
            onChange={handleRulesChange}
            onBack={() => setView('dashboard')}
          />
        ) : (
        <>
        {isPdf && (
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3 mb-6 text-sm animate-fade-up"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-200/70">
              <span className="font-semibold text-amber-300">PDF mode</span> — transaction amounts are extracted using layout heuristics and may occasionally be inaccurate.
              Click any category badge to correct categories. For best accuracy, use a CSV export from your bank.
            </p>
          </div>
        )}

        <SummaryCards transactions={filteredByYear} />
        <SpendingChart transactions={filteredByYear} />
        <YearFilter
          transactions={transactions}
          activeYear={activeYear}
          onChange={setActiveYear}
        />
        <CategoryFilter
          transactions={filteredByYear}
          active={activeCategory}
          onChange={setActiveCategory}
          customCategories={customCategories}
          onAddCategory={handleAddCategory}
        />
        <TransactionTable
          transactions={filteredByYear}
          onCategoryChange={handleCategoryChange}
          onSubcategoryChange={handleSubcategoryChange}
          activeCategory={activeCategory}
          categories={allCategories}
          customCategories={customCategories}
          onAddRuleFromTransaction={handleAddRuleFromTransaction}
        />
        <p className="text-center text-xs text-slate-700 mt-8">
          FinLens · All data processed locally · Nothing sent to any server
        </p>
        </>
        )}
      </main>

      {/* Upload modal */}
      {uploadModalOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setUploadModalOpen(false)}
            aria-hidden
          />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{
              background: 'rgba(15,23,42,0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add more files</h3>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              New transactions will be added to the current profile. CSV and PDF supported.
            </p>
            <UploadZone
              compact
              onFileSelected={handleAddFiles}
              loading={false}
            />
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <button
                type="button"
                onClick={() => { handleReset(); setUploadModalOpen(false) }}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                Replace all & start over
              </button>
            </div>
          </div>
        </>
      )}

      {/* Create rule from transaction modal */}
      {ruleModalOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={handleCancelRuleModal}
            aria-hidden
          />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{
              background: 'rgba(15,23,42,0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Create rule from transaction</h3>
              <button
                type="button"
                onClick={handleCancelRuleModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              This rule will look for the text below in the description and automatically set the
              category when it matches.
            </p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Description contains
                </label>
                <input
                  autoFocus
                  value={ruleModalDraft?.text || ''}
                  onChange={(e) =>
                    setRuleModalDraft((prev) => ({ ...(prev || {}), text: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Uber, Netflix, Payroll"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Set category to
                </label>
                <select
                  value={ruleModalDraft?.category || (allCategories[0] || 'Uncategorized')}
                  onChange={(e) =>
                    setRuleModalDraft((prev) => ({ ...(prev || {}), category: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelRuleModal}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRuleFromModal}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"
              >
                Save rule
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
