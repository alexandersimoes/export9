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
    router.push(`/?name=${encodeURIComponent(playerName)}`)
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
                            {isWinner ? 'Winner' : '2nd Place'}
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