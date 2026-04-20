import { create } from 'zustand'
import {
  type Character,
  type Chat,
  type Message,
  type AppSettings,
  type UserProfile,
  type AppView,
  type AppLanguage,
  DEFAULT_MODIFIERS,
} from './types'
import { DEFAULT_MODEL_ID } from './ai-config'

const STORAGE_KEY = 'soulchat_data'

interface AppData {
  user: UserProfile
  settings: AppSettings
  characters: Character[]
  chats: Chat[]
}

interface AppState extends AppData {
  view: AppView
  selectedCharacterId: string | null
  selectedChatId: string | null
  editingCharacterId: string | null
  modelStatuses: Record<string, 'online' | 'offline' | 'unknown'>

  // Actions
  setView: (view: AppView) => void
  selectCharacter: (id: string | null) => void
  selectChat: (id: string | null) => void
  setEditingCharacter: (id: string | null) => void

  // User
  setUserProfile: (profile: Partial<UserProfile>) => void

  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void
  setModelStatus: (modelId: string, status: 'online' | 'offline' | 'unknown') => void

  // Characters
  addCharacter: (character: Character) => void
  updateCharacter: (id: string, updates: Partial<Character>) => void
  deleteCharacter: (id: string) => void

  // Chats
  createChat: (characterId: string) => string
  addMessage: (chatId: string, message: Message) => void
  updateChatSummary: (chatId: string, summary: string) => void
  deleteChat: (chatId: string) => void

  // Data management
  exportData: () => string
  importData: (json: string) => boolean
  clearAllData: () => void
  loadData: () => void
}

function loadFromStorage(): AppData {
  if (typeof window === 'undefined') {
    return {
      user: { name: '', language: 'en', onboarded: false, showDataWarning: true },
      settings: { theme: 'dark', selectedModelId: DEFAULT_MODEL_ID },
      characters: [],
      chats: [],
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return {
        user: {
          name: data.user?.name || '',
          language: (data.user?.language || 'en') as AppLanguage,
          onboarded: data.user?.onboarded || false,
          showDataWarning: data.user?.showDataWarning !== false,
        },
        settings: {
          theme: data.settings?.theme || 'dark',
          selectedModelId: data.settings?.selectedModelId || DEFAULT_MODEL_ID,
        },
        characters: (data.characters || []).map((c: any) => ({
          ...c,
          lore: c.lore || '',
          wikiData: c.wikiData || '',
        })),
        chats: data.chats || [],
      }
    }
  } catch (e) {
    console.warn('Failed to load data from localStorage:', e)
  }

  return {
    user: { name: '', language: 'en', onboarded: false, showDataWarning: true },
    settings: { theme: 'dark', selectedModelId: DEFAULT_MODEL_ID },
    characters: [],
    chats: [],
  }
}

function saveToStorage(data: AppData) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      user: data.user,
      settings: data.settings,
      characters: data.characters,
      chats: data.chats,
    }))
  } catch (e) {
    console.warn('Failed to save data to localStorage:', e)
  }
}

