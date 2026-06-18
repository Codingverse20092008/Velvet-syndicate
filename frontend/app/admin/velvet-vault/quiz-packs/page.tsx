'use client'

import { useState, useRef, DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle,
  Package, Search, Filter, Trash2,
  BarChart3, Clock, RefreshCw, Hash, Sparkles, ChevronDown
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://velvet-syndicate.onrender.com'

interface ValidationError {
  questionNumber: number
  field: string
  message: string
}

interface VersionInfo {
  existing: boolean
  currentVersion: number
  latestVersion: number
}

interface ImportResult {
  success: boolean
  packId: string
  packName: string
  category: string
  difficulty: string
  version: number
  questionsImported: number
  questionsFailed: number
  totalXp: number
  totalCoins: number
  errors?: string[]
}

type PageState = 'upload' | 'validating' | 'validation-result' | 'preview' | 'importing' | 'imported' | 'manage' | 'analytics'

export default function QuizPacksAdminPage() {
  const [pageState, setPageState] = useState<PageState>('upload')
  const [jsonData, setJsonData] = useState<any>(null)
  const [jsonFileName, setJsonFileName] = useState('')
  const [jsonContent, setJsonContent] = useState('')
  const [validationResult, setValidationResult] = useState<any>(null)
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importAction, setImportAction] = useState<'create_new' | 'update_existing'>('create_new')
  const [packs, setPacks] = useState<any[]>([])
  const [packsTotal, setPacksTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [analytics, setAnalytics] = useState<any>(null)
  const [perPackAnalytics, setPerPackAnalytics] = useState<any>(null)
  const [difficultyRanking, setDifficultyRanking] = useState<any>(null)
  const [expandedPack, setExpandedPack] = useState<string | null>(null)
  const [packDetail, setPackDetail] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isDragActive, setIsDragActive] = useState(false)

  const handleFileDrop = (file: File) => {
    if (!file || !file.name.endsWith('.json')) {
      setError('Please upload a .json file')
      return
    }
    setJsonFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setJsonContent(text)
      try {
        const data = JSON.parse(text)
        setJsonData(data)
        setError('')
      } catch {
        setError('Invalid JSON file')
        setJsonData(null)
      }
    }
    reader.readAsText(file)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = () => setIsDragActive(false)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileDrop(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileDrop(file)
  }

  const handleTextJsonChange = (text: string) => {
    setJsonContent(text)
    try {
      const data = JSON.parse(text)
      setJsonData(data)
      setError('')
    } catch {
      if (text.trim()) setError('Invalid JSON syntax')
      else setError('')
      setJsonData(null)
    }
  }

  const handleValidate = async () => {
    if (!jsonData) return
    setLoading(true)
    setPageState('validating')
    try {
      const res = await fetch(`${API_URL}/api/quiz-packs/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      })
      const data = await res.json()
      setValidationResult(data.data || data)
      setVersionInfo(data.data?.versionInfo || null)
      setPageState('validation-result')
    } catch {
      setError('Failed to validate pack')
      setPageState('upload')
    }
    setLoading(false)
  }

  const handleImport = async () => {
    if (!jsonData || !validationResult?.valid) return
    setLoading(true)
    setPageState('importing')
    try {
      const action = importAction === 'create_new' ? '' : 'action=update'
      const res = await fetch(`${API_URL}/api/quiz-packs/import?${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      })
      const data = await res.json()
      setImportResult(data.data || data)
      setPageState('imported')
    } catch {
      setError('Import failed')
      setPageState('validation-result')
    }
    setLoading(false)
  }

  const handleReset = () => {
    setPageState('upload')
    setJsonData(null)
    setJsonContent('')
    setJsonFileName('')
    setValidationResult(null)
    setVersionInfo(null)
    setImportResult(null)
    setError('')
  }

  const loadPacks = async (search?: string, status?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      const res = await fetch(`${API_URL}/api/quiz-packs/packs?${params}`)
      const data = await res.json()
      setPacks(data.data?.packs || [])
      setPacksTotal(data.data?.total || 0)
    } catch {
      setError('Failed to load packs')
    }
    setLoading(false)
  }

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const [mainRes, perPackRes, diffRes] = await Promise.all([
        fetch(`${API_URL}/api/quiz-packs/analytics`),
        fetch(`${API_URL}/api/quiz-packs/analytics/packs`),
        fetch(`${API_URL}/api/quiz-packs/analytics/questions/difficulty?limit=20`),
      ])
      const [mainData, perPackData, diffData] = await Promise.all([
        mainRes.json(), perPackRes.json(), diffRes.json(),
      ])
      setAnalytics(mainData.data || mainData)
      setPerPackAnalytics(perPackData.data || perPackData)
      setDifficultyRanking(diffData.data || diffData)
    } catch {
      setError('Failed to load analytics')
    }
    setLoading(false)
  }

  const loadPackDetail = async (packId: string) => {
    if (expandedPack === packId) {
      setExpandedPack(null)
      setPackDetail(null)
      return
    }
    setExpandedPack(packId)
    setPackDetail(null)
    try {
      const res = await fetch(`${API_URL}/api/quiz-packs/analytics/packs/${packId}`)
      const data = await res.json()
      setPackDetail(data.data || data)
    } catch {
      setError('Failed to load pack detail')
    }
  }

  const handleDeletePack = async (packId: string) => {
    if (!confirm('Delete this pack? This cannot be undone.')) return
    try {
      await fetch(`${API_URL}/api/quiz-packs/packs/${packId}`, { method: 'DELETE' })
      loadPacks(searchQuery, statusFilter)
    } catch {
      setError('Failed to delete pack')
    }
  }

  const handleToggleStatus = async (packId: string, status: string) => {
    try {
      await fetch(`${API_URL}/api/quiz-packs/packs/${packId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      loadPacks(searchQuery, statusFilter)
    } catch {
      setError('Failed to update status')
    }
  }

  return (
    <main className="min-h-screen bg-velvet-black px-4 py-16 sm:px-6 md:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Velvet Vault Admin</p>
            <h1 className="mt-2 text-3xl font-heading uppercase tracking-[0.04em] text-velvet-white flex items-center gap-3">
              <Package className="w-7 h-7 text-orange-400" />
              Quiz Pack Import System
            </h1>
          </div>
          <div className="flex gap-2">
            {[
              { id: 'upload' as PageState, label: 'Upload' },
              { id: 'manage' as PageState, label: 'Manage' },
              { id: 'analytics' as PageState, label: 'Analytics' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setPageState(tab.id)
                  if (tab.id === 'manage') loadPacks()
                  if (tab.id === 'analytics') loadAnalytics()
                }}
                className={`px-5 py-2.5 rounded-full text-[9px] uppercase tracking-[0.24em] font-bold transition-all ${
                  pageState === tab.id
                    ? 'bg-velvet-white text-velvet-black'
                    : 'bg-white/5 text-velvet-muted hover:text-velvet-white border border-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
            >
              {error}
              <button onClick={() => setError('')} className="ml-4 underline">Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== UPLOAD TAB ===== */}
        {pageState === 'upload' && (
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8 text-center">
              <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 transition-all cursor-pointer ${
                isDragActive
                  ? 'border-orange-500 bg-orange-500/5'
                  : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-12 h-12 text-velvet-muted mx-auto mb-4" />
              <p className="text-lg text-velvet-white font-semibold mb-2">
                {isDragActive ? 'Drop your JSON file here' : 'Drag & drop a Quiz Pack JSON file'}
              </p>
              <p className="text-sm text-velvet-muted mb-4">or click to browse</p>
              <p className="text-[10px] text-velvet-muted">Supports .json files</p>
            </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8 space-y-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Or Paste JSON</p>
              <textarea
                value={jsonContent}
                onChange={e => handleTextJsonChange(e.target.value)}
                placeholder={`{\n  "packName": "My Quiz Pack",\n  "description": "...",\n  "category": "Sneaker Culture",\n  "difficulty": "easy",\n  "questions": [...]\n}`}
                className="w-full h-48 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-velvet-white font-mono placeholder:text-velvet-muted/30 focus:outline-none focus:border-orange-500/50"
              />
            </div>

            {/* JSON Format Guide */}
            <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-3">📋 Required JSON Format</p>
              <pre className="text-xs text-velvet-muted font-mono whitespace-pre-wrap">
{`{
  "packName": "Sneaker Trivia Vol 1",
  "description": "Test your sneaker knowledge",
  "category": "Sneaker Culture",
  "difficulty": "easy",
  "reward": {},
  "questions": [
    {
      "type": "mcq",
      "question": "What year were Air Jordans first released?",
      "options": ["1984", "1985", "1986", "1987"],
      "correctAnswer": "1985",
      "xp": 10,
      "coins": 0,
      "explanation": "The first Air Jordans were released in 1985."
    }
  ]
}`}
              </pre>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { type: 'mcq', desc: 'Multiple Choice' },
                  { type: 'fill_blank', desc: 'Fill in Blank' },
                  { type: 'true_false', desc: 'True / False' },
                  { type: 'multi_select', desc: 'Multi Select' },
                ].map(t => (
                  <div key={t.type} className="rounded-xl border border-white/5 bg-black/30 p-3 text-center">
                    <p className="text-xs font-semibold text-velvet-white">{t.type}</p>
                    <p className="text-[9px] text-velvet-muted">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {jsonData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-sm text-velvet-white font-semibold">{jsonFileName || 'Pasted JSON'}</p>
                    <p className="text-xs text-velvet-muted">{jsonData.questions?.length || 0} questions loaded</p>
                  </div>
                </div>
                <button
                  onClick={handleValidate}
                  className="px-6 py-3 rounded-full bg-orange-500 text-black text-[9px] uppercase tracking-[0.24em] font-bold hover:bg-orange-400 transition-all"
                >
                  Validate & Preview
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* ===== VALIDATION / PREVIEW ===== */}
        {(pageState === 'validating' || pageState === 'validation-result' || pageState === 'preview' || pageState === 'importing' || pageState === 'imported') && validationResult && (
          <div className="space-y-8">

            {/* Validation Results */}
            {pageState !== 'imported' && (
              <div className={`rounded-[2rem] border p-8 ${
                validationResult.valid
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-red-500/20 bg-red-500/5'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  {validationResult.valid ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-400" />
                  )}
                  <div>
                    <h2 className="text-xl font-heading text-velvet-white">
                      {validationResult.valid ? 'Validation Passed' : 'Validation Failed'}
                    </h2>
                    <p className="text-sm text-velvet-muted">
                      {validationResult.errors?.length || 0} error(s) found
                    </p>
                  </div>
                </div>

                {!validationResult.valid && validationResult.errors?.length > 0 && (
                  <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
                    {validationResult.errors.map((err: ValidationError, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-red-300">
                            {err.questionNumber > 0 ? `Question #${err.questionNumber}: ` : ''}{err.message}
                          </p>
                          <p className="text-[9px] text-red-400/60">Field: {err.field}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {validationResult.valid && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="Pack Name" value={validationResult.packName} />
                    <StatCard label="Category" value={validationResult.category} />
                    <StatCard label="Difficulty" value={validationResult.difficulty} />
                    <StatCard label="Total Questions" value={String(validationResult.questionCount)} />
                    <StatCard label="Total XP" value={String(validationResult.totalXp)} />
                    <StatCard label="Total Coins" value={String(validationResult.totalCoins)} />
                    {versionInfo && (
                      <StatCard label="Latest Version" value={`v${versionInfo.latestVersion}`} />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Version Conflict */}
            {validationResult.valid && versionInfo?.existing && pageState === 'validation-result' && (
              <div className="rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-6 space-y-4">
                <p className="text-sm font-semibold text-amber-300">⚠️ Pack already exists v{versionInfo.latestVersion}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setImportAction('create_new'); setPageState('preview') }}
                    className="px-6 py-3 rounded-full bg-amber-500 text-black text-[9px] uppercase tracking-[0.24em] font-bold hover:bg-amber-400"
                  >
                    Create New Version (v{versionInfo.latestVersion + 1})
                  </button>
                  <button
                    onClick={() => { setImportAction('update_existing'); setPageState('preview') }}
                    className="px-6 py-3 rounded-full border border-amber-500/30 text-amber-300 text-[9px] uppercase tracking-[0.24em] font-bold hover:bg-amber-500/10"
                  >
                    Update Existing Version
                  </button>
                </div>
              </div>
            )}

            {validationResult.valid && !versionInfo?.existing && pageState === 'validation-result' && (
              <div className="flex gap-3">
                <button
                  onClick={() => setPageState('preview')}
                  className="px-8 py-4 rounded-full bg-orange-500 text-black text-[10px] uppercase tracking-[0.24em] font-bold hover:bg-orange-400"
                >
                  Preview Questions
                </button>
              </div>
            )}

            {/* Preview */}
            {pageState === 'preview' && (
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-4">Preview (First 10 Questions)</p>
                  <div className="space-y-4">
                    {validationResult.previewQuestions?.map((q: any, i: number) => (
                      <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] uppercase tracking-wider text-velvet-muted">
                            #{q.number} — {q.type}
                          </span>
                          <span className="text-[9px] text-velvet-muted">+{q.xp} XP</span>
                        </div>
                        <p className="text-sm text-velvet-white">{q.question}</p>
                        {q.options && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {q.options.map((opt: string, j: number) => (
                              <span key={j} className="text-[10px] px-2.5 py-1 rounded-full border border-white/10 bg-black/30 text-velvet-muted">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleImport}
                    disabled={loading}
                    className="px-8 py-4 rounded-full bg-emerald-500 text-black text-[10px] uppercase tracking-[0.24em] font-bold hover:bg-emerald-400 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Importing...' : `Confirm Import (v${importAction === 'create_new' ? (versionInfo?.latestVersion || 0) + 1 : versionInfo?.latestVersion || 1})`}
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-8 py-4 rounded-full border border-white/10 text-velvet-muted text-[10px] uppercase tracking-[0.24em] font-bold hover:text-velvet-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Importing */}
            {pageState === 'importing' && (
              <div className="text-center py-16">
                <RefreshCw className="w-12 h-12 text-orange-400 mx-auto mb-4 animate-spin" />
                <p className="text-lg text-velvet-white">Importing quiz pack...</p>
              </div>
            )}

            {/* Imported Successfully */}
            {pageState === 'imported' && importResult && (
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-heading text-velvet-white mb-2">Pack Imported Successfully</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto mt-6">
                    <StatCard label="Questions" value={String(importResult.questionsImported)} />
                    <StatCard label="Category" value={importResult.category} />
                    <StatCard label="Difficulty" value={importResult.difficulty} />
                    <StatCard label="Version" value={`v${importResult.version}`} />
                    <StatCard label="Total XP" value={String(importResult.totalXp)} />
                    <StatCard label="Total Coins" value={String(importResult.totalCoins)} />
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                      <p className="text-sm text-red-300">{importResult.errors.length} question(s) failed</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleReset}
                    className="px-8 py-4 rounded-full bg-velvet-white text-black text-[10px] uppercase tracking-[0.24em] font-bold hover:bg-white/90"
                  >
                    Import Another Pack
                  </button>
                  <button
                    onClick={() => { setPageState('manage'); loadPacks() }}
                    className="px-8 py-4 rounded-full border border-white/10 text-velvet-muted text-[10px] uppercase tracking-[0.24em] font-bold hover:text-velvet-white"
                  >
                    View All Packs
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== MANAGE PACKS ===== */}
        {pageState === 'manage' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-velvet-muted" />
                <input
                  type="text"
                  placeholder="Search packs..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadPacks(searchQuery, statusFilter)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-velvet-white placeholder:text-velvet-muted/50 focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); loadPacks(searchQuery, e.target.value) }}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white focus:outline-none focus:border-orange-500/50"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
              <button
                onClick={() => loadPacks(searchQuery, statusFilter)}
                className="px-5 py-3 rounded-xl bg-orange-500 text-black text-[9px] uppercase tracking-[0.2em] font-bold hover:bg-orange-400"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {packs.length === 0 && !loading && (
                <div className="rounded-[2rem] border border-white/10 bg-black/40 p-12 text-center">
                  <Package className="w-12 h-12 text-velvet-muted mx-auto mb-4" />
                  <p className="text-velvet-muted">No quiz packs found. Import one to get started.</p>
                </div>
              )}

              {packs.map((pack: any) => (
                <div key={pack.id} className="rounded-2xl border border-white/10 bg-black/40 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-velvet-white">{pack.pack_name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-bold ${
                        pack.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                        pack.status === 'inactive' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {pack.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="text-[10px] text-velvet-muted">{pack.category}</span>
                      <span className="text-[10px] text-velvet-muted capitalize">{pack.difficulty}</span>
                      <span className="text-[10px] text-velvet-muted">v{pack.version}</span>
                      <span className="text-[10px] text-velvet-muted">{pack.question_count} questions</span>
                      <span className="text-[10px] text-velvet-muted">{pack.total_xp} XP</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(pack.id, pack.status === 'active' ? 'inactive' : 'active')}
                      className={`px-4 py-2 rounded-full text-[8px] uppercase tracking-wider font-bold border transition-all ${
                        pack.status === 'active'
                          ? 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10'
                          : 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
                      }`}
                    >
                      {pack.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeletePack(pack.id)}
                      className="px-4 py-2 rounded-full border border-red-500/20 text-red-400 text-[8px] uppercase tracking-wider font-bold hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-orange-400 mx-auto animate-spin" />
                </div>
              )}
            </div>

            {packs.length > 0 && (
              <p className="text-xs text-velvet-muted text-center">{packsTotal} total pack(s)</p>
            )}
          </div>
        )}

        {/* ===== ANALYTICS ===== */}
        {pageState === 'analytics' && (
          <div className="space-y-8">
            {!analytics && loading && (
              <div className="text-center py-16">
                <RefreshCw className="w-12 h-12 text-orange-400 mx-auto animate-spin" />
              </div>
            )}

            {analytics && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <AnalyticCard icon={Package} label="Total Packs" value={String(analytics.totalPacks)} color="text-blue-400" />
                  <AnalyticCard icon={Hash} label="Total Questions" value={String(analytics.totalQuestions)} color="text-emerald-400" />
                  <AnalyticCard icon={BarChart3} label="Total Attempts" value={String(analytics.totalAttempts)} color="text-amber-400" />
                  <AnalyticCard icon={Clock} label="Daily Active Users" value={String(analytics.dailyActiveUsers)} color="text-purple-400" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <AnalyticCard icon={CheckCircle2} label="Correct Rate" value={`${analytics.correctRate}%`} color="text-emerald-400" />
                  <AnalyticCard icon={XCircle} label="Incorrect Rate" value={`${analytics.incorrectRate}%`} color="text-red-400" />
                  <AnalyticCard icon={Sparkles} label="Top Category" value={analytics.mostAttemptedCategory} color="text-orange-400" />
                  <AnalyticCard icon={AlertTriangle} label="Most Failed" value={analytics.mostFailedQuestion?.question?.slice(0, 30) || 'N/A'} color="text-red-400" />
                </div>

                {/* Questions by Type */}
                <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-4">Questions by Type</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {analytics.questionsByType?.map((t: any) => (
                      <div key={t.type} className="rounded-xl border border-white/5 bg-black/30 p-4 text-center">
                        <p className="text-lg font-bold text-velvet-white">{t.count}</p>
                        <p className="text-[9px] uppercase tracking-wider text-velvet-muted mt-1">{t.type}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Questions by Difficulty */}
                <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-4">Questions by Difficulty</p>
                  <div className="grid grid-cols-3 gap-3">
                    {analytics.questionsByDifficulty?.map((d: any) => (
                      <div key={d.difficulty} className="rounded-xl border border-white/5 bg-black/30 p-4 text-center">
                        <p className="text-lg font-bold text-velvet-white">{d.count}</p>
                        <p className="text-[9px] uppercase tracking-wider text-velvet-muted mt-1 capitalize">{d.difficulty}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent 7-day Activity */}
                {analytics.recentAttempts?.length > 0 && (
                  <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-4">Last 7 Days Activity</p>
                    <div className="flex items-end gap-2 h-24">
                      {analytics.recentAttempts.map((d: any) => {
                        const maxCount = Math.max(...analytics.recentAttempts.map((r: any) => r.count), 1)
                        const heightPct = (d.count / maxCount) * 100
                        return (
                          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[8px] text-velvet-muted">{d.count}</span>
                            <div
                              className="w-full rounded-t bg-gradient-to-t from-orange-500 to-amber-400"
                              style={{ height: `${Math.max(heightPct, 4)}%` }}
                            />
                            <span className="text-[7px] text-velvet-muted">{d.date?.slice(5)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Per-Pack Analytics */}
                {perPackAnalytics?.packs?.length > 0 && (
                  <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-4">Per-Pack Performance</p>
                    <div className="space-y-3">
                      {perPackAnalytics.packs.map((p: any) => (
                        <div key={p.packId}>
                          <button
                            onClick={() => loadPackDetail(p.packId)}
                            className="w-full rounded-2xl border border-white/5 bg-black/30 p-4 text-left hover:border-white/20 transition-all"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-velvet-white">{p.packName}</p>
                                  <span className={`px-1.5 py-0.5 rounded-full text-[7px] uppercase tracking-wider ${
                                    p.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {p.status}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <span className="text-[9px] text-velvet-muted">{p.totalQuestions} questions</span>
                                  <span className="text-[9px] text-velvet-muted">{p.totalAttempts} attempts</span>
                                  <span className="text-[9px] text-velvet-muted">{p.category}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 shrink-0">
                                <div className="text-center">
                                  <p className={`text-lg font-bold ${
                                    p.correctRate >= 70 ? 'text-emerald-400' : p.correctRate >= 40 ? 'text-amber-400' : 'text-red-400'
                                  }`}>
                                    {p.correctRate}%
                                  </p>
                                  <p className="text-[7px] uppercase tracking-wider text-velvet-muted">Correct</p>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-velvet-muted transition-transform ${expandedPack === p.packId ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                          </button>

                          {/* Expandable Pack Detail */}
                          {expandedPack === p.packId && (
                            <div className="mt-2 ml-4 rounded-2xl border border-white/5 bg-black/20 p-4 space-y-4">
                              {!packDetail && (
                                <div className="text-center py-4">
                                  <RefreshCw className="w-5 h-5 text-orange-400 mx-auto animate-spin" />
                                </div>
                              )}

                              {packDetail && packDetail.pack && (
                                <>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <StatCard label="Attempts" value={String(packDetail.pack.totalAttempts)} />
                                    <StatCard label="Correct" value={String(packDetail.pack.correctAttempts)} />
                                    <StatCard label="Type Count" value={String(packDetail.pack.questionsByType?.length || 0)} />
                                    <StatCard label="Diff Tiers" value={String(packDetail.pack.questionsByDifficulty?.length || 0)} />
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[9px] uppercase tracking-wider text-velvet-muted mb-2">By Type</p>
                                      {packDetail.pack.questionsByType?.map((t: any) => (
                                        <div key={t.type} className="flex items-center justify-between px-3 py-1.5 text-xs text-velvet-white">
                                          <span className="text-velvet-muted">{t.type}</span>
                                          <span className="font-semibold">{t.count}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div>
                                      <p className="text-[9px] uppercase tracking-wider text-velvet-muted mb-2">By Difficulty</p>
                                      {packDetail.pack.questionsByDifficulty?.map((d: any) => (
                                        <div key={d.difficulty} className="flex items-center justify-between px-3 py-1.5 text-xs text-velvet-white">
                                          <span className="text-velvet-muted capitalize">{d.difficulty}</span>
                                          <span className="font-semibold">{d.count}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Per-Question Stats */}
                                  {packDetail.questions?.length > 0 && (
                                    <div>
                                      <p className="text-[9px] uppercase tracking-wider text-velvet-muted mb-2">Per-Question Stats</p>
                                      <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {packDetail.questions.map((q: any) => (
                                          <div key={q.questionId} className="rounded-xl border border-white/5 bg-black/20 p-3">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs text-velvet-white truncate">{q.question}</p>
                                                <div className="flex gap-2 mt-1">
                                                  <span className="text-[8px] text-velvet-muted uppercase">{q.type}</span>
                                                  <span className="text-[8px] text-velvet-muted capitalize">{q.difficulty}</span>
                                                  <span className="text-[8px] text-velvet-muted">{q.totalAttempts} attempts</span>
                                                </div>
                                              </div>
                                              <div className="text-right shrink-0">
                                                <p className={`text-sm font-bold ${
                                                  q.correctRate >= 70 ? 'text-emerald-400' : q.correctRate >= 40 ? 'text-amber-400' : 'text-red-400'
                                                }`}>
                                                  {q.correctRate}%
                                                </p>
                                                <p className="text-[7px] text-velvet-muted">Correct</p>
                                              </div>
                                            </div>
                                            <div className="mt-2 flex gap-1.5">
                                              <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                                                <div
                                                  className="h-full rounded-full bg-emerald-500"
                                                  style={{ width: `${q.correctRate}%` }}
                                                />
                                              </div>
                                              <span className="text-[7px] text-velvet-muted">{q.correctCount}/{q.totalAttempts}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question Difficulty Ranking */}
                {difficultyRanking?.questions?.length > 0 && (
                  <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-2">Hardest Questions</p>
                    <p className="text-[9px] text-velvet-muted mb-4">Ranked by lowest correct rate</p>
                    <div className="space-y-2">
                      {difficultyRanking.questions.map((q: any, i: number) => (
                        <div key={q.questionId} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/30 p-3">
                          <span className="text-[10px] font-bold text-velvet-muted w-5 text-right">#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-velvet-white truncate">{q.question}</p>
                            <div className="flex gap-2 mt-0.5">
                              <span className="text-[8px] text-velvet-muted uppercase">{q.type}</span>
                              <span className="text-[8px] text-velvet-muted capitalize">{q.difficulty}</span>
                              <span className="text-[8px] text-velvet-muted">{q.totalAttempts} attempts</span>
                              <span className="text-[8px] text-velvet-muted text-orange-400/60">{q.packName}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-red-400">{q.difficultyScore}%</p>
                            <p className="text-[7px] text-velvet-muted">Fail rate</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={loadAnalytics}
                  className="px-6 py-3 rounded-full border border-white/10 text-velvet-muted text-[9px] uppercase tracking-[0.2em] font-bold hover:text-velvet-white"
                >
                  Refresh Analytics
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/30 p-4 text-center">
      <p className="text-[9px] uppercase tracking-wider text-velvet-muted">{label}</p>
      <p className="text-sm font-bold text-velvet-white mt-1 truncate">{value}</p>
    </div>
  )
}

function AnalyticCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
      <div className="flex items-center gap-3 mb-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <p className="text-[10px] uppercase tracking-wider text-velvet-muted flex-1">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
