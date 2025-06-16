/**
 * Geolocation tracking for user analytics
 */

export interface GeolocationData {
  country_code: string
  country_name: string
  city: string
  postal: string
  latitude: number
  longitude: number
  IPv4: string
  state: string
  timestamp: string
}

const GEOLOCATION_KEY = 'export9_user_geolocation'

/**
 * Fetch user's geolocation data from external service
 */
export async function fetchGeolocationData(): Promise<GeolocationData | null> {
  try {
    const response = await fetch('https://geolocation-db.com/json/')
    
    if (!response.ok) {
      console.warn('Geolocation service unavailable')
      return null
    }
    
    const data = await response.json()
    
    // Add timestamp when we fetched the data
    const geolocationData: GeolocationData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    
    return geolocationData
  } catch (error) {
    console.warn('Failed to fetch geolocation data:', error)
    return null
  }
}

/**
 * Store geolocation data in localStorage
 */
export function storeGeolocationData(data: GeolocationData): void {
  try {
    localStorage.setItem(GEOLOCATION_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to store geolocation data:', error)
  }
}

/**
 * Get stored geolocation data from localStorage
 */
export function getStoredGeolocationData(): GeolocationData | null {
  try {
    const data = localStorage.getItem(GEOLOCATION_KEY)
    if (data) {
      return JSON.parse(data)
    }
    return null
  } catch (error) {
    console.warn('Failed to get stored geolocation data:', error)
    return null
  }
}

/**
 * Fetch and store geolocation data for new users
 */
export async function initializeUserGeolocation(): Promise<GeolocationData | null> {
  // Check if we already have geolocation data
  const existingData = getStoredGeolocationData()
  if (existingData) {
    // Check if data is less than 24 hours old
    const dataAge = Date.now() - new Date(existingData.timestamp).getTime()
    const twentyFourHours = 24 * 60 * 60 * 1000
    
    if (dataAge < twentyFourHours) {
      return existingData
    }
  }
  
  // Fetch fresh geolocation data
  const geolocationData = await fetchGeolocationData()
  if (geolocationData) {
    storeGeolocationData(geolocationData)
  }
  
  return geolocationData
}

/**
 * Clear stored geolocation data
 */
export function clearGeolocationData(): void {
  try {
    localStorage.removeItem(GEOLOCATION_KEY)
  } catch (error) {
    console.warn('Failed to clear geolocation data:', error)
  }
}

/**
 * Get user's country for analytics/display purposes
 */
export function getUserCountry(): string | null {
  const data = getStoredGeolocationData()
  return data?.country_name || null
}

/**
 * Get user's country code for flag display
 */
export function getUserCountryCode(): string | null {
  const data = getStoredGeolocationData()
  return data?.country_code || null
}