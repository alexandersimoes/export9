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
  if (value >= 1) {
    return `$${value.toFixed(1)}B`
  } else if (value >= 0.001) {
    return `$${(value * 1000).toFixed(0)}M`
  } else {
    return `$${(value * 1000000).toFixed(0)}k`
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
      if (value >= 1) {
        return `$${value.toFixed(precision)}B`
      } else if (value >= 0.001) {
        // For millions, use appropriate precision
        const millionValue = value * 1000
        const millionPrecision = precision === 1 ? 0 : precision - 1
        return `$${millionValue.toFixed(millionPrecision)}M`
      } else {
        // For thousands, use appropriate precision
        const thousandValue = value * 1000000
        const thousandPrecision = precision === 1 ? 0 : precision - 1
        return `$${thousandValue.toFixed(thousandPrecision)}k`
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
    'cocoa_beans': '🍫',
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