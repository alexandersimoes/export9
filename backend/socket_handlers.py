import logging
import uuid
from typing import Dict, Any
import socketio

from models import GameManager, Player, PlayerState, GameState

logger = logging.getLogger(__name__)

def register_socket_handlers(sio: socketio.AsyncServer, game_manager: GameManager):
    """Register all Socket.IO event handlers"""
    
    @sio.event
    async def connect(sid, environ):
        logger.info(f"Client connected: {sid}")
        await sio.emit('connected', {'status': 'connected'}, room=sid)
    
    @sio.event
    async def disconnect(sid):
        logger.info(f"Client disconnected: {sid}")
        
        # Find player by socket ID and remove them
        player = None
        for waiting_player in game_manager.waiting_players:
            if waiting_player.socket_id == sid:
                player = waiting_player
                break
        
        if not player:
            # Check if player is in a game
            for game in game_manager.games.values():
                for game_player in game.players:
                    if game_player.socket_id == sid:
                        player = game_player
                        break
                if player:
                    break
        
        if player:
            player.state = PlayerState.DISCONNECTED
            game_manager.remove_player(player.id)
            
            # Notify other players in the game
            game = game_manager.get_game_by_player(player.id)
            if game:
                await sio.emit('player_disconnected', {
                    'player_id': player.id,
                    'player_name': player.name
                }, room=f"game_{game.id}")
    
    @sio.event
    async def join_game(sid, data):
        """Handle player joining game"""
        try:
            player_name = data.get('name', '').strip()
            if not player_name:
                await sio.emit('error', {'message': 'Name is required'}, room=sid)
                return
            
            # Create new player
            player = Player(
                id=str(uuid.uuid4()),
                name=player_name,
                socket_id=sid,
                state=PlayerState.WAITING
            )
            
            # Add to waiting queue
            game_manager.add_waiting_player(player)
            
            await sio.emit('player_created', {
                'player_id': player.id,
                'name': player.name,
                'status': 'waiting_for_opponent'
            }, room=sid)
            
            # Try to find a match
            game = game_manager.find_match()
            if game:
                logger.info(f"Game created with ID: {game.id}")
                
                # Join both players to game room
                for game_player in game.players:
                    await sio.enter_room(game_player.socket_id, f"game_{game.id}")
                    logger.info(f"Player {game_player.name} joined room game_{game.id}")
                
                # Start the game
                game_manager.start_game(game.id)
                
                # Log cards for debugging
                for i, game_player in enumerate(game.players):
                    player_cards = [c.country.code for c in game_player.cards]
                    logger.info(f"Player {i+1} ({game_player.name}) cards: {player_cards}")
                
                # Send personalized game_found event to each player
                for game_player in game.players:
                    await sio.emit('game_found', {
                        'game_id': game.id,
                        'players': [{'id': p.id, 'name': p.name} for p in game.players],
                        'your_cards': [{'country_code': c.country.code, 'country_name': c.country.name} 
                                      for c in game_player.cards]
                    }, room=game_player.socket_id)
                
                # Start first round
                await start_round(sio, game_manager, game.id, 1)
                
        except Exception as e:
            logger.error(f"Error in join_game: {e}")
            await sio.emit('error', {'message': 'Failed to join game'}, room=sid)
    
    @sio.event
    async def play_cpu(sid, data):
        """Handle player choosing to play against CPU"""
        try:
            # Find the waiting player
            player = None
            for waiting_player in game_manager.waiting_players:
                if waiting_player.socket_id == sid:
                    player = waiting_player
                    break
            
            if not player:
                await sio.emit('error', {'message': 'Player not found in waiting queue'}, room=sid)
                return
            
            # Create CPU game
            game = game_manager.create_cpu_game(player)
            logger.info(f"CPU Game created with ID: {game.id}")
            
            # Join human player to game room (CPU doesn't need socket room)
            await sio.enter_room(player.socket_id, f"game_{game.id}")
            
            # Start the game
            game_manager.start_game(game.id)
            
            # Send game_found event to human player
            await sio.emit('game_found', {
                'game_id': game.id,
                'players': [{'id': p.id, 'name': p.name, 'is_cpu': p.is_cpu} for p in game.players],
                'your_cards': [{'country_code': c.country.code, 'country_name': c.country.name} 
                              for c in player.cards]
            }, room=player.socket_id)
            
            # Start first round
            await start_round(sio, game_manager, game.id, 1)
            
        except Exception as e:
            logger.error(f"Error in play_cpu: {e}")
            await sio.emit('error', {'message': 'Failed to create CPU game'}, room=sid)
    
    @sio.event
    async def play_card(sid, data):
        """Handle player playing a card"""
        try:
            card_country_code = data.get('country_code')
            if not card_country_code:
                await sio.emit('error', {'message': 'Country code is required'}, room=sid)
                return
            
            # Find player and game
            player = None
            game = None
            for g in game_manager.games.values():
                for p in g.players:
                    if p.socket_id == sid:
                        player = p
                        game = g
                        break
                if player:
                    break
            
            if not player or not game:
                await sio.emit('error', {'message': 'Game not found'}, room=sid)
                return
            
            if game.state != GameState.IN_PROGRESS:
                logger.error(f"Game {game.id} not in progress, current state: {game.state}")
                await sio.emit('error', {'message': f'Game is not in progress (current state: {game.state.value})'}, room=sid)
                return
            
            if game.current_round == 0:
                logger.error(f"Game {game.id} current round is 0")
                await sio.emit('error', {'message': 'Round not started yet'}, room=sid)
                return
            
            # Find the card in player's hand
            card_to_play = None
            for card in player.cards:
                if card.country.code == card_country_code and not card.is_played:
                    card_to_play = card
                    break
            
            if not card_to_play:
                logger.error(f"Card not found: {card_country_code} for player {player.id}")
                logger.error(f"Available cards: {[c.country.code for c in player.cards if not c.is_played]}")
                await sio.emit('error', {'message': f'Card {card_country_code} not found or already played'}, room=sid)
                return
            
            # Mark card as played
            card_to_play.is_played = True
            player.current_card = card_to_play
            
            # Add to current round
            current_round = game.rounds[game.current_round - 1]
            current_round.player_cards[player.id] = card_to_play
            
            # Notify all players about the card played
            await sio.emit('card_played', {
                'player_id': player.id,
                'player_name': player.name,
                'country_code': card_country_code,
                'country_name': card_to_play.country.name
            }, room=f"game_{game.id}")
            
            # Check if all players have played
            if len(current_round.player_cards) == len(game.players):
                await resolve_round(sio, game_manager, game.id)
                
        except Exception as e:
            logger.error(f"Error in play_card: {e}")
            await sio.emit('error', {'message': 'Failed to play card'}, room=sid)
    
    @sio.event
    async def get_game_state(sid, data):
        """Get current game state"""
        try:
            # Find player's game
            player = None
            game = None
            for g in game_manager.games.values():
                for p in g.players:
                    if p.socket_id == sid:
                        player = p
                        game = g
                        break
                if player:
                    break
            
            if not player or not game:
                await sio.emit('error', {'message': 'Game not found'}, room=sid)
                return
            
            # Send current game state
            current_round = game.rounds[game.current_round - 1] if game.current_round > 0 else None
            
            await sio.emit('game_state', {
                'game_id': game.id,
                'state': game.state.value,
                'current_round': game.current_round,
                'total_rounds': len(game.rounds),
                'current_product': {
                    'id': current_round.product.id,
                    'name': current_round.product.name,
                    'category': current_round.product.category
                } if current_round else None,
                'players': [{
                    'id': p.id,
                    'name': p.name,
                    'score': p.score,
                    'cards_remaining': len([c for c in p.cards if not c.is_played])
                } for p in game.players],
                'your_cards': [{'country_code': c.country.code, 'country_name': c.country.name} 
                              for c in player.cards if not c.is_played]
            }, room=sid)
            
        except Exception as e:
            logger.error(f"Error in get_game_state: {e}")
            await sio.emit('error', {'message': 'Failed to get game state'}, room=sid)

