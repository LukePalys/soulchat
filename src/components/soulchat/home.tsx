'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'
import CharacterCard from './character-card'
import { Plus, Settings, MessageCircle } from 'lucide-react'

export default function Home() {
  const {
    user,
    characters,
    chats,
    setView,
    selectCharacter,
    selectChat,
    createChat,
    setEditingCharacter,
  } = useStore()
  const lang = user.language

  useEffect(() => {
    useStore.getState().loadData()
  }, [])

  const handleCreateClick = () => {
    setEditingCharacter(null) // CLEAR editing state so form resets
    setView('create-character')
  }

  const handleCharacterClick = (characterId: string) => {
    selectCharacter(characterId)
    const existingChat = chats.find((c) => c.characterId === characterId)
    if (existingChat) {
      selectChat(existingChat.id)
    } else {
      createChat(characterId)
    }
    setView('chat')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="header-glass">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <MessageCircle size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight gradient-text">{t(lang, 'appName')}</h1>
              <p className="text-[11px] text-[var(--text-muted)]">
                {t(lang, 'homeGreeting')}, {user.name} &middot; {characters.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleCreateClick} className="btn-primary px-3 py-1.5 text-xs">
              <Plus size={14} />
              <span className="hidden sm:inline">{t(lang, 'createCharacter')}</span>
            </button>
            <button
              onClick={() => setView('settings')}
              className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 animate-fadeUp">
            <div className="w-20 h-20 rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center mb-5 animate-float">
              <MessageCircle size={36} className="text-[var(--accent)]" />
            </div>
            <h2 className="text-lg font-semibold mb-1">{t(lang, 'homeEmpty')}</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">{t(lang, 'homeEmptyDesc')}</p>
            <button onClick={handleCreateClick} className="btn-primary">
              <Plus size={16} />
              {t(lang, 'createCharacter')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {characters.map((character, index) => (
              <div
                key={character.id}
                className="animate-fadeUp"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <CharacterCard
                  character={character}
                  onClick={() => handleCharacterClick(character.id)}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
