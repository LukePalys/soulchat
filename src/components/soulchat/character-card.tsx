'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'
import type { Character } from '@/lib/types'
import { Pencil, Trash2, MessageSquare } from 'lucide-react'

export default function CharacterCard({
  character,
  onClick,
}: {
  character: Character
  onClick: () => void
}) {
  const { user, chats, setEditingCharacter, deleteCharacter, setView } = useStore()
  const lang = user.language
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const characterChats = chats.filter((c) => c.characterId === character.id)
  const lastChat = characterChats.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0]
  const lastMessage = lastChat?.messages?.[lastChat.messages.length - 1]

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingCharacter(character.id)
    setView('create-character')
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteCharacter(character.id)
    setShowDeleteConfirm(false)
  }

  return (
    <>
      <button
        onClick={onClick}
        className="card p-3.5 text-left w-full group"
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {character.avatar ? (
            <div className="avatar w-11 h-11">
              <img src={character.avatar} alt={character.name} className="w-[42px] h-[42px] object-cover" />
            </div>
          ) : (
            <div className="avatar-placeholder w-11 h-11">
              <span className="text-sm font-bold gradient-text">
                {character.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate group-hover:text-[var(--accent)] transition-colors">
                {character.name}
              </h3>
              {character.source && (
                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded-md truncate max-w-[120px]">
                  {character.source}
                </span>
              )}
            </div>
            {lastMessage ? (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate flex items-center gap-1">
                <MessageSquare size={10} className="flex-shrink-0" />
                <span>{lastMessage.content.substring(0, 80)}</span>
              </p>
            ) : (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {t(lang, 'noChatsYet')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleEdit}
              className="p-1.5 rounded-md hover:bg-[var(--accent-soft)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-md hover:bg-[var(--error-soft)] text-[var(--text-muted)] hover:text-[var(--error)] transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </button>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-[var(--error-soft)] flex items-center justify-center mx-auto mb-3">
                <Trash2 size={18} className="text-[var(--error)]" />
              </div>
              <h3 className="text-sm font-semibold mb-1">{t(lang, 'deleteCharacter')}</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                {t(lang, 'deleteConfirm')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary flex-1 text-xs py-2"
                >
                  {t(lang, 'cancel')}
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2 bg-[var(--error)] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  {t(lang, 'delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
