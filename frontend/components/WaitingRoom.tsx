'use client'

import { useEffect, useState } from 'react'
import { GameStatus } from '@/types/game'
import { getFlagEmoji } from '@/lib/utils'
import HowToPlayInstructions from './HowToPlayInstructions'

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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--poker-strong-bg)' }}></div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--poker-dark-text)' }}>
              Welcome, {playerName}!
            </h2>
          </div>

          {status === 'connecting' && (
            <div>
              <p className="text-lg mb-2" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>Connecting to game server...</p>
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--poker-strong-bg)' }}></div>
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--poker-strong-bg)', animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--poker-strong-bg)', animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}

          {status === 'waiting_for_opponent' && (
            <div>
              <p className="text-lg mb-2" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>Looking for an opponent...</p>
              
              {!showCPUOption ? (
                <div className="rounded-lg p-4 mb-4 border" style={{ backgroundColor: '#f9f7f4', borderColor: '#d4b896' }}>
                  <p className="text-xs" style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>
                    If no opponent is found in {waitTime} seconds, you can play against the computer.
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
              
            </div>
          )}

          {/* How to Play Instructions */}
          <div className="mt-8">
            <HowToPlayInstructions />
          </div>
        </div>
      </div>
    </div>
  )
}