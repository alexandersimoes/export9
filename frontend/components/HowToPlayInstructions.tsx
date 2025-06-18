'use client'

import React from 'react'
import { getFlagEmoji } from '@/lib/utils'

interface HowToPlayInstructionsProps {
  compact?: boolean
}

export default function HowToPlayInstructions({ compact = false }: HowToPlayInstructionsProps) {
  return (
    <div className={`rounded-lg p-6 ${compact ? 'p-4' : ''}`} style={{ backgroundColor: '#f9f7f4', border: '1px solid #d4b896' }}>
      <h3 className={`font-bold mb-4 text-center ${compact ? 'text-base' : 'text-lg'}`} style={{ color: 'var(--poker-dark-text)' }}>
        How to Play
      </h3>
      
      <div className="space-y-4">
        {/* Example Round */}
        <div className="text-center">
          <div className="text-sm" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>
            <strong>This Round's Product:</strong>
          </div>
          <div className="flex items-center justify-center space-x-2 my-3">
            <span className="text-2xl">🚗</span>
            <span className={`font-semibold ${compact ? 'text-base' : 'text-lg'}`} style={{ color: 'var(--poker-strong-bg)' }}>
              Cars
            </span>
          </div>
          
          <div className="text-sm mb-3" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>
            <strong>Your Cards - Pick the Best Exporter:</strong>
          </div>
          
          {/* Sample Hand with Game-Style Cards */}
          <div className={`flex justify-center mb-4 ${compact ? 'space-x-2' : 'space-x-3'}`} style={{ perspective: '1000px' }}>
            {/* USA Card */}
            <div className={`playing-card card-in-hand hover:scale-105 transition-transform cursor-pointer ${compact ? 'scale-75' : ''}`} style={{ transform: 'rotate(-8deg)' }}>
              <div className="card-corner top-left">
                <div>US</div>
                <div style={{ fontSize: '10px' }}>{getFlagEmoji('US')}</div>
              </div>
              <div className="card-center">
                <div className="card-flag">{getFlagEmoji('US')}</div>
                <div className="card-name">USA</div>
              </div>
              <div className="card-corner bottom-right">
                <div>US</div>
                <div style={{ fontSize: '10px' }}>{getFlagEmoji('US')}</div>
              </div>
            </div>

            {/* Germany Card - Winner */}
            <div className={`playing-card card-in-hand selected ${compact ? 'scale-75' : ''}`} style={{ transform: 'translateY(-8px) scale(1.05)', zIndex: 10 }}>
              <div className="card-corner top-left">
                <div>DE</div>
                <div style={{ fontSize: '10px' }}>{getFlagEmoji('DE')}</div>
              </div>
              <div className="card-center">
                <div className="card-flag">{getFlagEmoji('DE')}</div>
                <div className="card-name">Germany</div>
              </div>
              <div className="card-corner bottom-right">
                <div>DE</div>
                <div style={{ fontSize: '10px' }}>{getFlagEmoji('DE')}</div>
              </div>
              <div className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-green-600 bg-white px-2 py-1 rounded border border-green-500 ${compact ? 'text-xs' : ''}`}>
                Best Choice!
              </div>
            </div>

            {/* Brazil Card */}
            <div className={`playing-card card-in-hand hover:scale-105 transition-transform cursor-pointer ${compact ? 'scale-75' : ''}`} style={{ transform: 'rotate(8deg)' }}>
              <div className="card-corner top-left">
                <div>BR</div>
                <div style={{ fontSize: '10px' }}>{getFlagEmoji('BR')}</div>
              </div>
              <div className="card-center">
                <div className="card-flag">{getFlagEmoji('BR')}</div>
                <div className="card-name">Brazil</div>
              </div>
              <div className="card-corner bottom-right">
                <div>BR</div>
                <div style={{ fontSize: '10px' }}>{getFlagEmoji('BR')}</div>
              </div>
            </div>
          </div>
          
          <div className="text-xs mt-6" style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>
            Germany exports the most cars! You win this round. 🏆
          </div>
        </div>
        
        {/* Game Rules */}
        <div className="border-t pt-4" style={{ borderColor: 'var(--poker-strong-bg)', opacity: 0.2 }}>
          <div className={`grid gap-3 text-xs text-center ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
            <div>
              <div className="font-semibold" style={{ color: 'var(--poker-dark-text)' }}>Step 1</div>
              <div style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>See the product</div>
            </div>
            <div>
              <div className="font-semibold" style={{ color: 'var(--poker-dark-text)' }}>Step 2</div>
              <div style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>Pick best exporter</div>
            </div>
            <div>
              <div className="font-semibold" style={{ color: 'var(--poker-dark-text)' }}>Step 3</div>
              <div style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>Win the round!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}