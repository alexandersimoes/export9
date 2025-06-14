'use client'

import React, { useState, useEffect } from 'react'
import { getEloCategory, getEloColor } from '@/lib/guestElo'

interface LeaderboardEntry {
  display_name: string
  elo_rating: number
  games_played: number
  wins: number
  losses: number
  draws: number
  win_rate: number
}

interface LeaderboardProps {
  isOpen: boolean
  onClose: () => void
}

export default function Leaderboard({ isOpen, onClose }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard()
    }
  }, [isOpen])

  const fetchLeaderboard = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const apiUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://export9.oec.world'
      const response = await fetch(`${apiUrl}/api/leaderboard`)
      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data)
      } else {
        setError('Failed to load leaderboard')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-poker-light-bg rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border-2 border-poker-strong-bg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-poker-dark-text">ELO Leaderboard</h2>
          <button
            onClick={onClose}
            className="text-poker-dark-text opacity-60 hover:opacity-80 text-2xl"
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-strong-bg mx-auto mb-4"></div>
            <p className="text-poker-dark-text">Loading leaderboard...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!loading && !error && leaderboard.length === 0 && (
          <div className="text-center py-8">
            <p className="text-poker-dark-text opacity-60">
              No players on the leaderboard yet. Play some games to appear here!
            </p>
          </div>
        )}

        {!loading && !error && leaderboard.length > 0 && (
          <div className="space-y-3">
            {leaderboard.map((player, index) => {
              const eloCategory = getEloCategory(player.elo_rating)
              const eloColor = getEloColor(player.elo_rating)
              
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg p-4 border-2 border-poker-strong-bg border-opacity-20 hover:border-opacity-40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl font-bold text-poker-strong-bg">
                        #{index + 1}
                      </div>
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: eloColor }}
                      />
                      <div>
                        <div className="font-bold text-poker-dark-text">
                          {player.display_name}
                        </div>
                        <div className="text-sm text-poker-dark-text opacity-60">
                          {eloCategory}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xl font-bold text-poker-strong-bg">
                        {player.elo_rating}
                      </div>
                      <div className="text-xs text-poker-dark-text opacity-60">
                        ELO Rating
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-poker-strong-bg border-opacity-10">
                    <div className="grid grid-cols-4 gap-4 text-center text-sm">
                      <div>
                        <div className="font-bold text-poker-dark-text">
                          {player.games_played}
                        </div>
                        <div className="text-xs text-poker-dark-text opacity-60">
                          Games
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-green-600">
                          {player.wins}
                        </div>
                        <div className="text-xs text-poker-dark-text opacity-60">
                          Wins
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-red-600">
                          {player.losses}
                        </div>
                        <div className="text-xs text-poker-dark-text opacity-60">
                          Losses
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-poker-accent">
                          {player.win_rate}%
                        </div>
                        <div className="text-xs text-poker-dark-text opacity-60">
                          Win Rate
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="poker-chip text-white font-semibold py-2 px-6 rounded-lg hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}