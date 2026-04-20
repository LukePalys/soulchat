import { AIModel } from './types'

// ChatAnywhere model (proven working — set as default)
const CHATANYWHERE_MODEL: AIModel = {
  id: 'chatanywhere-gpt',
  name: 'GPT (ChatAnywhere)',
  provider: 'chatanywhere',
  modelId: 'gpt-3.5-turbo',
  apiKey: 'sk-YFtEcctGY3Vq8UiyRoGxh7JzJ4QHzccM9nqCSGR559LghMRf',
  baseUrl: 'https://api.chatanywhere.tech/v1',
  description: 'High quality GPT',
  status: 'unknown',
}

// OpenRouter free models (may vary in availability)
const OPENROUTER_MODELS: AIModel[] = [
  {
    id: 'meta-llama-3.3-70b',
    name: 'Llama 3.3 70B',
    provider: 'openrouter',
    modelId: 'meta-llama/llama-3.3-70b-instruct',
    apiKey: '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',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'Best for roleplay',
    status: 'unknown',
  },
  {
    id: 'qwen3-80b',
    name: 'Qwen3 80B',
    provider: 'openrouter',
    modelId: 'qwen/qwen3-next-80b-a3b-instruct',
    apiKey: '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',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'Creative and detailed',
    status: 'unknown',
  },
  {
    id: 'glm-4.5-air',
    name: 'GLM 4.5 Air',
    provider: 'openrouter',
    modelId: 'z-ai/glm-4.5-air',
    apiKey: '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',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'Fast and efficient',
    status: 'unknown',
  },
  {
    id: 'minimax-m2.5',
    name: 'MiniMax M2.5',
    provider: 'openrouter',
    modelId: 'minimax/minimax-m2.5',
    apiKey: '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',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'Good at dialogues',
    status: 'unknown',
  },
  {
    id: 'nous-hermes-405b',
    name: 'Nous Hermes 405B',
    provider: 'openrouter',
    modelId: 'nousresearch/nous-hermes-3-llama-3.1-405b-instruct',
    apiKey: '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',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'Deep interpretation',
    status: 'unknown',
  },
  {
    id: 'stepfun-3.5-flash',
    name: 'StepFun 3.5',
    provider: 'openrouter',
    modelId: 'stepfun/step-3-5-flash',
    apiKey: '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',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'Fast, short responses',
    status: 'unknown',
  },
  {
    id: 'arcee-trinity',
    name: 'Arcee Trinity',
    provider: 'openrouter',
    modelId: 'arcee-ai/trinity-large-preview',
    apiKey: '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',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'Creative and detailed',
    status: 'unknown',
  },
  {
    id: 'openai-gpt-oss-120b',
    name: 'GPT OSS 120B',
    provider: 'openrouter',
    modelId: 'openai/gpt-oss-120b',
    apiKey: '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',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'High quality',
    status: 'unknown',
  },
  {
    id: 'openai-gpt-oss-20b',
    name: 'GPT OSS 20B',
    provider: 'openrouter',
    modelId: 'openai/gpt-oss-20b',
    apiKey: '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',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'Fast and good',
    status: 'unknown',
  },
  {
    id: 'venice-uncensored',
    name: 'Venice Uncensored',
    provider: 'openrouter',
    modelId: 'venice/venice-uncensored',
    apiKey: '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',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'No censorship',
    status: 'unknown',
  },
]

// puter.js model (always available as fallback)
const PUTER_MODEL: AIModel = {
  id: 'puter',
  name: 'puter.js',
  provider: 'puter',
  modelId: '',
  description: 'Fallback, always available',
  status: 'unknown',
}

// All models — ChatAnywhere first (proven working), then OpenRouter, then puter fallback
export const ALL_MODELS: AIModel[] = [
  CHATANYWHERE_MODEL,
  ...OPENROUTER_MODELS,
  PUTER_MODEL,
]

export type { AIModel }
export const DEFAULT_MODEL_ID = 'chatanywhere-gpt'

export function getModelById(id: string): AIModel | undefined {
  return ALL_MODELS.find(m => m.id === id)
}

export function getSelectableModels(): AIModel[] {
  return ALL_MODELS.filter(m => m.id !== 'puter')
}

export const LANGUAGE_FULL_NAMES: Record<string, string> = {
  'en': 'English',
  'pt-br': 'Portuguese (Brazil)',
  'es': 'Spanish',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese',
}

declare global {
  interface Window {
    puter: any
  }
}
