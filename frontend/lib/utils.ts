/**
 * Utility functions for the Export Game
 */

/**
 * Format export values for display
 * Values >= $1B show as billions (e.g., "$45.2B")
 * Values >= $1M show as millions (e.g., "$200M")
 * Values < $1M show as thousands (e.g., "$500k")
 */
export function formatExportValue(value: number): string {
  if (value === 0) {
    return '0'
  } else if (value >= 1) {
    return `$${value.toFixed(1)}B`
  } else if (value >= 0.001) {
    return `$${(value * 1000).toFixed(0)}M`
  } else if (value >= 0.000001) {
    return `$${(value * 1000000).toFixed(0)}k`
  } else {
    return `$${(value * 1000000).toFixed(0)}`
  }
}

/**
 * Format export values with smart precision to avoid displaying identical values
 * When two values would display the same, increases precision automatically
 */
export function formatExportValueWithPrecision(values: number[]): string[] {
  if (values.length === 0) return []
  
  // Start with standard formatting
  let precision = 1
  let formatted: string[] = []
  
  // Try increasing precision until all values are unique or we hit max precision
  while (precision <= 3) {
    formatted = values.map(value => {
      if (value === 0) {
        return '0'
      } else if (value >= 1) {
        return `$${value.toFixed(precision)}B`
      } else if (value >= 0.001) {
        // For millions, use appropriate precision
        const millionValue = value * 1000
        const millionPrecision = precision === 1 ? 0 : precision - 1
        return `$${millionValue.toFixed(millionPrecision)}M`
      } else if (value >= 0.000001) {
        // For thousands, use appropriate precision
        const thousandValue = value * 1000000
        const thousandPrecision = precision === 1 ? 0 : precision - 1
        return `$${thousandValue.toFixed(thousandPrecision)}k`
      } else {
        // For very small values, show as dollars
        const dollarValue = value * 1000000
        return `$${dollarValue.toFixed(0)}`
      }
    })
    
    // Check if all formatted values are unique
    const uniqueValues = new Set(formatted)
    if (uniqueValues.size === formatted.length) {
      break // All values are unique, we're done
    }
    
    precision++
  }
  
  return formatted
}

/**
 * Get flag emoji for country code
 * Includes all countries used in the game
 */
export function getFlagEmoji(countryCode: string): string {
  const flags: Record<string, string> = {
    'CN': '🇨🇳', 'US': '🇺🇸', 'DE': '🇩🇪', 'JP': '🇯🇵', 'GB': '🇬🇧',
    'FR': '🇫🇷', 'KR': '🇰🇷', 'IT': '🇮🇹', 'CA': '🇨🇦', 'ES': '🇪🇸',
    'IN': '🇮🇳', 'NL': '🇳🇱', 'SA': '🇸🇦', 'CH': '🇨🇭', 'AU': '🇦🇺',
    'IE': '🇮🇪', 'MX': '🇲🇽', 'RU': '🇷🇺', 'TH': '🇹🇭', 'MY': '🇲🇾',
    'BR': '🇧🇷', 'CL': '🇨🇱', 'ZA': '🇿🇦', 'SL': '🇸🇱', 'NG': '🇳🇬',
    'ID': '🇮🇩', 'EC': '🇪🇨'
  }
  return flags[countryCode] || '🏳️'
}

/**
 * Format currency with appropriate precision
 * For displaying in game UI elements
 */
export function formatCurrency(value: number, compact: boolean = false): string {
  if (compact) {
    return formatExportValue(value)
  }
  
  if (value >= 1) {
    return `$${value.toFixed(2)} Billion USD`
  } else if (value >= 0.001) {
    return `$${(value * 1000).toFixed(0)} Million USD`
  } else {
    return `$${(value * 1000000).toFixed(0)} Thousand USD`
  }
}

/**
 * Get product category emoji
 */
export function getCategoryEmoji(category: string): string {
  const categoryEmojis: Record<string, string> = {
    'automotive': '🚗',
    'electronics': '📱',
    'healthcare': '💊',
    'beverages': '🍷',
    'energy': '⛽',
    'food': '🧀',
    'agriculture': '🌾',
    'materials': '🏭'
  }
  return categoryEmojis[category] || '📦'
}

/**
 * Play a bell sound notification
 */
export function playBellSound(): void {
  try {
    // Create an audio context and play a bell sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // Create a bell-like sound using oscillators
    const oscillator1 = audioContext.createOscillator()
    const oscillator2 = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    // Bell frequencies
    oscillator1.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime)
    
    // Connect the oscillators
    oscillator1.connect(gainNode)
    oscillator2.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Set volume and envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8)
    
    // Start and stop the sound
    oscillator1.start(audioContext.currentTime)
    oscillator2.start(audioContext.currentTime)
    oscillator1.stop(audioContext.currentTime + 0.8)
    oscillator2.stop(audioContext.currentTime + 0.8)
  } catch (error) {
    console.log('Could not play bell sound:', error)
  }
}

/**
 * Get specific product emoji by product ID
 */
export function getProductEmoji(productId: string): string {
  const productEmojis: Record<string, string> = {
    'cars': '🚗',
    'phones': '📱',
    'medicine': '💊',
    'coffee': '☕',
    'wine': '🍷',
    'computers': '💻',
    'oil': '🛢️',
    'circuits': '🔌',
    'gas': '⛽',
    'cheese': '🧀',
    'beer': '🍺',
    'tires': '🛞',
    'soybeans': '🌱',
    'sugar': '🍯',
    'liquor': '🥃',
    'refined_oil': '⛽',
    'auto_parts': '🔧',
    'drones': '🚁',
    'corn': '🌽',
    'cherries': '🍒',
    'diamonds': '💎',
    'copper_ore': '🪨',
    'cocoa_beans': '🫘',
    'fish_fillets': '🐟',
    't_shirts': '👕',
    'tea': '🍃',
    'leather_footwear': '👞',
    'bicycles': '🚲',
    'bananas': '🍌',
    'nitrogenous_fertilizers': '🌾'
  }
  return productEmojis[productId] || '📦'
}