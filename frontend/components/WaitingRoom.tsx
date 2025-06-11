'use client'

import { GameStatus } from '@/types/game'

interface WaitingRoomProps {
  playerName: string
  status: GameStatus
}

export default function WaitingRoom({ playerName, status }: WaitingRoomProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="card max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-game-primary mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome, {playerName}!
            </h2>
          </div>

          {status === 'connecting' && (
            <div>
              <p className="text-lg text-gray-600 mb-4">Connecting to game server...</p>
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-game-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-game-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-game-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}

          {status === 'waiting_for_opponent' && (
            <div>
              <p className="text-lg text-gray-600 mb-4">Looking for an opponent...</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-700">
                  You'll be automatically matched with another player when one becomes available.
                </p>
              </div>
              <div className="flex justify-center space-x-1">
                <div className="w-3 h-3 bg-game-secondary rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-game-secondary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-game-secondary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}

          <div className="mt-8 text-sm text-gray-500 space-y-2">
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">How to Play:</h3>
              <ul className="text-left space-y-1">
                <li>• You'll get 10 country cards</li>
                <li>• Each round has a different product</li>
                <li>• Choose the country with highest exports</li>
                <li>• Win the most rounds to win the game!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}