'use client'

import React from 'react'
import { useUser } from '@/contexts/UserContext'
import { getEloCategory, getEloColor, calculateWinRate } from '@/lib/guestElo'

interface UserProfileProps {
  compact?: boolean
}

export default function UserProfile({ compact = false }: UserProfileProps) {
  const { user, guestData, isGuest, logout } = useUser()

  if (!user) return null

  const eloRating = isGuest ? (guestData?.elo_rating || 1200) : user.elo_rating
  const gamesPlayed = isGuest ? (guestData?.games_played || 0) : user.games_played
  const wins = isGuest ? (guestData?.wins || 0) : user.wins
  const losses = isGuest ? (guestData?.losses || 0) : user.losses
  const draws = isGuest ? (guestData?.draws || 0) : user.draws

  const eloCategory = getEloCategory(eloRating)
  const eloColor = getEloColor(eloRating)
  const winRate = calculateWinRate(wins, losses, draws)

  if (compact) {
    return (
      <div className="flex items-center space-x-3 text-sm">
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: eloColor }}
          />
          <span className="text-white font-medium">{user.display_name}</span>
        </div>
        <div className="text-white font-bold bg-poker-dark-text bg-opacity-80 px-2 py-1 rounded">
          {eloRating}
        </div>
        <div className="text-white opacity-75">
          {eloCategory}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-poker-light-bg rounded-lg p-4 border-2 border-poker-strong-bg" style={{ borderColor: '#e3c2b1' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: eloColor }}
          />
          <div>
            <h3 className="font-bold text-poker-dark-text">{user.display_name}</h3>
            <p className="text-xs text-poker-dark-text opacity-60">
              {isGuest ? 'Guest Player' : 'OEC Account'}
            </p>
          </div>
        </div>

      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-poker-strong-bg">
            {eloRating}
          </div>
          <div className="text-xs text-poker-dark-text opacity-75">
            ELO Rating
          </div>
          <div 
            className="text-xs font-medium mt-1"
            style={{ color: eloColor }}
          >
            {eloCategory}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-poker-strong-bg">
            {gamesPlayed}
          </div>
          <div className="text-xs text-poker-dark-text opacity-75">
            Games Played
          </div>
          {gamesPlayed > 0 && (
            <div className="text-xs text-poker-accent font-medium mt-1">
              {winRate}% Win Rate
            </div>
          )}
        </div>
      </div>
      
      {gamesPlayed > 0 && (
        <div className="mt-4 pt-4 border-t border-poker-strong-bg border-opacity-20" style={{ borderColor: '#e3c2b1' }}>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="font-bold text-green-600">{wins}</div>
              <div className="text-poker-dark-text opacity-60">Wins</div>
            </div>
            <div>
              <div className="font-bold text-yellow-600">{draws}</div>
              <div className="text-poker-dark-text opacity-60">Draws</div>
            </div>
            <div>
              <div className="font-bold text-red-600">{losses}</div>
              <div className="text-poker-dark-text opacity-60">Losses</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}