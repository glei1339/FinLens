import React, { useMemo, useState } from 'react'
import { ArrowLeft, FileText, Trash2, Folder as FolderIcon, FolderPlus } from 'lucide-react'

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
      <FolderIcon className="w-3.5 h-3.5 text-slate-500" />
      {editing ? (
        <input
          className="px-2 py-1 rounded-lg bg-slate-900/70 border border-white/10 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[160px]"
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
          className="px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-dashed border-white/10 transition-colors max-w-[180px] truncate"
          title={value || 'Click to add this file to a folder'}
        >
          {value || 'Add to folder'}
        </button>
      )}
    </div>
  )
}

export default function FilesPage({ fileNames, transactions, fileFolders = {}, folders = [], onFolderChange, onCreateFolder, onDeleteFolder, onRenameFolder, onRemoveFile, onBack }) {
  if (!fileNames?.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </button>
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">No files uploaded yet</p>
          <p className="text-slate-500 text-sm mt-1">Use &quot;New Upload&quot; in the header to add CSV or PDF statements.</p>
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
    for (const name of fileNames) {
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
  }, [fileNames, fileFolders, folders])

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
        className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </button>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Uploaded files</h1>
          <p className="text-slate-500 text-sm">
            Drag files into folders. Remove any file that was added to the wrong profile.
          </p>
        </div>
        {onCreateFolder && (
          <div className="flex items-center gap-2">
            {creatingFolder ? (
              <form onSubmit={handleSubmitNewFolder} className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/15 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Folder name (e.g. Taxes, 2024)"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingFolder(false)
                    setNewFolderName('')
                  }}
                  className="px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 hover:bg-indigo-500/30 transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                New folder
              </button>
            )}
          </div>
        )}
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
            e.currentTarget.classList.add('ring-2', 'ring-indigo-400/50', 'bg-indigo-500/10')
          }
          function handleDragLeave(e) {
            e.currentTarget.classList.remove('ring-2', 'ring-indigo-400/50', 'bg-indigo-500/10')
          }
          function handleDrop(e) {
            e.preventDefault()
            e.currentTarget.classList.remove('ring-2', 'ring-indigo-400/50', 'bg-indigo-500/10')
            const fileName = e.dataTransfer.getData('text/plain')
            if (!fileName || !fileNames.includes(fileName)) return
            const targetFolder = isUnfiled ? '' : folderKey
            onFolderChange?.(fileName, targetFolder)
          }

          return (
            <div
              key={folderKey}
              className="rounded-2xl transition-all min-h-[80px]"
              style={{ border: '1px solid rgba(148,163,184,0.35)', background: 'rgba(15,23,42,0.8)' }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderIcon className="w-4 h-4 text-slate-400" />
                  {isUnfiled ? (
                    <p className="text-sm font-semibold text-slate-200">{label}</p>
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
                      className="px-2 py-1 rounded-md bg-slate-900/80 border border-white/15 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFolder(folderKey)
                        setEditingFolderName(label)
                      }}
                      className="text-sm font-semibold text-slate-200 hover:text-white hover:underline decoration-dotted underline-offset-2"
                    >
                      {label}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[11px] text-slate-500">
                    {names.length} file{names.length !== 1 ? 's' : ''}
                  </p>
                  {!isUnfiled && onDeleteFolder && (
                    <button
                      type="button"
                      onClick={() => onDeleteFolder(folderKey)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded"
                      title="Delete folder (files move to No folder)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-white/5">
                {names.map((name) => {
                  const count = transactions.filter((t) => t.source === name).length
                  const isPdf = /\.pdf$/i.test(name)
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
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02] cursor-grab active:cursor-grabbing"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isPdf ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                          border: `1px solid ${isPdf ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                        }}
                      >
                        <FileText
                          className="w-5 h-5"
                          style={{ color: isPdf ? '#f87171' : '#4ade80' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate" title={name}>
                          {name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {count} transaction{count !== 1 ? 's' : ''}
                          <span className="ml-2 text-slate-600">· {isPdf ? 'PDF' : 'CSV'}</span>
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
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
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

      <p className="text-xs text-slate-600 mt-8">
        {fileNames.length} file{fileNames.length !== 1 ? 's' : ''} · {transactions.length} total transactions
      </p>
    </div>
  )
}
