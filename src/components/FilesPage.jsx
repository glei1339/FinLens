import React, { useMemo, useState } from 'react'
import { ArrowLeft, FileText, Trash2, Folder as FolderIcon, FolderPlus, Calendar, RefreshCw } from 'lucide-react'
import { getYearFromDate, getUniqueYears } from '../utils/dateHelpers'

const UNFILED_KEY = '__UNFILED__'

function FolderBadge({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  function commit() {
    const clean = draft.trim()
    onChange(clean)
    setEditing(false)
  }

  return (
    <div className="inline-flex items-center gap-1">
      <FolderIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
      {editing ? (
        <input
          className="px-2 py-1 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-offset-0 bg-white max-w-[160px]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setDraft(value || ''); setEditing(false) }
          }}
          placeholder="Folder name…"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="px-2 py-1 rounded-lg text-xs border border-dashed transition-colors max-w-[180px] truncate hover:bg-slate-50"
          style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
          title={value || 'Click to add this file to a folder'}
        >
          {value || 'Add to folder'}
        </button>
      )}
    </div>
  )
}

export default function FilesPage({ fileNames, transactions, fileFolders = {}, folders = [], selectedFileYear, onFileYearChange, onFolderChange, onCreateFolder, onDeleteFolder, onRenameFolder, onRemoveFile, onRereadFiles, rereadLoading = false, fileContents = {}, onBack }) {
  const years = useMemo(() => getUniqueYears(transactions || []), [transactions])

  const fileNamesForYear = useMemo(() => {
    if (!fileNames?.length) return []
    if (selectedFileYear == null) return fileNames
    return fileNames.filter((name) =>
      (transactions || []).some((t) => t.source === name && getYearFromDate(t.date) === selectedFileYear)
    )
  }, [fileNames, transactions, selectedFileYear])

  if (!fileNames?.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium mb-8 transition-colors hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </button>
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No files uploaded yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Click Upload in the header to add CSV or PDF statements.</p>
        </div>
      </div>
    )
  }

  const grouped = useMemo(() => {
    const map = {}
    const allFolderNames = [...new Set([...(folders || []), ...Object.values(fileFolders).filter(Boolean)])]
    for (const folderName of allFolderNames) {
      map[folderName] = []
    }
    map[UNFILED_KEY] = []
    for (const name of fileNamesForYear) {
      const folder = (fileFolders[name] || '').trim()
      const key = folder || UNFILED_KEY
      if (!map[key]) map[key] = []
      map[key].push(name)
    }
    const keys = Object.keys(map).sort((a, b) => {
      if (a === UNFILED_KEY) return 1
      if (b === UNFILED_KEY) return -1
      return a.localeCompare(b)
    })
    return { map, keys }
  }, [fileNamesForYear, fileFolders, folders])

  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolder, setEditingFolder] = useState(null)
  const [editingFolderName, setEditingFolderName] = useState('')

  function handleSubmitNewFolder(e) {
    e.preventDefault()
    const trimmed = newFolderName.trim()
    onCreateFolder?.(trimmed)
    setNewFolderName('')
    setCreatingFolder(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium mb-6 transition-colors hover:opacity-80"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </button>

      {years.length > 0 && (
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <h2 className="card-title">View by year</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onFileYearChange?.(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                selectedFileYear == null ? 'text-white border-transparent' : 'hover:bg-[var(--bg-elevated)]'
              }`}
              style={selectedFileYear == null ? { background: 'var(--accent)' } : { color: 'var(--text-secondary)' }}
            >
              All years · {fileNames.length}
            </button>
            {years.map((y) => {
              const count = fileNames.filter((name) =>
                (transactions || []).some((t) => t.source === name && getYearFromDate(t.date) === y)
              ).length
              const isActive = selectedFileYear === y
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => onFileYearChange?.(isActive ? null : y)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    isActive ? 'text-white border-transparent' : 'hover:bg-[var(--bg-elevated)]'
                  }`}
                  style={isActive ? { background: 'var(--accent)' } : { color: 'var(--text-secondary)' }}
                >
                  {y} · {count} file{count !== 1 ? 's' : ''}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="section-title mb-1">
            {selectedFileYear != null ? `Files for ${selectedFileYear}` : 'Uploaded files'}
          </h1>
          <p className="section-desc">
            {selectedFileYear != null
              ? `Showing ${fileNamesForYear.length} file${fileNamesForYear.length !== 1 ? 's' : ''} with transactions in ${selectedFileYear}.`
              : 'Drag files into folders. Remove any file that was added to the wrong profile.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRereadFiles && fileNames?.length > 0 && fileNames.some((n) => fileContents[n]) && (
            <button
              type="button"
              onClick={onRereadFiles}
              disabled={rereadLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              <RefreshCw className={`w-4 h-4 ${rereadLoading ? 'animate-spin' : ''}`} />
              {rereadLoading ? 'Re-reading…' : 'Re-read files'}
            </button>
          )}
          {onCreateFolder && (creatingFolder ? (
            <form onSubmit={handleSubmitNewFolder} className="flex items-center gap-2">
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="px-3 py-1.5 rounded-lg border text-sm bg-[var(--bg-elevated)] placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder="Folder name (e.g. Taxes, 2024)"
              />
              <button type="submit" className="px-3 py-1.5 rounded-lg text-sm font-medium btn-primary">
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingFolder(false)
                  setNewFolderName('')
                }}
                className="px-2 py-1.5 rounded-lg text-sm transition-colors hover:bg-[var(--bg-elevated)]"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCreatingFolder(true)
                setNewFolderName('')
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium btn-primary"
            >
              <FolderPlus className="w-4 h-4" />
              New folder
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {grouped.keys.map((folderKey) => {
          const names = grouped.map[folderKey] || []
          const isUnfiled = folderKey === UNFILED_KEY
          const label = isUnfiled ? 'No folder' : folderKey
          const isRenaming = editingFolder === folderKey

          function handleDragOver(e) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            e.currentTarget.classList.add('ring-2', 'ring-[var(--accent)]', 'bg-[var(--accent-light)]')
          }
          function handleDragLeave(e) {
            e.currentTarget.classList.remove('ring-2', 'ring-[var(--accent)]', 'bg-[var(--accent-light)]')
          }
          function handleDrop(e) {
            e.preventDefault()
            e.currentTarget.classList.remove('ring-2', 'ring-[var(--accent)]', 'bg-[var(--accent-light)]')
            const fileName = e.dataTransfer.getData('text/plain')
            if (!fileName || !fileNames.includes(fileName)) return
            const targetFolder = isUnfiled ? '' : folderKey
            onFolderChange?.(fileName, targetFolder)
          }

          return (
            <div
              key={folderKey}
              className="card overflow-hidden transition-all min-h-[80px] p-0"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  {isUnfiled ? (
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                  ) : isRenaming ? (
                    <input
                      autoFocus
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      onBlur={() => {
                        setEditingFolder(null)
                        setEditingFolderName('')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const trimmed = editingFolderName.trim()
                          if (trimmed && trimmed !== folderKey) {
                            onRenameFolder?.(folderKey, trimmed)
                          }
                          setEditingFolder(null)
                          setEditingFolderName('')
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          setEditingFolder(null)
                          setEditingFolderName('')
                        }
                      }}
                      className="px-2 py-1 rounded-md border text-xs focus:outline-none focus:ring-2 focus:ring-offset-0"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFolder(folderKey)
                        setEditingFolderName(label)
                      }}
                      className="text-sm font-semibold hover:opacity-80 hover:underline decoration-dotted underline-offset-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {label}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {names.length} file{names.length !== 1 ? 's' : ''}
                  </p>
                  {!isUnfiled && onDeleteFolder && (
                    <button
                      type="button"
                      onClick={() => onDeleteFolder(folderKey)}
                      className="p-1 rounded transition-colors hover:text-red-600"
                      style={{ color: 'var(--text-muted)' }}
                      title="Delete folder (files move to No folder)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-slate-200">
                {names.map((name) => {
                  const count = transactions.filter((t) => t.source === name).length
                  const folder = fileFolders[name] || ''
                  return (
                    <div
                      key={name}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', name)
                        e.dataTransfer.effectAllowed = 'move'
                        e.currentTarget.classList.add('opacity-60')
                      }}
                      onDragEnd={(e) => e.currentTarget.classList.remove('opacity-60')}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--bg-subtle)] cursor-grab active:cursor-grabbing"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[var(--success-light)] border border-[rgba(16,185,129,0.2)]">
                        <FileText className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }} title={name}>
                          {name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {count} transaction{count !== 1 ? 's' : ''}
                          <span className="ml-2 opacity-70">· CSV</span>
                        </p>
                        <div className="mt-2">
                          <FolderBadge
                            value={folder}
                            onChange={(folderName) => onFolderChange && onFolderChange(name, folderName)}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveFile(name)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:text-red-600 hover:bg-[var(--danger-light)]"
                        style={{ color: 'var(--text-muted)' }}
                        title={`Remove ${name} from this profile`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-sm mt-8" style={{ color: 'var(--text-muted)' }}>
        {fileNames.length} file{fileNames.length !== 1 ? 's' : ''} · {transactions.length} total transactions
      </p>
    </div>
  )
}
