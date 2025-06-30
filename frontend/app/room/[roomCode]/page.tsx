'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import UserOnboarding from '@/components/UserOnboarding'

interface PrivateRoom {
  id: string
  creator_id: string
  room_code: string
  is_active: boolean
  current_players: number
  max_players: number
  share_url: string
  created_at: string
  expires_at: string
}

export default function PrivateRoomPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isLoading } = useUser()
  const [room, setRoom] = useState<PrivateRoom | null>(null)
  const [roomLoading, setRoomLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const roomCode = params?.roomCode as string

  const getApiUrl = () => {
    return process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://export9.oec.world'
  }

  useEffect(() => {
    if (roomCode) {
      fetchRoom()
    }
  }, [roomCode])

  useEffect(() => {
    // Show onboarding if no user and room is valid
    if (!isLoading && !user && room) {
      setShowOnboarding(true)
    }
  }, [user, isLoading, room])

  const fetchRoom = async () => {
    setRoomLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl()}/api/private-rooms/${roomCode}`)
      if (response.ok) {
        const roomData = await response.json()
        setRoom(roomData)
      } else if (response.status === 404) {
        setError('Room not found or expired')
      } else {
        setError('Failed to load room')
      }
    } catch (error) {
      setError('Failed to connect to server')
    } finally {
      setRoomLoading(false)
    }
  }

  const joinRoom = async () => {
    if (!user || !room) return

    try {
      // Store room code in localStorage for the game connection
      localStorage.setItem('private_room_code', room.room_code)
      
      // Navigate to game with room code
      router.push(`/game?room=${room.room_code}`)
    } catch (error) {
      setError('Failed to join room')
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours > 0) return `${hours} hours remaining`
    
    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes} minutes remaining`
  }

  if (isLoading || roomLoading) {
    return (
      <div className="poker-table flex items-center justify-center p-4">
        <div className="card w-full max-w-[800px] mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-strong-bg mx-auto mb-4"></div>
            <p className="text-poker-dark-text">Loading room...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {showOnboarding && (
        <UserOnboarding onComplete={handleOnboardingComplete} />
      )}
      
      {!showOnboarding && (
        <div className="poker-table flex items-center justify-center p-4">
          <div className="card w-full max-w-[800px] mx-4">
            <div className="text-center">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <img 
                  src="/logo.png" 
                  alt="Export Holdem" 
                  className="h-16 w-auto"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
                />
              </div>

              {error ? (
                <div className="mb-6">
                  <div className="text-4xl mb-4">❌</div>
                  <h1 className="text-2xl font-bold text-red-600 mb-2">Room Not Found</h1>
                  <p className="text-poker-dark-text opacity-70 mb-6">{error}</p>
                  <button
                    onClick={() => router.push('/')}
                    className="btn-primary"
                  >
                    Back to Home
                  </button>
                </div>
              ) : room ? (
                <div>
                  <div className="mb-6">
                    <div className="text-4xl mb-4">🎮</div>
                    <h1 className="text-3xl font-bold text-poker-dark-text mb-2">Private Room</h1>
                    <div className="bg-poker-accent text-poker-dark-text rounded-lg p-4 mb-4">
                      <div className="text-2xl font-bold">{room.room_code}</div>
                      <div className="text-sm opacity-75">Room Code</div>
                    </div>
                  </div>

                  <div className="mb-6 space-y-3">
                    <div className="flex justify-center items-center gap-4 text-sm text-poker-dark-text opacity-70">
                      <span>👥 {room.current_players}/{room.max_players} players</span>
                      <span>⏰ {formatTimeRemaining(room.expires_at)}</span>
                    </div>
                  </div>

                  {user ? (
                    <div className="space-y-4">
                      <button
                        onClick={joinRoom}
                        disabled={room.current_players >= room.max_players}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {room.current_players >= room.max_players ? 'Room Full' : '🚀 Join Private Room'}
                      </button>
                      
                      <button
                        onClick={() => router.push('/')}
                        className="w-full bg-white border-2 border-poker-strong-bg text-poker-dark-text font-semibold py-3 px-3 rounded-lg hover:bg-poker-light-bg transition-colors"
                      >
                        Back to Home
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-poker-dark-text opacity-70 mb-4">
                        Sign in to join this private room
                      </p>
                      <button
                        onClick={() => setShowOnboarding(true)}
                        className="w-full btn-primary"
                      >
                        Sign In to Join
                      </button>
                    </div>
                  )}

                  <div className="mt-8 p-4 bg-poker-light-bg rounded-lg">
                    <h3 className="font-bold text-poker-dark-text mb-2">About Private Rooms</h3>
                    <ul className="text-sm text-poker-dark-text opacity-70 text-left space-y-1">
                      <li>• Play with your friends using this exclusive room</li>
                      <li>• First 2 players to join will be matched together</li>
                      <li>• Room expires after 24 hours</li>
                      <li>• Your ELO rating will be affected normally</li>
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  )
}