export interface Country {
  code: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
}

export interface Card {
  country_code: string;
  country_name: string;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  cards_remaining?: number;
  is_cpu?: boolean;
  elo_rating?: number;
}

export interface GameState {
  game_id: string;
  state: 'waiting' | 'in_progress' | 'finished';
  current_round: number;
  total_rounds: number;
  current_product?: Product;
  players: Player[];
  your_cards: Card[];
  lastRoundResult?: RoundResult;
}

export interface RoundResult {
  round_number: number;
  winner_id?: string;
  winner_name?: string;
  is_tie: boolean;
  winner_country: string;
  winner_player_ids: string[];
  export_data: Record<string, number>;
  players: Array<{
    id: string;
    name: string;
    score: number;
    is_round_winner: boolean;
    card_played?: {
      country_code: string;
      country_name: string;
      export_value: number;
    };
  }>;
}

export interface GameEndResult {
  winner_id: string;
  winner_name: string;
  final_scores: Array<{
    id: string;
    name: string;
    score: number;
  }>;
}

export type GameStatus = 
  | 'connecting'
  | 'waiting_for_opponent'
  | 'game_found'
  | 'playing'
  | 'round_ended'
  | 'game_ended'
  | 'disconnected'
  | 'error';