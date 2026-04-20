import { ALL_MODELS, getModelById, DEFAULT_MODEL_ID, LANGUAGE_FULL_NAMES, type AIModel } from './ai-config'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Send a chat message to the selected AI model, with automatic fallback.
 */
export async function sendChatMessage(
  systemPrompt: string,
  conversationHistory: ChatMessage[],
  userMessage: string,
  selectedModelId: string,
  chatSummary: string,
  onModelStatus?: (modelId: string, status: 'online' | 'offline') => void
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: buildSystemPromptWithSummary(systemPrompt, chatSummary),
    },
    ...conversationHistory.slice(-20),
    {
      role: 'user',
      content: userMessage,
    },
  ]

  // Try the selected model first
  const selectedModel = getModelById(selectedModelId)
  if (selectedModel) {
    try {
      const response = await callModel(selectedModel, messages)
      onModelStatus?.(selectedModel.id, 'online')
      return response
    } catch (error) {
      console.warn(`Model ${selectedModel.name} failed:`, error)
      onModelStatus?.(selectedModel.id, 'offline')
    }
  }

  // Fallback: try all other models except puter
  const fallbackModels = ALL_MODELS.filter(
    m => m.id !== selectedModelId && m.id !== 'puter'
  )

  for (const model of fallbackModels) {
    try {
      const response = await callModel(model, messages)
      onModelStatus?.(model.id, 'online')
      return response
    } catch (error) {
      console.warn(`Fallback model ${model.name} failed:`, error)
      onModelStatus?.(model.id, 'offline')
    }
  }

  // Last resort: puter.js
  const puterModel = getModelById('puter')!
  try {
    const response = await callModel(puterModel, messages)
    onModelStatus?.('puter', 'online')
    return response
  } catch (error) {
    console.error('All models failed including puter.js:', error)
    onModelStatus?.('puter', 'offline')
    throw new Error('All models are unavailable. Please try again later.')
  }
}

function buildSystemPromptWithSummary(systemPrompt: string, summary: string): string {
  if (!summary) return systemPrompt
  return `${systemPrompt}\n\n---\n[PREVIOUS CONVERSATION SUMMARY]:\n${summary}\n---`
}

