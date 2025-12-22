'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { GameState, GameStatus, RoundResult, GameEndResult, Player } from '@/types/game'
import { playBellSound } from './utils'

interface UseSocketReturn {
  socket: Socket | null
  gameState: GameState | null
  gameStatus: GameStatus
  error: string | null
  playerId: string | null
  joinGame: (playerName: string, userId?: string, roomCode?: string) => void
  rejoinGame: (gameId: string, playerId: string, playerName: string, userId?: string) => void
  requestRejoin: (gameId: string, playerId: string, playerName: string, userId?: string) => void
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
  const [playerId, setPlayerId] = useState<string | null>(null)
  const gameStatusRef = useRef<GameStatus>('connecting')
  const playerIdRef = useRef<string | null>(null)
  const lastUserIdRef = useRef<string | undefined>(undefined)
  const lastPlayerNameRef = useRef<string | undefined>(undefined)
  const pendingRejoinRef = useRef<{
    gameId: string
    playerId: string
    playerName: string
    userId?: string
  } | null>(null)
  const pauseTimeoutRef = useRef<number | null>(null)
  const pauseIntervalRef = useRef<number | null>(null)

  const clearPauseTimers = () => {
    if (pauseTimeoutRef.current) {
      window.clearTimeout(pauseTimeoutRef.current)
      pauseTimeoutRef.current = null
    }
    if (pauseIntervalRef.current) {
      window.clearInterval(pauseIntervalRef.current)
      pauseIntervalRef.current = null
    }
  }

  useEffect(() => {
    gameStatusRef.current = gameStatus
  }, [gameStatus])

  const setActiveGame = (gameId: string) => {
    const payload = {
      game_id: gameId,
      player_id: playerIdRef.current,
      user_id: lastUserIdRef.current,
      player_name: lastPlayerNameRef.current,
      updated_at: Date.now()
    }
    localStorage.setItem('export9_active_game', JSON.stringify(payload))
  }

  const bumpActiveGameTimestamp = () => {
    try {
      const stored = localStorage.getItem('export9_active_game')
      if (!stored) {
        return
      }
      const parsed = JSON.parse(stored)
      if (!parsed?.game_id || !parsed?.player_id) {
        return
      }
      parsed.updated_at = Date.now()
      localStorage.setItem('export9_active_game', JSON.stringify(parsed))
    } catch (error) {
      // Ignore localStorage parsing errors.
    }
  }

  const clearActiveGame = () => {
    localStorage.removeItem('export9_active_game')
  }

