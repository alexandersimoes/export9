'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

type FilterType = 'all' | 'oec' | 'guest'

export default function LeaderboardPage() {
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('all')

  useEffect(() => {
    fetchLeaderboard(filterType)
  }, [filterType])

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

  return (
    <div className="poker-table flex items-center justify-center p-2 md:p-4">
      <div className="card w-full max-w-4xl mx-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-poker-dark-text mb-2">🏆 ELO Leaderboard</h1>
            <p className="text-poker-dark-text opacity-70">
              Top players ranked by ELO rating
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-white border-2 border-poker-strong-bg text-poker-dark-text font-semibold py-2 px-4 rounded-lg hover:bg-poker-light-bg transition-colors self-center sm:self-auto"
          >
            ← Back to Game
          </button>
        </div>

        {/* Filter Controls */}
        <div className="mb-6">
          <div className="flex justify-center">
            <div className="bg-white border-2 border-poker-strong-bg rounded-lg p-1 inline-flex">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                  filterType === 'all'
                    ? 'bg-red-800 text-white shadow-md scale-105'
                    : 'text-poker-dark-text hover:bg-poker-light-bg hover:scale-102'
                }`}
              >
                All Players
              </button>
              <button
                onClick={() => handleFilterChange('oec')}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                  filterType === 'oec'
                    ? 'bg-red-800 text-white shadow-md scale-105'
                    : 'text-poker-dark-text hover:bg-poker-light-bg hover:scale-102'
                }`}
              >
                🌐 OEC Accounts
              </button>
              <button
                onClick={() => handleFilterChange('guest')}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                  filterType === 'guest'
                    ? 'bg-red-800 text-white shadow-md scale-105'
                    : 'text-poker-dark-text hover:bg-poker-light-bg hover:scale-102'
                }`}
              >
                👤 Guest Players
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-strong-bg mx-auto mb-4"></div>
            <p className="text-poker-dark-text text-lg">Loading leaderboard...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6">
            <h3 className="font-semibold">Error Loading Leaderboard</h3>
            <p>{error}</p>
            <button
              onClick={fetchLeaderboard}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && leaderboard.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold text-poker-dark-text mb-2">
              No Players Yet
            </h3>
            <p className="text-poker-dark-text opacity-60 mb-6">
              Be the first to play and appear on the leaderboard!
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-white border-2 border-poker-strong-bg text-poker-dark-text font-semibold py-3 px-6 rounded-lg hover:bg-poker-light-bg transition-colors"
            >
              🎯 Start Playing
            </button>
          </div>
        )}

        {!loading && !error && leaderboard.length > 0 && (
          <>
            <div className="grid gap-4">
              {leaderboard.map((player, index) => {
                const eloCategory = getEloCategory(player.elo_rating)
                const eloColor = getEloColor(player.elo_rating)
                const isTopThree = index < 3
                
                return (
                  <div
                    key={index}
                    className={`rounded-lg p-4 md:p-6 border-2 transition-all hover:shadow-lg ${
                      isTopThree 
                        ? 'bg-gradient-to-r from-poker-light-bg via-white to-poker-light-bg border-poker-accent shadow-lg' 
                        : 'bg-white border-poker-strong-bg border-opacity-30 hover:border-opacity-50 hover:bg-poker-light-bg hover:bg-opacity-30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 md:space-x-6">
                        <div className="text-center">
                          <div className={`text-xl md:text-3xl font-bold ${
                            isTopThree ? 'text-poker-strong-bg' : 'text-poker-dark-text opacity-70'
                          }`}>
                            #{index + 1}
                          </div>
                          {index === 0 && <div className="text-2xl">🥇</div>}
                          {index === 1 && <div className="text-2xl">🥈</div>}
                          {index === 2 && <div className="text-2xl">🥉</div>}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="text-lg md:text-xl font-bold text-poker-dark-text truncate">
                            {player.display_name}
                          </div>
                          <div className="text-sm text-poker-dark-text opacity-60">
                            <span className="w-3 h-3 rounded-full flex-shrink-0 inline-block mr-1" style={{ backgroundColor: eloColor }} /> {eloCategory}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl md:text-2xl font-bold text-poker-strong-bg">
                          {player.elo_rating}
                        </div>
                        <div className="text-sm text-poker-dark-text opacity-60">
                          ELO Rating
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-poker-strong-bg border-opacity-10">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-poker-dark-text">
                            {player.games_played}
                          </div>
                          <div className="text-xs text-poker-dark-text opacity-60">
                            Games
                          </div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-600">
                            {player.wins}
                          </div>
                          <div className="text-xs text-poker-dark-text opacity-60">
                            Wins
                          </div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-yellow-600">
                            {player.draws}
                          </div>
                          <div className="text-xs text-poker-dark-text opacity-60">
                            Draws
                          </div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-red-600">
                            {player.losses}
                          </div>
                          <div className="text-xs text-poker-dark-text opacity-60">
                            Losses
                          </div>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <div className="text-lg font-bold text-poker-accent">
                            {player.win_rate}%
                          </div>
                          <div className="text-xs text-poker-dark-text opacity-60">
                            Win Rate
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {player.has_external_data && (
                      <div className="mt-4 pt-4 border-t border-poker-strong-bg border-opacity-10">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-poker-dark-text opacity-60">
                            🌐 External ELO Data
                          </div>
                          <div className="flex items-center space-x-4">
                            {player.external_old_elo && player.external_elo && (
                              <div className="text-sm">
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
                              <div className="text-xs text-poker-dark-text opacity-50">
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

            <div className="mt-8 text-center">
              <div className="text-sm text-poker-dark-text opacity-60 mb-4">
                Minimum 3 games required to appear on leaderboard
              </div>
              <button
                onClick={() => router.push('/')}
                className="bg-white border-2 border-poker-strong-bg text-poker-dark-text font-semibold py-3 px-6 rounded-lg hover:bg-poker-light-bg transition-colors"
              >
                🎯 Play Now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}