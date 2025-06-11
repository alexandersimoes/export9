'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [playerName, setPlayerName] = useState('')
  const router = useRouter()

  const handleJoinGame = () => {
    if (playerName.trim()) {
      router.push(`/game?name=${encodeURIComponent(playerName)}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="card max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Export Game</h1>
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