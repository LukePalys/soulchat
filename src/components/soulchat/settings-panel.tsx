'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { t, LANGUAGE_NAMES, type AppLanguage } from '@/lib/i18n'
import { getModelById, getSelectableModels, DEFAULT_MODEL_ID } from '@/lib/ai-config'
import { testAllModelsParallel } from '@/lib/ai-chat'
import { ArrowLeft, Download, Upload, Trash2, Sun, Moon, Monitor, Loader2, Check, X, AlertTriangle, MessageCircle, RefreshCw } from 'lucide-react'

export default function SettingsPanel() {
  const { user, settings, setUserProfile, updateSettings, setView, exportData, importData, clearAllData, modelStatuses, setModelStatus } = useStore()
  const lang = user.language

  const [showModelSelector, setShowModelSelector] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const testModels = async () => {
      setTesting(true)
      try {
        const results = await testAllModelsParallel()
        for (const [modelId, status] of Object.entries(results)) setModelStatus(modelId, status)
      } catch (e) { console.error('Model testing failed:', e) }
      finally { setTesting(false) }
    }
    testModels()
  }, [])

  const handleRetest = async () => {
    setTesting(true)
    try {
      const results = await testAllModelsParallel()
      for (const [modelId, status] of Object.entries(results)) setModelStatus(modelId, status)
    } finally { setTesting(false) }
  }

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `soulchat_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      const success = importData(content)
      setImportStatus(success ? t(lang, 'success') : t(lang, 'error'))
      setTimeout(() => setImportStatus(null), 3000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme })
    const html = document.documentElement
    html.classList.remove('dark', 'light')
    if (theme === 'dark') html.classList.add('dark')
    else if (theme === 'light') html.classList.add('light')
    else html.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  }

  useEffect(() => { handleThemeChange(settings.theme) }, [])

  const currentModel = getModelById(settings.selectedModelId || DEFAULT_MODEL_ID)
  const languages = Object.entries(LANGUAGE_NAMES) as [AppLanguage, string][]

  const StatusDot = ({ modelId }: { modelId: string }) => {
    const status = modelStatuses[modelId]
    if (testing) return <Loader2 size={10} className="animate-spin text-[var(--text-muted)]" />
    return (
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
        status === 'online' ? 'bg-[var(--success)]' :
        status === 'offline' ? 'bg-[var(--error)]' :
        'bg-[var(--text-muted)]'
      }`} />
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="header">
        <div className="max-w-xl mx-auto px-4 h-12 flex items-center gap-2">
          <button onClick={() => setView('home')} className="btn-ghost text-xs">
            <ArrowLeft size={14} /> {t(lang, 'back')}
          </button>
          <h1 className="text-sm font-semibold">{t(lang, 'settingsTitle')}</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 space-y-4">
        {/* Profile */}
        <section className="section animate-fadeUp" style={{ animationDelay: '0.03s' }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">{t(lang, 'profileSection')}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-[var(--text-muted)] mb-1">{t(lang, 'nameLabel')}</label>
              <input type="text" value={user.name} onChange={(e) => setUserProfile({ name: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--text-muted)] mb-1">{t(lang, 'languageLabelSettings')}</label>
              <div className="grid grid-cols-3 gap-1.5">
                {languages.map(([code, label]) => (
                  <button key={code} onClick={() => setUserProfile({ language: code })}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] transition-all ${
                      user.language === code
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)]/30'
                    }`}
                  >{label}</button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Theme */}
        <section className="section animate-fadeUp" style={{ animationDelay: '0.06s' }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">{t(lang, 'themeSection')}</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { value: 'light' as const, label: t(lang, 'themeLight'), icon: Sun },
              { value: 'dark' as const, label: t(lang, 'themeDark'), icon: Moon },
              { value: 'system' as const, label: t(lang, 'themeSystem'), icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => handleThemeChange(value)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-[11px] transition-all ${
                  settings.theme === value
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)]/30'
                }`}
              >
                <Icon size={16} />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* AI Model */}
        <section className="section animate-fadeUp" style={{ animationDelay: '0.09s' }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">{t(lang, 'modelSection')}</h2>
          <button onClick={() => setShowModelSelector(true)}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <StatusDot modelId={settings.selectedModelId || DEFAULT_MODEL_ID} />
              <div className="text-left">
                <p className="text-xs font-medium">{currentModel?.name || 'Unknown'}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{currentModel?.description || ''}</p>
              </div>
            </div>
            <span className="text-[10px] text-[var(--accent)] font-medium">{t(lang, 'modelChange')}</span>
          </button>
        </section>

        {/* API Status */}
        <section className="section animate-fadeUp" style={{ animationDelay: '0.12s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{t(lang, 'apiStatusSection')}</h2>
            <button onClick={handleRetest} disabled={testing} className="btn-ghost text-[10px] py-1 px-1.5">
              <RefreshCw size={10} className={testing ? 'animate-spin' : ''} />
              {testing ? t(lang, 'testing') : t(lang, 'retry')}
            </button>
          </div>
          <div className="space-y-0.5">
            {getSelectableModels().map((model) => (
              <div key={model.id} className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                <StatusDot modelId={model.id} />
                <span className="flex-1 truncate text-[var(--text-secondary)]">{model.name}</span>
                <span className={`text-[10px] font-medium ${
                  modelStatuses[model.id] === 'online' ? 'text-[var(--success)]' :
                  modelStatuses[model.id] === 'offline' ? 'text-[var(--error)]' :
                  'text-[var(--text-muted)]'
                }`}>
                  {modelStatuses[model.id] === 'online' ? t(lang, 'online') :
                   modelStatuses[model.id] === 'offline' ? t(lang, 'offline') :
                   testing ? t(lang, 'testing') : t(lang, 'unknown')}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Data */}
        <section className="section animate-fadeUp" style={{ animationDelay: '0.15s' }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">{t(lang, 'dataSection')}</h2>
          <p className="text-[10px] text-[var(--text-muted)] mb-3 flex items-start gap-1">
            <AlertTriangle size={11} className="flex-shrink-0 mt-0.5 text-[var(--warning)]" />
            {t(lang, 'exportTip')}
          </p>
          <div className="space-y-1.5">
            <button onClick={handleExport}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-xs hover:bg-[var(--bg-tertiary)] transition-all"
            >
              <Download size={13} className="text-[var(--text-muted)]" /> {t(lang, 'exportData')}
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-xs hover:bg-[var(--bg-tertiary)] transition-all"
            >
              <Upload size={13} className="text-[var(--text-muted)]" /> {t(lang, 'importData')}
              {importStatus && <span className="text-[10px] text-[var(--success)] ml-auto">{importStatus}</span>}
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
            <button onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--error)]/20 text-xs text-[var(--error)] hover:bg-[var(--error-soft)] transition-all"
            >
              <Trash2 size={13} /> {t(lang, 'clearData')}
            </button>
          </div>
        </section>

        {/* About */}
        <section className="section animate-fadeUp" style={{ animationDelay: '0.18s' }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">{t(lang, 'aboutSection')}</h2>
          <p className="text-xs text-[var(--text-secondary)]">{t(lang, 'appName')} v3.0.0</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t(lang, 'appTagline')}</p>
        </section>
      </main>

      {/* Model Selector */}
      {showModelSelector && (
        <div className="modal-backdrop" onClick={() => setShowModelSelector(false)}>
          <div className="modal max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-semibold">{t(lang, 'modelSelectorTitle')}</h3>
              <button onClick={() => setShowModelSelector(false)} className="p-1 rounded hover:bg-[var(--bg-tertiary)]">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {getSelectableModels().map((model, index) => (
                <button key={model.id}
                  onClick={() => { updateSettings({ selectedModelId: model.id }); setShowModelSelector(false) }}
                  className={`w-full p-2.5 rounded-lg text-left transition-all flex items-center gap-2.5 mb-0.5 text-xs ${
                    settings.selectedModelId === model.id
                      ? 'bg-[var(--accent-soft)] border border-[var(--accent)]/20'
                      : 'hover:bg-[var(--bg-tertiary)] border border-transparent'
                  }`}
                >
                  <span className="text-[10px] font-bold text-[var(--text-muted)] w-4">{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium">{model.name}</p>
                      <StatusDot modelId={model.id} />
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">{model.description}</p>
                  </div>
                  {settings.selectedModelId === model.id && <Check size={14} className="text-[var(--accent)]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirm */}
      {showClearConfirm && (
        <div className="modal-backdrop">
          <div className="modal p-5">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-[var(--error-soft)] flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={18} className="text-[var(--error)]" />
              </div>
              <h3 className="text-sm font-semibold mb-1">{t(lang, 'clearData')}</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">{t(lang, 'clearDataConfirm')}</p>
              <div className="flex gap-2">
                <button onClick={() => setShowClearConfirm(false)} className="btn-secondary flex-1 py-2 text-xs">
                  {t(lang, 'cancel')}
                </button>
                <button onClick={() => { clearAllData(); setShowClearConfirm(false) }}
                  className="flex-1 py-2 bg-[var(--error)] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  {t(lang, 'delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
