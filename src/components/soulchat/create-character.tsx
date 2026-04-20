'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'
import { multiStepResearch } from '@/lib/wikipedia'
import { generateSystemPrompt, generateGreetingPrompt, sendChatMessage } from '@/lib/ai-chat'
import { DEFAULT_MODIFIERS, TONES, type Character, type CharacterModifiers, type ResearchProgress } from '@/lib/types'
import { DEFAULT_MODEL_ID } from '@/lib/ai-config'
import { ArrowLeft, ArrowRight, Search, Loader2, Check, Upload, Sparkles, X, BookOpen } from 'lucide-react'

function emptyForm() {
  return {
    name: '', description: '', source: '', avatar: '',
    personality: '', speechStyle: '', tone: 'calm' as string,
    energyLevel: 5, intelligence: 5, empathy: 5, humor: 5,
    modifiers: { ...DEFAULT_MODIFIERS },
    extraInstructions: '', lore: '', wikiData: '',
  }
}

export default function CreateCharacter() {
  const { user, settings, addCharacter, updateCharacter, setView, editingCharacterId, characters, setEditingCharacter } = useStore()
  const lang = user.language
  const editingCharacter = editingCharacterId ? characters.find(c => c.id === editingCharacterId) : null

  // Form state
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [source, setSource] = useState('')
  const [avatar, setAvatar] = useState('')
  const [personality, setPersonality] = useState('')
  const [speechStyle, setSpeechStyle] = useState('')
  const [tone, setTone] = useState('calm')
  const [energyLevel, setEnergyLevel] = useState(5)
  const [intelligence, setIntelligence] = useState(5)
  const [empathy, setEmpathy] = useState(5)
  const [humor, setHumor] = useState(5)
  const [modifiers, setModifiers] = useState<CharacterModifiers>({ ...DEFAULT_MODIFIERS })
  const [extraInstructions, setExtraInstructions] = useState('')
  const [lore, setLore] = useState('')
  const [wikiData, setWikiData] = useState('')

  // Research state
  const [researching, setResearching] = useState(false)
  const [researchProgress, setResearchProgress] = useState<ResearchProgress | null>(null)
  const [generating, setGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // RESET form when switching from edit to create, or when component mounts for new character
  const resetForm = useCallback((clearAll = true) => {
    const empty = emptyForm()
    if (clearAll) {
      setName(empty.name)
      setDescription(empty.description)
      setSource(empty.source)
      setAvatar(empty.avatar)
      setPersonality(empty.personality)
      setSpeechStyle(empty.speechStyle)
      setTone(empty.tone)
      setEnergyLevel(empty.energyLevel)
      setIntelligence(empty.intelligence)
      setEmpathy(empty.empathy)
      setHumor(empty.humor)
      setModifiers({ ...empty.modifiers })
      setExtraInstructions(empty.extraInstructions)
      setLore(empty.lore)
      setWikiData(empty.wikiData)
    }
    setStep(1)
    setResearchProgress(null)
  }, [])

  // Load character data when editing
  useEffect(() => {
    if (editingCharacter) {
      setName(editingCharacter.name || '')
      setDescription(editingCharacter.description || '')
      setSource(editingCharacter.source || '')
      setAvatar(editingCharacter.avatar || '')
      setPersonality(editingCharacter.personality || '')
      setSpeechStyle(editingCharacter.speechStyle || '')
      setTone(editingCharacter.tone || 'calm')
      setEnergyLevel(editingCharacter.energyLevel || 5)
      setIntelligence(editingCharacter.intelligence || 5)
      setEmpathy(editingCharacter.empathy || 5)
      setHumor(editingCharacter.humor || 5)
      setModifiers(editingCharacter.modifiers || { ...DEFAULT_MODIFIERS })
      setExtraInstructions(editingCharacter.extraInstructions || '')
      setLore(editingCharacter.lore || '')
      setWikiData(editingCharacter.wikiData || '')
      setStep(1)
    } else {
      resetForm(true)
    }
  }, [editingCharacterId, resetForm])

  const handleResearch = async () => {
    if (!name.trim()) return
    setResearching(true)
    setResearchProgress(null)

    try {
      const result = await multiStepResearch(
        name.trim(),
        source || undefined,
        (progress) => setResearchProgress({ ...progress })
      )

      if (result.isComplete && result.compiledText) {
        setDescription(prev => prev || result.compiledText.substring(0, 500) || '')
        if (result.thumbnail) setAvatar(prev => prev || result.thumbnail)
        if (result.source) setSource(prev => prev || result.source)
        setLore(result.compiledText)
        setWikiData(result.compiledText)
      }
    } catch (e) {
      console.error('Research failed:', e)
    } finally {
      setResearching(false)
    }
  }

  const handleGeneratePersonality = async () => {
    if (!name.trim()) return
    setGenerating(true)

    try {
      const context = lore || `Character: ${name}. Source: ${source}. Description: ${description}`
      const prompt = `Based on the following character information, create a roleplay profile. Answer in this exact JSON format (no markdown, just raw JSON):
{
  "personality": "detailed personality description",
  "speechStyle": "how they speak, catchphrases, accent, vocabulary",
  "tone": "one of: ${TONES.join(', ')}",
  "energyLevel": 1-10,
  "intelligence": 1-10,
  "empathy": 1-10,
  "humor": 1-10
}

Character info:
${context}`

      const response = await sendChatMessage('', [], prompt, settings.selectedModelId || DEFAULT_MODEL_ID, '')
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0])
        if (data.personality) setPersonality(data.personality)
        if (data.speechStyle) setSpeechStyle(data.speechStyle)
        if (data.tone && TONES.includes(data.tone)) setTone(data.tone)
        if (data.energyLevel) setEnergyLevel(Math.min(10, Math.max(1, Math.round(data.energyLevel))))
        if (data.intelligence) setIntelligence(Math.min(10, Math.max(1, Math.round(data.intelligence))))
        if (data.empathy) setEmpathy(Math.min(10, Math.max(1, Math.round(data.empathy))))
        if (data.humor) setHumor(Math.min(10, Math.max(1, Math.round(data.humor))))
      }
    } catch (e) {
      console.error('Failed to generate personality:', e)
    } finally {
      setGenerating(false)
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_SIZE = 200
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        setAvatar(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = result
    }
    reader.readAsDataURL(file)
  }

  const toggleModifier = (key: keyof CharacterModifiers) => {
    if (key === 'secretDescription') return
    setModifiers(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleCreate = () => {
    const systemPrompt = generateSystemPrompt({
      name, description, source, personality, speechStyle, tone,
      energyLevel, intelligence, empathy, humor,
      modifiers, extraInstructions, lore, wikiData,
    }, user.language)

    const character: Character = {
      id: editingCharacter?.id || `char_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: name.trim(),
      description, source, avatar, personality, speechStyle, tone,
      energyLevel, intelligence, empathy, humor,
      modifiers, extraInstructions, systemPrompt, lore, wikiData,
      createdAt: editingCharacter?.createdAt || new Date().toISOString(),
      lastChatAt: new Date().toISOString(),
    }

    if (editingCharacterId) {
      updateCharacter(editingCharacterId, character)
    } else {
      addCharacter(character)
    }
    setEditingCharacter(null)
    setView('home')
  }

  const canProceedStep1 = name.trim().length > 0

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="header">
        <div className="max-w-xl mx-auto px-4 h-12 flex items-center justify-between">
          <button
            onClick={() => {
              if (step === 1) {
                setEditingCharacter(null)
                setView('home')
              } else {
                setStep(step - 1)
              }
            }}
            className="btn-ghost text-xs"
          >
            <ArrowLeft size={14} />
            {t(lang, 'back')}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {editingCharacterId ? t(lang, 'editCharacter') : t(lang, 'createTitle')}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
              {step}/3
            </span>
          </div>
          <div className="w-12" />
        </div>
        <div className="progress">
          <div className="progress-fill" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5">
        {/* Research Progress Overlay */}
        {(researching || (researchProgress && !researchProgress.isComplete)) && (
          <div className="modal-backdrop">
            <div className="modal p-5" onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center mx-auto mb-3">
                  <BookOpen size={22} className="text-[var(--accent)] animate-float" />
                </div>
                <h2 className="text-sm font-semibold mb-0.5">{t(lang, 'researchProgressTitle')}</h2>
                <p className="text-xs text-[var(--text-muted)]">{name}</p>
              </div>

              <div className="space-y-2 mb-4">
                {researchProgress?.steps.map((s) => (
                  <div key={s.id} className="flex items-center gap-2.5 animate-fadeIn">
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[10px] ${
                      s.status === 'done' ? 'bg-[var(--success-soft)] text-[var(--success)]' :
                      s.status === 'active' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' :
                      s.status === 'error' ? 'bg-[var(--error-soft)] text-[var(--error)]' :
                      'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                    }`}>
                      {s.status === 'done' ? <Check size={10} /> :
                       s.status === 'active' ? <Loader2 size={10} className="animate-spin" /> :
                       s.status === 'error' ? <X size={10} /> :
                       <span>{s.id}</span>}
                    </div>
                    <span className={`text-xs ${
                      s.status === 'active' ? 'text-[var(--text-primary)] font-medium' :
                      s.status === 'done' ? 'text-[var(--success)]' :
                      'text-[var(--text-muted)]'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="progress">
                <div
                  className="progress-fill transition-all duration-500"
                  style={{ width: `${researchProgress ? (researchProgress.currentStep / researchProgress.totalSteps) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Lore toast */}
        {researchProgress?.isComplete && lore && !researching && (
          <div className="mb-3 p-2.5 rounded-lg bg-[var(--success-soft)] border border-[var(--success)]/20 text-xs text-[var(--success)] flex items-center gap-2 animate-fadeUp">
            <Check size={14} />
            {t(lang, 'loreCompiled')}
          </div>
        )}

        {/* ===== STEP 1: Basic Info ===== */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeUp">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t(lang, 'characterName')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(lang, 'characterNamePlaceholder')}
                className="input"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t(lang, 'searchCharacter')}</label>
              <button
                onClick={handleResearch}
                disabled={!name.trim() || researching}
                className="btn-outline w-full py-2.5 text-xs"
              >
                {researching ? (
                  <><Loader2 size={13} className="animate-spin" /> {t(lang, 'searching')}</>
                ) : (
                  <><Search size={13} /> {t(lang, 'researchDetailed')}</>
                )}
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t(lang, 'sourceLabel')}</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder={t(lang, 'sourcePlaceholder')}
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t(lang, 'descriptionLabel')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(lang, 'descriptionPlaceholder')}
                rows={3}
                className="textarea"
              />
            </div>

            {/* Avatar */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t(lang, 'avatarLabel')}</label>
              <div className="flex items-center gap-2.5">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer bg-[var(--bg-tertiary)] flex items-center justify-center border border-dashed border-[var(--border-primary)] hover:border-[var(--accent)] transition-all"
                >
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold gradient-text">{name ? name.charAt(0).toUpperCase() : '?'}</span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <button onClick={() => fileInputRef.current?.click()} className="btn-ghost text-xs py-2">
                  <Upload size={13} />
                  {t(lang, 'changeAvatar')}
                </button>
              </div>
            </div>

            {/* Lore preview */}
            {lore && (
              <div className="section p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <BookOpen size={12} className="text-[var(--accent)]" />
                  <span className="text-xs font-medium">{t(lang, 'characterLore')}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">({lore.length})</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] line-clamp-3">{lore.substring(0, 300)}...</p>
              </div>
            )}

            <button onClick={() => setStep(2)} disabled={!canProceedStep1} className="btn-primary w-full py-2.5">
              {t(lang, 'next')} <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* ===== STEP 2: Personality ===== */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeUp">
            <button
              onClick={handleGeneratePersonality}
              disabled={generating}
              className="btn-outline w-full py-2 text-xs"
            >
              {generating ? (
                <><Loader2 size={12} className="animate-spin" /> {t(lang, 'loading')}</>
              ) : (
                <><Sparkles size={12} /> {t(lang, 'aiGenerated')}</>
              )}
            </button>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t(lang, 'personalityLabel')}</label>
              <textarea value={personality} onChange={(e) => setPersonality(e.target.value)} rows={3}
                placeholder="e.g. Brave, determined, always looking for strong opponents..."
                className="textarea"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t(lang, 'speechStyle')}</label>
              <textarea value={speechStyle} onChange={(e) => setSpeechStyle(e.target.value)} rows={2}
                placeholder={t(lang, 'speechStylePlaceholder')}
                className="textarea"
              />
            </div>

            {/* Tone */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t(lang, 'tone')}</label>
              <div className="flex flex-wrap gap-1.5">
                {TONES.map((t_option) => (
                  <button
                    key={t_option}
                    onClick={() => setTone(t_option)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all capitalize ${
                      tone === t_option
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)]/30'
                    }`}
                  >
                    {t_option}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            {[
              { label: t(lang, 'energyLevel'), value: energyLevel, set: setEnergyLevel },
              { label: t(lang, 'intelligence'), value: intelligence, set: setIntelligence },
              { label: t(lang, 'empathy'), value: empathy, set: setEmpathy },
              { label: t(lang, 'humor'), value: humor, set: setHumor },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">{label}</span>
                  <span className="text-[var(--text-muted)] font-mono">{value}/10</span>
                </div>
                <input type="range" min="1" max="10" value={value}
                  onChange={(e) => set(Number(e.target.value))} className="w-full"
                />
              </div>
            ))}

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-2 text-xs">
                <ArrowLeft size={14} /> {t(lang, 'back')}
              </button>
              <button onClick={() => setStep(3)} className="btn-primary flex-1 py-2 text-xs">
                {t(lang, 'next')} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 3: Modifiers ===== */}
        {step === 3 && (
          <div className="space-y-3 animate-fadeUp">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">{t(lang, 'modifiersTitle')}</p>

            {[
              { key: 'neverBreakCharacter' as keyof CharacterModifiers, icon: '🎭', label: t(lang, 'modNeverBreak'), desc: t(lang, 'modNeverBreakDesc') },
              { key: 'realWorldAwareness' as keyof CharacterModifiers, icon: '🌍', label: t(lang, 'modRealWorld'), desc: t(lang, 'modRealWorldDesc') },
              { key: 'fourthWall' as keyof CharacterModifiers, icon: '💬', label: t(lang, 'modFourthWall'), desc: t(lang, 'modFourthWallDesc') },
              { key: 'darkMode' as keyof CharacterModifiers, icon: '😈', label: t(lang, 'modDark'), desc: t(lang, 'modDarkDesc') },
              { key: 'adultContent' as keyof CharacterModifiers, icon: '🔞', label: t(lang, 'modAdult'), desc: t(lang, 'modAdultDesc') },
              { key: 'realWorldKnowledge' as keyof CharacterModifiers, icon: '📚', label: t(lang, 'modRealKnowledge'), desc: t(lang, 'modRealKnowledgeDesc') },
              { key: 'originalReferences' as keyof CharacterModifiers, icon: '🎬', label: t(lang, 'modReferences'), desc: t(lang, 'modReferencesDesc') },
              { key: 'characterSecret' as keyof CharacterModifiers, icon: '🔒', label: t(lang, 'modSecret'), desc: t(lang, 'modSecretDesc') },
            ].map(({ key, icon, label, desc }) => (
              <button
                key={key}
                onClick={() => toggleModifier(key)}
                className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
                  modifiers[key]
                    ? 'border-[var(--accent)] bg-[var(--accent-softer)]'
                    : 'border-[var(--border-subtle)] hover:border-[var(--border-primary)]'
                }`}
              >
                <span className="text-sm">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{label}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{desc}</p>
                </div>
                <div className={`toggle ${modifiers[key] ? 'active' : ''}`}>
                  <div className="toggle-thumb" style={modifiers[key] ? { transform: 'translateX(18px)' } : {}} />
                </div>
              </button>
            ))}

            {modifiers.characterSecret && (
              <div className="animate-fadeUp">
                <input
                  type="text"
                  value={modifiers.secretDescription}
                  onChange={(e) => setModifiers(prev => ({ ...prev, secretDescription: e.target.value }))}
                  placeholder={t(lang, 'secretPlaceholder')}
                  className="input"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t(lang, 'extraInstructions')}</label>
              <textarea
                value={extraInstructions}
                onChange={(e) => setExtraInstructions(e.target.value)}
                placeholder={t(lang, 'extraInstructionsPlaceholder')}
                rows={2}
                className="textarea"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1 py-2 text-xs">
                <ArrowLeft size={14} /> {t(lang, 'back')}
              </button>
              <button onClick={handleCreate} disabled={!name.trim()} className="btn-primary flex-1 py-2 text-xs">
                <Sparkles size={14} />
                {editingCharacterId ? t(lang, 'save') : t(lang, 'create')}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
