'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { GameState, GameStatus, RoundResult, GameEndResult, Player } from '@/types/game'

interface UseSocketReturn {
  socket: Socket | null
  gameState: GameState | null
  gameStatus: GameStatus
  error: string | null
  joinGame: (playerName: string, userId?: string) => void
  playCard: (countryCode: string) => void
  playCPU: () => void
  quitGame: () => void
  reconnect: () => void
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [gameStatus, setGameStatus] = useState<GameStatus>('connecting')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize socket connection
    const socket = io(process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://export9.oec.world', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      autoConnect: true,
      forceNew: true
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to server with ID:', socket.id)
      setError(null)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from server')
      setGameStatus('disconnected')
    })

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err)
      setError(`Failed to connect to server: ${err.message || 'Connection refused'}`)
      setGameStatus('error')
    })

    // Game events
    socket.on('connected', (data) => {
      console.log('Server acknowledged connection:', data)
    })

    socket.on('player_created', (data) => {
      console.log('Player created:', data)
      setGameStatus('waiting_for_opponent')
    })

    socket.on('game_found', (data) => {
      console.log('Game found:', data)
      setGameStatus('game_found')
      
      // Initialize game state
      setGameState({
        game_id: data.game_id,
        state: 'in_progress',
        current_round: 0,
        total_rounds: 9,
        players: data.players,
        your_cards: data.your_cards
      })
    })

    socket.on('round_started', (data) => {
      console.log('Round started:', data)
      setGameStatus('playing')
      setError(null) // Clear any previous errors
      
      setGameState(prevState => prevState ? {
        ...prevState,
        current_round: data.round_number,
        total_rounds: data.total_rounds,
        current_product: data.product,
        players: data.players || prevState.players, // Update with latest player data including ELO
        your_cards: data.your_cards || prevState.your_cards, // Update with remaining cards
        lastRoundResult: undefined // Clear previous round result
      } : null)
    })

    socket.on('card_played', (data) => {
      console.log('Card played:', data)
      // Note: We don't remove cards here anymore - server handles this properly
      // Cards are permanently removed after each round
    })

    socket.on('round_completed', (data: RoundResult) => {
      console.log('Round completed:', data)
      setGameStatus('round_ended')

      // Update game state with new scores and round results
      setGameState(prevState => prevState ? {
        ...prevState,
        players: data.players.map(p => ({
          id: p.id,
          name: p.name,
          score: p.score
        })),
        lastRoundResult: data
      } : null)

      // Don't auto-transition - let the server control this
    })

    socket.on('game_ended', (data: GameEndResult) => {
      console.log('Game ended:', data)
      setGameStatus('game_ended')

      setGameState(prevState => prevState ? {
        ...prevState,
        state: 'finished',
        players: data.final_scores
      } : null)
    })

    socket.on('player_disconnected', (data) => {
      console.log('Player disconnected:', data)
      setError(`${data.player_name} disconnected from the game`)
    })

    socket.on('game_state', (data: GameState) => {
      console.log('Game state received:', data)
      setGameState(data)
    })

    socket.on('error', (data) => {
      console.error('Game error:', data)
      // Don't show errors for empty objects or card-related timing issues
      if (data && data.message && !data.message.includes('not found or already played')) {
        setError(data.message)
        setGameStatus('error')
      }
    })

    // Cleanup on unmount
    return () => {
      socket.disconnect()
    }
  }, [])

  const joinGame = (playerName: string, userId?: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join_game', { name: playerName, user_id: userId })
    }
  }

  const playCard = (countryCode: string) => {
    if (socketRef.current && gameState) {
      console.log('Playing card:', countryCode)
      socketRef.current.emit('play_card', { country_code: countryCode })
      
      // Don't optimistically remove card - wait for server confirmation
      // This prevents the "card not found" error
    }
  }

  const playCPU = () => {
    if (socketRef.current) {
      socketRef.current.emit('play_cpu', {})
    }
  }

  const quitGame = () => {
    if (socketRef.current) {
      console.log('Quitting game')
      socketRef.current.emit('quit_game', {})
      socketRef.current.disconnect()
      // Reset state
      setGameState(null)
      setGameStatus('connecting')
      setError(null)
    }
  }

  const reconnect = () => {
    if (socketRef.current) {
      socketRef.current.connect()
    }
  }

  return {
    socket: socketRef.current,
    gameState,
    gameStatus,
    error,
    joinGame,
    playCard,
    playCPU,
    quitGame,
    reconnect
  }
}