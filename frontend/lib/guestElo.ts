/**
 * Guest ELO tracking using localStorage
 * For users who play without signing in to OEC
 */

export interface GuestEloData {
  elo_rating: number
  games_played: number
  wins: number
  losses: number
  draws: number
  username: string
  display_name: string
  created_at: string
  last_played: string
}

interface GameResult {
  opponent_name: string
  opponent_elo: number
  player_score: number
  opponent_score: number
  elo_change: number
  new_elo: number
  date: string
}

const GUEST_ELO_KEY = 'export9_guest_elo'
const GUEST_HISTORY_KEY = 'export9_guest_history'
const DEFAULT_ELO = 1200

/**
 * ELO calculation for guest users (simplified version)
 */
function calculateGuestEloChange(
  playerElo: number,
  opponentElo: number,
  playerScore: number,
  opponentScore: number,
  gamesPlayed: number
): number {
  // Determine K-factor based on games played
  let kFactor = 32 // New player
  if (gamesPlayed >= 100) kFactor = 16 // Experienced
  else if (gamesPlayed >= 30) kFactor = 24 // Intermediate
  
  // Calculate expected score
  const eloDiff = opponentElo - playerElo
  const expectedScore = 1 / (1 + Math.pow(10, eloDiff / 400))
  
  // Determine actual score
  let actualScore: number
  if (playerScore > opponentScore) {
    actualScore = 1.0 // Win
  } else if (playerScore < opponentScore) {
    actualScore = 0.0 // Loss
  } else {
    actualScore = 0.5 // Draw
  }
  
  // Calculate ELO change
  const eloChange = Math.round(kFactor * (actualScore - expectedScore))
  return eloChange
}

/**
 * Get guest ELO data from localStorage
 */
export function getGuestEloData(): GuestEloData | null {
  try {
    const data = localStorage.getItem(GUEST_ELO_KEY)
    if (data) {
      return JSON.parse(data)
    }
    return null
  } catch (error) {
    console.error('Failed to get guest ELO data:', error)
    return null
  }
}

/**
 * Initialize guest ELO data
 */
export function initializeGuestElo(username: string, displayName: string): GuestEloData {
  const guestData: GuestEloData = {
    elo_rating: DEFAULT_ELO,
    games_played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    username,
    display_name: displayName,
    created_at: new Date().toISOString(),
    last_played: new Date().toISOString()
  }
  
  try {
    localStorage.setItem(GUEST_ELO_KEY, JSON.stringify(guestData))
    return guestData
  } catch (error) {
    console.error('Failed to initialize guest ELO:', error)
    return guestData
  }
}

/**
 * Update guest ELO after a game
 */
export function updateGuestElo(
  opponentName: string,
  opponentElo: number,
  playerScore: number,
  opponentScore: number
): GuestEloData | null {
  try {
    const currentData = getGuestEloData()
    if (!currentData) {
      console.error('No guest ELO data found')
      return null
    }
    
    // Calculate ELO change
    const eloChange = calculateGuestEloChange(
      currentData.elo_rating,
      opponentElo,
      playerScore,
      opponentScore,
      currentData.games_played
    )
    
    // Update stats
    const newElo = Math.max(100, Math.min(3000, currentData.elo_rating + eloChange))
    
    let wins = currentData.wins
    let losses = currentData.losses
    let draws = currentData.draws
    
    if (playerScore > opponentScore) {
      wins++
    } else if (playerScore < opponentScore) {
      losses++
    } else {
      draws++
    }
    
    const updatedData: GuestEloData = {
      ...currentData,
      elo_rating: newElo,
      games_played: currentData.games_played + 1,
      wins,
      losses,
      draws,
      last_played: new Date().toISOString()
    }
    
    // Save updated data
    localStorage.setItem(GUEST_ELO_KEY, JSON.stringify(updatedData))
    
    // Save game result to history
    const gameResult: GameResult = {
      opponent_name: opponentName,
      opponent_elo: opponentElo,
      player_score: playerScore,
      opponent_score: opponentScore,
      elo_change: eloChange,
      new_elo: newElo,
      date: new Date().toISOString()
    }
    
    saveGameResultToHistory(gameResult)
    
    return updatedData
    
  } catch (error) {
    console.error('Failed to update guest ELO:', error)
    return null
  }
}

/**
 * Save game result to history
 */
function saveGameResultToHistory(gameResult: GameResult): void {
  try {
    const history = getGuestGameHistory()
    history.push(gameResult)
    
    // Keep only last 50 games
    const trimmedHistory = history.slice(-50)
    
    localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(trimmedHistory))
  } catch (error) {
    console.error('Failed to save game result to history:', error)
  }
}

/**
 * Get guest game history
 */
export function getGuestGameHistory(): GameResult[] {
  try {
    const data = localStorage.getItem(GUEST_HISTORY_KEY)
    if (data) {
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('Failed to get guest game history:', error)
    return []
  }
}

/**
 * Clear guest ELO data (for testing or reset)
 */
export function clearGuestEloData(): void {
  try {
    localStorage.removeItem(GUEST_ELO_KEY)
    localStorage.removeItem(GUEST_HISTORY_KEY)
  } catch (error) {
    console.error('Failed to clear guest ELO data:', error)
  }
}

/**
 * Check if user has guest ELO data
 */
export function hasGuestEloData(): boolean {
  return getGuestEloData() !== null
}

/**
 * Get ELO category for display
 */
export function getEloCategory(eloRating: number): string {
  if (eloRating >= 2400) return "Master"
  if (eloRating >= 2000) return "Expert"
  if (eloRating >= 1600) return "Advanced"
  if (eloRating >= 1200) return "Intermediate"
  if (eloRating >= 800) return "Beginner"
  return "Novice"
}

/**
 * Get ELO color for display
 */
export function getEloColor(eloRating: number): string {
  if (eloRating >= 2400) return "#FFD700" // Gold
  if (eloRating >= 2000) return "#C0C0C0" // Silver
  if (eloRating >= 1600) return "#CD7F32" // Bronze
  if (eloRating >= 1200) return "#4CAF50" // Green
  if (eloRating >= 800) return "#2196F3"  // Blue
  return "#9E9E9E" // Gray
}

/**
 * Calculate win rate percentage
 */
export function calculateWinRate(wins: number, losses: number, draws: number): number {
  const totalGames = wins + losses + draws
  if (totalGames === 0) return 0
  return Math.round((wins / totalGames) * 100 * 10) / 10 // One decimal place
}

/**
 * Export guest data for migration to authenticated account
 */
export function exportGuestData(): {
  elo_data: GuestEloData | null
  game_history: GameResult[]
} {
  return {
    elo_data: getGuestEloData(),
    game_history: getGuestGameHistory()
  }
}

/**
 * Simulate ELO change for preview (before game result)
 */
export function simulateEloChange(
  playerElo: number,
  opponentElo: number,
  gamesPlayed: number,
  outcome: 'win' | 'loss' | 'draw'
): number {
  let playerScore: number
  let opponentScore: number
  
  switch (outcome) {
    case 'win':
      playerScore = 9
      opponentScore = 0
      break
    case 'loss':
      playerScore = 0
      opponentScore = 9
      break
    case 'draw':
      playerScore = 4
      opponentScore = 4
      break
  }
  
  return calculateGuestEloChange(playerElo, opponentElo, playerScore, opponentScore, gamesPlayed)
}