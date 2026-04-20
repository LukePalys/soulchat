'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { t, LANGUAGE_NAMES, type AppLanguage } from '@/lib/i18n'
import { MessageCircle, Sparkles } from 'lucide-react'

export default function Onboarding() {
  const { user, setUserProfile } = useStore()
  const [name, setName] = useState('')
  const [language, setLanguage] = useState<AppLanguage>(user.language || 'en')
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    if (user.onboarded && user.name) {
      useStore.getState().setView('home')
    }
    if (user.name) setName(user.name)
  }, [])

  const handleContinue = () => {
    if (!name.trim()) return
    if (user.showDataWarning && !showWarning) {
      setShowWarning(true)
      return
    }
    setUserProfile({
      name: name.trim(),
      language,
      onboarded: true,
      showDataWarning: false,
    })
    useStore.getState().setView('home')
  }

  const languages = Object.entries(LANGUAGE_NAMES) as [AppLanguage, string][]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
      {/* Warning Modal */}
      {showWarning && (
        <div className="modal-backdrop">
          <div className="modal p-6">
            <div className="w-12 h-12 rounded-xl bg-[var(--warning-soft)] flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">!</span>
            </div>
            <h2 className="text-base font-semibold text-center mb-2">
              {t(language, 'dataWarningTitle')}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-1.5 text-center">
              {t(language, 'dataWarningText')}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mb-5 text-center">
              {t(language, 'dataWarningTip')}
            </p>
            <button onClick={handleContinue} className="btn-primary w-full">
              {t(language, 'dataWarningButton')}
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm animate-fadeUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[var(--accent)]/20 animate-float">
            <MessageCircle size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1 gradient-text">
            {t(language, 'welcomeTitle')}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {t(language, 'welcomeSubtitle')}
          </p>
        </div>

        {/* Form Card */}
        <div className="section p-5">
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">
              {t(language, 'nameInputPlaceholder').replace('?', '')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
              placeholder={t(language, 'nameInputPlaceholder')}
              className="input"
              autoFocus
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">
              {t(language, 'languageLabel')}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {languages.map(([code, label]) => (
                <button
                  key={code}
                  onClick={() => setLanguage(code)}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                    language === code
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)]/30'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleContinue}
            disabled={!name.trim()}
            className="btn-primary w-full py-3"
          >
            <Sparkles size={16} />
            {t(language, 'letsGo')}
          </button>
        </div>

        <p className="text-center text-[10px] text-[var(--text-muted)] mt-5">
          SoulChat v3.0
        </p>
      </div>
    </div>
  )
}
