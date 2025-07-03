'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/contexts/UserContext'

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

interface PrivateRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onRoomCreated?: (room: PrivateRoom) => void
  onJoinRoom?: (roomCode: string) => void
}

export default function PrivateRoomModal({ isOpen, onClose, onRoomCreated, onJoinRoom }: PrivateRoomModalProps) {
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [activeRooms, setActiveRooms] = useState<PrivateRoom[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedRoomCode, setCopiedRoomCode] = useState<string | null>(null)

  const getApiUrl = () => {
    return process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://export9.oec.world'
  }

  useEffect(() => {
    if (isOpen && user && !user.is_guest) {
      fetchActiveRooms()
    }
  }, [isOpen, user])

  const fetchActiveRooms = async () => {
    if (!user) return
    
    try {
      const response = await fetch(`${getApiUrl()}/api/users/${user.id}/private-rooms`)
      if (response.ok) {
        const rooms = await response.json()
        setActiveRooms(rooms)
      }
    } catch (error) {
      console.error('Failed to fetch active rooms:', error)
    }
  }

  const createPrivateRoom = async () => {
    if (!user) {
      setError('User information not available')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl()}/api/private-rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creator_id: user.id
        })
      })

      if (response.ok) {
        const room = await response.json()
        setActiveRooms(prev => [room, ...prev])
        onRoomCreated?.(room)
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to create private room')
      }
    } catch (error) {
      setError('Failed to create private room')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, roomCode: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedRoomCode(roomCode)
      setTimeout(() => setCopiedRoomCode(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours > 0) return `${hours}h remaining`
    
    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes}m remaining`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full mx-2 md:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--poker-dark-text)' }}>Private Rooms</h2>
          <button
            onClick={onClose}
            className="opacity-60 hover:opacity-80 text-2xl"
            style={{ color: 'var(--poker-dark-text)' }}
          >
            ×
          </button>
        </div>

        {user ? (
          <>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {activeRooms.length === 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--poker-dark-text)' }}>Create New Private Room</h3>
                <p className="opacity-70 text-sm mb-4" style={{ color: 'var(--poker-dark-text)' }}>
                  Create a private room and share the link with your friends to play together.
                </p>
                <button
                  onClick={createPrivateRoom}
                  disabled={isLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : '🎮 Create Private Room'}
                </button>
              </div>
            )}

            {activeRooms.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--poker-dark-text)' }}>Your Active Rooms</h3>
                <div className="space-y-3">
                  {activeRooms.map((room) => (
                    <div
                      key={room.id}
                      className="bg-white rounded-lg p-4 border-2 border-opacity-20"
                      style={{ borderColor: 'var(--poker-strong-bg)' }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-xl" style={{ color: 'var(--poker-strong-bg)' }}>
                              {room.room_code}
                            </span>
                          </div>
                          <p className="text-sm opacity-60" style={{ color: 'var(--poker-dark-text)' }}>
                            {formatTimeRemaining(room.expires_at)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(`https://dev.oec.world/en/games/export-holdem/?room=${room.room_code}`, room.room_code)}
                            className="text-xs px-3 py-1 rounded hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: 'var(--poker-accent)', color: 'var(--poker-dark-text)' }}
                          >
                            {copiedRoomCode === room.room_code ? '✓ Copied!' : 'Copy Link'}
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-opacity-10" style={{ borderColor: 'var(--poker-strong-bg)' }}>
                        <p className="text-sm opacity-70" style={{ color: 'var(--poker-dark-text)' }}>
                          Share this link with your friends: <code className="bg-gray-100 px-1 rounded text-xs">https://dev.oec.world/en/games/export-holdem/?room={room.room_code}</code>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
              <button
                            onClick={() => onJoinRoom?.(activeRooms[0]?.room_code)}
                            className="btn-primary"
                          >
                            🎮 Join Room
                          </button>
            </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">⏳</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--poker-dark-text)' }}>Loading</h3>
            <p className="opacity-70 mb-4" style={{ color: 'var(--poker-dark-text)' }}>
              Setting up user information...
            </p>
            <button
              onClick={onClose}
              className="btn-primary"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}