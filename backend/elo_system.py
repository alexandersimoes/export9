"""
ELO Rating System for Export 9
Based on standard chess ELO with adjustments for the game format
"""

import math
from typing import Tuple
from dataclasses import dataclass

@dataclass
class EloResult:
    player1_new_elo: int
    player2_new_elo: int
    elo_change: int  # Points gained by winner (or 0 for draw)

class EloCalculator:
    """
    ELO calculation system for Export 9
    
    Standard ELO formula with K-factor adjustments based on:
    - Player rating level (higher rated players have lower K-factor)
    - Number of games played (new players have higher K-factor)
    - Game outcome (wins/losses/draws)
    """
    
    # K-factor settings
    K_FACTOR_NEW_PLAYER = 32      # < 30 games
    K_FACTOR_INTERMEDIATE = 24     # 30-100 games, rating < 2000
    K_FACTOR_EXPERIENCED = 16      # 100+ games or rating >= 2000
    K_FACTOR_MASTER = 12          # Rating >= 2400
    
    # ELO bounds
    MIN_ELO = 100
    MAX_ELO = 3000
    
    @classmethod
    def get_k_factor(cls, elo_rating: int, games_played: int) -> int:
        """
        Determine K-factor based on player's ELO and experience
        
        Args:
            elo_rating: Current ELO rating
            games_played: Number of games played
            
        Returns:
            K-factor for ELO calculation
        """
        if elo_rating >= 2400:
            return cls.K_FACTOR_MASTER
        elif elo_rating >= 2000 or games_played >= 100:
            return cls.K_FACTOR_EXPERIENCED
        elif games_played >= 30:
            return cls.K_FACTOR_INTERMEDIATE
        else:
            return cls.K_FACTOR_NEW_PLAYER
    
    @classmethod
    def calculate_expected_score(cls, player_elo: int, opponent_elo: int) -> float:
        """
        Calculate expected score for a player against an opponent
        
        Args:
            player_elo: Player's current ELO
            opponent_elo: Opponent's current ELO
            
        Returns:
            Expected score (0.0 to 1.0)
        """
        elo_diff = opponent_elo - player_elo
        expected = 1.0 / (1.0 + math.pow(10, elo_diff / 400.0))
        return expected
    
    @classmethod
    def calculate_new_elos(
        cls, 
        player1_elo: int, 
        player1_games: int,
        player2_elo: int, 
        player2_games: int,
        player1_score: int, 
        player2_score: int
    ) -> EloResult:
        """
        Calculate new ELO ratings based on game result
        
        Args:
            player1_elo: Player 1's current ELO
            player1_games: Player 1's games played
            player2_elo: Player 2's current ELO  
            player2_games: Player 2's games played
            player1_score: Player 1's final score
            player2_score: Player 2's final score
            
        Returns:
            EloResult with new ratings and change amount
        """
        # Determine game outcome
        if player1_score > player2_score:
            # Player 1 wins
            player1_actual = 1.0
            player2_actual = 0.0
        elif player2_score > player1_score:
            # Player 2 wins  
            player1_actual = 0.0
            player2_actual = 1.0
        else:
            # Draw
            player1_actual = 0.5
            player2_actual = 0.5
        
        # Calculate expected scores
        player1_expected = cls.calculate_expected_score(player1_elo, player2_elo)
        player2_expected = cls.calculate_expected_score(player2_elo, player1_elo)
        
        # Get K-factors
        player1_k = cls.get_k_factor(player1_elo, player1_games)
        player2_k = cls.get_k_factor(player2_elo, player2_games)
        
        # Calculate ELO changes
        player1_change = player1_k * (player1_actual - player1_expected)
        player2_change = player2_k * (player2_actual - player2_expected)
        
        # Apply changes
        player1_new = player1_elo + round(player1_change)
        player2_new = player2_elo + round(player2_change)
        
        # Enforce bounds
        player1_new = max(cls.MIN_ELO, min(cls.MAX_ELO, player1_new))
        player2_new = max(cls.MIN_ELO, min(cls.MAX_ELO, player2_new))
        
        # Calculate the actual change (for display purposes)
        elo_change = abs(round(player1_change)) if player1_actual > player2_actual else abs(round(player2_change))
        
        return EloResult(
            player1_new_elo=player1_new,
            player2_new_elo=player2_new,
            elo_change=elo_change
        )
    
    @classmethod
    def get_elo_category(cls, elo_rating: int) -> str:
        """
        Get player category based on ELO rating
        
        Args:
            elo_rating: Player's ELO rating
            
        Returns:
            Category string for display
        """
        if elo_rating >= 2400:
            return "Master"
        elif elo_rating >= 2000:
            return "Expert"
        elif elo_rating >= 1600:
            return "Advanced"
        elif elo_rating >= 1200:
            return "Intermediate"
        elif elo_rating >= 800:
            return "Beginner"
        else:
            return "Novice"
    
    @classmethod
    def get_elo_color(cls, elo_rating: int) -> str:
        """
        Get color code for ELO display
        
        Args:
            elo_rating: Player's ELO rating
            
        Returns:
            Color hex code
        """
        if elo_rating >= 2400:
            return "#FFD700"  # Gold
        elif elo_rating >= 2000:
            return "#C0C0C0"  # Silver
        elif elo_rating >= 1600:
            return "#CD7F32"  # Bronze
        elif elo_rating >= 1200:
            return "#4CAF50"  # Green
        elif elo_rating >= 800:
            return "#2196F3"  # Blue
        else:
            return "#9E9E9E"  # Gray

def simulate_elo_change(
    player_elo: int, 
    opponent_elo: int, 
    games_played: int = 50,
    win: bool = True
) -> Tuple[int, int]:
    """
    Simulate ELO change for testing purposes
    
    Args:
        player_elo: Player's current ELO
        opponent_elo: Opponent's ELO
        games_played: Player's games played
        win: Whether player wins (True) or loses (False)
        
    Returns:
        Tuple of (new_elo, change_amount)
    """
    player_score = 9 if win else 0
    opponent_score = 0 if win else 9
    
    result = EloCalculator.calculate_new_elos(
        player_elo, games_played,
        opponent_elo, 50,  # Assume opponent has 50 games
        player_score, opponent_score
    )
    
    change = result.player1_new_elo - player_elo
    return result.player1_new_elo, change

# Example usage and testing
if __name__ == "__main__":
    # Test scenarios
    print("ELO System Testing")
    print("=" * 50)
    
    scenarios = [
        (1200, 1200, "Even match"),
        (1200, 1400, "Underdog wins"),
        (1400, 1200, "Favorite wins"),
        (1000, 1600, "Major upset"),
        (2000, 1200, "Expert vs Beginner")
    ]
    
    for player_elo, opponent_elo, description in scenarios:
        win_elo, win_change = simulate_elo_change(player_elo, opponent_elo, True)
        lose_elo, lose_change = simulate_elo_change(player_elo, opponent_elo, False)
        
        print(f"\n{description}:")
        print(f"  Player: {player_elo} vs Opponent: {opponent_elo}")
        print(f"  Win:  {player_elo} → {win_elo} ({win_change:+d})")
        print(f"  Loss: {player_elo} → {lose_elo} ({lose_change:+d})")