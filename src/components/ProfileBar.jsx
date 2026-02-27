import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Trash2, Check } from 'lucide-react'

export default function ProfileBar({ profiles, activeProfileId, onSwitch, onCreate, onDelete }) {
  const [open, setOpen]       = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]  = useState('')
  const inputRef = useRef(null)

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
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-white/10"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
      >
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: active.color }} />
        <span className="text-slate-300 max-w-[140px] truncate">{active.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div
            className="absolute right-0 top-full mt-2 w-52 rounded-xl z-20 overflow-hidden"
            style={{
              background: 'rgba(13,15,26,0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            {/* Profile list */}
            <div className="p-1.5">
              {profiles.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer group transition-colors hover:bg-white/8"
                  onClick={() => { onSwitch(p.id); close() }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <span className="text-sm text-slate-300 flex-1 truncate">{p.name}</span>
                  {p.id === activeProfileId
                    ? <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    : profiles.length > 1 && (
                      <button
                        onClick={e => { e.stopPropagation(); onDelete(p.id) }}
                        className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all flex-shrink-0"
                        title={`Delete "${p.name}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  }
                </div>
              ))}
            </div>

            {/* Create new */}
            <div className="p-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              {creating ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <Plus className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                  <input
                    ref={inputRef}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submit()
                      if (e.key === 'Escape') { setCreating(false); setNewName('') }
                    }}
                    placeholder="Profile name…"
                    className="flex-1 bg-transparent text-sm text-white placeholder-slate-700 outline-none min-w-0"
                  />
                  <button
                    onClick={submit}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex-shrink-0"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm text-slate-500 hover:text-slate-300 transition-colors hover:bg-white/8"
                >
                  <Plus className="w-3.5 h-3.5" />
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
