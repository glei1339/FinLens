import React, { useState, useCallback, useEffect } from 'react'
import { Upload, Sparkles, FileText, X, LayoutDashboard, List, FolderOpen, Settings, Sliders, Menu } from 'lucide-react'
import UploadZone from './components/UploadZone'
import SummaryCards from './components/SummaryCards'
import SpendingChart from './components/SpendingChart'
import RecentActivity from './components/RecentActivity'
import YearFilter from './components/YearFilter'
import SpendingBreakdownSection from './components/SpendingBreakdownSection'
import SpendingInsights from './components/SpendingInsights'
import TransactionsPage from './components/TransactionsPage'
import FilesPage from './components/FilesPage'
import RulesPage from './components/RulesPage'
import SettingsPage from './components/SettingsPage'
import { getYearFromDate, getUniqueYears, getYearMonthFromDate } from './utils/dateHelpers'
import ProfileBar from './components/ProfileBar'
import { parseCSV, parseCSVFromString } from './utils/csvParser'
import { categorizeAll, needsSignFlip, CATEGORIES, CATEGORY_COLORS } from './utils/categorizer'
import { classifyDepositsAndPayments, categorizeTransactionsWithAI } from './utils/aiClassifier'

const AI_API_KEY_STORAGE = 'finlens-openai-api-key'
const THEME_STORAGE = 'finlens-theme'

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

const DEFAULT_EXCLUDED_CATEGORIES = ['Transfers']

function newProfile(name, colorIdx = 0) {
  return {
    id: crypto.randomUUID(),
    name,
    color: PROFILE_COLORS[colorIdx % PROFILE_COLORS.length],
    transactions: null,
    fileNames: [],
    fileContents: {},
    customCategories: [],
    fileFolders: {},
    folders: [],
    rules: [],
    excludedCategories: [...DEFAULT_EXCLUDED_CATEGORIES],
  }
}

