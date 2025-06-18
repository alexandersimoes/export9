'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/lib/useSocket'
import { useUser } from '@/contexts/UserContext'
import GameBoard from '@/components/GameBoard'
import WaitingRoom from '@/components/WaitingRoom'
import GameResults from '@/components/GameResults'
import ErrorDisplay from '@/components/ErrorDisplay'

function GamePageContent() {
  const router = useRouter()
  const { user, isLoading } = useUser()
  
  const { gameState, gameStatus, error, joinGame, playCard, playCPU, quitGame, reconnect } = useSocket()

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to home if no user
      router.push('/')
      return
    }
    
    if (user && gameStatus === 'connecting') {
      joinGame(user.display_name, `${user.id}`)
    }
  }, [user, isLoading, gameStatus, joinGame, router])

  // Show error state
  if (error && gameStatus === 'error') {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={reconnect}
      />
    )
  }

  // Show waiting room while looking for opponent
  if (gameStatus === 'connecting' || gameStatus === 'waiting_for_opponent') {
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