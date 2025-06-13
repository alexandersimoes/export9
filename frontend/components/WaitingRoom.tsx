'use client'

import { useEffect, useState } from 'react'
import { GameStatus } from '@/types/game'

interface WaitingRoomProps {
  playerName: string
  status: GameStatus
  onPlayCPU: () => void
}

export default function WaitingRoom({ playerName, status, onPlayCPU }: WaitingRoomProps) {
  const [waitTime, setWaitTime] = useState(10)
  const [showCPUOption, setShowCPUOption] = useState(false)

  useEffect(() => {
    if (status === 'waiting_for_opponent') {
      const timer = setInterval(() => {
        setWaitTime(prev => {
          const newTime = prev - 1
          if (newTime <= 0) {
            setShowCPUOption(true)
            return 0
          }
          return newTime
        })
      }, 1000)

      return () => clearInterval(timer)
    } else {
      setWaitTime(10)
      setShowCPUOption(false)
    }
  }, [status])
  return (
    <div className="poker-table flex items-center justify-center p-4">
      <div className="card w-full max-w-[800px] mx-4">
        <div className="text-center">
          <div className="mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-game-primary mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--poker-dark-text)' }}>
              Welcome, {playerName}!
            </h2>
          </div>

          {status === 'connecting' && (
            <div>
              <p className="text-lg mb-4" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>Connecting to game server...</p>
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-game-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-game-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-game-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}

          {status === 'waiting_for_opponent' && (
            <div>
              <p className="text-lg mb-2" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>Looking for an opponent...</p>
              <p className="text-sm mb-4" style={{ color: 'var(--poker-dark-text)', opacity: 0.6 }}>
                {waitTime > 0 ? `CPU option in ${waitTime} seconds` : 'CPU option available'}
              </p>
              
              {!showCPUOption ? (
                <div className="rounded-lg p-4 mb-4 border" style={{ backgroundColor: '#f9f7f4', borderColor: '#d4b896' }}>
                  <p className="text-sm" style={{ color: 'var(--poker-dark-text)' }}>
                    You'll be automatically matched with another player when one becomes available.
                  </p>
                  <p className="text-xs mt-2" style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>
                    Or you can play against the CPU after 10 seconds
                  </p>
                </div>
              ) : (
                <div className="rounded-lg p-4 mb-4 border-2" style={{ backgroundColor: '#fff7e6', borderColor: 'var(--poker-accent)' }}>
                  <p className="text-sm mb-3" style={{ color: 'var(--poker-dark-text)' }}>
                    Still no opponent found. Would you like to play against the computer?
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={onPlayCPU}
                      className="btn-primary"
                    >
                      🤖 Play vs CPU
                    </button>
                    <button
                      onClick={() => setShowCPUOption(false)}
                      className="btn-secondary"
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