'use client'

import { useEffect, useState } from 'react'
import { GameStatus } from '@/types/game'

interface WaitingRoomProps {
  playerName: string
  status: GameStatus
  onPlayCPU: () => void
}

export default function WaitingRoom({ playerName, status, onPlayCPU }: WaitingRoomProps) {
  const [waitTime, setWaitTime] = useState(0)
  const [showCPUOption, setShowCPUOption] = useState(false)

  useEffect(() => {
    if (status === 'waiting_for_opponent') {
      const timer = setInterval(() => {
        setWaitTime(prev => {
          const newTime = prev + 1
          if (newTime >= 10) {
            setShowCPUOption(true)
          }
          return newTime
        })
      }, 1000)

      return () => clearInterval(timer)
    } else {
      setWaitTime(0)
      setShowCPUOption(false)
    }
  }, [status])
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="card max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-game-primary mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome, {playerName}!
            </h2>
          </div>

          {status === 'connecting' && (
            <div>
              <p className="text-lg text-gray-600 mb-4">Connecting to game server...</p>
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-game-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-game-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-game-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}

          {status === 'waiting_for_opponent' && (
            <div>
              <p className="text-lg text-gray-600 mb-2">Looking for an opponent...</p>
              <p className="text-sm text-gray-500 mb-4">Waiting for {waitTime} seconds</p>
              
              {!showCPUOption ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-700">
                    You'll be automatically matched with another player when one becomes available.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Or you can play against the CPU after 30 seconds
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 mb-3">
                    Still no opponent found. Would you like to play against the computer?
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={onPlayCPU}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                      🤖 Play vs CPU
                    </button>
                    <button
                      onClick={() => setShowCPUOption(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                      Keep Waiting
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex justify-center space-x-1">
                <div className="w-3 h-3 bg-game-secondary rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-game-secondary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-game-secondary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}

          <div className="mt-8 text-sm text-gray-500 space-y-2">
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">How to Play:</h3>
              <ul className="text-left space-y-1">
                <li>• Look at the product</li>
                <li>• Pick a country card</li>
                <li>• The country with the most exports wins</li>
                <li>• Watch out! You can only use a card once!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}