async def start_round(sio: socketio.AsyncServer, game_manager: GameManager, game_id: str, round_number: int):
    """Start a new round"""
    game = game_manager.games.get(game_id)
    if not game:
        return
    
    game.current_round = round_number
    current_round = game.rounds[round_number - 1]
    
    # Clear previous round data
    for player in game.players:
        player.current_card = None
    
    # Send round started event with updated cards for each player (only non-CPU players)
    for player in game.players:
        if not player.is_cpu:
            available_cards = [c for c in player.cards if not c.is_played]
            await sio.emit('round_started', {
                'round_number': round_number,
                'total_rounds': len(game.rounds),
                'product': {
                    'id': current_round.product.id,
                    'name': current_round.product.name,
                    'category': current_round.product.category
                },
                'your_cards': [{'country_code': c.country.code, 'country_name': c.country.name} 
                              for c in available_cards]
            }, room=player.socket_id)
    
    # Auto-play CPU move after a short delay (2 seconds)
    import asyncio
    await asyncio.sleep(2)
    await cpu_auto_play(sio, game_manager, game_id)

async def cpu_auto_play(sio: socketio.AsyncServer, game_manager: GameManager, game_id: str):
    """Handle CPU automatically playing the best card"""
    game = game_manager.games.get(game_id)
    if not game:
        return
    
    current_round = game.rounds[game.current_round - 1]
    
    # Find CPU player
    cpu_player = None
    for player in game.players:
        if player.is_cpu:
            cpu_player = player
            break
    
    if not cpu_player:
        return
    
    # Check if CPU already played this round
    if cpu_player.id in current_round.player_cards:
        return
    
    # Get best card for CPU
    best_card = await game_manager.get_cpu_best_card(cpu_player, current_round.product)
    if not best_card:
        logger.error(f"CPU has no available cards in game {game_id}")
        return
    
    # Mark card as played
    best_card.is_played = True
    cpu_player.current_card = best_card
    
    # Add to current round
    current_round.player_cards[cpu_player.id] = best_card
    
    logger.info(f"CPU played {best_card.country.code} in game {game_id}")
    
    # Notify human player about CPU move
    await sio.emit('card_played', {
        'player_id': cpu_player.id,
        'player_name': cpu_player.name,
        'country_code': best_card.country.code,
        'country_name': best_card.country.name
    }, room=f"game_{game_id}")
    
    # Check if all players have played
    if len(current_round.player_cards) == len(game.players):
        await resolve_round(sio, game_manager, game_id)

