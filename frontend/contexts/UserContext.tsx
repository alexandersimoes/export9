'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getGuestEloData, initializeGuestElo, hasGuestEloData, GuestEloData } from '@/lib/guestElo'
import { initializeUserGeolocation, GeolocationData } from '@/lib/geolocation'
import useConsentFromSearchParams from "@/lib/useConsentSearchParam";
import { useOECSession, type OECSession } from "@/lib/useOECSession";

interface User {
  id: string
  username: string
  display_name: string
  is_guest: boolean
  elo_rating: number
  games_played: number
  wins: number
  losses: number
  draws: number
  elo_category: string
}

interface UserContextType {
  user: User | null
  guestData: GuestEloData | null
  isAuthenticated: boolean
  isGuest: boolean
  login: (session: OECSession) => Promise<boolean>
  loginAsGuest: (name?: string) => Promise<boolean>
  logout: () => void
  refreshUser: () => Promise<void>
  refreshGuestData: () => void
  isLoading: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [guestData, setGuestData] = useState<GuestEloData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = user !== null && !user.is_guest
  const isGuest = user !== null && user.is_guest

  // Helper function to get API URL
  const getApiUrl = () => {
    return process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://export9.oec.world'
  }

  // Initialize user state from localStorage or backend
  useEffect(() => {
    initializeUserState()
  }, [])

  const initializeUserState = async () => {
    setIsLoading(true)
    
    try {
      // Check for stored user ID (from previous session)
      const storedUserId = localStorage.getItem('export9_user_id')
      const storedIsGuest = localStorage.getItem('export9_is_guest') === 'true'
      
      if (storedUserId) {
        // Try to fetch user from backend
        const response = await fetch(`${getApiUrl()}/api/users/${storedUserId}`)
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
          
          if (userData.is_guest) {
            // Also load guest ELO data
            const localGuestData = getGuestEloData()
            setGuestData(localGuestData)
          }
        } else {
          // User not found, clear stored data
          localStorage.removeItem('export9_user_id')
          localStorage.removeItem('export9_is_guest')
        }
      } else if (hasGuestEloData()) {
        // User has guest ELO data but no backend user - auto-login as guest
        const localGuestData = getGuestEloData()
        if (localGuestData) {
          setGuestData(localGuestData)
          await createGuestUserFromLocalData(localGuestData)
        }
      }
    } catch (error) {
      console.error('Failed to initialize user state:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createGuestUserFromLocalData = async (guestData: GuestEloData) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/users/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: guestData.display_name })
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        localStorage.setItem('export9_user_id', userData.id.toString())
        localStorage.setItem('export9_is_guest', 'true')
      }
    } catch (error) {
      console.error('Failed to create guest user from local data:', error)
    }
  }

  const login = async (session: OECSession): Promise<boolean> => {
    setIsLoading(true)
    
    try {
      console.log('!!!LOGIN session!!!', session)
      
      if (session) {
        // Create/get OEC user from backend
        const response = await fetch(`${getApiUrl()}/api/users/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            oec_user_id: session.id.toString(),
            username: session.name || session.email || `user_${session.id}`,
            display_name: session.name || session.email || `User ${session.id}`,
            email: session.email
          })
        })
        
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
          setGuestData(null) // Clear guest data
          
          // Initialize geolocation tracking for new authenticated users
          initializeUserGeolocation().catch(error => 
            console.warn('Geolocation initialization failed:', error)
          )
          
          // Store user session
          localStorage.setItem('export9_user_id', userData.id.toString())
          localStorage.setItem('export9_is_guest', 'false')
          localStorage.setItem('export9_oec_session', JSON.stringify(session))
          
          return true
        } else {
          console.error('Failed to create/get OEC user from backend')
          return false
        }
      } else {
        console.error('No OEC session found')
        return false
      }
    } catch (error) {
      console.error('Login failed:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const loginAsGuest = async (name?: string): Promise<boolean> => {
    setIsLoading(true)
    
    try {
      // Create guest user on backend
      const response = await fetch(`${getApiUrl()}/api/users/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || undefined })
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        
        // Initialize guest ELO data locally
        const guestData = initializeGuestElo(userData.username, userData.display_name)
        setGuestData(guestData)
        
        // Initialize geolocation tracking for new guest users
        initializeUserGeolocation().catch(error => 
          console.warn('Geolocation initialization failed:', error)
        )
        
        // Store session
        localStorage.setItem('export9_user_id', userData.id.toString())
        localStorage.setItem('export9_is_guest', 'true')
        
        return true
      } else {
        console.error('Guest user creation failed')
        return false
      }
    } catch (error) {
      console.error('Guest login failed:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setGuestData(null)
    
    // Clear session storage but keep guest ELO data
    localStorage.removeItem('export9_user_id')
    localStorage.removeItem('export9_is_guest')
    localStorage.removeItem('export9_oec_token')
  }

  const refreshUser = async () => {
    if (!user) return
    
    try {
      if (user.is_guest) {
        // For guest users, just refresh from localStorage
        const localGuestData = getGuestEloData()
        setGuestData(localGuestData)
      } else {
        // For authenticated users, fetch from backend
        const response = await fetch(`${getApiUrl()}/api/users/${user.id}`)
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        }
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error)
    }
  }

  const refreshGuestData = () => {
    if (isGuest) {
      const localGuestData = getGuestEloData()
      setGuestData(localGuestData)
    }
  }

  const contextValue: UserContextType = {
    user,
    guestData,
    isAuthenticated,
    isGuest,
    login,
    loginAsGuest,
    logout,
    refreshUser,
    refreshGuestData,
    isLoading
  }

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}