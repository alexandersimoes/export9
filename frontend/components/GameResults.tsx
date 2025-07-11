'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { GameState } from '@/types/game'
import { useUser } from '@/contexts/UserContext'
import { updateGuestElo, getGuestEloData } from '@/lib/guestElo'
import { useOECSession, type OECSession } from "@/lib/useOECSession"
import { getStoredGeolocationData } from '@/lib/geolocation'

interface GameResultsProps {
  gameState: GameState
  playerName: string
  userId: string
}

interface EloChange {
  change: number
  newElo: number
}

export default function GameResults({ gameState, playerName, userId }: GameResultsProps) {
  const router = useRouter()
  const { user, isGuest, refreshUser, refreshGuestData } = useUser()
  const session: OECSession = useOECSession()
  const [eloChange, setEloChange] = useState<EloChange | null>(null)
  const [processingElo, setProcessingElo] = useState(true)
  const oecSaveAttempted = useRef(false)
  
  // Use game ID + user ID + player scores as unique identifier to prevent duplicate processing
  const gameResultId = `${gameState.game_id}-${userId}-${gameState.players.map(p => p.score).join('-')}`
  
  const currentPlayer = gameState.players.find(p => p.name === playerName)
  const opponent = gameState.players.find(p => p.name !== playerName)
  
  const isWinner = !!(currentPlayer && opponent && currentPlayer.score > opponent.score)
  const isDraw = !!(currentPlayer && opponent && currentPlayer.score === opponent.score)

  // Save score to OEC API for authenticated users
  const saveScoreToOEC = async (won: boolean, userId: string, gameScores: { playerScore: number, opponentScore: number }, eloData: { oldElo: number, newElo: number }, opponentData: any) => {
    try {
      const geoData = getStoredGeolocationData()
      
      await fetch('https://oec.world/api/games/score', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          game: 'export-holdem',
          meta: {
            user: geoData,
            userId,
            opponent: opponentData
          },
          answer: {
            playerScore: gameScores.playerScore,
            opponentScore: gameScores.opponentScore,
          },
          submission: {
            oldElo: eloData.oldElo,
            newElo: eloData.newElo,
            eloChange: eloData.newElo - eloData.oldElo
          },
          won: won,
        }),
      })
    } catch (error) {
      console.error('Error saving score to OEC:', error)
    }
  }

  // Handle game end for OEC authenticated users (localStorage only)
  const handleOECUserGameEnd = async (currentPlayer: any, opponent: any, isWinner: boolean, isDraw: boolean, alreadySavedToOEC: boolean, oecSavedGames: string[]) => {
    if (!currentPlayer || !opponent) return
    
    // Check if we've already added this game to history
    const existingHistory = JSON.parse(localStorage.getItem('export9_history') || '[]')
    const gameAlreadyInHistory = existingHistory.some((h: any) => 
      h.date && Math.abs(new Date(h.date).getTime() - new Date().getTime()) < 30000 && // Within 30 seconds
      h.answer?.playerScore === currentPlayer.score && 
      h.answer?.opponentScore === opponent.score
    )
    
    if (gameAlreadyInHistory) {
      console.log('Game already in history, skipping localStorage update')
      return
    }
    
    // Calculate ELO change (simplified calculation for OEC users)
    const oldElo = user?.elo_rating || 1200
    const kFactor = (user?.games_played || 0) < 30 ? 32 : 16
    const expectedScore = 0.5 // Assume equal skill for now
    const actualScore = isWinner ? 1 : (isDraw ? 0.5 : 0)
    const eloChange = Math.round(kFactor * (actualScore - expectedScore))
    const newElo = Math.max(100, Math.min(3000, oldElo + eloChange))
    
    // Update ELO display
    setEloChange({
      change: eloChange,
      newElo: newElo
    })
    
    // Create game history entry
    const isGameDraw = currentPlayer.score === opponent.score
    const gameHistoryEntry = {
      game: 'export-holdem',
      meta: {
        user: getStoredGeolocationData(),
        userId: user?.id,
        opponent: 'cpu' // Most games are vs CPU
      },
      answer: {
        playerScore: currentPlayer.score,
        opponentScore: opponent.score
      },
      submission: {
        oldElo: oldElo,
        newElo: newElo,
        eloChange: eloChange
      },
      won: isWinner,
      isDraw: isGameDraw,
      date: new Date().toISOString()
    }
    
    // Update localStorage history
    const updatedHistory = [...existingHistory, gameHistoryEntry]
    localStorage.setItem('export9_history', JSON.stringify(updatedHistory))
    
    // Update user stats from the new history data
    await refreshUser()
    
    // Save to OEC API if not already saved
    if (!alreadySavedToOEC && !oecSaveAttempted.current) {
      const gameScores = {
        playerScore: currentPlayer.score,
        opponentScore: opponent.score
      }
      const eloData = {
        oldElo: oldElo,
        newElo: newElo
      }
      
      // Mark as attempted immediately to prevent race conditions
      oecSaveAttempted.current = true
      
      // Mark as saved in localStorage BEFORE calling to prevent race conditions
      const updatedOecSavedGames = [...oecSavedGames, gameResultId]
      const trimmedOecSavedGames = updatedOecSavedGames.slice(-50)
      localStorage.setItem('export9_oec_saved_games', JSON.stringify(trimmedOecSavedGames))
      
      // Save to OEC API
      await saveScoreToOEC(isWinner, user?.id || '', gameScores, eloData, 'cpu')
      console.log('OEC score saved for game:', gameResultId)
    }
  }

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

      // Check if OEC score has been saved for this game
      const oecSavedGames = JSON.parse(localStorage.getItem('export9_oec_saved_games') || '[]')
      const alreadySavedToOEC = oecSavedGames.includes(gameResultId)

      try {
        if (!isGuest) {
          // OEC authenticated users: only update localStorage, don't use backend database
          await handleOECUserGameEnd(currentPlayer, opponent, isWinner, isDraw, alreadySavedToOEC, oecSavedGames)
        } else {
          // Guest users: use backend API system
          const opponentUser = gameState.players.find(p => p.name !== playerName)

          const gameResults = {
            player1_id: user.id,
            player2_id: (opponentUser as any).user_id || 'cpu',
            player1_score: currentPlayer.score,
            player2_score: opponent.score
          }
          
          const apiUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://export9.oec.world'
          const response = await fetch(`${apiUrl}/api/games/result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gameResults)
          })
          
          if (response.ok) {
            const result = await response.json()
            const newEloRating = user.elo_rating + result.player1_elo_change
            
            setEloChange({
              change: result.player1_elo_change,
              newElo: newEloRating
            })
            
            // Refresh user data for guest users
            await refreshUser()
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
      <div className="card w-full max-w-[800px] mx-2">
        <div className="text-center">
          {/* Game Result Header */}
          <div className="mb-2">
            {isWinner && (
              <div className="mb-2 md:mb-4">
                <div className="text-3xl md:text-4xl mb-2">🏆</div>
                <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--poker-accent)' }}>You Won!</h1>
                {gameState.gameEndedEarly && gameState.forfeitReason === 'opponent_disconnected' ? (
                  <p className="text-lg" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>
                    {gameState.forfeitingPlayerName} disconnected - Victory by forfeit!
                  </p>
                ) : (
                  <p className="text-lg" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>Congratulations on your victory!</p>
                )}
              </div>
            )}
            
            {!isWinner && !isDraw && (
              <div className="mb-2 md:mb-4">
                <div className="text-3xl md:text-4xl mb-2">😔</div>
                <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--poker-dark-text)' }}>You Lost</h1>
                <p className="text-lg" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>Better luck next time!</p>
              </div>
            )}
            
            {isDraw && (
              <div className="mb-2 md:mb-4">
                <div className="text-3xl md:text-4xl mb-2">🤝</div>
                <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--poker-accent)' }}>It's a Draw!</h1>
                <p className="text-lg" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>What an evenly matched game!</p>
              </div>
            )}
          </div>

          {/* Final Scores */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-2 md:mb-4" style={{ color: 'var(--poker-dark-text)' }}>Final Scores</h2>
            <div className="space-y-2 md:space-y-4">
              {gameState.players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => {
                  // Check if this is a tie (both players have same score)
                  const isTie = gameState.players[0].score === gameState.players[1].score
                  const isWinner = isTie || index === 0
                  
                  return (
                    <div 
                      key={player.id} 
                      className="flex justify-between items-center p-2 md:p-4 rounded-lg border-2"
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
                          <div className="font-bold text-lg" style={{ color: 'var(--poker-dark-text)', lineHeight: '1.2' }}>
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
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* ELO Change Display */}
          {eloChange && !processingElo && (
            <div className="mb-4 md:mb-6 rounded-lg p-2" style={{
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
          <div className="mt-4 md:mt-8 text-sm" style={{ color: 'var(--poker-dark-text)', opacity: 0.6 }}>
            <p>Thanks for playing Export Hold'em!</p>
            <p>Challenge your friends and test your global trade knowledge.</p>
          </div>
        </div>
      </div>
    </div>
  )
}