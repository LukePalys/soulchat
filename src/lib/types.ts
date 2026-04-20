export type AppLanguage = 'en' | 'pt-br' | 'es' | 'ja' | 'ko' | 'zh'

export interface CharacterModifiers {
  neverBreakCharacter: boolean
  realWorldAwareness: boolean
  fourthWall: boolean
  darkMode: boolean
  adultContent: boolean
  realWorldKnowledge: boolean
  originalReferences: boolean
  characterSecret: boolean
  secretDescription: string
}

export interface Character {
  id: string
  name: string
  description: string
  source: string // where the character appears
  avatar: string // base64 image or empty
  personality: string
  speechStyle: string
  tone: string
  energyLevel: number
  intelligence: number
  empathy: number
  humor: number
  modifiers: CharacterModifiers
  extraInstructions: string
  systemPrompt: string
  lore: string // full research text from Wikipedia
  wikiData: string // raw Wikipedia data for reference
  createdAt: string
  lastChatAt: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface Chat {
  id: string
  characterId: string
  messages: Message[]
  summary: string // auto-generated summary of conversation
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  selectedModelId: string
}

export interface UserProfile {
  name: string
  language: AppLanguage
  onboarded: boolean
  showDataWarning: boolean
}

export interface AIModel {
  id: string
  name: string
  provider: 'openrouter' | 'chatanywhere' | 'puter'
  modelId: string // actual model ID for the API
  apiKey?: string
  baseUrl?: string
  description: string
  status: 'online' | 'offline' | 'unknown'
}

export type AppView = 'onboarding' | 'home' | 'create-character' | 'chat' | 'settings'

export interface CreateCharacterStep {
  step: number // 1, 2, or 3
  name: string
  description: string
  avatar: string
  source: string
  personality: string
  speechStyle: string
  tone: string
  energyLevel: number
  intelligence: number
  empathy: number
  humor: number
  modifiers: CharacterModifiers
  extraInstructions: string
}

// Research progress tracking
export interface ResearchStep {
  id: number
  label: string
  status: 'pending' | 'active' | 'done' | 'error'
  detail?: string
}

export interface ResearchProgress {
  steps: ResearchStep[]
  currentStep: number
  totalSteps: number
  isComplete: boolean
  compiledText: string
  thumbnail: string
  source: string
}

export const DEFAULT_MODIFIERS: CharacterModifiers = {
  neverBreakCharacter: true,
  realWorldAwareness: false,
  fourthWall: false,
  darkMode: false,
  adultContent: false,
  realWorldKnowledge: true,
  originalReferences: true,
  characterSecret: false,
  secretDescription: '',
}

export const TONES = [
  'calm', 'aggressive', 'happy', 'sarcastic', 'mysterious',
  'charismatic', 'shy', 'crazy', 'charming', 'cold',
  'gentle', 'competitive', 'lazy', 'intellectual', 'childish', 'warrior'
] as const

export type Tone = typeof TONES[number]
