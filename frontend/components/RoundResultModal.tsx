'use client'

import { useState, useEffect } from 'react'
import { RoundResult, Product } from '@/types/game'
import { formatExportValue, formatExportValueWithPrecision, getFlagEmoji, getProductEmoji } from '@/lib/utils'

const TIME_BETWEEN_ROUNDS = 5

interface RoundResultModalProps {
  roundResult: RoundResult | null
  playerName: string
  currentProduct?: Product
}

export default function RoundResultModal({ roundResult, playerName, currentProduct }: RoundResultModalProps) {
  const [timeLeft, setTimeLeft] = useState(TIME_BETWEEN_ROUNDS)

  useEffect(() => {
    if (!roundResult) return

    // Reset timer when new round result comes in
    setTimeLeft(TIME_BETWEEN_ROUNDS)

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

  // Check if we need smart precision (same export values but different countries)
  const playersWithCards = roundResult.players.filter(p => p.card_played)
  const needsSmartPrecision = playersWithCards.length === 2 && 
    playersWithCards[0].card_played!.export_value === playersWithCards[1].card_played!.export_value &&
    playersWithCards[0].card_played!.country_code !== playersWithCards[1].card_played!.country_code

  // Create a map for formatted values
  const formattedValueMap = new Map()
  
  if (needsSmartPrecision) {
    // Use smart precision formatting
    const exportValues = playersWithCards.map(p => p.card_played!.export_value)
    const formattedValues = formatExportValueWithPrecision(exportValues)
    playersWithCards.forEach((player, index) => {
      formattedValueMap.set(player.card_played!.export_value + '_' + player.card_played!.country_code, formattedValues[index])
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card max-w-lg w-full mx-4">
        <div className="text-center">
          {/* Winner announcement */}
          <div className="mb-4">
            {isTie ? (
              <div>
                <div className="text-3xl mb-1">🤝</div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--poker-dark-text)' }}>It's a Tie!</h2>
                <p style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>Both players chose the winning country!</p>
              </div>
            ) : isWinner ? (
              <div>
                <div className="text-3xl mb-1">🏆</div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--poker-accent)' }}>You Won This Round!</h2>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-1">😔</div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--poker-dark-text)' }}>
                  {roundResult.winner_name} Won This Round
                </h2>
              </div>
            )}
            <div style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>
              <p>Round {roundResult.round_number} Results</p>
              {currentProduct && (
                <p className="text-sm mt-1">
                  {getProductEmoji(currentProduct.id)} {currentProduct.name}
                </p>
              )}
            </div>
          </div>

          {/* Cards played and export values */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--poker-dark-text)' }}>Cards Played:</h3>
            {roundResult.players.map((player) => (
              <div 
                key={player.id}
                className="p-4 rounded-lg border-2"
                style={{
                  backgroundColor: player.is_round_winner ? '#fff7e6' : '#f9f7f4',
                  borderColor: player.is_round_winner ? 'var(--poker-accent)' : '#d4b896'
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="text-left">
                    <div className="font-semibold" style={{ color: 'var(--poker-dark-text)' }}>
                      {player.name} {player.name === playerName && '(You)'}
                      {player.is_round_winner && (isTie ? ' 🤝' : ' 🏆')}
                    </div>
                    {player.card_played && (
                      <div className="text-sm" style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>
                        {getFlagEmoji(player.card_played.country_code)} {player.card_played.country_name}
                        {player.card_played.country_code === roundResult.winner_country && ' (Winning choice!)'}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {player.card_played && (
                      <div className="text-lg font-bold" style={{ color: 'var(--poker-accent)' }}>
                        {needsSmartPrecision 
                          ? formattedValueMap.get(player.card_played.export_value + '_' + player.card_played.country_code)
                          : formatExportValue(player.card_played.export_value)
                        }
                      </div>
                    )}
                    <div className="text-xs" style={{ color: 'var(--poker-dark-text)', opacity: 0.6 }}>exports</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Current scores */}
          <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#f9f7f4', border: '1px solid #d4b896' }}>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--poker-dark-text)' }}>
              Current Scores {isTie && '(Both players earned a point!)'}:
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {roundResult.players.map((player) => (
                <div key={player.id} className="text-center">
                  <div className="font-semibold" style={{ color: 'var(--poker-dark-text)' }}>
                    {player.name}
                    {player.is_round_winner && (
                      <span className="text-sm ml-1" style={{ color: 'var(--poker-accent)' }}>+1</span>
                    )}
                  </div>
                  <div className="poker-chip">{player.score}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Countdown */}
          <div className="text-center">
            <div className="text-sm mb-2" style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>
              Next round starting in:
            </div>
            <div className="text-3xl font-bold" style={{ color: 'var(--poker-accent)' }}>
              {timeLeft}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}