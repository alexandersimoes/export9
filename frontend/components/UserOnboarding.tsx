'use client'

import React, { useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { getEloCategory, getEloColor } from '@/lib/guestElo'

interface UserOnboardingProps {
  onComplete: () => void
}

export default function UserOnboarding({ onComplete }: UserOnboardingProps) {
  const { loginAsGuest, login, isLoading } = useUser()
  const [showNameInput, setShowNameInput] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [oecToken, setOecToken] = useState('')
  const [showOecLogin, setShowOecLogin] = useState(false)
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

  const handleOecLogin = async () => {
    setError('')
    if (!oecToken.trim()) {
      setError('Please enter your OEC token')
      return
    }
    
    const success = await login(oecToken.trim())
    if (success) {
      onComplete()
    } else {
      setError('Invalid OEC token or authentication failed')
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
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#452610' }}>Welcome to Export Holdem!</h2>
          <p className="opacity-80" style={{ color: '#452610' }}>Choose how you'd like to play</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!showNameInput && !showOecLogin && (
          <div className="space-y-4">
            <button
              onClick={() => setShowOecLogin(true)}
              className="w-full poker-chip text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
            >
              Sign in with OEC Account
            </button>
            
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

        {showOecLogin && (
          <div className="space-y-4">
            <div>
              <label className="block text-poker-dark-text font-medium mb-2">
                OEC API Token:
              </label>
              <input
                type="password"
                value={oecToken}
                onChange={(e) => setOecToken(e.target.value)}
                placeholder="Enter your OEC token"
                className="w-full px-4 py-2 border-2 border-poker-strong-bg rounded-lg focus:outline-none focus:border-poker-accent bg-white text-poker-dark-text"
              />
              <p className="text-xs text-poker-dark-text opacity-60 mt-1">
                Get your token from <a href="https://oec.world/api" target="_blank" rel="noopener noreferrer" className="text-poker-accent hover:underline">oec.world/api</a>
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowOecLogin(false)}
                className="flex-1 bg-gray-200 text-poker-dark-text font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleOecLogin}
                className="flex-1 bg-poker-accent text-poker-dark-text font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}