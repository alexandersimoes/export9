'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSocket } from '@/lib/useSocket'
import { useUser } from '@/contexts/UserContext'
import GameBoard from '@/components/GameBoard'
import WaitingRoom from '@/components/WaitingRoom'
import GameResults from '@/components/GameResults'
import ErrorDisplay from '@/components/ErrorDisplay'

function GamePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading } = useUser()
  
  const { gameState, gameStatus, error, joinGame, rejoinGame, requestRejoin, playCard, playCPU, quitGame, reconnect, playerId } = useSocket()

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to home if no user
      router.push('/')
      return
    }
    
    if (user && gameStatus === 'connecting') {
      const storedGame = localStorage.getItem('export9_active_game')
      if (storedGame) {
        try {
          const parsed = JSON.parse(storedGame)
          if (parsed?.user_id === `${user.id}` && parsed?.game_id && parsed?.player_id) {
            rejoinGame(parsed.game_id, parsed.player_id, user.display_name, `${user.id}`)
            return
          }
        } catch (error) {
          localStorage.removeItem('export9_active_game')
        }
      }

      const roomCode = searchParams?.get('room') || localStorage.getItem('private_room_code') || ''
      joinGame(user.display_name, `${user.id}`, roomCode)
      
      // Clear room code from localStorage after use
      if (localStorage.getItem('private_room_code')) {
        localStorage.removeItem('private_room_code')
      }
    }
  }, [user, isLoading, gameStatus, joinGame, rejoinGame, router, searchParams])

  // Show error state
  if (error && gameStatus === 'error') {
    const showResume = error.includes('already in a game')
    const handleResume = () => {
      const storedGame = localStorage.getItem('export9_active_game')
      if (storedGame && user) {
        try {
          const parsed = JSON.parse(storedGame)
          if (parsed?.game_id && parsed?.player_id) {
            requestRejoin(parsed.game_id, parsed.player_id, user.display_name, `${user.id}`)
            return
          }
        } catch (error) {
          localStorage.removeItem('export9_active_game')
        }
      }
      router.push('/')
    }

    return (
      <ErrorDisplay 
        error={error} 
        onRetry={showResume ? handleResume : reconnect}
        retryLabel={showResume ? 'Resume Game' : undefined}
      />
    )
  }

  // Show waiting room while looking for opponent
  if (gameStatus === 'connecting' || gameStatus === 'waiting_for_opponent' || gameStatus === 'waiting_for_friend') {
    return (
      <WaitingRoom 
        playerName={user?.display_name || ''}
        status={gameStatus}
        onPlayCPU={playCPU}
      />
    )
  }

  // Show game results when game ends
  if (gameStatus === 'game_ended' && gameState) {
    return (
      <GameResults 
        gameState={gameState}
        playerName={user?.display_name || ''}
        playerId={playerId || ''}
        userId={user?.id || ''}
      />
    )
  }

  // Show main game board during active play
  if (gameState && (gameStatus === 'playing' || gameStatus === 'round_ended' || gameStatus === 'game_found')) {
    return (
      <GameBoard 
        gameState={gameState}
        gameStatus={gameStatus}
        playerName={user?.display_name || ''}
        playerId={playerId || ''}
        onPlayCard={playCard}
        onQuitGame={quitGame}
        error={error}
      />
    )
  }

  // Default loading state
  return (
    <div className="poker-table flex items-center justify-center p-4">
      <div className="card w-full max-w-[800px] mx-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--poker-accent)' }}></div>
          <p style={{ color: 'var(--poker-dark-text)' }}>Connecting to game...</p>
        </div>
      </div>
    </div>
  )
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="poker-table flex items-center justify-center p-4">
        <div className="card w-full max-w-[800px] mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--poker-accent)' }}></div>
            <p style={{ color: 'var(--poker-dark-text)' }}>Loading...</p>
          </div>
        </div>
      </div>
    }>
      <GamePageContent />
    </Suspense>
  )
}
