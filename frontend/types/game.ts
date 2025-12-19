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
  user_id?: string;
  is_guest?: boolean;
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
  gameEndedEarly?: boolean;
  forfeitReason?: string;
  forfeitingPlayerName?: string;
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
    elo_rating?: number;
    is_cpu?: boolean;
    user_id?: string;
    is_guest?: boolean;
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
    elo_rating?: number;
    is_cpu?: boolean;
    user_id?: string;
    is_guest?: boolean;
  }>;
}

export type GameStatus = 
  | 'connecting'
  | 'waiting_for_opponent'
  | 'waiting_for_friend'
  | 'game_found'
  | 'playing'
  | 'round_ended'
  | 'game_ended'
  | 'disconnected'
  | 'error';
