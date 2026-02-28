import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Trash2, Check } from 'lucide-react'

export default function ProfileBar({ profiles, activeProfileId, onSwitch, onCreate, onDelete, variant }) {
  const [open, setOpen]       = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]  = useState('')
  const inputRef = useRef(null)
  const isSidebar = variant === 'sidebar'

  const active = profiles.find(p => p.id === activeProfileId) || profiles[0]

  useEffect(() => {
    if (creating && open) inputRef.current?.focus()
  }, [creating, open])

  function close() {
    setOpen(false)
    setCreating(false)
    setNewName('')
  }

  function submit() {
    const name = newName.trim()
    if (!name) return
    onCreate(name)
    setNewName('')
    setCreating(false)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all w-full justify-between ${isSidebar ? 'border-0' : 'border hover:shadow-sm'}`}
        style={isSidebar ? { color: 'var(--sidebar-text)', background: 'transparent' } : { borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-card)' }}
      >
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: active.color }} />
        <span className={`truncate ${isSidebar ? 'flex-1 text-left' : 'max-w-[140px]'}`}>{active.name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`} style={{ color: isSidebar ? 'var(--sidebar-text)' : 'var(--text-muted)' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div
            className={`absolute top-full mt-2 w-56 rounded-xl z-20 overflow-hidden border shadow-lg ${isSidebar ? 'left-0' : 'right-0'}`}
            style={{ background: isSidebar ? 'var(--sidebar-bg)' : 'var(--bg-card)', borderColor: isSidebar ? 'var(--sidebar-border)' : 'var(--border)' }}
          >
            <div className="p-2">
              {profiles.map(p => (
                <div
                  key={p.id}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${isSidebar ? 'hover:bg-[var(--sidebar-bg-hover)]' : 'hover:bg-[var(--border-subtle)]'}`}
                  onClick={() => { onSwitch(p.id); close() }}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <span className="text-sm flex-1 truncate" style={{ color: isSidebar ? 'var(--sidebar-text-active)' : 'var(--text-primary)' }}>{p.name}</span>
                  {p.id === activeProfileId
                    ? <Check className="w-4 h-4 flex-shrink-0" style={{ color: isSidebar ? 'var(--sidebar-accent)' : 'var(--accent)' }} />
                    : profiles.length > 1 && (
                      <button
                        onClick={e => { e.stopPropagation(); onDelete(p.id) }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all flex-shrink-0 p-0.5 rounded"
                        title={`Delete "${p.name}"`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  }
                </div>
              ))}
            </div>
            <div className="p-2 border-t" style={{ borderColor: isSidebar ? 'var(--sidebar-border)' : 'var(--border-subtle)' }}>
              {creating ? (
                <div className="flex items-center gap-2 px-3 py-2">
                  <Plus className="w-4 h-4 flex-shrink-0" style={{ color: isSidebar ? 'var(--sidebar-text)' : 'var(--text-muted)' }} />
                  <input
                    ref={inputRef}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submit()
                      if (e.key === 'Escape') { setCreating(false); setNewName('') }
                    }}
                    placeholder="Profile name…"
                    className="flex-1 bg-transparent text-sm outline-none min-w-0 placeholder:opacity-60 font-medium"
                    style={{ color: isSidebar ? 'var(--sidebar-text-active)' : 'var(--text-primary)' }}
                  />
                  <button
                    onClick={submit}
                    className="text-sm font-semibold flex-shrink-0"
                    style={{ color: isSidebar ? 'var(--sidebar-accent)' : 'var(--accent)' }}
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isSidebar ? 'hover:bg-[var(--sidebar-bg-hover)]' : 'hover:bg-[var(--border-subtle)]'}`}
                  style={{ color: isSidebar ? 'var(--sidebar-text)' : 'var(--text-muted)' }}
                >
                  <Plus className="w-4 h-4" />
                  New Profile
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
