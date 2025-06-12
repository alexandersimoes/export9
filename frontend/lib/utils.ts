/**
 * Utility functions for the Export Game
 */

/**
 * Format export values for display
 * Values >= $1B show as billions (e.g., "$45.2B")
 * Values < $1B show as millions (e.g., "$200M")
 */
export function formatExportValue(value: number): string {
  if (value >= 1) {
    return `$${value.toFixed(1)}B`
  } else {
    return `$${(value * 1000).toFixed(0)}M`
  }
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
    'BR': '🇧🇷'
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
  } else {
    return `$${(value * 1000).toFixed(0)} Million USD`
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
    'corn': '🌽'
  }
  return productEmojis[productId] || '📦'
}