function initProfiles() {
  try {
    const raw = localStorage.getItem('finlens-profiles')
    if (raw) {
      const saved = JSON.parse(raw)
      if (Array.isArray(saved) && saved.length > 0) {
        return saved.map((p) => ({
          ...p,
          excludedCategories: Array.isArray(p.excludedCategories) ? p.excludedCategories : [...DEFAULT_EXCLUDED_CATEGORIES],
        }))
      }
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
  const [aiProcessedMsg,  setAiProcessedMsg] = useState(null) // brief "Processed with AI" after upload
  const [activeCategory, setActiveCategory] = useState(null)
  const [activeYear,     setActiveYear]     = useState(() => new Date().getFullYear())
  const [activeMonth,    setActiveMonth]    = useState(null) // 1–12 or null
  const [view,           setView]           = useState('dashboard') // 'dashboard' | 'transactions' | 'files' | 'rules' | 'settings'
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [ruleModalOpen,   setRuleModalOpen]   = useState(false)
  const [ruleModalDraft,  setRuleModalDraft]  = useState(null)
  const [activeFileYear,  setActiveFileYear]  = useState(null) // year filter on Files page (null = all)
  const [openaiApiKey, setOpenaiApiKeyState] = useState(() => typeof localStorage !== 'undefined' ? (localStorage.getItem(AI_API_KEY_STORAGE) || '') : '')
  const [useAIAnalysis, setUseAIAnalysis] = useState(false)
  const [duplicateModal, setDuplicateModal] = useState({ open: false, files: null, duplicateNames: [] })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setThemeState] = useState(() => {
    try { return localStorage.getItem(THEME_STORAGE) || 'light' } catch { return 'light' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light')
    try { localStorage.setItem(THEME_STORAGE, theme) } catch (_) {}
  }, [theme])

  const setTheme = useCallback((value) => setThemeState(value === 'dark' ? 'dark' : 'light'), [])

  const setOpenaiApiKey = useCallback((key) => {
    setOpenaiApiKeyState(key)
    try { localStorage.setItem(AI_API_KEY_STORAGE, key || '') } catch (_) {}
  }, [])

  const active = profiles.find(p => p.id === activeId) || profiles[0]
  const {
    transactions,
    fileNames,
    customCategories = [],
    fileFolders = {},
    folders = [],
    rules = [],
    excludedCategories = DEFAULT_EXCLUDED_CATEGORIES,
  } = active

  const allCategories = React.useMemo(
    () => [...CATEGORIES, ...customCategories.map((c) => c.name)],
    [customCategories]
  )

  // Categories that appear in at least one transaction (for Settings excluded list).
  const usedCategories = React.useMemo(() => {
    const set = new Set()
    for (const t of transactions || []) {
      const c = (t.category || 'Uncategorized').trim()
      if (c) set.add(c)
    }
    return [...set].sort()
  }, [transactions])

  // Show only used + currently excluded (so excluded can be toggled off).
  const categoriesForExcludedUI = React.useMemo(
    () => [...new Set([...usedCategories, ...(excludedCategories || []).map((c) => (c || '').trim())].filter(Boolean))].sort(),
    [usedCategories, excludedCategories]
  )

  const filteredByYear = !transactions
    ? null
    : activeYear == null
      ? transactions
      : transactions.filter((t) => getYearFromDate(t.date) === activeYear)

  // Further filter for the Transactions page: optional month filter on top of year filter.
  const filteredForTransactions = !filteredByYear
    ? null
    : activeMonth == null
      ? filteredByYear
      : filteredByYear.filter((t) => {
          const ym = getYearMonthFromDate(t.date)
          return ym && ym.month === activeMonth
        })

  // Expense-only: amount < 0 and not in excluded categories (app is an expense tracker).
  const excludedSet = React.useMemo(() => new Set((excludedCategories || []).map((c) => (c || '').trim())), [excludedCategories])
  const isExpense = (t) => {
    if (t.amount >= 0) return false
    const cat = (t.category || 'Uncategorized').trim()
    return !excludedSet.has(cat)
  }
  const expenseOnlyForTransactions = React.useMemo(
    () => (filteredForTransactions ? filteredForTransactions.filter(isExpense) : []),
    [filteredForTransactions]
  )

  // Months available for the current year selection (used in Transactions page month filter).
  // When viewing \"All years\" (activeYear == null), we hide the month filter entirely.
  const monthsForFilter = React.useMemo(() => {
    if (!filteredByYear || activeYear == null) return []
    const set = new Set()
    for (const t of filteredByYear) {
      const ym = getYearMonthFromDate(t.date)
      if (ym) set.add(ym.month)
    }
    return [...set].sort((a, b) => a - b)
  }, [filteredByYear, activeYear])

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
    setActiveMonth(null)
    setActiveFileYear(null)
    setError(null)
  }

  const handleSwitchProfile = (id) => {
    setActiveId(id)
    setActiveCategory(null)
    setActiveYear(null)
    setActiveMonth(null)
    setActiveFileYear(null)
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

  const handleExcludedCategoriesChange = useCallback((nextExcluded) => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === activeId ? { ...p, excludedCategories: nextExcluded } : p
      )
    )
  }, [activeId])

  // ── File upload ─────────────────────────────────────────────────────────────

  const handleFiles = useCallback(async (files) => {
    setLoading(true)
    setError(null)
    setActiveCategory(null)
    setActiveMonth(null)
    setActiveFileYear(null)

    const names   = files.map(f => f.name)
    const parseErrors = []
    let idOffset = 0
    const allTxs = []
    const fileContents = {}

    for (const file of files) {
      setLoadingFile(file.name)
      try {
        const text = await file.text()
        const parsed = await parseCSVFromString(text, file.name)
        fileContents[file.name] = text
        parsed.forEach((t, i) => allTxs.push({ ...t, id: idOffset + i, source: file.name }))
        idOffset += parsed.length
      } catch (err) {
        parseErrors.push(`${file.name}: ${err.message}`)
      }
    }

    let finalTxs = allTxs
    if (allTxs.length > 0) {
      const useAI = useAIAnalysis && openaiApiKey && openaiApiKey.trim()
      if (useAI) {
        try {
          setLoadingFile('AI: Classifying deposits vs payments…')
          finalTxs = await classifyDepositsAndPayments(allTxs, openaiApiKey.trim(), (msg) => setLoadingFile(msg))
        } catch (err) {
          setError((e) => (e ? e + '\n' : '') + `AI analysis failed: ${err.message}`)
        }
      } else if (needsSignFlip(allTxs) && !allTxs.some(t => (t.institution || '').toLowerCase() === 'chase')) {
        // Chase CSVs already have correct signs from the parser; don't flip (avoids wrong flip when rent income is categorized as Housing)
        finalTxs = allTxs.map(t => ({ ...t, amount: -t.amount }))
      }
    }

    let base = null
    if (finalTxs.length > 0) {
      const useAI = useAIAnalysis && openaiApiKey && openaiApiKey.trim()
      if (useAI) {
        try {
          setLoadingFile('AI: Categorizing transactions…')
          base = await categorizeTransactionsWithAI(finalTxs, allCategories, openaiApiKey.trim(), (msg) => setLoadingFile(msg))
        } catch (err) {
          setError((e) => (e ? e + '\n' : '') + `AI categorization failed: ${err.message}`)
          base = categorizeAll(finalTxs)
        }
      } else {
        base = categorizeAll(finalTxs)
      }
    }

    setLoadingFile('')
    if (parseErrors.length) setError(parseErrors.join('\n'))

    setProfiles(prev => prev.map(p => {
      if (p.id !== activeId) return p
      const withRules = base ? applyUserRules(base, p.rules || []) : null
      return {
        ...p,
        transactions: withRules,
        fileNames: names,
        fileContents: { ...(p.fileContents || {}), ...fileContents },
      }
    }))

    if (useAIAnalysis && openaiApiKey?.trim() && allTxs.length > 0) {
      setAiProcessedMsg('Processed with AI: deposits, payments & categories')
      setTimeout(() => setAiProcessedMsg(null), 5000)
    }
    setLoading(false)
  }, [activeId, useAIAnalysis, openaiApiKey, allCategories])

  const handleAddFiles = useCallback(async (files, options = {}) => {
    const { duplicateNames = [], duplicateStrategy } = options
    setUploadModalOpen(false)
    setDuplicateModal((m) => ({ ...m, open: false, files: null, duplicateNames: [] }))
    setLoading(true)
    setError(null)
    setActiveCategory(null)
    setActiveMonth(null)
    setActiveFileYear(null)

    let existingFileNames = active?.fileNames || []
    let filesToProcess = files
    let existing = active?.transactions || []
    if (duplicateStrategy === 'deleteOld' && duplicateNames.length > 0) {
      filesToProcess = files.filter((f) => !duplicateNames.includes(f.name))
      existing = (active?.transactions || []).filter((t) => !duplicateNames.includes(t.source))
      existingFileNames = (active?.fileNames || []).filter((n) => !duplicateNames.includes(n))
    } else if (duplicateStrategy === 'overwrite' && duplicateNames.length > 0) {
      existing = (active?.transactions || []).filter((t) => !duplicateNames.includes(t.source))
    }

    const names = filesToProcess.map((f) => f.name)
    const parseErrors = []
    let idOffset = existing.length
    const newTxs = []
    const nextFileContents = { ...(active?.fileContents || {}) }
    if (duplicateStrategy === 'deleteOld' && duplicateNames.length > 0) {
      duplicateNames.forEach((n) => delete nextFileContents[n])
    }
    for (const file of filesToProcess) {
      setLoadingFile(file.name)
      try {
        const text = await file.text()
        const parsed = await parseCSVFromString(text, file.name)
        nextFileContents[file.name] = text
        parsed.forEach((t, i) => newTxs.push({ ...t, id: idOffset + i, source: file.name }))
        idOffset += parsed.length
      } catch (err) {
        parseErrors.push(`${file.name}: ${err.message}`)
      }
    }

    let combined = existing.length || !newTxs.length ? [...existing, ...newTxs] : newTxs
    if (newTxs.length > 0) {
      const useAI = useAIAnalysis && openaiApiKey && openaiApiKey.trim()
      if (useAI) {
        try {
          setLoadingFile('AI: Classifying deposits vs payments…')
          const aiAdjusted = await classifyDepositsAndPayments(newTxs, openaiApiKey.trim(), (msg) => setLoadingFile(msg))
          combined = existing.length ? [...existing, ...aiAdjusted] : aiAdjusted
        } catch (err) {
          setError((e) => (e ? e + '\n' : '') + `AI analysis failed: ${err.message}`)
        }
      } else if (newTxs.length && needsSignFlip(newTxs) && !newTxs.some(t => (t.institution || '').toLowerCase() === 'chase')) {
        // Chase CSVs already have correct signs from the parser; don't flip
        const flipped = newTxs.map(t => ({ ...t, amount: -t.amount }))
        combined = existing.length ? [...existing, ...flipped] : flipped
      }
    }

    let base
    if (combined.length > 0) {
      const useAI = useAIAnalysis && openaiApiKey && openaiApiKey.trim()
      if (useAI) {
        try {
          setLoadingFile('AI: Categorizing transactions…')
          base = await categorizeTransactionsWithAI(combined, allCategories, openaiApiKey.trim(), (msg) => setLoadingFile(msg))
        } catch (err) {
          setError((e) => (e ? e + '\n' : '') + `AI categorization failed: ${err.message}`)
          base = categorizeAll(combined)
        }
      } else {
        base = categorizeAll(combined)
      }
    } else {
      base = []
    }

    setLoadingFile('')
    if (parseErrors.length) setError(parseErrors.join('\n'))
    const allNames = [...existingFileNames, ...names.filter((n) => !existingFileNames.includes(n))]

    setProfiles(prev => prev.map(p => {
      if (p.id !== activeId) return p
      const withRules = base ? applyUserRules(base, p.rules || []) : null
      const nextFolders =
        duplicateStrategy === 'deleteOld' && duplicateNames.length > 0
          ? Object.fromEntries(Object.entries(p.fileFolders || {}).filter(([k]) => !duplicateNames.includes(k)))
          : p.fileFolders
      return {
        ...p,
        transactions: withRules && withRules.length ? withRules : null,
        fileNames: allNames,
        fileContents: nextFileContents,
        fileFolders: nextFolders,
      }
    }))

    if (useAIAnalysis && openaiApiKey?.trim() && newTxs.length > 0) {
      setAiProcessedMsg('Processed with AI: deposits, payments & categories')
      setTimeout(() => setAiProcessedMsg(null), 5000)
    }
    setLoading(false)
  }, [activeId, active, useAIAnalysis, openaiApiKey, allCategories])

  const handleRereadFiles = useCallback(async () => {
    const names = active?.fileNames || []
    const contents = active?.fileContents || {}
    const hasStored = names.some((n) => contents[n])
    if (!hasStored || !names.length) return
    setLoading(true)
    setLoadingFile('Re-reading CSV files…')
    setError(null)
    try {
      const existing = active?.transactions || []
      const reParsed = []
      for (const name of names) {
        if (contents[name]) {
          setLoadingFile(`Re-reading ${name}…`)
          const txs = await parseCSVFromString(contents[name], name)
          txs.forEach((t, i) => reParsed.push({ ...t, id: reParsed.length + i, source: name }))
        } else {
          existing.filter((t) => t.source === name).forEach((t, i) => reParsed.push({ ...t, id: reParsed.length + i }))
        }
      }
      let combined = reParsed.map((t, i) => ({ ...t, id: i }))
      const isChase = combined.some((t) => (t.institution || '').toLowerCase() === 'chase')
      if (combined.length && needsSignFlip(combined) && !isChase) {
        combined = combined.map((t) => ({ ...t, amount: -t.amount }))
      }
      const base = combined.length ? categorizeAll(combined) : []
      const withRules = base.length ? applyUserRules(base, active?.rules || []) : []
      setProfiles((prev) =>
        prev.map((p) =>
          p.id !== activeId
            ? p
            : { ...p, transactions: withRules.length ? withRules : null }
        )
      )
    } catch (err) {
      setError(err?.message || 'Re-read failed')
    } finally {
      setLoadingFile('')
      setLoading(false)
    }
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

  const handleDeleteTransaction = useCallback((id) => {
    setProfiles(prev => prev.map(p => {
      if (p.id !== activeId || !p.transactions) return p
      const next = p.transactions.filter((t) => t.id !== id).map((t, i) => ({ ...t, id: i }))
      return { ...p, transactions: next.length ? next : null }
    }))
  }, [activeId])

  const handleReset = () => {
    setProfiles(prev => prev.map(p => p.id === activeId
      ? { ...p, transactions: null, fileNames: [], fileContents: {}, fileFolders: {}, folders: [] }
      : p
    ))
    setError(null)
    setActiveCategory(null)
    setActiveYear(null)
    setActiveMonth(null)
    setActiveFileYear(null)
  }

  const handleRemoveFile = useCallback((fileName) => {
    setProfiles(prev => prev.map(p => {
      if (p.id !== activeId || !p.transactions) return p
      const nextTxs = p.transactions
        .filter(t => t.source !== fileName)
        .map((t, i) => ({ ...t, id: i }))
      const nextNames = (p.fileNames || []).filter(n => n !== fileName)
      const { [fileName]: _removed, ...restFolders } = p.fileFolders || {}
      const { [fileName]: _removedContent, ...restContents } = p.fileContents || {}
      return {
        ...p,
        transactions: nextTxs.length ? nextTxs : null,
        fileNames: nextNames,
        fileContents: restContents,
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

  // ── AI Re-analyze ────────────────────────────────────────────────────────────

  const handleReanalyzeWithAI = useCallback(async () => {
    const existingTxs = active?.transactions
    if (!existingTxs?.length || !openaiApiKey?.trim()) return

    setLoading(true)
    setError(null)
    try {
      setLoadingFile('AI: Classifying deposits vs payments…')
      let analyzed = await classifyDepositsAndPayments(
        existingTxs,
        openaiApiKey.trim(),
        (msg) => setLoadingFile(msg),
      )

      setLoadingFile('AI: Categorizing transactions…')
      analyzed = await categorizeTransactionsWithAI(
        analyzed,
        allCategories,
        openaiApiKey.trim(),
        (msg) => setLoadingFile(msg),
      )

      setProfiles((prev) =>
        prev.map((p) => {
          if (p.id !== activeId) return p
          const withRules = applyUserRules(analyzed, p.rules || [])
          return { ...p, transactions: withRules }
        }),
      )

      setAiProcessedMsg('Re-analyzed with AI: deposits, payments & categories')
      setTimeout(() => setAiProcessedMsg(null), 5000)
    } catch (err) {
      setError(`AI re-analysis failed: ${err.message}`)
    }

    setLoadingFile('')
    setLoading(false)
  }, [activeId, active, openaiApiKey, allCategories])

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
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4" style={{ background: 'var(--bg-page)' }}>
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-light)', boxShadow: 'var(--shadow-md)' }}>
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        <div className="text-center max-w-sm">
          <p className="font-bold text-xl tracking-tight" style={{ color: 'var(--text-primary)' }}>Parsing transactions…</p>
          {loadingFile ? (
            <p className="text-sm mt-2 max-w-xs mx-auto truncate" style={{ color: 'var(--text-muted)' }}>
              Processing <span style={{ color: 'var(--text-secondary)' }}>{loadingFile}</span>
            </p>
          ) : (
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Categorizing automatically…</p>
          )}
        </div>
      </div>
    )
  }

  // ── Upload screen ───────────────────────────────────────────────────────────

  if (!transactions) {
    if (view === 'settings') {
      return (
        <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
          <header
            className="sticky top-0 z-20 px-4 sm:px-6 py-3 flex items-center justify-between border-b"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)' }}>
                <Sparkles className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <span className="font-display font-semibold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>FinLens</span>
            </div>
          </header>
          <SettingsPage
            openaiApiKey={openaiApiKey}
            onApiKeyChange={setOpenaiApiKey}
            useAIAnalysis={useAIAnalysis}
            onUseAIAnalysisChange={setUseAIAnalysis}
            hasTransactions={!!(active?.transactions?.length)}
            onReanalyze={handleReanalyzeWithAI}
            onBack={() => setView('dashboard')}
            excludedCategories={excludedCategories}
            onExcludedCategoriesChange={handleExcludedCategoriesChange}
            categoriesForExcludedUI={categoriesForExcludedUI}
            theme={theme}
            onThemeChange={setTheme}
          />
        </div>
      )
    }
    return (
      <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
        <header
          className="fixed top-0 left-0 right-0 z-20 px-4 sm:px-6 py-3 flex items-center justify-between border-b"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)' }}>
              <Sparkles className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <span className="font-display font-semibold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>FinLens</span>
          </div>
          <div className="flex items-center gap-3">
            <ProfileBar
              profiles={profiles}
              activeProfileId={activeId}
              onSwitch={handleSwitchProfile}
              onCreate={handleCreateProfile}
              onDelete={handleDeleteProfile}
            />
            <button
              type="button"
              onClick={() => setView('settings')}
              className="text-sm font-medium transition-colors hover:opacity-80 px-3 py-2 rounded-xl hover:bg-[var(--border-subtle)]"
              style={{ color: 'var(--text-muted)' }}
            >
              Settings
            </button>
          </div>
        </header>

        <UploadZone onFileSelected={handleFiles} loading={false} hideBrand />

        <div className="max-w-md mx-auto mt-8 px-4">
          <div className="p-5 rounded-2xl border bg-[var(--bg-card)] shadow-finlens" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI: Deposit vs payment</span>
            </div>
            <label className="flex items-center gap-3 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useAIAnalysis}
                onChange={(e) => setUseAIAnalysis(e.target.checked)}
                className="rounded-xl border w-4 h-4 focus:ring-[var(--accent)] bg-[var(--bg-card)]"
              style={{ borderColor: 'var(--input-border)', color: 'var(--accent)' }}
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Use AI to classify deposits vs payments</span>
            </label>
            <input
              type="password"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="OpenAI or Claude API key (optional)"
              className="input-base"
              autoComplete="off"
            />
          </div>
        </div>

        {error && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--danger-light)] border border-red-200 text-[var(--danger)] rounded-xl px-5 py-4 text-sm max-w-lg text-center animate-fade-up whitespace-pre-line shadow-finlens-lg font-medium">
            {error}
          </div>
        )}
      </div>
    )
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: List },
    ...(fileNames.length > 0 ? [{ id: 'files', label: 'Files', icon: FolderOpen }] : []),
    { id: 'rules', label: 'Rules', icon: Sliders },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-page)' }}>
      {aiProcessedMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 bg-[var(--success-light)] border border-[var(--success)] text-[var(--success)] rounded-xl px-5 py-3 text-sm font-semibold shadow-lg animate-fade-up">
          <Sparkles className="w-4 h-4" />
          {aiProcessedMsg}
        </div>
      )}

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-[var(--sidebar-width)] flex flex-col
          bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]
          transform transition-transform duration-300 ease-out
          md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--sidebar-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--sidebar-accent)', color: '#fff', boxShadow: '0 4px 14px rgba(129, 140, 248, 0.4)' }}>
              <Sparkles className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white">FinLens</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 rounded-xl text-[var(--sidebar-text)] hover:bg-[var(--sidebar-bg-hover)] hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Main">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => { setView(id); setSidebarOpen(false) }}
              className={`sidebar-nav-item w-full justify-start ${view === id ? 'sidebar-nav-item-active' : ''}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-[var(--sidebar-border)]">
          <ProfileBar
            profiles={profiles}
            activeProfileId={activeId}
            onSwitch={handleSwitchProfile}
            onCreate={handleCreateProfile}
            onDelete={handleDeleteProfile}
            variant="sidebar"
          />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-[var(--sidebar-width)]">
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 h-16 border-b"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl transition-colors hover:bg-[var(--border-subtle)]"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-display font-semibold text-lg truncate" style={{ color: 'var(--text-primary)' }}>
              {view === 'dashboard' ? '' : navItems.find((n) => n.id === view)?.label || view}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ProfileBar
              profiles={profiles}
              activeProfileId={activeId}
              onSwitch={handleSwitchProfile}
              onCreate={handleCreateProfile}
              onDelete={handleDeleteProfile}
            />
            <button
              onClick={() => setUploadModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </button>
          </div>
        </header>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-5 sm:px-8 py-8 sm:py-10">
        {/* Year filter: inside content when multiple years and on Dashboard or Transactions */}
        {transactions?.length > 0 && getUniqueYears(transactions).length > 1 && (view === 'dashboard' || view === 'transactions') && (
          <div className="mb-6">
            <YearFilter
              transactions={transactions}
              activeYear={activeYear}
              onChange={setActiveYear}
              compact
            />
          </div>
        )}

        {view === 'files' ? (
          <FilesPage
            fileNames={fileNames}
            fileContents={active?.fileContents || {}}
            transactions={transactions}
            fileFolders={fileFolders}
            folders={folders}
            selectedFileYear={activeFileYear}
            onFileYearChange={setActiveFileYear}
            onFolderChange={handleFileFolderChange}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onRenameFolder={handleRenameFolder}
            onRemoveFile={handleRemoveFile}
            onRereadFiles={handleRereadFiles}
            rereadLoading={loading}
            onBack={() => setView('dashboard')}
          />
        ) : view === 'transactions' ? (
          <TransactionsPage
            transactions={expenseOnlyForTransactions}
            months={monthsForFilter}
            activeMonth={activeMonth}
            activeCategory={activeCategory}
            onMonthChange={setActiveMonth}
            onCategoryFilterChange={setActiveCategory}
            onAddCategory={handleAddCategory}
            onTransactionCategoryChange={handleCategoryChange}
            onDeleteTransaction={handleDeleteTransaction}
            allCategories={allCategories}
            customCategories={customCategories}
            onAddRuleFromTransaction={handleAddRuleFromTransaction}
            onBack={() => setView('dashboard')}
          />
        ) : view === 'rules' ? (
          <RulesPage
            rules={rules}
            categories={allCategories}
            onChange={handleRulesChange}
            onBack={() => setView('dashboard')}
          />
        ) : view === 'settings' ? (
          <SettingsPage
            openaiApiKey={openaiApiKey}
            onApiKeyChange={setOpenaiApiKey}
            useAIAnalysis={useAIAnalysis}
            onUseAIAnalysisChange={setUseAIAnalysis}
            hasTransactions={!!(active?.transactions?.length)}
            onReanalyze={handleReanalyzeWithAI}
            onBack={() => setView('dashboard')}
            excludedCategories={excludedCategories}
            onExcludedCategoriesChange={handleExcludedCategoriesChange}
            categoriesForExcludedUI={categoriesForExcludedUI}
            theme={theme}
            onThemeChange={setTheme}
          />
        ) : (
        <>
        <div className="mb-10 animate-fade-up">
          <h1 className="section-title">Where your money goes</h1>
          <p className="section-desc">
            {activeYear != null ? `Expenses in ${activeYear} broken down by category` : 'All years · expenses broken down by category'}
          </p>
        </div>
        <SummaryCards transactions={filteredByYear} excludedCategories={excludedCategories} />

        {/* Spending overview YTD — full width, respects exclude category filter */}
        <div className="mb-6">
          <SpendingChart
            transactions={filteredByYear}
            activeYear={activeYear}
            excludedCategories={excludedCategories}
          />
        </div>

        {/* Two-column: Recent expenses | Spending insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="min-h-0 flex flex-col">
            <RecentActivity
              transactions={filteredByYear}
              excludedCategories={excludedCategories}
              onViewAll={() => setView('transactions')}
            />
          </div>
          <div className="min-h-0 flex flex-col">
            <SpendingInsights
              transactions={filteredByYear}
              selectedYear={activeYear}
              excludedCategories={excludedCategories}
              customCategories={customCategories}
            />
          </div>
        </div>

        <SpendingBreakdownSection
          transactions={filteredByYear}
          selectedYear={activeYear}
          customCategories={customCategories}
          excludedCategories={excludedCategories}
        />
        <p className="text-center text-sm mt-14 mb-8 font-medium" style={{ color: 'var(--text-muted)' }}>
          Data stays on your device
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
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-full max-w-md rounded-2xl p-6 shadow-finlens-lg border bg-[var(--bg-card)] animate-scale-in" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Add more files</h3>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="p-2 rounded-xl transition-colors hover:bg-[var(--border-subtle)]"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              New transactions will be added to the current profile. CSV and PDF supported.
            </p>

            <UploadZone
              compact
              onFileSelected={(files) => {
                const names = files.map((f) => f.name)
                const dups = names.filter((n) => (fileNames || []).includes(n))
                if (dups.length > 0) {
                  setDuplicateModal({ open: true, files, duplicateNames: dups })
                } else {
                  handleAddFiles(files)
                }
              }}
              loading={false}
            />
            <div className="mt-5 pt-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => { handleReset(); setUploadModalOpen(false) }}
                className="text-sm font-medium transition-colors hover:text-[var(--danger)]"
                style={{ color: 'var(--text-muted)' }}
              >
                Replace all & start over
              </button>
            </div>
          </div>
        </>
      )}

      {/* Duplicate files: overwrite or delete old */}
      {duplicateModal.open && duplicateModal.files && duplicateModal.duplicateNames?.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setDuplicateModal((m) => ({ ...m, open: false, files: null, duplicateNames: [] }))}
            aria-hidden
          />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-2xl p-6 shadow-finlens-lg border bg-[var(--bg-card)] animate-scale-in"
            style={{ borderColor: 'var(--border)' }}
          >
            <h3 className="text-xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>Files already exist</h3>
            <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              These files are already in this profile: <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{duplicateModal.duplicateNames.join(', ')}</span>
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Overwrite replaces their transactions with the new upload. Delete old removes the existing files and does not add the new upload for these names.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  handleAddFiles(duplicateModal.files, {
                    duplicateNames: duplicateModal.duplicateNames,
                    duplicateStrategy: 'overwrite',
                  })
                }}
                className="btn-primary px-4 py-2"
              >
                Overwrite
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAddFiles(duplicateModal.files, {
                    duplicateNames: duplicateModal.duplicateNames,
                    duplicateStrategy: 'deleteOld',
                  })
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                Delete old
              </button>
              <button
                type="button"
                onClick={() => setDuplicateModal((m) => ({ ...m, open: false, files: null, duplicateNames: [] }))}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--border-subtle)]"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancel
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-full max-w-md rounded-2xl p-6 shadow-finlens-lg border bg-[var(--bg-card)] animate-scale-in"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Create rule from transaction</h3>
              <button
                type="button"
                onClick={handleCancelRuleModal}
                className="p-2 rounded-xl transition-colors hover:bg-[var(--border-subtle)]"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              This rule will look for the text below in the description and automatically set the
              category when it matches.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Description contains
                </label>
                <input
                  autoFocus
                  value={ruleModalDraft?.text || ''}
                  onChange={(e) =>
                    setRuleModalDraft((prev) => ({ ...(prev || {}), text: e.target.value }))
                  }
                  className="input-base"
                  placeholder="e.g. Uber, Netflix, Payroll"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Set category to
                </label>
                <select
                  value={ruleModalDraft?.category || (allCategories[0] || 'Uncategorized')}
                  onChange={(e) =>
                    setRuleModalDraft((prev) => ({ ...(prev || {}), category: e.target.value }))
                  }
                  className="input-base"
                  style={{ cursor: 'pointer' }}
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelRuleModal}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--border-subtle)]"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRuleFromModal}
                className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold"
              >
                Save rule
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  )
}
