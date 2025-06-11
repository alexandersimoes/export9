'use client'

import { useState, useEffect } from 'react'
import { RoundResult } from '@/types/game'

interface RoundResultModalProps {
  roundResult: RoundResult | null
  playerName: string
}

export default function RoundResultModal({ roundResult, playerName }: RoundResultModalProps) {
  const [timeLeft, setTimeLeft] = useState(5)

  useEffect(() => {
    if (!roundResult) return

    // Reset timer when new round result comes in
    setTimeLeft(5)

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [roundResult])

  if (!roundResult) return null

  const currentPlayer = roundResult.players.find(p => p.name === playerName)
  const isWinner = currentPlayer?.is_round_winner || false
  const isTie = roundResult.is_tie

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4 shadow-xl">
        <div className="text-center">
          {/* Winner announcement */}
          <div className="mb-6">
            {isTie ? (
              <div className="text-blue-600">
                <div className="text-6xl mb-2">🤝</div>
                <h2 className="text-3xl font-bold mb-2">It's a Tie!</h2>
                <p className="text-blue-700">Both players chose the winning country!</p>
              </div>
            ) : isWinner ? (
              <div className="text-green-600">
                <div className="text-6xl mb-2">🏆</div>
                <h2 className="text-3xl font-bold mb-2">You Won This Round!</h2>
              </div>
            ) : (
              <div className="text-red-600">
                <div className="text-6xl mb-2">😔</div>
                <h2 className="text-3xl font-bold mb-2">
                  {roundResult.winner_name} Won This Round
                </h2>
              </div>
            )}
            <p className="text-gray-600">Round {roundResult.round_number} Results</p>
          </div>

          {/* Cards played and export values */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold">Cards Played:</h3>
            {roundResult.players.map((player) => (
              <div 
                key={player.id}
                className={`p-4 rounded-lg border-2 ${
                  player.is_round_winner
                    ? isTie 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'bg-green-50 border-green-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="text-left">
                    <div className="font-semibold">
                      {player.name} {player.name === playerName && '(You)'}
                      {player.is_round_winner && (isTie ? ' 🤝' : ' 🏆')}
                    </div>
                    {player.card_played && (
                      <div className="text-sm text-gray-600">
                        {player.card_played.country_name}
                        {player.card_played.country_code === roundResult.winner_country && ' (Winning choice!)'}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {player.card_played && (
                      <div className="text-lg font-bold text-blue-600">
                        ${player.card_played.export_value.toFixed(1)}B
                      </div>
                    )}
                    <div className="text-xs text-gray-500">exports</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Current scores */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">
              Current Scores {isTie && '(Both players earned a point!)'}:
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {roundResult.players.map((player) => (
                <div key={player.id} className="text-center">
                  <div className="font-semibold">
                    {player.name}
                    {player.is_round_winner && (
                      <span className="text-sm text-green-600 ml-1">+1</span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{player.score}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Countdown */}
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">
              Next round starting in:
            </div>
            <div className="text-3xl font-bold text-game-primary">
              {timeLeft}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}