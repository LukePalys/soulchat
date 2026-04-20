'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'
import { sendChatMessage, generateSummary, generateGreetingPrompt } from '@/lib/ai-chat'
import { DEFAULT_MODEL_ID } from '@/lib/ai-config'
import type { Message } from '@/lib/types'
import { ArrowLeft, Send, Plus, MessageSquare, Settings, Loader2, Pencil, Trash2, X } from 'lucide-react'

export default function ChatView() {
  const {
    user, settings, characters, chats,
    selectedCharacterId, selectedChatId,
    setView, selectCharacter, selectChat,
    createChat, addMessage, updateChatSummary, deleteChat, setEditingCharacter,
  } = useStore()
  const lang = user.language

  const character = characters.find((c) => c.id === selectedCharacterId)
  const chat = chats.find((c) => c.id === selectedChatId)
  const characterChats = chats
    .filter((c) => c.characterId === selectedCharacterId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [greetingSent, setGreetingSent] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat?.messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [message])

  // Auto-send greeting when starting a new chat
  useEffect(() => {
    if (character && chat && chat.messages.length === 0 && !isLoading && !greetingSent) {
      setGreetingSent(true)
      handleGreeting()
    }
  }, [character?.id, chat?.id])

  const handleGreeting = async () => {
    if (!character || !chat) return
    setIsLoading(true)

    try {
      // Generate greeting using AI
      const greetingPrompt = generateGreetingPrompt(character, user.language)
      const greeting = await sendChatMessage(
        character.systemPrompt,
        [],
        greetingPrompt,
        settings.selectedModelId || DEFAULT_MODEL_ID,
        '',
        (modelId, status) => useStore.getState().setModelStatus(modelId, status)
      )

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_greeting`,
        role: 'assistant',
        content: greeting,
        timestamp: new Date().toISOString(),
      }
      addMessage(chat.id, assistantMessage)
    } catch (error) {
      // If greeting fails, add a simple default greeting
      const defaultGreeting: Message = {
        id: `msg_${Date.now()}_greeting_default`,
        role: 'assistant',
        content: `*${character.name} notices your presence and turns to face you.*`,
        timestamp: new Date().toISOString(),
      }
      addMessage(chat.id, defaultGreeting)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async () => {
    if (!message.trim() || isLoading || !character || !chat) return

    const userMessage: Message = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    }

    addMessage(chat.id, userMessage)
    setMessage('')
    setIsLoading(true)

    try {
      const conversationHistory = [
        ...chat.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: message.trim() },
      ]

      const response = await sendChatMessage(
        character.systemPrompt,
        conversationHistory.slice(0, -1),
        message.trim(),
        settings.selectedModelId || DEFAULT_MODEL_ID,
        chat.summary || '',
        (modelId, status) => useStore.getState().setModelStatus(modelId, status)
      )

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      }

      addMessage(chat.id, assistantMessage)

      const updatedChat = useStore.getState().chats.find((c) => c.id === chat.id)
      if (updatedChat && updatedChat.messages.length % 10 === 0) {
        generateSummary(updatedChat.messages, settings.selectedModelId || DEFAULT_MODEL_ID)
          .then((summary) => { if (summary) updateChatSummary(chat.id, summary) })
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `msg_${Date.now()}_e`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response.'}`,
        timestamp: new Date().toISOString(),
      }
      addMessage(chat.id, errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewChat = () => {
    if (!selectedCharacterId) return
    setGreetingSent(false)
    createChat(selectedCharacterId)
  }

  const handleSelectChat = (chatId: string) => {
    selectChat(chatId)
    setShowSidebar(false)
    setGreetingSent(true) // Don't re-greet for existing chats
  }

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteChat(chatId)
    if (selectedChatId === chatId && characterChats.length > 1) {
      const remaining = characterChats.filter((c) => c.id !== chatId)
      if (remaining.length > 0) selectChat(remaining[0].id)
    }
  }

  const handleBack = () => {
    setView('home')
    selectCharacter(null)
    selectChat(null)
  }

  if (!character) return null

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleTimeString(lang === 'pt-br' ? 'pt-BR' : lang === 'es' ? 'es' : lang === 'ja' ? 'ja' : lang === 'ko' ? 'ko' : lang === 'zh' ? 'zh-CN' : 'en', {
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="header-glass flex-shrink-0">
        <div className="flex items-center gap-2 px-3 h-12">
          <button onClick={handleBack} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {character.avatar ? (
              <div className="avatar w-7 h-7">
                <img src={character.avatar} alt={character.name} className="w-[24px] h-[24px] object-cover" />
              </div>
            ) : (
              <div className="avatar-placeholder w-7 h-7">
                <span className="text-[10px] font-bold gradient-text">{character.name.charAt(0)}</span>
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate leading-tight">{character.name}</h2>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{character.source || character.tone}</p>
            </div>
          </div>
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)]">
            <MessageSquare size={16} />
          </button>
          <button
            onClick={() => { setEditingCharacter(character.id); setView('create-character') }}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)]"
          >
            <Pencil size={16} />
          </button>
          <button onClick={() => setView('settings')} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)]">
            <Settings size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40 sm:hidden" onClick={() => setShowSidebar(false)} />
            <div className="w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex-shrink-0 flex flex-col animate-slideInLeft z-50 absolute sm:relative">
              <div className="flex items-center justify-between px-3 h-11 border-b border-[var(--border-subtle)]">
                <span className="text-xs font-semibold">{t(lang, 'previousChats')}</span>
                <button onClick={() => setShowSidebar(false)} className="p-1 rounded hover:bg-[var(--bg-tertiary)]">
                  <X size={14} />
                </button>
              </div>
              <div className="p-2">
                <button onClick={handleNewChat}
                  className="btn-outline w-full py-1.5 text-[11px] mb-2">
                  <Plus size={12} /> {t(lang, 'newChat')}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 max-h-80">
                {characterChats.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectChat(c.id)}
                    className={`p-2.5 rounded-lg cursor-pointer transition-all group relative text-xs ${
                      selectedChatId === c.id
                        ? 'bg-[var(--accent-soft)] border border-[var(--accent)]/20'
                        : 'hover:bg-[var(--bg-tertiary)] border border-transparent'
                    }`}
                  >
                    <p className="text-[var(--text-secondary)]">{c.messages.length} {t(lang, 'messages')}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{new Date(c.updatedAt).toLocaleDateString()}</p>
                    <button
                      onClick={(e) => handleDeleteChat(c.id, e)}
                      className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--error-soft)] transition-all"
                    >
                      <Trash2 size={10} className="text-[var(--error)]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
            {!chat || chat.messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center py-20">
                <div className="animate-fadeUp">
                  {character.avatar ? (
                    <div className="avatar w-16 h-16 mx-auto mb-3">
                      <img src={character.avatar} alt={character.name} className="w-[56px] h-[56px] object-cover" />
                    </div>
                  ) : (
                    <div className="avatar-placeholder w-16 h-16 mx-auto mb-3">
                      <span className="text-2xl font-bold gradient-text">{character.name.charAt(0)}</span>
                    </div>
                  )}
                  <p className="text-xs text-[var(--text-muted)]">
                    {t(lang, 'noMessages').replace('{{name}}', character.name)}
                  </p>
                </div>
              </div>
            ) : (
              chat.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                  <div className={`max-w-[80%] sm:max-w-[70%] px-3.5 py-2 ${msg.role === 'user' ? 'msg-user' : 'msg-assistant'}`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className={`text-[9px] mt-0.5 ${
                      msg.role === 'user' ? 'text-white/40' : 'text-[var(--text-muted)]'
                    }`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}

            {/* Typing */}
            {isLoading && (
              <div className="flex justify-start animate-fadeIn">
                <div className="msg-assistant px-3.5 py-2.5">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] typing-dot" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] typing-dot" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-[var(--border-subtle)] p-3 bg-[var(--bg-primary)] safe-bottom">
            <div className="flex items-end gap-2 max-w-xl mx-auto">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
                placeholder={t(lang, 'chatPlaceholder')}
                rows={1}
                className="flex-1 textarea text-sm py-2"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || isLoading}
                className="p-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
