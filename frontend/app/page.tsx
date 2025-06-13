'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getFlagEmoji } from '@/lib/utils'
import { Suspense } from 'react'

function HomeContent() {
  const searchParams = useSearchParams()
  const [playerName, setPlayerName] = useState('')
  const router = useRouter()

  // Pre-fill name from URL if coming from "Play Again"
  useEffect(() => {
    const nameFromUrl = searchParams.get('name')
    if (nameFromUrl) {
      setPlayerName(nameFromUrl)
    }
  }, [searchParams])

  const handleJoinGame = () => {
    if (playerName.trim()) {
      router.push(`/game?name=${encodeURIComponent(playerName)}`)
    }
  }

  return (
    <div className="poker-table flex items-center justify-center p-4">
      <div className="card w-full max-w-[800px] mx-4">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Export Holdem" 
              className="h-20 w-auto"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
            />
          </div>
          
          <p className="text-lg" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>
            Test your knowledge of global trade exports in this real-time multiplayer game
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="playerName" className="block text-sm font-semibold mb-3" style={{ color: 'var(--poker-dark-text)' }}>
              Enter your name
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-lg border-2 font-medium transition-all duration-200 focus:outline-none"
              style={{ 
                backgroundColor: '#fff', 
                borderColor: '#d4b896',
                color: 'var(--poker-dark-text)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--poker-accent)'}
              onBlur={(e) => e.target.style.borderColor = '#d4b896'}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
            />
          </div>
          
          <button
            onClick={handleJoinGame}
            disabled={!playerName.trim()}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Game
          </button>
        </div>
        
        <div className="mt-8 text-sm text-center" style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>
          <div className="flex justify-center gap-6">
            <span>🎯 2 players</span>
            <span>🎲 9 rounds</span>
            <span>⚡ Real-time</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="card max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-game-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}