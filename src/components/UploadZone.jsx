import React, { useRef, useState } from 'react'
import { Upload, Zap, BarChart2, Download, Shield, Sparkles, FileText } from 'lucide-react'

const FEATURES = [
  { icon: Zap,       title: 'Instant Categorization', desc: '200+ keyword rules across 16 categories' },
  { icon: BarChart2, title: 'Visual Insights',         desc: 'Pie & bar charts of your spending' },
  { icon: Download,  title: 'Export to CSV',           desc: 'Download your categorized data anytime' },
  { icon: Shield,    title: '100% Private',            desc: 'Everything runs in your browser — no uploads' },
]

const BANKS = ['Chase', 'Bank of America', 'Wells Fargo', 'Capital One', 'Citi', 'Any CSV / PDF']

export default function UploadZone({ onFileSelected, loading, hideBrand, compact }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError]       = useState(null)

  function handleFiles(fileList) {
    setError(null)
    const all = Array.from(fileList)
    if (!all.length) return
    const valid   = all.filter(f => /\.(csv|pdf)$/i.test(f.name))
    const invalid = all.filter(f => !/\.(csv|pdf)$/i.test(f.name))
    if (valid.length === 0) {
      setError('Please upload .csv or .pdf files — most banks let you export your statement in one of these formats.')
      return
    }
    if (invalid.length > 0) {
      setError(`Skipping ${invalid.length} unsupported file(s) — only .csv and .pdf are accepted.`)
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
          className={`relative rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-all duration-300
            ${dragging ? 'border-indigo-500/60 bg-indigo-500/10' : 'border-white/10 hover:border-indigo-500/40 bg-white/[0.02]'}
            ${loading ? 'opacity-60 pointer-events-none' : ''}`}
          style={{ border: '1px solid' }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-indigo-500/20">
            {loading ? (
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-7 h-7 text-indigo-400" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white">
              {loading ? 'Parsing…' : dragging ? 'Release to add files' : 'Drop CSV or PDF here'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">or click to browse</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
        {error && (
          <div className="mt-2 text-red-400 text-xs font-medium">{error}</div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-20%] left-[10%]  w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[100px]" />
        <div className="absolute top-[40%] left-[50%]  w-[300px] h-[300px] rounded-full bg-blue-500/10  blur-[80px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-4 pt-16 pb-20">

        {/* Logo / Brand */}
        {!hideBrand && (
          <div className="animate-fade-up flex items-center gap-2.5 mb-16">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">FinLens</span>
          </div>
        )}

        {/* Hero headline */}
        <div className="text-center max-w-2xl mb-4 animate-fade-up delay-100">
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-4">
            <span className="text-white">Understand your</span>
            <br />
            <span className="text-gradient-accent">spending instantly.</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Upload your bank statement — CSV or PDF — and get automatic categorization,<br className="hidden sm:block" />
            visual charts, and spending insights, all in your browser.
          </p>
        </div>

        {/* Upload zone */}
        <div className="w-full max-w-lg mt-10 animate-fade-up delay-200">
          <div
            className={`relative rounded-2xl p-8 flex flex-col items-center gap-4 cursor-pointer transition-all duration-300
              ${dragging
                ? 'glass glow-indigo border-indigo-500/60 scale-[1.02]'
                : 'glass border-white/10 hover:border-indigo-500/40 hover:glow-indigo hover:scale-[1.01]'}
              ${loading ? 'opacity-60 pointer-events-none' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {!loading && !dragging && (
              <span className="absolute inset-0 rounded-2xl border border-indigo-500/30 animate-ping opacity-0 duration-1000" />
            )}

            <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
              ${dragging ? 'bg-indigo-500/30' : 'bg-indigo-500/15'}`}>
              {loading ? (
                <div className="w-8 h-8 border-[3px] border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Upload className={`w-8 h-8 transition-colors ${dragging ? 'text-indigo-300' : 'text-indigo-400'}`} />
                  {dragging && (
                    <div className="absolute inset-0 rounded-2xl bg-indigo-400/10 animate-pulse" />
                  )}
                </>
              )}
            </div>

            <div className="text-center">
              <p className="text-white font-semibold text-lg">
                {loading ? 'Parsing transactions…' : dragging ? 'Release to upload' : 'Drop your files here'}
              </p>
              <p className="text-slate-500 text-sm mt-1">or click to browse · select multiple files at once</p>
            </div>

            {/* Format badges */}
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                <FileText className="w-3.5 h-3.5" />
                CSV
              </div>
              <span className="text-slate-600 text-xs">or</span>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' }}
              >
                <FileText className="w-3.5 h-3.5" />
                PDF
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span className="w-8 h-px bg-slate-700" />
              Supports all major bank formats
              <span className="w-8 h-px bg-slate-700" />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {BANKS.map((b) => (
                <span key={b} className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-400 border border-white/8">
                  {b}
                </span>
              ))}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,.pdf"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm animate-fade-in">
              <span className="mt-0.5 flex-shrink-0">⚠</span>
              {error}
            </div>
          )}
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl w-full mt-16 animate-fade-up delay-300">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="glass-card rounded-xl p-4 flex flex-col gap-2 hover:border-indigo-500/30 transition-all duration-300 group"
              style={{ animationDelay: `${0.3 + i * 0.08}s` }}
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center group-hover:bg-indigo-500/25 transition-colors">
                <Icon className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Privacy note */}
        <p className="mt-10 text-xs text-slate-600 animate-fade-up delay-400 flex items-center gap-1.5">
          <Shield className="w-3 h-3" />
          Your data never leaves your device. All processing happens locally.
        </p>
      </div>
    </div>
  )
}