  const startPauseCountdown = (pauseExpiresAt: number) => {
    clearPauseTimers()
    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((pauseExpiresAt - Date.now()) / 1000))
      setGameState(prevState => prevState ? {
        ...prevState,
        is_paused: true,
        pause_reason: 'opponent_disconnected',
        pause_remaining: remaining
      } : prevState)
    }
    setGameStatus('playing')
    updateRemaining()
    pauseIntervalRef.current = window.setInterval(updateRemaining, 1000)
  }

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

      if (pendingRejoinRef.current) {
        const pending = pendingRejoinRef.current
        socket.emit('rejoin_game', {
          game_id: pending.gameId,
          player_id: pending.playerId,
          user_id: pending.userId,
          name: pending.playerName
        })
        pendingRejoinRef.current = null
      }
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

    // Send heartbeat every 5 seconds to maintain connection tracking
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat', { timestamp: Date.now() })
        console.log('Heartbeat sent', Date.now())
      }
    }, 5000)

    // Try to notify server when tab/window is being closed
    const handleBeforeUnload = () => {
      if (socket.connected) {
        console.log('Tab closing, sending disconnect signal')
        socket.emit('player_leaving', { reason: 'tab_closed' })
        socket.disconnect()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)

    socket.on('player_created', (data) => {
      console.log('Player created:', data)
      if (data?.player_id) {
        setPlayerId(data.player_id)
        playerIdRef.current = data.player_id
      }
      // Check if this is a private room
      if (data.status === 'waiting_for_friend') {
        setGameStatus('waiting_for_friend')
      } else {
        setGameStatus('waiting_for_opponent')
      }
    })

    socket.on('game_found', (data) => {
      console.log('Game found:', data)
      setGameStatus('game_found')
      
      // Play bell sound to notify user that opponent was found
      playBellSound()
      
      // Initialize game state
      setGameState({
        game_id: data.game_id,
        state: 'in_progress',
        current_round: 0,
        total_rounds: 9,
        players: data.players,
        your_cards: data.your_cards
      })

      setActiveGame(data.game_id)
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

      bumpActiveGameTimestamp()
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
          score: p.score,
          user_id: p.user_id,
          elo_rating: p.elo_rating,
          is_cpu: p.is_cpu,
          is_guest: p.is_guest
        })),
        lastRoundResult: data
      } : null)

      bumpActiveGameTimestamp()

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

      clearPauseTimers()
      clearActiveGame()
    })

    socket.on('player_disconnected', (data) => {
      console.log('Player disconnected:', data)
      setError(`${data.player_name} disconnected from the game`)
    })

    // Catch-all event handler for debugging
    socket.onAny((eventName, ...args) => {
      console.log(`📡 Socket event received: ${eventName}`, args)
    })

    socket.on('game_forfeited', (data) => {
      console.log('🚨 GAME FORFEITED EVENT RECEIVED:', data)
      setGameStatus('game_ended')
      setError(null) // Clear any existing errors
      
      setGameState(prevState => {
        console.log('Setting forfeit game state, previous state:', prevState)
        return prevState ? {
          ...prevState,
          state: 'finished',
          players: data.final_scores,
          gameEndedEarly: true,
          forfeitReason: data.reason,
          forfeitingPlayerName: data.forfeiting_player_name
        } : null
      })

      clearPauseTimers()
      clearActiveGame()
    })

    socket.on('opponent_disconnected', (data) => {
      console.log('Opponent disconnected:', data)
      const pauseExpiresAt = data?.pause_expires_at ? data.pause_expires_at * 1000 : Date.now() + 30000

      if (gameStatusRef.current === 'round_ended') {
        clearPauseTimers()
        pauseTimeoutRef.current = window.setTimeout(() => {
          startPauseCountdown(pauseExpiresAt)
        }, 5000)
        return
      }

      startPauseCountdown(pauseExpiresAt)
    })

    socket.on('opponent_reconnected', (data) => {
      console.log('Opponent reconnected:', data)
      clearPauseTimers()
      setGameState(prevState => prevState ? {
        ...prevState,
        is_paused: false,
        pause_reason: undefined,
        pause_remaining: null
      } : prevState)
    })

    socket.on('game_state', (data: GameState) => {
      console.log('Game state received:', data)
      setGameState(data)

      if (data.is_paused && data.pause_remaining !== null && data.pause_remaining !== undefined) {
        const pauseExpiresAt = Date.now() + data.pause_remaining * 1000
        startPauseCountdown(pauseExpiresAt)
      } else {
        clearPauseTimers()
      }

      if (data.state === 'finished') {
        setGameStatus('game_ended')
        clearActiveGame()
      } else if (data.state === 'in_progress' || data.state === 'paused') {
        setGameStatus('playing')
        bumpActiveGameTimestamp()
      }
    })

    socket.on('error', (data) => {
      console.error('Game error:', data)
      // Don't show errors for empty objects or card-related timing issues
      if (data && data.message && !data.message.includes('not found or already played')) {
        setError(data.message)
        setGameStatus('error')
      }

      if (data?.message && (data.message.includes('Game not found') || data.message.includes('Player not found'))) {
        clearActiveGame()
      }
    })

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatInterval)
      clearPauseTimers()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
      socket.disconnect()
    }
  }, [])

  const joinGame = (playerName: string, userId?: string, roomCode?: string) => {
    if (socketRef.current) {
      lastUserIdRef.current = userId
      lastPlayerNameRef.current = playerName
      const data: any = { name: playerName, user_id: userId }
      if (roomCode) {
        data.room_code = roomCode
      }
      socketRef.current.emit('join_game', data)
    }
  }

  const rejoinGame = (gameId: string, playerId: string, playerName: string, userId?: string) => {
    if (socketRef.current) {
      lastUserIdRef.current = userId
      lastPlayerNameRef.current = playerName
      socketRef.current.emit('rejoin_game', {
        game_id: gameId,
        player_id: playerId,
        user_id: userId,
        name: playerName
      })
    }
  }

  const requestRejoin = (gameId: string, playerId: string, playerName: string, userId?: string) => {
    pendingRejoinRef.current = { gameId, playerId, playerName, userId }
    if (socketRef.current?.connected) {
      socketRef.current.emit('rejoin_game', {
        game_id: gameId,
        player_id: playerId,
        user_id: userId,
        name: playerName
      })
      pendingRejoinRef.current = null
    } else {
      socketRef.current?.connect()
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
      setPlayerId(null)
      playerIdRef.current = null
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
    playerId,
    joinGame,
    rejoinGame,
    requestRejoin,
    playCard,
    playCPU,
    quitGame,
    reconnect
  }
}
