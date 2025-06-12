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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="card max-w-md w-full mx-4">
        <div className="text-center mb-8">
          {/* Logo with Country Cards */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative" style={{ width: '140px', height: '100px' }}>
              {/* Back Card - Germany */}
              <div className="playing-card bg-white border-2 border-gray-800 rounded-lg shadow-lg absolute transform rotate-6" style={{
                width: '60px',
                height: '84px',
                left: '0px',
                top: '8px',
                zIndex: 1
              }}>
                {/* Top-left corner */}
                <div className="absolute top-1 left-1 text-xs font-bold text-gray-800">
                  <div>DE</div>
                  <div style={{ fontSize: '8px' }}>{getFlagEmoji('DE')}</div>
                </div>
                
                {/* Center flag */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-2xl">{getFlagEmoji('DE')}</div>
                </div>
                
                {/* Bottom-right corner (upside down) */}
                <div className="absolute bottom-1 right-1 text-xs font-bold text-gray-800 transform rotate-180">
                  <div>DE</div>
                  <div style={{ fontSize: '8px' }}>{getFlagEmoji('DE')}</div>
                </div>
              </div>
              
              {/* Middle Card - China */}
              <div className="playing-card bg-white border-2 border-gray-800 rounded-lg shadow-lg absolute transform rotate-12" style={{
                width: '60px',
                height: '84px',
                left: '40px',
                top: '0px',
                zIndex: 2
              }}>
                {/* Top-left corner */}
                <div className="absolute top-1 left-1 text-xs font-bold text-gray-800">
                  <div>CN</div>
                  <div style={{ fontSize: '8px' }}>{getFlagEmoji('CN')}</div>
                </div>
                
                {/* Center flag */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-2xl">{getFlagEmoji('CN')}</div>
                </div>
                
                {/* Bottom-right corner (upside down) */}
                <div className="absolute bottom-1 right-1 text-xs font-bold text-gray-800 transform rotate-180">
                  <div>CN</div>
                  <div style={{ fontSize: '8px' }}>{getFlagEmoji('CN')}</div>
                </div>
              </div>
              
              {/* Front Card - US */}
              <div className="playing-card bg-white border-2 border-gray-800 rounded-lg shadow-lg absolute transform rotate-3" style={{
                width: '60px',
                height: '84px',
                left: '80px',
                top: '4px',
                zIndex: 3
              }}>
                {/* Top-left corner */}
                <div className="absolute top-1 left-1 text-xs font-bold text-gray-800">
                  <div>US</div>
                  <div style={{ fontSize: '8px' }}>{getFlagEmoji('US')}</div>
                </div>
                
                {/* Center flag */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-2xl">{getFlagEmoji('US')}</div>
                </div>
                
                {/* Bottom-right corner (upside down) */}
                <div className="absolute bottom-1 right-1 text-xs font-bold text-gray-800 transform rotate-180">
                  <div>US</div>
                  <div style={{ fontSize: '8px' }}>{getFlagEmoji('US')}</div>
                </div>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Export 9</h1>
          <p className="text-gray-600">
            Test your knowledge of global trade exports in this real-time multiplayer game
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your name
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-game-primary"
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
        
        <div className="mt-8 text-sm text-gray-500 text-center">
          <p>• 2 players per game</p>
          <p>• 9 rounds of strategic play</p>
          <p>• Real-time multiplayer action</p>
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