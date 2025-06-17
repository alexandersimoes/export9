'use client'

import { useEffect, useState } from 'react'
import { GameStatus } from '@/types/game'
import { getFlagEmoji } from '@/lib/utils'

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
          <div className="mt-8 rounded-lg p-6" style={{ backgroundColor: '#f9f7f4', border: '1px solid #d4b896' }}>
            <h3 className="text-lg font-bold mb-4 text-center" style={{ color: 'var(--poker-dark-text)' }}>
              How to Play
            </h3>
            
            <div className="space-y-4">
              {/* Example Round */}
              <div className="text-center">
                <div className="text-sm" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>
                  <strong>This Round's Product:</strong>
                </div>
                <div className="flex items-center justify-center space-x-2 my-3">
                  <span className="text-2xl">🚗</span>
                  <span className="text-lg font-semibold" style={{ color: 'var(--poker-strong-bg)' }}>
                    Cars
                  </span>
                </div>
                
                <div className="text-sm mb-3" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>
                  <strong>Your Cards - Pick the Best Exporter:</strong>
                </div>
                
                {/* Sample Hand with Game-Style Cards */}
                <div className="flex justify-center space-x-3 mb-4" style={{ perspective: '1000px' }}>
                  {/* USA Card */}
                  <div className="playing-card card-in-hand hover:scale-105 transition-transform cursor-pointer" style={{ transform: 'rotate(-8deg)' }}>
                    <div className="card-corner top-left">
                      <div>US</div>
                      <div style={{ fontSize: '10px' }}>{getFlagEmoji('US')}</div>
                    </div>
                    <div className="card-center">
                      <div className="card-flag">{getFlagEmoji('US')}</div>
                      <div className="card-name">USA</div>
                    </div>
                    <div className="card-corner bottom-right">
                      <div>US</div>
                      <div style={{ fontSize: '10px' }}>{getFlagEmoji('US')}</div>
                    </div>
                  </div>

                  {/* Germany Card - Winner */}
                  <div className="playing-card card-in-hand selected" style={{ transform: 'translateY(-8px) scale(1.05)', zIndex: 10 }}>
                    <div className="card-corner top-left">
                      <div>DE</div>
                      <div style={{ fontSize: '10px' }}>{getFlagEmoji('DE')}</div>
                    </div>
                    <div className="card-center">
                      <div className="card-flag">{getFlagEmoji('DE')}</div>
                      <div className="card-name">Germany</div>
                    </div>
                    <div className="card-corner bottom-right">
                      <div>DE</div>
                      <div style={{ fontSize: '10px' }}>{getFlagEmoji('DE')}</div>
                    </div>
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-green-600 bg-white px-2 py-1 rounded border border-green-500">
                      Best Choice!
                    </div>
                  </div>

                  {/* Brazil Card */}
                  <div className="playing-card card-in-hand hover:scale-105 transition-transform cursor-pointer" style={{ transform: 'rotate(8deg)' }}>
                    <div className="card-corner top-left">
                      <div>BR</div>
                      <div style={{ fontSize: '10px' }}>{getFlagEmoji('BR')}</div>
                    </div>
                    <div className="card-center">
                      <div className="card-flag">{getFlagEmoji('BR')}</div>
                      <div className="card-name">Brazil</div>
                    </div>
                    <div className="card-corner bottom-right">
                      <div>BR</div>
                      <div style={{ fontSize: '10px' }}>{getFlagEmoji('BR')}</div>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs mt-6" style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>
                  Germany exports the most cars! You win this round. 🏆
                </div>
              </div>
              
              {/* Game Rules */}
              <div className="border-t pt-4" style={{ borderColor: 'var(--poker-strong-bg)', opacity: 0.2 }}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-center">
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--poker-dark-text)' }}>Step 1</div>
                    <div style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>See the product</div>
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--poker-dark-text)' }}>Step 2</div>
                    <div style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>Pick best exporter</div>
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--poker-dark-text)' }}>Step 3</div>
                    <div style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>Win the round!</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}