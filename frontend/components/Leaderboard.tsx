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
  external_elo?: number
  external_old_elo?: number
  external_last_game?: string
  has_external_data?: boolean
}

interface LeaderboardProps {
  isOpen: boolean
  onClose: () => void
}

type FilterType = 'all' | 'oec' | 'guest'

export default function Leaderboard({ isOpen, onClose }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('all')

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard(filterType)
    }
  }, [isOpen, filterType])

  const fetchLeaderboard = async (filter: FilterType = 'all') => {
    setLoading(true)
    setError(null)
    
    try {
      const apiUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://export9.oec.world'
      const response = await fetch(`${apiUrl}/api/leaderboard?filter_type=${filter}`)
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

  const handleFilterChange = (newFilter: FilterType) => {
    setFilterType(newFilter)
  }

  if (!isOpen) return null

  return (
    <div className="inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-poker-light-bg rounded-lg p-3 sm:p-6 max-w-2xl w-full mx-1 sm:mx-2 md:mx-4 max-h-[90vh] overflow-y-auto border-2 border-poker-strong-bg">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-poker-dark-text">ELO Leaderboard</h2>
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

        {/* Filter Controls */}
        <div className="mb-4">
          <div className="flex justify-center">
            <div className="bg-white border-2 border-poker-strong-bg rounded-lg p-1 inline-flex text-xs">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-3 py-1 rounded-md font-medium transition-all duration-200 ${
                  filterType === 'all'
                    ? 'bg-red-800 text-white shadow-sm scale-105'
                    : 'text-poker-dark-text hover:bg-poker-light-bg hover:scale-102'
                }`}
              >
                All Players
              </button>
              <button
                onClick={() => handleFilterChange('oec')}
                className={`px-3 py-1 rounded-md font-medium transition-all duration-200 ${
                  filterType === 'oec'
                    ? 'bg-red-800 text-white shadow-sm scale-105'
                    : 'text-poker-dark-text hover:bg-poker-light-bg hover:scale-102'
                }`}
              >
                🌐 OEC
              </button>
              <button
                onClick={() => handleFilterChange('guest')}
                className={`px-3 py-1 rounded-md font-medium transition-all duration-200 ${
                  filterType === 'guest'
                    ? 'bg-red-800 text-white shadow-sm scale-105'
                    : 'text-poker-dark-text hover:bg-poker-light-bg hover:scale-102'
                }`}
              >
                👤 Guest
              </button>
            </div>
          </div>
        </div>

        {!loading && !error && leaderboard.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            {leaderboard.map((player, index) => {
              const eloCategory = getEloCategory(player.elo_rating)
              const eloColor = getEloColor(player.elo_rating)
              
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg p-2 sm:p-4 border-2 border-poker-strong-bg border-opacity-20 hover:border-opacity-40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
                      <div className="text-lg sm:text-2xl font-bold text-poker-strong-bg flex-shrink-0">
                        #{index + 1}
                      </div>
                      <div 
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: eloColor }}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-poker-dark-text text-sm sm:text-base truncate">
                          {player.display_name}
                        </div>
                        <div className="text-xs sm:text-sm text-poker-dark-text opacity-60">
                          {eloCategory}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg sm:text-xl font-bold text-poker-strong-bg">
                        {player.elo_rating}
                      </div>
                      <div className="text-xs text-poker-dark-text opacity-60">
                        ELO
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-poker-strong-bg border-opacity-10">
                    <div className="grid grid-cols-4 gap-1 sm:gap-4 text-center text-xs sm:text-sm">
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
                          Rate
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {player.has_external_data && (
                    <div className="mt-2 pt-2 border-t border-poker-strong-bg border-opacity-10">
                      <div className="flex items-center justify-between text-xs">
                        <div className="text-poker-dark-text opacity-60">
                          🌐 External ELO
                        </div>
                        <div className="flex items-center space-x-2">
                          {player.external_old_elo && player.external_elo && (
                            <div>
                              <span className="text-poker-dark-text opacity-60">
                                {player.external_old_elo} → 
                              </span>
                              <span className={`font-semibold ml-1 ${
                                player.external_elo > player.external_old_elo 
                                  ? 'text-green-600' 
                                  : player.external_elo < player.external_old_elo 
                                    ? 'text-red-600' 
                                    : 'text-poker-dark-text'
                              }`}>
                                {player.external_elo}
                              </span>
                            </div>
                          )}
                          {player.external_last_game && (
                            <div className="text-poker-dark-text opacity-50">
                              {new Date(player.external_last_game).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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