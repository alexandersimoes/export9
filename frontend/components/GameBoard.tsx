'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GameState, GameStatus, Card } from '@/types/game'
import RoundResultModal from './RoundResultModal'
import { getFlagEmoji, getProductEmoji } from '@/lib/utils'
import { useUser } from '@/contexts/UserContext'
import { getUserCountryCode } from '@/lib/geolocation'
import UserProfile from './UserProfile'

interface GameBoardProps {
  gameState: GameState
  gameStatus: GameStatus
  playerName: string
  onPlayCard: (countryCode: string) => void
  onQuitGame: () => void
  error: string | null
}

export default function GameBoard({ 
  gameState, 
  gameStatus, 
  playerName, 
  onPlayCard, 
  onQuitGame,
  error 
}: GameBoardProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [showRoundResult, setShowRoundResult] = useState(false)
  const [timeLeft, setTimeLeft] = useState(20)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [showQuitDialog, setShowQuitDialog] = useState(false)
  const router = useRouter()

  const handleLogoClick = () => {
    setShowQuitDialog(true)
  }

  const handleQuitGame = () => {
    onQuitGame()
    router.push(`/?name=${encodeURIComponent(playerName)}`)
    setShowQuitDialog(false)
  }

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
    if (hasSubmitted || gameStatus !== 'playing') return
    
    // Auto-submit the selected card if it's still valid, or first available card
    let cardToPlay = null
    
    // Ensure we have available cards
    if (!gameState.your_cards || gameState.your_cards.length === 0) {
      console.log('No cards available for auto-submit')
      return
    }
    
    // Double-check that the selected card is still available and valid
    if (selectedCard && gameState.your_cards.some(card => card.country_code === selectedCard)) {
      cardToPlay = selectedCard
    } else {
      // Use the first available card
      cardToPlay = gameState.your_cards[0].country_code
      console.log(`Auto-submitting first available card: ${cardToPlay}`)
    }
    
    if (cardToPlay) {
      console.log(`Auto-submitting card: ${cardToPlay}`)
      // Set submitted state immediately to prevent double submission
      setHasSubmitted(true)
      setSelectedCard(null)
      onPlayCard(cardToPlay)
    }
  }

  const currentPlayer = gameState.players.find(p => p.name === playerName)
  const opponent = gameState.players.find(p => p.name !== playerName)

  // Helper function to get player flag
  const getPlayerFlag = (player: any) => {
    if (player.name === playerName) {
      // For current player, use their geolocation data
      const userCountryCode = getUserCountryCode()
      return userCountryCode ? getFlagEmoji(userCountryCode) : '🌐'
    } else {
      // For opponent, show world emoji (we don't have their geolocation)
      return '🌐'
    }
  }

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
          // Auto-submit when time runs out - only if still playing and not submitted
          if (gameStatus === 'playing' && !hasSubmitted) {
            setTimeout(() => handleAutoSubmit(), 100)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStatus, hasSubmitted, timeLeft, gameState.current_round])


  return (
    <div className="poker-table p-4 flex justify-center min-h-[630px]">
      <div className="w-full max-w-[800px]">
      {/* Header */}
      <div className="mb-3 rounded-lg overflow-hidden">
        {/* Mobile Layout */}
        <div className="sm:hidden flex items-center justify-between px-2 py-1">
          <div className="text-sm font-semibold" style={{ color: '#fbe4c7', textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
            {gameState.current_round}/{gameState.total_rounds}
          </div>
          <img 
            src="/logo.png" 
            alt="Export Holdem" 
            className="h-12 w-auto cursor-pointer hover:opacity-80 transition-opacity"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))' }}
            onClick={handleLogoClick}
          />
          <div className="w-[40px]"></div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:grid grid-cols-3 items-center gap-4">
          <div className="justify-self-start pl-3 min-w-0">
            <div className="text-left">
              <div className="text-lg font-bold break-words" style={{ color: '#fbe4c7', textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                Round {gameState.current_round}
              </div>
              <div className="break-words">
                <UserProfile compact />
              </div>
            </div>
          </div>
          
          <div className="justify-self-center">
            <img 
              src="/logo.png" 
              alt="Export Holdem" 
              className="h-24 w-auto cursor-pointer hover:opacity-80 transition-opacity"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))' }}
              onClick={handleLogoClick}
            />
          </div>
          
          <div className="justify-self-end pr-3 min-w-0">
            <div className="text-right">
              {gameState.current_product && (
                <div className="text-base font-semibold break-words" style={{ color: '#fbe4c7', textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                  {getProductEmoji(gameState.current_product.id)} {gameState.current_product.name}
                </div>
              )}
            </div>
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


      {/* Players - Clean Scoreboard */}
      <div className="mb-3 p-3 rounded-lg" style={{ 
        backgroundColor: 'rgba(251, 228, 199, 0.3)', 
        border: '1px solid rgba(212, 184, 150, 0.5)' 
      }}>
        <div className="flex items-center justify-center gap-2 sm:gap-6 px-2">
          {(() => {
            // Always show current player first, then opponent
            const currentPlayer = gameState.players.find(p => p.name === playerName)
            const opponent = gameState.players.find(p => p.name !== playerName)
            const orderedPlayers = currentPlayer && opponent ? [currentPlayer, opponent] : gameState.players
            
            return orderedPlayers.map((player, index) => (
              <div key={player.id} className="flex items-center gap-1 sm:gap-2 min-w-0">
                <div className="flex-shrink-0">
                {getPlayerFlag(player)}
                </div>
                <span className="font-semibold text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none" style={{ color: 'var(--poker-dark-text)' }}>
                  {player.name}
                  {player.name === playerName && <span className="ml-1 opacity-75">(You)</span>}
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0" style={{ 
                  backgroundColor: 'var(--poker-accent)', 
                  color: 'var(--poker-dark-text)',
                  border: '2px solid #e6a82e',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }}>
                  {player.score || 0}
                </div>
                {index === 0 && (
                  <span className="text-xs sm:text-sm font-medium mx-1 sm:mx-2 flex-shrink-0" style={{ color: 'var(--poker-dark-text)', opacity: 0.6 }}>vs</span>
                )}
              </div>
            ))
          })()}
        </div>
      </div>

      {/* Error Display */}
      {error && !error.includes('not found or already played') && (
        <div className="card mb-6 bg-red-50 border-red-200">
          <div className="text-center text-red-700">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Current Product */}
      {gameState.current_product && gameStatus === 'playing' && (
        <div className="card mb-4 border-2" style={{ borderColor: 'var(--poker-accent)' }}>
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ color: 'var(--poker-dark-text)' }}>
              {getProductEmoji(gameState.current_product.id)} {gameState.current_product.name}
            </h2>
          </div>
        </div>
      )}

      {/* Your Cards */}
      {gameStatus === 'playing' && gameState.your_cards.length > 0 && !hasSubmitted && (
        <div className="card">
          {/* Timer Progress Bar */}
          <div className="poker-progress mb-4">
            <div 
              className={`poker-progress-bar ${
                timeLeft <= 5 ? 'animate-pulse' : ''
              }`}
              style={{ 
                width: `${(timeLeft / 20) * 100}%`,
                background: timeLeft <= 5 ? '#dc2626' : timeLeft <= 10 ? '#eab308' : 'linear-gradient(90deg, var(--poker-accent) 0%, #e6a82e 100%)'
              }}
            ></div>
          </div>
          
          <h3 className="text-lg font-bold mb-4 text-center" style={{ color: 'var(--poker-dark-text)' }}>Your Hand</h3>
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
          
          <div className="text-center mt-4">
            {selectedCard ? (
              <div className="space-y-3">
                <div className="rounded-lg p-3 border-2" style={{ backgroundColor: '#fff7e6', borderColor: 'var(--poker-accent)' }}>
                  <p className="text-sm" style={{ color: 'var(--poker-dark-text)' }}>
                    🃏 Selected: <strong>{gameState.your_cards.find(c => c.country_code === selectedCard)?.country_name}</strong>
                  </p>
                </div>
                <button
                  onClick={handleSubmitCard}
                  disabled={hasSubmitted || timeLeft <= 0}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  🎯 Play Card
                </button>
              </div>
            ) : (
              <div className="rounded-lg p-3 border" style={{ backgroundColor: '#f9f7f4', borderColor: '#d4b896' }}>
                <p className="font-semibold text-sm" style={{ color: 'var(--poker-dark-text)', lineHeight: '1.2' }}>
                  Choose the country with the most exports
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

      {/* Quit Game Confirmation Modal */}
      {showQuitDialog && (
        <div className="inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm sm:max-w-md">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">⚠️</div>
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4" style={{ color: 'var(--poker-dark-text)' }}>
                End Game?
              </h2>
              <p className="mb-4 sm:mb-6 text-sm sm:text-base" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>
                Are you sure you want to quit? Your opponent will automatically win.
              </p>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setShowQuitDialog(false)}
                  className="flex-1 btn-secondary text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuitGame}
                  className="flex-1 btn-primary text-sm sm:text-base"
                >
                  Quit Game
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Round Result Modal */}
      {showRoundResult && gameState.lastRoundResult && (
        <RoundResultModal
          roundResult={gameState.lastRoundResult}
          playerName={playerName}
          currentProduct={gameState.current_product}
        />
      )}
      </div>
    </div>
  )
}

