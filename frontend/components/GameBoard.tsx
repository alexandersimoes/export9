'use client'

import React, { useState } from 'react'
import { GameState, GameStatus, Card } from '@/types/game'
import RoundResultModal from './RoundResultModal'

interface GameBoardProps {
  gameState: GameState
  gameStatus: GameStatus
  playerName: string
  onPlayCard: (countryCode: string) => void
  error: string | null
}

export default function GameBoard({ 
  gameState, 
  gameStatus, 
  playerName, 
  onPlayCard, 
  error 
}: GameBoardProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [showRoundResult, setShowRoundResult] = useState(false)
  const [timeLeft, setTimeLeft] = useState(20)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const handleCardSelect = (countryCode: string) => {
    if (gameStatus === 'playing' && !hasSubmitted && timeLeft > 0) {
      // Verify the card is actually available
      const cardExists = gameState.your_cards.some(card => card.country_code === countryCode)
      if (cardExists) {
        setSelectedCard(countryCode)
        console.log(`Selected card: ${countryCode}`)
      } else {
        console.warn(`Attempted to select unavailable card: ${countryCode}`)
      }
    }
  }

  const handleSubmitCard = () => {
    if (selectedCard && !hasSubmitted) {
      onPlayCard(selectedCard)
      setHasSubmitted(true)
      setSelectedCard(null)
    }
  }

  const handleAutoSubmit = () => {
    if (hasSubmitted) return
    
    // Auto-submit the selected card if it's still valid, or first available card
    let cardToPlay = null
    
    if (selectedCard && gameState.your_cards.some(card => card.country_code === selectedCard)) {
      cardToPlay = selectedCard
    } else if (gameState.your_cards.length > 0) {
      cardToPlay = gameState.your_cards[0].country_code
    }
    
    if (cardToPlay) {
      console.log(`Auto-submitting card: ${cardToPlay}`)
      onPlayCard(cardToPlay)
      setHasSubmitted(true)
      setSelectedCard(null)
    }
  }

  const currentPlayer = gameState.players.find(p => p.name === playerName)
  const opponent = gameState.players.find(p => p.name !== playerName)

  // Show round result modal when round ends
  React.useEffect(() => {
    if (gameStatus === 'round_ended' && gameState.lastRoundResult) {
      setShowRoundResult(true)
    } else if (gameStatus === 'playing') {
      setShowRoundResult(false)
    }
  }, [gameStatus, gameState.lastRoundResult])

  // Reset state when new round starts
  React.useEffect(() => {
    if (gameStatus === 'playing') {
      console.log(`Starting round ${gameState.current_round}, resetting UI state`)
      setSelectedCard(null)
      setHasSubmitted(false)
      setTimeLeft(20)
    }
  }, [gameStatus, gameState.current_round])

  // Additional safety reset when cards change (new round starts)
  React.useEffect(() => {
    if (gameStatus === 'playing' && gameState.your_cards) {
      // If selected card is no longer in available cards, clear selection
      if (selectedCard && !gameState.your_cards.some(card => card.country_code === selectedCard)) {
        console.log(`Selected card ${selectedCard} no longer available, clearing selection`)
        setSelectedCard(null)
      }
    }
  }, [gameState.your_cards, selectedCard, gameStatus])

  // Countdown timer
  React.useEffect(() => {
    if (gameStatus !== 'playing' || hasSubmitted || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Auto-submit when time runs out
          setTimeout(() => handleAutoSubmit(), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStatus, hasSubmitted, timeLeft, gameState.current_round])


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-4">
      {/* Header */}
      <div className="card mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Export Game</h1>
            <div className="flex space-x-4 text-sm text-gray-600">
              <span>Round {gameState.current_round} of {gameState.total_rounds}</span>
              {gameState.current_product && (
                <span>Product: <strong>{gameState.current_product.name}</strong></span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Your Score</div>
            <div className="text-3xl font-bold text-game-primary">{currentPlayer?.score || 0}</div>
          </div>
        </div>
      </div>

      {/* Game Status */}
      {gameStatus === 'game_found' && (
        <div className="card mb-6 bg-green-50 border-green-200">
          <div className="text-center">
            <h2 className="text-xl font-bold text-green-800 mb-2">Game Found!</h2>
            <p className="text-green-700">
              You're playing against <strong>{opponent?.name}</strong>
            </p>
            <p className="text-sm text-green-600 mt-2">Get ready for the first round...</p>
          </div>
        </div>
      )}

      {/* Current Product */}
      {gameState.current_product && gameStatus === 'playing' && (
        <div className="card mb-6 bg-yellow-50 border-yellow-200">
          <div className="text-center">
            <h2 className="text-xl font-bold text-yellow-800 mb-2">
              Current Product: {gameState.current_product.name}
            </h2>
            <p className="text-yellow-700">
              Choose the country you think exports the most {gameState.current_product.name.toLowerCase()}
            </p>
            <div className="text-sm text-yellow-600 mt-2">
              Category: {gameState.current_product.category}
            </div>
          </div>
        </div>
      )}

      {/* Countdown Timer */}
      {gameStatus === 'playing' && !hasSubmitted && (
        <div className="card mb-6">
          <div className="text-center">
            <div className={`text-6xl font-bold mb-2 ${
              timeLeft <= 5 ? 'text-red-500 animate-pulse' : 
              timeLeft <= 10 ? 'text-yellow-500' : 'text-green-500'
            }`}>
              {timeLeft}
            </div>
            <p className="text-gray-600">
              {timeLeft <= 5 ? 'Time running out!' : 'seconds to make your choice'}
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mt-4 mb-2">
              <div 
                className={`h-3 rounded-full transition-all duration-1000 ${
                  timeLeft <= 5 ? 'bg-red-500' : 
                  timeLeft <= 10 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${(timeLeft / 20) * 100}%` }}
              ></div>
            </div>
            
            {selectedCard && (
              <p className="text-sm text-blue-600 mt-2">
                Selected: {gameState.your_cards.find(c => c.country_code === selectedCard)?.country_name}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {gameState.players.map((player) => (
          <div key={player.id} className={`card ${player.name === playerName ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{player.name}</h3>
                {player.name === playerName && <span className="text-sm text-blue-600">(You)</span>}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-game-primary">{player.score}</div>
                <div className="text-sm text-gray-600">
                  {player.name === playerName 
                    ? `${gameState.your_cards.length}/${10 - (gameState.current_round - 1)} cards left`
                    : `${10 - (gameState.current_round - 1)} cards left`
                  }
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="card mb-6 bg-red-50 border-red-200">
          <div className="text-center text-red-700">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Your Cards */}
      {gameStatus === 'playing' && gameState.your_cards.length > 0 && !hasSubmitted && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Your Country Cards</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            {gameState.your_cards.map((card: Card) => (
              <button
                key={card.country_code}
                onClick={() => handleCardSelect(card.country_code)}
                disabled={hasSubmitted || timeLeft <= 0}
                className={`game-card ${selectedCard === card.country_code ? 'selected' : ''} ${
                  hasSubmitted || timeLeft <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{getFlagEmoji(card.country_code)}</div>
                  <div className="font-semibold text-sm">{card.country_name}</div>
                  <div className="text-xs text-gray-500">{card.country_code}</div>
                </div>
              </button>
            ))}
          </div>
          
          {selectedCard && (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                You can change your selection anytime before submitting
              </p>
              <button
                onClick={handleSubmitCard}
                disabled={hasSubmitted || timeLeft <= 0}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Final Choice: {gameState.your_cards.find(c => c.country_code === selectedCard)?.country_name}
              </button>
            </div>
          )}
          
          {!selectedCard && timeLeft > 0 && (
            <div className="text-center">
              <p className="text-yellow-600 font-semibold">
                ⚠️ Select a country card above to submit your choice
              </p>
            </div>
          )}
        </div>
      )}

      {/* Card submitted - waiting for opponent */}
      {gameStatus === 'playing' && hasSubmitted && (
        <div className="card">
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-green-600 mb-2">Choice Submitted!</h3>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-game-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Waiting for opponent to make their choice...</p>
          </div>
        </div>
      )}

      {/* Time's up */}
      {gameStatus === 'playing' && !hasSubmitted && timeLeft <= 0 && (
        <div className="card">
          <div className="text-center">
            <div className="text-4xl mb-4">⏰</div>
            <h3 className="text-xl font-bold text-red-600 mb-2">Time's Up!</h3>
            <p className="text-gray-600">
              {selectedCard 
                ? `Auto-submitted: ${gameState.your_cards.find(c => c.country_code === selectedCard)?.country_name}`
                : `Auto-submitted: ${gameState.your_cards[0]?.country_name}`
              }
            </p>
          </div>
        </div>
      )}

      {/* Round ended */}
      {gameStatus === 'round_ended' && !showRoundResult && (
        <div className="card">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-4 text-green-600">Round Complete!</h3>
            <p className="text-gray-600 mb-4">Preparing next round...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-game-primary mx-auto"></div>
          </div>
        </div>
      )}

      {/* Round Result Modal */}
      {showRoundResult && gameState.lastRoundResult && (
        <RoundResultModal
          roundResult={gameState.lastRoundResult}
          playerName={playerName}
        />
      )}
    </div>
  )
}

// Helper function to get flag emoji (simplified)
function getFlagEmoji(countryCode: string): string {
  const flags: Record<string, string> = {
    'CN': '🇨🇳', 'US': '🇺🇸', 'DE': '🇩🇪', 'JP': '🇯🇵', 'UK': '🇬🇧',
    'FR': '🇫🇷', 'KR': '🇰🇷', 'IT': '🇮🇹', 'CA': '🇨🇦', 'ES': '🇪🇸',
    'IN': '🇮🇳', 'NL': '🇳🇱', 'BR': '🇧🇷', 'CH': '🇨🇭', 'AU': '🇦🇺',
    'IE': '🇮🇪', 'MX': '🇲🇽', 'RU': '🇷🇺', 'TH': '🇹🇭', 'MY': '🇲🇾'
  }
  return flags[countryCode] || '🏳️'
}