# Export Game - Real-time Multiplayer

A real-time multiplayer game where players compete by guessing which countries have the highest exports for different products. Built with Next.js frontend and FastAPI + Socket.IO backend.

## Game Rules

- 2 players per game
- **Both players get the same 10 randomly chosen country cards** for fair competition
- 9 rounds total, each with a different product (cars, phones, crude oil, etc.)
- **Real export data from OEC API** - actual 2023 trade statistics used for scoring
- **20-second timer** per round - players must submit their choice before time runs out
- Players can **change their selection** as many times as they want before submitting
- **Auto-submit** if time expires (uses selected card, or first card if none selected)
- **Once played, cards are permanently removed** - players lose that country for remaining rounds
- Winner of each round gets 1 point
- **Ties are possible** - if both players choose the same country, both get 1 point
- **Round results show real export values** in billions USD with 5-second timer
- Player with the most points after 9 rounds wins

## Tech Stack

### Frontend
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time communication

### Backend
- **FastAPI** for the REST API
- **Socket.IO** for real-time websocket communication
- **Python** with async/await support
- **Pydantic** for data validation
- **OEC API Integration** for real-time export data
- **aiohttp** for async HTTP requests

## Getting Started

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Test the OEC API integration:
```bash
python test_oec.py
```

5. Run the development server:
```bash
python main.py
```

The backend will be available at `http://localhost:8000`
- Health check: `http://localhost:8000/health`
- OEC API test: `http://localhost:8000/test-oec`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## How to Play

1. Open `http://localhost:3000` in your browser
2. Enter your name and click "Join Game"
3. Wait for another player to join (open another browser tab/window for testing)
4. Once matched, you'll see the first product and your country cards
5. Click on the country you think exports the most of that product
6. Click "Play Selected Card" to submit your choice
7. See the results and continue to the next round
8. After 9 rounds, see who won!

## API Endpoints

### REST API
- `GET /` - Health check
- `GET /health` - Server status with game statistics

### Socket.IO Events

#### Client to Server
- `join_game` - Join matchmaking queue
- `play_card` - Play a country card for the current round
- `get_game_state` - Request current game state

#### Server to Client
- `connected` - Connection acknowledged
- `player_created` - Player successfully created
- `game_found` - Matched with opponent, game starting
- `round_started` - New round begins with product info
- `card_played` - Another player played a card
- `round_completed` - Round finished with results
- `game_ended` - Game finished with final scores
- `error` - Error occurred

## Scalability Features

The application is designed with scalability in mind:

- **Stateless Backend**: Game state is managed in memory with plans for Redis integration
- **Room-based Socket.IO**: Players are grouped into game rooms for efficient communication
- **Async/Await**: Full async support for handling multiple concurrent games
- **Modular Architecture**: Clean separation between game logic, socket handlers, and data models

## Development

### Running Tests
```bash
# Backend tests (when implemented)
cd backend
pytest

# Frontend tests (when implemented)  
cd frontend
npm test
```

### Code Structure

```
├── backend/
│   ├── main.py              # FastAPI app and Socket.IO server
│   ├── models.py            # Game data models and logic
│   ├── socket_handlers.py   # Socket.IO event handlers
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── app/                 # Next.js app directory
│   ├── components/          # React components
│   ├── lib/                 # Utilities and hooks
│   ├── types/               # TypeScript type definitions
│   └── package.json         # Node.js dependencies
└── README.md
```

## Future Enhancements

- **Redis Integration**: For persistent game state and session management
- **Database**: Store game history and player statistics  
- **Authentication**: User accounts and profiles
- **Tournaments**: Multi-game tournaments with brackets
- **Real Export Data**: Integration with trade statistics APIs
- **Mobile App**: React Native mobile client
- **Spectator Mode**: Watch ongoing games
- **Custom Game Modes**: Different rule variations
