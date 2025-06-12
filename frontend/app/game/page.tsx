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
  
  const { gameState, gameStatus, error, joinGame, playCard, playCPU, reconnect } = useSocket()

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
        error={error}
      />
    )
  }

  // Default loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="card">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-game-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to game...</p>
        </div>
      </div>
    </div>
  )
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="card">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-game-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <GamePageContent />
    </Suspense>
  )
}