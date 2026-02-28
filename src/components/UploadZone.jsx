import React, { useRef, useState } from 'react'
import { Upload, Zap, BarChart2, Download, Shield, Sparkles, FileText } from 'lucide-react'

const FEATURES = [
  { icon: Zap,       title: 'Auto-categorize',   desc: 'Every expense tagged by category automatically' },
  { icon: BarChart2, title: 'Breakdown by category', desc: 'See exactly where each dollar went' },
  { icon: Download,  title: 'Export',            desc: 'Download your expense list as CSV anytime' },
  { icon: Shield,    title: '100% Private',      desc: 'Runs in your browser — data never leaves your device' },
]

export default function UploadZone({ onFileSelected, loading, hideBrand, compact }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError]       = useState(null)

  function handleFiles(fileList) {
    setError(null)
    const all = Array.from(fileList)
    if (!all.length) return
    const valid   = all.filter(f => /\.csv$/i.test(f.name))
    const invalid = all.filter(f => !/\.csv$/i.test(f.name))
    if (valid.length === 0) {
      setError('Please upload .csv files — most banks let you export your statement as a CSV.')
      return
    }
    if (invalid.length > 0) {
      setError(`Skipping ${invalid.length} unsupported file(s) — only .csv files are accepted.`)
    }
    onFileSelected(valid)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  if (compact) {
    return (
      <div className="w-full max-w-md">
        <div
          className={`relative rounded-2xl p-5 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 border-2 border-dashed
            ${dragging ? 'border-[var(--accent)] bg-[var(--accent-light)]' : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--border-subtle)]/50'}
            ${loading ? 'opacity-70 pointer-events-none' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
            {loading ? (
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            ) : (
              <Upload className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {loading ? 'Parsing…' : dragging ? 'Release to add files' : 'Drop CSV here'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>or click to browse</p>
          </div>
          <input ref={inputRef} type="file" accept=".csv" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>
        {error && (
          <div className="mt-2 text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center" style={{ background: 'var(--bg-page)' }}>
      {/* Subtle top gradient for depth */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-[var(--accent-light)]/50 to-transparent" aria-hidden />

      <div className="relative z-10 flex flex-col items-center w-full max-w-2xl px-4 pt-20 pb-24 sm:pt-24 sm:pb-28">

        {/* Logo */}
        {!hideBrand && (
          <div className="animate-fade-up flex items-center gap-2.5 mb-10 sm:mb-12">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display" style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)' }}>
              <Sparkles className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>FinLens</span>
          </div>
        )}

        {/* Hero */}
        <div className="text-center animate-fade-up delay-100 mb-2">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>
            Expense tracker
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-[1.15] tracking-tight mb-5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            See where
            <br />
            <span style={{ color: 'var(--accent)' }}>every dollar goes.</span>
          </h1>
          <p className="text-base sm:text-lg leading-relaxed max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Upload your bank CSV. We categorize every expense so you get a clear breakdown—all in your browser.
          </p>
        </div>

        {/* Upload zone */}
        <div className="w-full mt-10 sm:mt-12 animate-fade-up delay-200">
        <div
          className={`relative rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[220px] sm:min-h-[260px]
              ${dragging ? 'border-2 border-dashed' : 'bg-[var(--bg-card)] border-2 border-dashed hover:bg-[var(--border-subtle)]/50'}
              ${loading ? 'opacity-80 pointer-events-none' : ''}`}
            style={dragging ? { borderColor: 'var(--accent)', background: 'var(--accent-light)', boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.12)' } : { borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${dragging ? 'scale-110' : ''}`} style={{ background: dragging ? 'var(--bg-card)' : 'var(--bg-elevated)', boxShadow: dragging ? 'var(--shadow-md)' : 'none' }}>
              {loading ? (
                <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              ) : (
                <Upload className="w-7 h-7" style={{ color: dragging ? 'var(--accent)' : 'var(--text-muted)' }} strokeWidth={1.8} />
              )}
            </div>
            <p className="text-base font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              {loading ? 'Parsing…' : dragging ? 'Release to upload' : 'Drop CSV files here'}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              or click to browse · CSV only
            </p>
            <div className="mt-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
              <FileText className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Chase, BofA, Wells Fargo, and more</span>
            </div>
            <input ref={inputRef} type="file" accept=".csv" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium animate-fade-in" style={{ background: 'var(--danger-light)', border: '1px solid rgba(244,63,94,0.25)', color: 'var(--danger)' }}>
              <span className="mt-0.5 flex-shrink-0">⚠</span>
              {error}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full mt-12 sm:mt-14 animate-fade-up delay-300">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-xl p-4 transition-all duration-200"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', animationDelay: `${0.35 + i * 0.06}s` }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>
                <Icon className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{title}</p>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy */}
        <p className="mt-10 text-xs font-medium animate-fade-up delay-400 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Shield className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
          Your data never leaves your device.
        </p>
      </div>
    </div>
  )
}
