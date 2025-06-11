'use client'

import { useRouter } from 'next/navigation'
import { GameState } from '@/types/game'

interface GameResultsProps {
  gameState: GameState
  playerName: string
}

export default function GameResults({ gameState, playerName }: GameResultsProps) {
  const router = useRouter()
  
  const currentPlayer = gameState.players.find(p => p.name === playerName)
  const opponent = gameState.players.find(p => p.name !== playerName)
  
  const isWinner = currentPlayer && opponent && currentPlayer.score > opponent.score
  const isDraw = currentPlayer && opponent && currentPlayer.score === opponent.score
  
  const handlePlayAgain = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 p-4">
      <div className="card max-w-2xl w-full mx-4">
        <div className="text-center">
          {/* Game Result Header */}
          <div className="mb-8">
            {isWinner && (
              <div className="mb-4">
                <div className="text-6xl mb-2">🏆</div>
                <h1 className="text-4xl font-bold text-green-600 mb-2">You Won!</h1>
                <p className="text-lg text-gray-600">Congratulations on your victory!</p>
              </div>
            )}
            
            {!isWinner && !isDraw && (
              <div className="mb-4">
                <div className="text-6xl mb-2">😔</div>
                <h1 className="text-4xl font-bold text-red-600 mb-2">You Lost</h1>
                <p className="text-lg text-gray-600">Better luck next time!</p>
              </div>
            )}
            
            {isDraw && (
              <div className="mb-4">
                <div className="text-6xl mb-2">🤝</div>
                <h1 className="text-4xl font-bold text-yellow-600 mb-2">It's a Draw!</h1>
                <p className="text-lg text-gray-600">What an evenly matched game!</p>
              </div>
            )}
          </div>

          {/* Final Scores */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Final Scores</h2>
            <div className="space-y-4">
              {gameState.players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                <div 
                  key={player.id} 
                  className={`flex justify-between items-center p-4 rounded-lg ${
                    player.name === playerName 
                      ? 'bg-blue-50 border-2 border-blue-200' 
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-lg">
                        {player.name}
                        {player.name === playerName && <span className="text-blue-600 ml-2">(You)</span>}
                      </div>
                      <div className="text-sm text-gray-600">
                        {index === 0 ? 'Winner' : `${index + 1}${index === 1 ? 'nd' : 'rd'} Place`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-game-primary">{player.score}</div>
                    <div className="text-sm text-gray-600">rounds won</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Game Stats */}
          <div className="mb-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Game Statistics</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-game-primary">{gameState.total_rounds}</div>
                <div className="text-sm text-gray-600">Total Rounds</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-game-primary">
                  {Math.max(...gameState.players.map(p => p.score))}
                </div>
                <div className="text-sm text-gray-600">Highest Score</div>
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
          <div className="mt-8 text-sm text-gray-500">
            <p>Thanks for playing Export Game!</p>
            <p>Challenge your friends and test your global trade knowledge.</p>
          </div>
        </div>
      </div>
    </div>
  )
}