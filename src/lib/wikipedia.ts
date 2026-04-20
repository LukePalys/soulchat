/**
 * Wikipedia API Client for SoulChat v3
 * AI-planned research with progress callback
 * All searches are done in English; the AI translates to the user's language.
 */

import type { ResearchProgress, ResearchStep } from './types'
import { sendChatMessage } from './ai-chat'

export interface WikiSearchResult {
  title: string
  snippet: string
  pageId: number
}

export interface WikiArticle {
  title: string
  summary: string
  extract: string
  thumbnail: string
  sections: WikiSection[]
  categories: string[]
}

export interface WikiSection {
  title: string
  content: string
  subsections: WikiSection[]
}

export type SearchType = 'fast' | 'detailed'

const WIKI_API = 'https://en.wikipedia.org/w/api.php'

/**
 * Search Wikipedia for a query
 */
export async function searchWiki(query: string, limit: number = 5): Promise<WikiSearchResult[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: String(limit),
    format: 'json',
    origin: '*',
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(`${WIKI_API}?${params}`, { signal: controller.signal })
    const data = await response.json()
    return (data.query?.search || []).map((item: any) => ({
      title: item.title,
      snippet: stripHtml(item.snippet),
      pageId: item.pageid,
    }))
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Get full article data from Wikipedia
 */
export async function getWikiArticle(title: string, type: SearchType = 'detailed'): Promise<WikiArticle> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)

  try {
    const idParams = new URLSearchParams({
      action: 'query',
      titles: title,
      format: 'json',
      origin: '*',
    })

    const idResponse = await fetch(`${WIKI_API}?${idParams}`, { signal: controller.signal })
    const idData = await idResponse.json()
    const pages = idData.query?.pages || {}
    const pageId = Object.keys(pages)[0]

    if (!pageId || pageId === '-1') {
      throw new Error(`Article "${title}" not found on Wikipedia.`)
    }

    const contentParams = new URLSearchParams({
      action: 'query',
      pageids: pageId,
      prop: 'extracts|pageimages|categories',
      exintro: type === 'fast' ? '1' : '0',
      explaintext: '1',
      exsectionformat: 'plain',
      exlimit: '5',
      piprop: 'thumbnail',
      pithumbsize: '500',
      cllimit: '50',
      format: 'json',
      origin: '*',
    })

    const response = await fetch(`${WIKI_API}?${contentParams}`, { signal: controller.signal })
    const data = await response.json()

    const page = data.query?.pages?.[pageId]
    if (!page) throw new Error('Failed to fetch article.')

    const extract = page.extract || ''
    const summary = extract.split('\n\n')[0] || extract.substring(0, 500)
    const sections = type === 'detailed' ? parseSections(extract) : []
    const categories = (page.categories || []).map((cat: any) =>
      cat.title.replace('Category:', '')
    )
    const thumbnail = page.thumbnail?.source || ''

    return {
      title: page.title,
      summary,
      extract,
      thumbnail,
      sections,
      categories,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * AI-planned multi-step research with progress callback.
 * Step 1: AI generates smart search queries based on character name + source
 * Step 2: Execute all search queries in parallel
 * Step 3: Fetch full articles for all found pages
 * Step 4: Compile comprehensive character profile
 */
export async function multiStepResearch(
  characterName: string,
  sourceHint?: string,
  onProgress?: (progress: ResearchProgress) => void
): Promise<ResearchProgress> {
  const totalSteps = 5
  const steps: ResearchStep[] = [
    { id: 1, label: 'Analyzing character for research strategy...', status: 'active' },
    { id: 2, label: 'Executing smart Wikipedia searches...', status: 'pending' },
    { id: 3, label: 'Fetching full character articles...', status: 'pending' },
    { id: 4, label: 'Reading related articles...', status: 'pending' },
    { id: 5, label: 'Compiling comprehensive profile...', status: 'pending' },
  ]

  const updateProgress = (currentStep: number, overrides?: Partial<ResearchStep>) => {
    const updatedSteps: ResearchStep[] = steps.map((s, i) => {
      let status: ResearchStep['status'] = 'pending'
      if (i < currentStep - 1) status = 'done'
      else if (i === currentStep - 1) status = overrides?.status || 'active'
      return { ...s, status, ...(i === currentStep - 1 ? overrides : {}) }
    })
    onProgress?.({
      steps: updatedSteps,
      currentStep,
      totalSteps,
      isComplete: false,
      compiledText: '',
      thumbnail: '',
      source: '',
    })
  }

  try {
    // Step 1: AI generates search queries
    updateProgress(1)

    let searchQueries: string[] = []

    // Try to use AI to plan searches (falls back to hardcoded strategy)
    try {
      const planningPrompt = `I need to research a fictional character for an AI roleplay system. Generate 6 specific Wikipedia search queries that would find the most comprehensive information about this character.

Character name: ${characterName}
${sourceHint ? `Source/Origin: ${sourceHint}` : 'Source: Unknown'}

Generate exactly 6 search queries as a JSON array of strings. Focus on:
1. The character's main Wikipedia page
2. The source work (anime/game/movie/series) they appear in
3. Related characters, story arcs, or plot lines
4. The fictional universe/world they belong to
5. Voice actors, creators, or production info
6. Any cultural impact or reception articles

Return ONLY a JSON array, no markdown. Example: ["Goku", "Goku Dragon Ball", "Dragon Ball Z", "Son Goku", "Goku character analysis", "Dragon Ball anime"]`

      const planningResponse = await sendChatMessage('', [], planningPrompt, 'chatanywhere-gpt', '', undefined)
      const jsonMatch = planningResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed) && parsed.length >= 3) {
          searchQueries = parsed.map((q: any) => String(q).trim()).filter(q => q.length > 2)
        }
      }
    } catch (e) {
      console.warn('AI planning failed, using fallback strategy:', e)
    }

    // Fallback: generate smart queries manually
    if (searchQueries.length < 3) {
      searchQueries = [
        characterName,
        `${characterName} character`,
        sourceHint ? `${characterName} ${sourceHint}` : `${characterName} anime`,
        sourceHint || `${characterName} series`,
        `${characterName} fictional`,
        sourceHint ? sourceHint : `${characterName} film`,
      ]
    }

    // Step 2: Execute all searches in parallel
    updateProgress(2)

    const allTitles = new Set<string>()
    const searchPromises = searchQueries.slice(0, 6).map(q =>
      searchWiki(q, 5).catch(() => [] as WikiSearchResult[])
    )

    const searchResults = await Promise.all(searchPromises)
    for (const results of searchResults) {
      for (const r of results) {
        allTitles.add(r.title)
      }
    }

    // Step 3: Fetch main articles (first 4)
    updateProgress(3, { label: `Fetching ${Math.min(4, allTitles.size)} main articles...` })

    const titlesArray = Array.from(allTitles)
    const mainTitles = titlesArray.slice(0, 4)
    const allArticles: WikiArticle[] = []

    const mainPromises = mainTitles.map(title =>
      getWikiArticle(title, 'detailed').catch(() => null)
    )
    const mainArticles = await Promise.all(mainPromises)
    for (const article of mainArticles) {
      if (article) allArticles.push(article)
    }

    // Step 4: Fetch related articles (next 3)
    if (titlesArray.length > 4) {
      updateProgress(4, { label: 'Reading related articles...' })
      const relatedTitles = titlesArray.slice(4, 7)
      const relatedPromises = relatedTitles.map(title =>
        getWikiArticle(title, 'detailed').catch(() => null)
      )
      const relatedArticles = await Promise.all(relatedPromises)
      for (const article of relatedArticles) {
        if (article) allArticles.push(article)
      }
    } else {
      updateProgress(4, { label: 'Reading related articles...' })
    }

    // Step 5: Compile comprehensive profile
    updateProgress(5, { label: 'Compiling comprehensive profile...' })

    const seenContent = new Set<string>()
    const compiledParts: string[] = []
    let bestThumbnail = ''
    let bestSource = ''

    for (const article of allArticles) {
      if (!article.extract) continue

      if (!bestThumbnail && article.thumbnail) {
        bestThumbnail = article.thumbnail
      }

      let articleText = `=== ${article.title} ===\n\n`
      articleText += article.summary + '\n\n'

      for (const section of article.sections) {
        if (['External links', 'References', 'Further reading', 'See also', 'Notes', 'Bibliography', 'Footnotes'].includes(section.title)) {
          continue
        }
        const content = section.content.trim()
        if (content && content.length > 30) {
          const contentKey = content.substring(0, 100)
          if (!seenContent.has(contentKey)) {
            seenContent.add(contentKey)
            articleText += `--- ${section.title} ---\n${content}\n\n`
          }
        }
      }

      if (article.categories.length > 0) {
        articleText += `Categories: ${article.categories.join(', ')}\n`
      }

      compiledParts.push(articleText)

      // Try to determine source
      if (article.categories) {
        const animeCat = article.categories.find(c =>
          c.toLowerCase().includes('anime') || c.toLowerCase().includes('manga')
        )
        const gameCat = article.categories.find(c =>
          c.toLowerCase().includes('video game') || c.toLowerCase().includes('game')
        )
        const filmCat = article.categories.find(c =>
          c.toLowerCase().includes('film') || c.toLowerCase().includes('movie')
        )
        const bookCat = article.categories.find(c =>
          c.toLowerCase().includes('novel') || c.toLowerCase().includes('book') || c.toLowerCase().includes('literature')
        )
        if (animeCat) bestSource = bestSource || 'Anime/Manga'
        if (gameCat) bestSource = bestSource || 'Video Game'
        if (filmCat) bestSource = bestSource || 'Film/TV'
        if (bookCat) bestSource = bestSource || 'Book/Literature'
      }
    }

    // Small delay for the "compiling" step to feel natural
    await delay(500)

    const compiledText = compiledParts.join('\n---\n\n')

    const finalSteps = steps.map(s => ({ ...s, status: 'done' as const }))

    const result: ResearchProgress = {
      steps: finalSteps,
      currentStep: totalSteps,
      totalSteps,
      isComplete: true,
      compiledText,
      thumbnail: bestThumbnail,
      source: bestSource || sourceHint || '',
    }

    onProgress?.(result)
    return result

  } catch (error) {
    console.error('Research failed:', error)
    const errorSteps = steps.map((s, i) => ({
      ...s,
      status: s.status === 'active' ? 'error' as const : s.status as ResearchStep['status'],
    }))

    const result: ResearchProgress = {
      steps: errorSteps,
      currentStep: steps.findIndex(s => s.status === 'active') + 1 || 1,
      totalSteps,
      isComplete: false,
      compiledText: '',
      thumbnail: '',
      source: '',
    }

    onProgress?.(result)
    return result
  }
}