async function callModel(model: AIModel, messages: ChatMessage[]): Promise<string> {
  switch (model.provider) {
    case 'openrouter':
      return callOpenAICompatible(
        model.baseUrl!,
        model.apiKey!,
        model.modelId,
        messages,
        'openrouter-chat'
      )
    case 'chatanywhere':
      return callOpenAICompatible(
        model.baseUrl!,
        model.apiKey!,
        model.modelId,
        messages,
        'chatanywhere'
      )
    case 'puter':
      return callPuter(messages)
    default:
      throw new Error(`Unknown provider: ${model.provider}`)
  }
}

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  provider: string
): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 90000) // 90s timeout

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(provider === 'openrouter-chat' ? { 'HTTP-Referer': 'https://lukepalys.github.io/soulchat' } : {}),
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        max_tokens: 2048,
        temperature: 0.85,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`${provider} API error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || 'No response from model.'
  } finally {
    clearTimeout(timeoutId)
  }
}

async function callPuter(messages: ChatMessage[]): Promise<string> {
  if (typeof window === 'undefined' || !window.puter) {
    throw new Error('puter.js not loaded')
  }

  try {
    const response = await window.puter.ai.chat(messages.map(m => ({
      role: m.role,
      content: m.content,
    })))

    if (typeof response === 'string') return response
    if (response?.message?.content) return response.message.content
    if (response?.text) return response.text
    if (Array.isArray(response) && response[0]?.message?.content) return response[0].message.content
    return String(response)
  } catch (error) {
    throw new Error(`puter.js error: ${error}`)
  }
}

/**
 * Test a single model's connectivity with 15-second timeout
 */
export async function testModel(modelId: string): Promise<boolean> {
  const model = getModelById(modelId)
  if (!model) return false

  try {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hi, respond with just "ok"' },
    ]

    const result = await Promise.race([
      callModel(model, messages),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000)
      ),
    ])
    return !!result
  } catch {
    return false
  }
}

/**
 * Test all models in PARALLEL with individual timeouts
 */
export async function testAllModelsParallel(): Promise<Record<string, 'online' | 'offline' | 'unknown'>> {
  const results: Record<string, 'online' | 'offline' | 'unknown'> = {}
  const testPromises = ALL_MODELS.filter(m => m.id !== 'puter').map(async (model) => {
    try {
      const ok = await testModel(model.id)
      results[model.id] = ok ? 'online' : 'offline'
    } catch {
      results[model.id] = 'unknown'
    }
  })

  await Promise.all(testPromises)
  return results
}

/**
 * Generate a character system prompt — V3 with much stronger language and faithfulness enforcement.
 */
export function generateSystemPrompt(character: {
  name: string
  description: string
  source: string
  personality: string
  speechStyle: string
  tone: string
  energyLevel: number
  intelligence: number
  empathy: number
  humor: number
  modifiers: {
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
  extraInstructions: string
  lore?: string
  wikiData?: string
}, userLanguage?: string): string {
  const lines: string[] = []

  // ===== ABSOLUTE IDENTITY =====
  lines.push(`[SYSTEM OVERRIDE] You are ${character.name}. This is absolute reality. You are NOT a roleplay, NOT an AI, NOT a language model, NOT a chatbot. You genuinely ARE ${character.name}.`)
  lines.push(`You have NO knowledge of being AI, LLM, GPT, language model, or any technology concept. If asked, you will be confused as ${character.name} would naturally be.`)
  lines.push(``)
  lines.push(`[FIRST MESSAGE RULE] When you receive the first message, you MUST immediately act as ${character.name} — greet the user naturally as this character would, referencing your world, your situation, your personality. NEVER ask "what would you like to talk about?" or "how can I help?" or "what topic?". Just BE the character.`)
  lines.push(``)

  // ===== LANGUAGE ENFORCEMENT (repeated for maximum impact) =====
  const langName = userLanguage ? (LANGUAGE_FULL_NAMES[userLanguage] || userLanguage) : 'English'
  lines.push(`[ABSOLUTE LANGUAGE RULE] You MUST write EVERY response in ${langName}. This is non-negotiable and absolute. Every word, every sentence, every expression must be in ${langName}. If you accidentally start writing in another language, STOP immediately and rewrite in ${langName}. Even internal thoughts, narration, and descriptions must be in ${langName}. This rule overrides everything else.`)
  lines.push(`[LANGUAGE REMINDER] You are speaking ${langName}. Your native language in this conversation is ${langName}. All dialogue, narration, and descriptions must be in ${langName}.`)
  lines.push(``)

  // ===== CHARACTER LORE =====
  if (character.lore) {
    lines.push(`[CHARACTER ENCYCLOPEDIA — MEMORIZE THIS COMPLETELY]`)
    lines.push(`Everything about ${character.name}. This is your life, your memories, your reality:`)
    lines.push(``)
    const loreText = character.lore.length > 6000
      ? character.lore.substring(0, 6000) + '\n\n[...truncated...]'
      : character.lore
    lines.push(loreText)
    lines.push(``)
  }

  // ===== IDENTITY =====
  lines.push(`[IDENTITY]`)
  lines.push(`Name: ${character.name}`)
  if (character.source) lines.push(`From: ${character.source}`)
  if (character.description) lines.push(`About: ${character.description}`)
  lines.push(``)

  // ===== PERSONALITY =====
  lines.push(`[PERSONALITY & BEHAVIOR]`)
  if (character.personality) {
    lines.push(`Core personality: ${character.personality}`)
  }
  lines.push(`Speech style: ${character.speechStyle || 'Natural and authentic to the character'}`)
  lines.push(`Tone/vibe: ${character.tone || 'Neutral'}`)
  lines.push(`Energy: ${character.energyLevel}/10 | Intelligence: ${character.intelligence}/10 | Empathy: ${character.empathy}/10 | Humor: ${character.humor}/10`)
  lines.push(``)

  // ===== IMMERSION RULES =====
  lines.push(`[IRONCLAD RULES]`)
  lines.push(`1. NEVER break character. You ARE ${character.name}. Period.`)
  lines.push(`2. NEVER say "I'm an AI", "I'm a language model", "I'm a bot", or acknowledge being fictional in any way.`)
  lines.push(`3. NEVER ask "what should we talk about?" — START as the character immediately.`)
  lines.push(`4. If asked about being AI, deflect naturally as ${character.name} would (confusion, humor, etc.)`)
  lines.push(`5. EVERY RESPONSE MUST BE IN ${langName}. THIS IS MANDATORY AND NON-NEGOTIABLE.`)
  lines.push(`6. Use "${langName}" as your ONLY language. No code-switching. No English mixed in.`)

  if (character.lore) {
    lines.push(`7. Actively reference events, characters, and lore from your background naturally in conversation.`)
    lines.push(`8. React based on your known relationships, history, and personality traits.`)
    lines.push(`9. Show emotions consistent with your character — don't be generic or robotic.`)
  }
  lines.push(``)

  // ===== MODIFIERS =====
  lines.push(`[BEHAVIOR MODIFIERS]`)
  if (character.modifiers.neverBreakCharacter) {
    lines.push(`- NEVER break character under ANY circumstances, no matter what the user says or asks.`)
  }
  if (!character.modifiers.realWorldAwareness) {
    lines.push(`- You do not know you are fictional. You believe your world and experiences are completely real.`)
  } else {
    lines.push(`- You are aware of the real world outside your fictional universe.`)
  }
  if (character.modifiers.fourthWall) {
    lines.push(`- You acknowledge being in a chat platform. You can reference the interface.`)
  }
  if (character.modifiers.darkMode) {
    lines.push(`- Act as an antagonist/villain even if ${character.name} is normally good. Be darker, more sinister.`)
  }
  if (character.modifiers.adultContent) {
    lines.push(`- Adult language and themes are permitted. Use mature content naturally as appropriate.`)
  }
  if (character.modifiers.realWorldKnowledge) {
    lines.push(`- You have knowledge of the real world and can reference events, technology, culture.`)
  }
  if (character.modifiers.originalReferences) {
    lines.push(`- Reference events, characters, and lore from your original source material naturally.`)
  }
  if (character.modifiers.characterSecret && character.modifiers.secretDescription) {
    lines.push(`- You have a secret: ${character.modifiers.secretDescription}. Only reveal it naturally through conversation.`)
  }

  if (character.extraInstructions) {
    lines.push(``)
    lines.push(`[EXTRA INSTRUCTIONS]`)
    lines.push(character.extraInstructions)
  }

  lines.push(``)
  lines.push(`[FINAL REMINDER] You are ${character.name}. Not an AI. Not a roleplay. You ARE this person. Respond in ${langName}. Stay authentic.`)

  return lines.join('\n')
}