export const useStore = create<AppState>((set, get) => ({
  ...loadFromStorage(),
  view: 'onboarding',
  selectedCharacterId: null,
  selectedChatId: null,
  editingCharacterId: null,
  modelStatuses: {},

  setView: (view) => set({ view }),

  selectCharacter: (id) => set({ selectedCharacterId: id }),
  selectChat: (id) => set({ selectedChatId: id }),
  setEditingCharacter: (id) => set({ editingCharacterId: id }),

  setUserProfile: (profile) => {
    const state = get()
    const updated = { ...state.user, ...profile }
    const newData = { ...state, user: updated }
    saveToStorage(newData)
    set({ user: updated })
  },

  updateSettings: (settings) => {
    const state = get()
    const updated = { ...state.settings, ...settings }
    const newData = { ...state, settings: updated }
    saveToStorage(newData)
    set({ settings: updated })
  },

  setModelStatus: (modelId, status) => {
    set((state) => ({
      modelStatuses: { ...state.modelStatuses, [modelId]: status },
    }))
  },

  addCharacter: (character) => {
    const state = get()
    const newCharacters = [...state.characters, character]
    const newData = { ...state, characters: newCharacters }
    saveToStorage(newData)
    set({ characters: newCharacters })
  },

  updateCharacter: (id, updates) => {
    const state = get()
    const newCharacters = state.characters.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    )
    const newData = { ...state, characters: newCharacters }
    saveToStorage(newData)
    set({ characters: newCharacters })
  },

  deleteCharacter: (id) => {
    const state = get()
    const newCharacters = state.characters.filter((c) => c.id !== id)
    const newChats = state.chats.filter((c) => c.characterId !== id)
    const newData = { ...state, characters: newCharacters, chats: newChats }
    saveToStorage(newData)
    set({
      characters: newCharacters,
      chats: newChats,
      selectedCharacterId: state.selectedCharacterId === id ? null : state.selectedCharacterId,
    })
  },

  createChat: (characterId) => {
    const state = get()
    const chat: Chat = {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      characterId,
      messages: [],
      summary: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const newChats = [...state.chats, chat]
    const newData = { ...state, chats: newChats }
    saveToStorage(newData)
    set({ chats: newChats, selectedChatId: chat.id })
    return chat.id
  },

  addMessage: (chatId, message) => {
    const state = get()
    const newChats = state.chats.map((c) =>
      c.id === chatId
        ? {
            ...c,
            messages: [...c.messages, message],
            updatedAt: new Date().toISOString(),
          }
        : c
    )
    const newData = { ...state, chats: newChats }
    saveToStorage(newData)
    set({ chats: newChats })
  },

  updateChatSummary: (chatId, summary) => {
    const state = get()
    const newChats = state.chats.map((c) =>
      c.id === chatId ? { ...c, summary } : c
    )
    const newData = { ...state, chats: newChats }
    saveToStorage(newData)
    set({ chats: newChats })
  },

  deleteChat: (chatId) => {
    const state = get()
    const newChats = state.chats.filter((c) => c.id !== chatId)
    const newData = { ...state, chats: newChats }
    saveToStorage(newData)
    set({
      chats: newChats,
      selectedChatId: state.selectedChatId === chatId ? null : state.selectedChatId,
    })
  },

  exportData: () => {
    const state = get()
    return JSON.stringify(
      {
        version: '2.0',
        exportDate: new Date().toISOString(),
        app: 'SoulChat',
        user: state.user,
        settings: state.settings,
        characters: state.characters,
        chats: state.chats,
      },
      null,
      2
    )
  },

  importData: (json) => {
    try {
      const data = JSON.parse(json)
      if (!data.user || !data.characters) return false

      const imported: AppData = {
        user: {
          name: data.user.name || '',
          language: data.user.language || 'en',
          onboarded: true,
          showDataWarning: data.user.showDataWarning !== false,
        },
        settings: {
          theme: data.settings?.theme || 'dark',
          selectedModelId: data.settings?.selectedModelId || DEFAULT_MODEL_ID,
        },
        characters: (data.characters || []).map((c: any) => ({
          ...c,
          lore: c.lore || '',
          wikiData: c.wikiData || '',
        })),
        chats: data.chats || [],
      }

      saveToStorage(imported)
      set({
        ...imported,
        view: 'home',
        selectedCharacterId: null,
        selectedChatId: null,
      })
      return true
    } catch {
      return false
    }
  },

  clearAllData: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
    set({
      user: { name: '', language: 'en', onboarded: false, showDataWarning: true },
      settings: { theme: 'dark', selectedModelId: DEFAULT_MODEL_ID },
      characters: [],
      chats: [],
      view: 'onboarding',
      selectedCharacterId: null,
      selectedChatId: null,
    })
  },

  loadData: () => {
    const data = loadFromStorage()
    set(data)
  },
}))