export async function smartSearch(query: string, type: SearchType = 'fast'): Promise<WikiArticle | null> {
  try {
    const searchResults = await searchWiki(query)
    if (searchResults.length === 0) return null
    return await getWikiArticle(searchResults[0].title, type)
  } catch {
    return null
  }
}

export function formatArticleForAI(article: WikiArticle, type: SearchType): string {
  let text = `# ${article.title}\n\n`

  if (type === 'fast') {
    text += article.summary
  } else {
    text += article.summary + '\n\n'
    for (const section of article.sections) {
      if (['External links', 'References', 'Further reading', 'See also', 'Notes'].includes(section.title)) {
        continue
      }
      text += `## ${section.title}\n${section.content}\n\n`
    }
    if (article.categories.length > 0) {
      text += `Categories: ${article.categories.join(', ')}\n`
    }
  }

  return text
}

function parseSections(text: string): WikiSection[] {
  const sections: WikiSection[] = []
  const lines = text.split('\n')
  let currentSection: WikiSection | null = null
  let currentContent: string[] = []

  for (const line of lines) {
    if (line.startsWith('== ') || line.startsWith('==')) {
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim()
        if (currentSection.content) sections.push(currentSection)
      }
      const title = line.replace(/={2,}/g, '').trim()
      currentSection = { title, content: '', subsections: [] }
      currentContent = []
    } else if (line.trim()) {
      currentContent.push(line)
    }
  }

  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim()
    if (currentSection.content) sections.push(currentSection)
  }

  return sections
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