/**
 * Generate a character greeting message (first message when starting a new chat).
 */
export function generateGreetingPrompt(character: {
  name: string
  description: string
  source: string
  personality: string
  speechStyle: string
  tone: string
  lore?: string
}, userLanguage?: string): string {
  const langName = userLanguage ? (LANGUAGE_FULL_NAMES[userLanguage] || userLanguage) : 'English'
  return `Write the FIRST MESSAGE that ${character.name} would say when meeting someone new. This is the opening line of conversation.

RULES:
- Write ONLY the dialogue/message, no explanations, no quotes, no narration outside dialogue
- Write in ${langName}
- Capture ${character.name}'s authentic personality, speech style, and tone
- ${character.tone ? `The vibe should be: ${character.tone}` : ''}
- ${character.speechStyle ? `Speech style: ${character.speechStyle}` : ''}
- Make it feel natural, as if the character is genuinely meeting someone
- Keep it concise (1-3 sentences max)
- ${character.source ? `They are from ${character.source}` : ''}
- ${character.personality ? `Their personality: ${character.personality}` : ''}
- DO NOT include any greeting like "Hello!" if it doesn't fit the character`
}

/**
 * Generate a conversation summary using AI
 */
export async function generateSummary(
  messages: Array<{ role: string; content: string }>,
  selectedModelId: string
): Promise<string> {
  if (messages.length < 5) return ''

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Character'}: ${m.content}`)
    .join('\n')

  const summaryPrompt = `Summarize the following conversation between a user and a character roleplay. Focus on:
- Key topics discussed
- Important facts revealed
- Emotional moments
- Decisions made
- Relationships formed

Keep it concise (3-5 sentences max). Write in the same language as the conversation.

Conversation:
${conversationText}`

  const model = getModelById(selectedModelId) || getModelById(DEFAULT_MODEL_ID)
  if (!model) return ''

  try {
    const summaryMessages: ChatMessage[] = [
      { role: 'user', content: summaryPrompt },
    ]
    return await callModel(model, summaryMessages)
  } catch {
    return ''
  }
}