async def resolve_round(sio: socketio.AsyncServer, game_manager: GameManager, game_id: str):
    """Resolve the current round and determine winner"""
    game = game_manager.games.get(game_id)
    if not game:
        return
    
    current_round = game.rounds[game.current_round - 1]
    
    # Calculate export values for each played card
    for player_id, card in current_round.player_cards.items():
        export_value = await game_manager.get_export_value(card.country.code, current_round.product.id)
        current_round.export_data[card.country.code] = export_value
        player = game.get_player_by_id(player_id)
        player_type = "CPU" if player.is_cpu else "Human"
        logger.info(f"{player_type} ({player.name}) played {card.country.code} with {export_value:.2f}B exports for {current_round.product.name}")
    
    # Determine winner(s) - handle ties when both players pick same country
    winner_country = max(current_round.export_data, key=current_round.export_data.get)
    winner_export_value = current_round.export_data[winner_country]
    logger.info(f"Winning country: {winner_country} with {winner_export_value:.2f}B exports")
    
    winner_player_ids = []
    
    # Find all players who played the winning country
    for player_id, card in current_round.player_cards.items():
        if card.country.code == winner_country:
            winner_player_ids.append(player_id)
            player = game.get_player_by_id(player_id)
            player_type = "CPU" if player.is_cpu else "Human"
            logger.info(f"{player_type} ({player.name}) wins this round with {winner_country}")
    
    # Award points to all winners (handles ties)
    for winner_id in winner_player_ids:
        winner_player = game.get_player_by_id(winner_id)
        if winner_player:
            winner_player.score += 1
    
    # Set winner info for round result
    if len(winner_player_ids) == 1:
        current_round.winner_id = winner_player_ids[0]
    elif len(winner_player_ids) > 1:
        current_round.winner_id = "tie"  # Special marker for ties
    
    is_tie = len(winner_player_ids) > 1
    
    current_round.is_complete = True
    
    # Send round results
    await sio.emit('round_completed', {
        'round_number': game.current_round,
        'winner_id': current_round.winner_id,
        'winner_name': game.get_player_by_id(current_round.winner_id).name if current_round.winner_id and current_round.winner_id != "tie" else None,
        'is_tie': is_tie,
        'winner_country': winner_country,
        'winner_player_ids': winner_player_ids,
        'export_data': current_round.export_data,
        'players': [{
            'id': p.id,
            'name': p.name,
            'score': p.score,
            'is_round_winner': p.id in winner_player_ids,
            'card_played': {
                'country_code': current_round.player_cards[p.id].country.code,
                'country_name': current_round.player_cards[p.id].country.name,
                'export_value': current_round.export_data.get(current_round.player_cards[p.id].country.code, 0)
            } if p.id in current_round.player_cards else None
        } for p in game.players]
    }, room=f"game_{game_id}")
    
    # Check if game is finished
    if game.current_round >= len(game.rounds):
        # Give players time to see final round results before ending game
        import asyncio
        await asyncio.sleep(6)
        await end_game(sio, game_manager, game_id)
    else:
        # Start next round after showing results for 5 seconds
        import asyncio
        await asyncio.sleep(6)
        await start_round(sio, game_manager, game_id, game.current_round + 1)

async def end_game(sio: socketio.AsyncServer, game_manager: GameManager, game_id: str):
    """End the game and determine overall winner"""
    game = game_manager.games.get(game_id)
    if not game:
        return
    
    game.state = GameState.FINISHED
    
    # Determine overall winner
    winner_player = max(game.players, key=lambda p: p.score)
    game.winner_id = winner_player.id
    
    await sio.emit('game_ended', {
        'winner_id': winner_player.id,
        'winner_name': winner_player.name,
        'final_scores': [{
            'id': p.id,
            'name': p.name,
            'score': p.score
        } for p in game.players]
    }, room=f"game_{game_id}")
    
    # Clean up game after a delay
    import asyncio
    await asyncio.sleep(10)
    if game_id in game_manager.games:
        # Remove players from player_game_map
        for player in game.players:
            if player.id in game_manager.player_game_map:
                del game_manager.player_game_map[player.id]
        # Remove game
        del game_manager.games[game_id]
        logger.info(f"Cleaned up completed game {game_id}")