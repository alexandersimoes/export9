'use client'

import React, { useState } from 'react'
import { GameState, GameStatus, Card } from '@/types/game'
import RoundResultModal from './RoundResultModal'
import { getFlagEmoji } from '@/lib/utils'

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
      // Verify the card is still available before submitting
      const cardExists = gameState.your_cards.some(card => card.country_code === selectedCard)
      if (cardExists) {
        onPlayCard(selectedCard)
        setHasSubmitted(true)
        setSelectedCard(null)
      } else {
        console.warn(`Selected card ${selectedCard} no longer available, clearing selection`)
        setSelectedCard(null)
      }
    }
  }

  const handleAutoSubmit = () => {
    if (hasSubmitted) return
    
    // Auto-submit the selected card if it's still valid, or first available card
    let cardToPlay = null
    
    // Double-check that the selected card is still available and valid
    if (selectedCard && gameState.your_cards.some(card => card.country_code === selectedCard)) {
      cardToPlay = selectedCard
    } else if (gameState.your_cards.length > 0) {
      // If selected card is not valid, use the first available card
      cardToPlay = gameState.your_cards[0].country_code
      console.log(`Selected card ${selectedCard} no longer valid, auto-submitting first available: ${cardToPlay}`)
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
    <div className="min-h-screen p-4" style={{
      background: 'radial-gradient(ellipse at center, #1e3a3a 0%, #0f2027 50%, #2c5364 100%)',
      backgroundAttachment: 'fixed'
    }}>
      {/* Header */}
      <div className="card mb-6 bg-gradient-to-r from-green-800 to-blue-900 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">🃏 Export Card Game</h1>
            <div className="flex space-x-4 text-sm text-green-100">
              <span>🎮 Round {gameState.current_round} of {gameState.total_rounds}</span>
              {gameState.current_product && (
                <span>🎯 <strong>{gameState.current_product.name}</strong></span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-green-200">Your Score</div>
            <div className="text-3xl font-bold text-yellow-300">{currentPlayer?.score || 0}</div>
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
        <div className="card mb-6 bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-yellow-300">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-amber-800 mb-3">
              🏆 This Round: {gameState.current_product.name}
            </h2>
            <p className="text-amber-700 text-lg mb-2">
              Play the country card with the highest {gameState.current_product.name.toLowerCase()} exports
            </p>
            <div className="inline-block bg-amber-200 px-3 py-1 rounded-full text-sm text-amber-800 font-semibold">
              📊 Category: {gameState.current_product.category}
            </div>
          </div>
        </div>
      )}

      {/* Countdown Timer */}
      {gameStatus === 'playing' && !hasSubmitted && (
        <div className="card mb-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white border-2 border-gray-600">
          <div className="text-center">
            <div className="text-sm text-gray-300 mb-2">⏰ TIME REMAINING</div>
            <div className={`text-7xl font-mono font-bold mb-3 ${
              timeLeft <= 5 ? 'text-red-400 animate-pulse' : 
              timeLeft <= 10 ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {timeLeft}
            </div>
            <p className={`text-lg font-semibold ${
              timeLeft <= 5 ? 'text-red-300' : 'text-gray-300'
            }`}>
              {timeLeft <= 5 ? '🚨 TIME RUNNING OUT!' : 'seconds to play your card'}
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-4 mt-4 mb-3 border border-gray-600">
              <div 
                className={`h-4 rounded-full transition-all duration-1000 ${
                  timeLeft <= 5 ? 'bg-red-500' : 
                  timeLeft <= 10 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${(timeLeft / 20) * 100}%` }}
              ></div>
            </div>
            
            {selectedCard && (
              <div className="bg-blue-800 border border-blue-600 rounded-lg p-2 mt-3">
                <p className="text-sm text-blue-200">
                  🃏 Ready to play: <span className="font-bold text-blue-100">
                    {gameState.your_cards.find(c => c.country_code === selectedCard)?.country_name}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {gameState.players.map((player) => (
          <div key={player.id} className={`card ${
            player.name === playerName 
              ? 'bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-400' 
              : 'bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-300'
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xl flex items-center gap-2">
                  {player.name === playerName && '👤'}
                  {player.name !== playerName && '🎭'}
                  {player.name}
                </h3>
                {player.name === playerName && (
                  <span className="text-sm text-blue-600 font-semibold">(Your Position)</span>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">{player.score}</div>
                <div className="text-sm text-gray-600 flex items-center gap-1">
                  🃏 {player.name === playerName 
                    ? `${gameState.your_cards.length} cards`
                    : `${10 - (gameState.current_round - 1)} cards`
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
          <h3 className="text-lg font-bold mb-4 text-center">Your Hand</h3>
          <div className="card-hand">
            {gameState.your_cards.map((card: Card, index: number) => {
              const rotation = (index - (gameState.your_cards.length - 1) / 2) * 8; // Fan out cards
              const isSelected = selectedCard === card.country_code;
              const isDisabled = hasSubmitted || timeLeft <= 0;
              
              return (
                <button
                  key={card.country_code}
                  onClick={() => handleCardSelect(card.country_code)}
                  disabled={isDisabled}
                  className={`playing-card card-in-hand ${isSelected ? 'selected' : ''} ${
                    isDisabled ? 'disabled' : ''
                  }`}
                  style={{
                    transform: `rotate(${rotation}deg) ${isSelected ? 'translateY(-12px) scale(1.08)' : ''}`,
                    zIndex: isSelected ? 20 : 10 - Math.abs(rotation)
                  }}
                >
                  {/* Top-left corner */}
                  <div className="card-corner top-left">
                    <div>{card.country_code}</div>
                    <div style={{ fontSize: '10px' }}>{getFlagEmoji(card.country_code)}</div>
                  </div>
                  
                  {/* Center content */}
                  <div className="card-center">
                    <div className="card-flag">{getFlagEmoji(card.country_code)}</div>
                    <div className="card-name">{card.country_name}</div>
                  </div>
                  
                  {/* Bottom-right corner (upside down) */}
                  <div className="card-corner bottom-right">
                    <div>{card.country_code}</div>
                    <div style={{ fontSize: '10px' }}>{getFlagEmoji(card.country_code)}</div>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="text-center mt-6">
            {selectedCard ? (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700 mb-2">
                    🃏 Selected: <strong>{gameState.your_cards.find(c => c.country_code === selectedCard)?.country_name}</strong>
                  </p>
                  <p className="text-xs text-blue-600">
                    You can change your selection anytime before playing your card
                  </p>
                </div>
                <button
                  onClick={handleSubmitCard}
                  disabled={hasSubmitted || timeLeft <= 0}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🎯 Play Card
                </button>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-700 font-semibold">
                  🎮 Choose a card from your hand to play
                </p>
              </div>
            )}
          </div>
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

