'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSocket } from '@/lib/useSocket'
import GameBoard from '@/components/GameBoard'
import WaitingRoom from '@/components/WaitingRoom'
import GameResults from '@/components/GameResults'
import ErrorDisplay from '@/components/ErrorDisplay'

function GamePageContent() {
  const searchParams = useSearchParams()
  const playerName = searchParams.get('name') || ''
  
  const { gameState, gameStatus, error, joinGame, playCard, playCPU, quitGame, reconnect } = useSocket()

  useEffect(() => {
    if (playerName && gameStatus === 'connecting') {
      joinGame(playerName)
    }
  }, [playerName, gameStatus, joinGame])

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
        playerName={playerName}
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
        playerName={playerName}
      />
    )
  }

  // Show main game board during active play
  if (gameState && (gameStatus === 'playing' || gameStatus === 'round_ended' || gameStatus === 'game_found')) {
    return (
      <GameBoard 
        gameState={gameState}
        gameStatus={gameStatus}
        playerName={playerName}
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