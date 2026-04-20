'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import Onboarding from '@/components/soulchat/onboarding'
import Home from '@/components/soulchat/home'
import CreateCharacter from '@/components/soulchat/create-character'
import ChatView from '@/components/soulchat/chat-view'
import SettingsPanel from '@/components/soulchat/settings-panel'

export default function SoulChatApp() {
  const { view, user } = useStore()

  useEffect(() => {
    useStore.getState().loadData()

    const settings = useStore.getState().settings
    if (typeof document !== 'undefined') {
      const html = document.documentElement
      html.classList.remove('dark', 'light')
      if (settings.theme === 'dark') {
        html.classList.add('dark')
      } else if (settings.theme === 'light') {
        html.classList.add('light')
      } else {
        html.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      }
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const settings = useStore.getState().settings
      if (settings.theme === 'system') {
        const html = document.documentElement
        html.classList.remove('dark', 'light')
        html.classList.add(mq.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const currentView = (!user.onboarded || !user.name) ? 'onboarding' : view

  switch (currentView) {
    case 'onboarding': return <Onboarding />
    case 'home': return <Home />
    case 'create-character': return <CreateCharacter />
    case 'chat': return <ChatView />
    case 'settings': return <SettingsPanel />
    default: return <Home />
  }
}
