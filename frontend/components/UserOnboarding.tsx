'use client'

import React, { useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { getEloCategory, getEloColor } from '@/lib/guestElo'
import { useOECSession, type OECSession } from "@/lib/useOECSession"
import HowToPlayInstructions from './HowToPlayInstructions'

interface UserOnboardingProps {
  onComplete: () => void
}

export default function UserOnboarding({ onComplete }: UserOnboardingProps) {
  const { loginAsGuest, login, isLoading } = useUser()
  const session: OECSession = useOECSession()
  console.log('!!!OECSession!!!', session)
  const [showNameInput, setShowNameInput] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [oecToken, setOecToken] = useState('')
  const [showOecLogin, setShowOecLogin] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [error, setError] = useState('')

  const handleGuestPlay = async () => {
    setError('')
    const success = await loginAsGuest()
    if (success) {
      onComplete()
    } else {
      setError('Failed to create guest account')
    }
  }

  const validateName = (name: string): string | null => {
    const trimmedName = name.trim()
    
    if (!trimmedName) {
      return 'Please enter a name'
    }
    
    if (trimmedName.length > 20) {
      return 'Name must be 20 characters or less'
    }
    
    // Allow only letters, numbers, and spaces
    const validNameRegex = /^[a-zA-Z0-9\s]+$/
    if (!validNameRegex.test(trimmedName)) {
      return 'Name can only contain letters, numbers, and spaces'
    }
    
    return null
  }

  const handleGuestPlayWithName = async () => {
    setError('')
    
    const validationError = validateName(guestName)
    if (validationError) {
      setError(validationError)
      return
    }
    
    const success = await loginAsGuest(guestName.trim())
    if (success) {
      onComplete()
    } else {
      setError('Failed to create guest account')
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="rounded-lg p-8 max-w-sm w-full mx-4 border-2" style={{ backgroundColor: '#fbe4c7', borderColor: '#891710' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: '#891710' }}></div>
            <p style={{ color: '#452610' }}>Setting up your account...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="rounded-lg p-8 max-w-md w-full mx-4 border-2" style={{ backgroundColor: '#fbe4c7', borderColor: '#891710' }}>
        <div className="text-center mb-6">
          {/* Logo */}
          <div className="flex justify-center mb-3">
            <img 
              src="/logo.png" 
              alt="Export Holdem" 
              className="h-20 w-auto"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
            />
          </div>
          <p className="opacity-80" style={{ color: '#452610' }}>Choose how you'd like to play</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!showNameInput && !showOecLogin && (
          <div className="space-y-4">
            {session ? (
              <button
                onClick={handleOecLogin}
                className="w-full poker-chip text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
              >
                Use {session.name || session.email}
              </button>
            ) : (
              <a
                href={`https://oec.world/en/login?redirect=${window.location.origin}`}
                className="w-full poker-chip text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
              >
                Sign in with OEC Account
              </a>
            )}
            
            <div className="text-center">
              <span className="text-poker-dark-text opacity-60">or</span>
            </div>
            
            <button
              onClick={() => setShowNameInput(true)}
              className="w-full bg-poker-light-bg text-poker-dark-text font-semibold py-3 px-6 rounded-lg hover:bg-white transition-colors"
            >
              Guest Play (Choose Name)
            </button>
            
            <div className="text-xs text-poker-dark-text opacity-60 text-center mt-4">
              <p><strong>OEC Account:</strong> Global leaderboard & cross-device sync</p>
              <p><strong>Guest Play:</strong> Your ELO rating is saved locally</p>
            </div>
          </div>
        )}

        {showNameInput && (
          <div className="space-y-4">
            <div>
              <label className="block text-poker-dark-text font-medium mb-2">
                Choose your display name:
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => {
                  const value = e.target.value
                  // Allow only letters, numbers, and spaces while typing
                  if (value === '' || /^[a-zA-Z0-9\s]*$/.test(value)) {
                    setGuestName(value)
                  }
                }}
                placeholder="Enter your name"
                className="w-full px-4 py-2 border-2 border-poker-strong-bg rounded-lg focus:outline-none focus:border-poker-accent bg-white text-poker-dark-text"
                maxLength={20}
              />
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-poker-dark-text opacity-60">
                  Letters, numbers, and spaces only
                </div>
                <div className={`text-xs ${guestName.length > 18 ? 'text-red-600' : 'text-poker-dark-text opacity-60'}`}>
                  {guestName.length}/20
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowNameInput(false)}
                className="flex-1 bg-gray-200 text-poker-dark-text font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleGuestPlayWithName}
                className="flex-1 poker-chip text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
              >
                Start Playing
              </button>
            </div>
          </div>
        )}
        
        {/* How to Play Button */}
        {!showHowToPlay && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowHowToPlay(true)}
              className="text-poker-dark-text opacity-60 hover:opacity-80 text-sm underline transition-opacity"
            >
              How to Play
            </button>
          </div>
        )}
      </div>
      
      {/* How to Play Popover */}
      {showHowToPlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#d4b896' }}>
              <h2 className="text-xl font-bold" style={{ color: '#452610' }}>How to Play Export Holdem</h2>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="text-2xl hover:opacity-70 transition-opacity"
                style={{ color: '#452610' }}
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <HowToPlayInstructions compact />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}