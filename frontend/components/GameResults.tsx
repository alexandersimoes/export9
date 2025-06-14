'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GameState } from '@/types/game'
import { useUser } from '@/contexts/UserContext'
import { updateGuestElo, getGuestEloData } from '@/lib/guestElo'

interface GameResultsProps {
  gameState: GameState
  playerName: string
}

interface EloChange {
  change: number
  newElo: number
}

export default function GameResults({ gameState, playerName }: GameResultsProps) {
  const router = useRouter()
  const { user, isGuest, refreshUser, refreshGuestData } = useUser()
  const [eloChange, setEloChange] = useState<EloChange | null>(null)
  const [processingElo, setProcessingElo] = useState(true)
  
  // Use game ID + player scores as unique identifier to prevent duplicate processing
  const gameResultId = `${gameState.game_id}-${gameState.players.map(p => p.score).join('-')}`
  
  const currentPlayer = gameState.players.find(p => p.name === playerName)
  const opponent = gameState.players.find(p => p.name !== playerName)
  
  const isWinner = currentPlayer && opponent && currentPlayer.score > opponent.score
  const isDraw = currentPlayer && opponent && currentPlayer.score === opponent.score

  // Process ELO changes
  useEffect(() => {
    const processEloChanges = async () => {
      if (!user || !currentPlayer || !opponent) {
        setProcessingElo(false)
        return
      }
      
      // Check if we've already processed this game result
      const processedGames = JSON.parse(localStorage.getItem('export9_processed_games') || '[]')
      if (processedGames.includes(gameResultId)) {
        setProcessingElo(false)
        return
      }

      try {
        if (isGuest) {
          // Handle guest ELO update locally
          const currentGuestData = getGuestEloData()
          if (currentGuestData) {
            const previousElo = currentGuestData.elo_rating
            
            const updatedGuestData = updateGuestElo(
              opponent.name,
              1200, // Default opponent ELO for now
              currentPlayer.score,
              opponent.score
            )
            
            if (updatedGuestData) {
              setEloChange({
                change: updatedGuestData.elo_rating - previousElo,
                newElo: updatedGuestData.elo_rating
              })
              
              // Refresh guest data in context to update UI
              refreshGuestData()
            }
          }
        } else {
          // Handle authenticated user ELO update via API
          const opponentUser = gameState.players.find(p => p.name !== playerName)
          if (opponentUser && 'user_id' in opponentUser) {
            const apiUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://export9.oec.world'
            const response = await fetch(`${apiUrl}/api/games/result`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                player1_id: user.id,
                player2_id: (opponentUser as any).user_id,
                player1_score: currentPlayer.score,
                player2_score: opponent.score
              })
            })
            
            if (response.ok) {
              const result = await response.json()
              setEloChange({
                change: result.player1_elo_change,
                newElo: user.elo_rating + result.player1_elo_change
              })
              
              // Refresh user data
              await refreshUser()
            }
          }
        }
        // Mark this game as processed to prevent duplicate updates
        const processedGames = JSON.parse(localStorage.getItem('export9_processed_games') || '[]')
        processedGames.push(gameResultId)
        // Keep only last 50 processed games to prevent unlimited growth
        const trimmedProcessedGames = processedGames.slice(-50)
        localStorage.setItem('export9_processed_games', JSON.stringify(trimmedProcessedGames))
        
      } catch (error) {
        console.error('Failed to process ELO changes:', error)
      } finally {
        setProcessingElo(false)
      }
    }

    processEloChanges()
  }, [user, currentPlayer, opponent, isGuest, playerName, gameState.players, refreshUser, refreshGuestData, gameResultId])
  
  const handlePlayAgain = () => {
    router.push('/')
  }

  return (
    <div className="poker-table flex items-center justify-center p-4">
      <div className="card w-full max-w-[800px] mx-4">
        <div className="text-center">
          {/* Game Result Header */}
          <div className="mb-8">
            {isWinner && (
              <div className="mb-4">
                <div className="text-6xl mb-2">🏆</div>
                <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--poker-accent)' }}>You Won!</h1>
                <p className="text-lg" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>Congratulations on your victory!</p>
              </div>
            )}
            
            {!isWinner && !isDraw && (
              <div className="mb-4">
                <div className="text-6xl mb-2">😔</div>
                <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--poker-dark-text)' }}>You Lost</h1>
                <p className="text-lg" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>Better luck next time!</p>
              </div>
            )}
            
            {isDraw && (
              <div className="mb-4">
                <div className="text-6xl mb-2">🤝</div>
                <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--poker-accent)' }}>It's a Draw!</h1>
                <p className="text-lg" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>What an evenly matched game!</p>
              </div>
            )}
          </div>

          {/* Final Scores */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--poker-dark-text)' }}>Final Scores</h2>
            <div className="space-y-4">
              {gameState.players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => {
                  // Check if this is a tie (both players have same score)
                  const isTie = gameState.players[0].score === gameState.players[1].score
                  const isWinner = isTie || index === 0
                  
                  return (
                    <div 
                      key={player.id} 
                      className="flex justify-between items-center p-4 rounded-lg border-2"
                      style={{
                        backgroundColor: player.name === playerName ? '#fff7e6' : '#f9f7f4',
                        borderColor: player.name === playerName ? 'var(--poker-accent)' : '#d4b896'
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">
                          {isTie ? '🥇' : (index === 0 ? '🥇' : '🥈')}
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-lg" style={{ color: 'var(--poker-dark-text)' }}>
                            {player.name}
                            {player.name === playerName && <span className="ml-2" style={{ color: 'var(--poker-accent)' }}>(You)</span>}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>
                            {isTie ? 'Draw' : (isWinner ? 'Winner' : '2nd Place')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="poker-chip text-xl">{player.score}</div>
                        <div className="text-sm" style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>rounds won</div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* ELO Change Display */}
          {eloChange && !processingElo && (
            <div className="mb-6 rounded-lg p-4" style={{ 
              backgroundColor: eloChange.change >= 0 ? '#e8f5e8' : '#fde8e8', 
              border: `2px solid ${eloChange.change >= 0 ? '#4ade80' : '#f87171'}`
            }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--poker-dark-text)' }}>
                ELO Rating Update
              </h3>
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <div className="text-sm opacity-75" style={{ color: 'var(--poker-dark-text)' }}>
                    {eloChange.change >= 0 ? 'Rating Gained' : 'Rating Lost'}
                  </div>
                  <div className="text-2xl font-bold" style={{ 
                    color: eloChange.change >= 0 ? '#22c55e' : '#ef4444'
                  }}>
                    {eloChange.change >= 0 ? '+' : ''}{eloChange.change}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm opacity-75" style={{ color: 'var(--poker-dark-text)' }}>
                    New Rating
                  </div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--poker-accent)' }}>
                    {eloChange.newElo}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {processingElo && (
            <div className="mb-6 rounded-lg p-4 text-center" style={{ backgroundColor: '#f9f7f4', border: '1px solid #d4b896' }}>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-poker-strong-bg mx-auto mb-2"></div>
              <p className="text-sm" style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>
                Updating your ELO rating...
              </p>
            </div>
          )}

          {/* Game Stats */}
          <div className="mb-8 rounded-lg p-6" style={{ backgroundColor: '#f9f7f4', border: '1px solid #d4b896' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--poker-dark-text)' }}>Game Statistics</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold" style={{ color: 'var(--poker-accent)' }}>{gameState.total_rounds}</div>
                <div className="text-sm" style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>Total Rounds</div>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: 'var(--poker-accent)' }}>
                  {Math.max(...gameState.players.map(p => p.score))}
                </div>
                <div className="text-sm" style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>Highest Score</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button 
              onClick={handlePlayAgain}
              className="w-full btn-primary"
            >
              Play Again
            </button>
            <button 
              onClick={() => router.push('/')}
              className="w-full btn-secondary"
            >
              Back to Home
            </button>
          </div>

          {/* Thank you message */}
          <div className="mt-8 text-sm" style={{ color: 'var(--poker-dark-text)', opacity: 0.6 }}>
            <p>Thanks for playing Export Hold'em!</p>
            <p>Challenge your friends and test your global trade knowledge.</p>
          </div>
        </div>
      </div>
    </div>
  )
}