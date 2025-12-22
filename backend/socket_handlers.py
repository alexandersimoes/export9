import logging
import uuid
import os
import time
import asyncio
from typing import Dict, Any
import socketio

from models import GameManager, Player, PlayerState, GameState
from database import db

logger = logging.getLogger(__name__)

# Global task for timeout checking
_timeout_check_task = None
_grace_tasks = {}

GRACE_PERIOD_SECONDS = 30

def stop_timeout_checking():
  """Stop the timeout checking background task"""
  global _timeout_check_task
  if _timeout_check_task and not _timeout_check_task.done():
    _timeout_check_task.cancel()
    logger.info("Timeout checking task stopped")

  for task in _grace_tasks.values():
    if not task.done():
      task.cancel()
  _grace_tasks.clear()


def _cancel_grace_task(player_id: str):
  task = _grace_tasks.pop(player_id, None)
  if task and not task.done():
    task.cancel()


def _build_game_state_payload(game, player):
  current_round = game.rounds[game.current_round - 1] if game.current_round > 0 else None
  pause_remaining = None
  if game.state == GameState.PAUSED and game.pause_expires_at:
    pause_remaining = max(0, int(game.pause_expires_at - time.time()))

  return {
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
          'cards_remaining': len([c for c in p.cards if not c.is_played]),
          'elo_rating': p.elo_rating,
          'is_cpu': p.is_cpu,
          'is_guest': p.is_guest,
          'user_id': p.user_id
      } for p in game.players],
      'your_cards': [{'country_code': c.country.code, 'country_name': c.country.name}
                     for c in player.cards if not c.is_played],
      'is_paused': game.state == GameState.PAUSED,
      'pause_reason': 'opponent_disconnected' if game.state == GameState.PAUSED else None,
      'pause_remaining': pause_remaining
  }


async def _start_grace_period(sio: socketio.AsyncServer, game_manager: GameManager, game_id: str, disconnected_player_id: str, remaining_player_id: str):
  game = game_manager.games.get(game_id)
  if not game:
    return

  game.state = GameState.PAUSED
  game.pause_expires_at = time.time() + GRACE_PERIOD_SECONDS
  game.pending_pause = False
  game.pending_disconnected_player_id = None
  game.pending_remaining_player_id = None

  await sio.emit('opponent_disconnected', {
      'player_id': disconnected_player_id,
      'grace_seconds': GRACE_PERIOD_SECONDS,
      'pause_expires_at': game.pause_expires_at
  }, room=f"game_{game_id}")

  try:
    await asyncio.sleep(GRACE_PERIOD_SECONDS)
  except asyncio.CancelledError:
    return

  game = game_manager.games.get(game_id)
  if not game:
    return

  disconnected_player = game.get_player_by_id(disconnected_player_id)
  remaining_player = game.get_player_by_id(remaining_player_id)
  if not disconnected_player or not remaining_player:
    return

  if disconnected_player.state == PlayerState.DISCONNECTED and game.state == GameState.PAUSED:
    await handle_game_forfeit(sio, game_manager, game.id, disconnected_player.id, remaining_player.id)


async def _cleanup_after_grace(game_manager: GameManager, game_id: str, player_id: str):
  try:
    await asyncio.sleep(GRACE_PERIOD_SECONDS)
  except asyncio.CancelledError:
    return

  game = game_manager.games.get(game_id)
  if not game:
    return

  still_disconnected = all(p.state == PlayerState.DISCONNECTED for p in game.players if not p.is_cpu)
  if still_disconnected:
    for player in game.players:
      if player.id in game_manager.player_game_map:
        del game_manager.player_game_map[player.id]
    if game.id in game_manager.games:
      del game_manager.games[game.id]
    _cancel_grace_task(player_id)

async def check_player_timeouts(sio: socketio.AsyncServer, game_manager: GameManager):
  """Background task to check for player timeouts in active games"""
  logger.info("Player timeout checking task started")
  
  while True:
    try:
      current_time = time.time()
      timeout_threshold = 15  # Reduced to 15 seconds for faster detection
      
      games_to_check = list(game_manager.games.values())
      active_games = [g for g in games_to_check if g.state == GameState.IN_PROGRESS]
      
      if active_games:
        logger.debug(f"Checking {len(active_games)} active games for timeouts")
      
      for game in active_games:
        game_has_human_players = any(not p.is_cpu for p in game.players)
        if not game_has_human_players:
          continue
          
        timed_out_players = []
        active_players = []
        
        logger.debug(f"Checking game {game.id} with {len(game.players)} players")
        
        for player in game.players:
          if not player.is_cpu and player.state != PlayerState.DISCONNECTED:
            time_since_last_seen = current_time - player.last_seen
            logger.debug(f"Player {player.name} last seen {time_since_last_seen:.1f}s ago (threshold: {timeout_threshold}s)")
            
            if time_since_last_seen > timeout_threshold:
              logger.warning(f"Player {player.name} timed out in game {game.id} (last seen {time_since_last_seen:.1f}s ago)")
              timed_out_players.append(player)
            else:
              active_players.append(player)
        
        # If a player timed out and there's still an active player, handle forfeit
        if timed_out_players and active_players:
          for timed_out_player in timed_out_players:
            remaining_player = active_players[0]  # Take first active player
            logger.warning(f"TIMEOUT FORFEIT: {timed_out_player.name} timed out, awarding win to {remaining_player.name}")
            try:
              await handle_game_forfeit(sio, game_manager, game.id, timed_out_player.id, remaining_player.id)
            except Exception as forfeit_error:
              logger.error(f"Error handling forfeit for game {game.id}: {forfeit_error}")
            break  # Only handle one forfeit per game per check cycle
        elif not active_players:
          # All human players are disconnected; clean up stale game.
          logger.warning(f"Cleaning up game {game.id} with no active human players")
          for player in game.players:
            if player.id in game_manager.player_game_map:
              del game_manager.player_game_map[player.id]
          if game.id in game_manager.games:
            del game_manager.games[game.id]
      
    except Exception as e:
      logger.error(f"Error in timeout check loop: {e}")
    
    try:
      # Check every 3 seconds for faster detection
      await asyncio.sleep(3)
    except asyncio.CancelledError:
      logger.info("Timeout checking task cancelled")
      break
    except Exception as e:
      logger.error(f"Error in timeout check sleep: {e}")
      await asyncio.sleep(3)  # Fallback sleep


def register_socket_handlers(sio: socketio.AsyncServer, game_manager: GameManager):
  """Register all Socket.IO event handlers"""

  async def ensure_timeout_task_running():
    """Ensure the timeout checking task is running"""
    global _timeout_check_task
    if _timeout_check_task is None or _timeout_check_task.done():
      try:
        _timeout_check_task = asyncio.create_task(check_player_timeouts(sio, game_manager))
        logger.info("Started player timeout checking task")
      except Exception as e:
        logger.error(f"Failed to start timeout checking task: {e}")

  @sio.event
  async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    
    # Start timeout checking task when first client connects
    await ensure_timeout_task_running()
    
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
      
      # Check if player was in an active game
      game = game_manager.get_game_by_player(player.id)
      if game and game.state in (GameState.IN_PROGRESS, GameState.PAUSED):
        logger.info(f"Player {player.name} disconnected from active game {game.id}")
        
        # Find the remaining player
        remaining_player = None
        for p in game.players:
          if p.id != player.id and p.state != PlayerState.DISCONNECTED:
            remaining_player = p
            break
        
        if remaining_player and not remaining_player.is_cpu:
          _cancel_grace_task(player.id)
          current_round = game.rounds[game.current_round - 1] if game.current_round > 0 else None
          if game.state == GameState.IN_PROGRESS and current_round and current_round.is_complete:
            game.pending_pause = True
            game.pending_disconnected_player_id = player.id
            game.pending_remaining_player_id = remaining_player.id
            return

          _grace_tasks[player.id] = asyncio.create_task(
              _start_grace_period(sio, game_manager, game.id, player.id, remaining_player.id)
          )
          return
        else:
          _cancel_grace_task(player.id)
          _grace_tasks[player.id] = asyncio.create_task(
              _cleanup_after_grace(game_manager, game.id, player.id)
          )
          return
      else:
        # Normal disconnect handling for waiting players or finished games
        game_manager.remove_player(player.id)
        if game:
          await sio.emit('player_disconnected', {
              'player_id': player.id,
              'player_name': player.name
          }, room=f"game_{game.id}")

  @sio.event
  async def heartbeat(sid, data):
    """Handle heartbeat from client to detect active connections"""
    # Update last seen time for the player
    player_found = False
    
    # First check if player is in an active game
    for game in game_manager.games.values():
      for player in game.players:
        if player.socket_id == sid:
          player.last_seen = time.time()
          logger.debug(f"Heartbeat received from {player.name} in game {game.id}")
          player_found = True
          break
      if player_found:
        break
    
    # If not in game, check waiting players
    if not player_found:
      for waiting_player in game_manager.waiting_players:
        if waiting_player.socket_id == sid:
          waiting_player.last_seen = time.time()
          logger.debug(f"Heartbeat received from waiting player {waiting_player.name}")
          player_found = True
          break
    
    if not player_found:
      logger.debug(f"Heartbeat received from unknown socket {sid}")

  @sio.event
  async def player_leaving(sid, data):
    """Handle explicit player leaving notification"""
    logger.info(f"Player leaving notification from {sid}: {data}")
    # Trigger the same logic as disconnect
    await disconnect(sid)

  @sio.event
  async def join_game(sid, data):
    """Handle player joining game"""
    try:
      player_name = data.get('name', '').strip()
      user_id = data.get('user_id')
      room_code = data.get('room_code', '').strip().upper()  # Private room code
      
      if not player_name:
        await sio.emit('error', {'message': 'Name is required'}, room=sid)
        return

      # Check if this user is already in a game or waiting
      if user_id:
        # Remove any existing player with same user_id from waiting queue
        game_manager.waiting_players = [
            p for p in game_manager.waiting_players if getattr(p, 'user_id', None) != user_id]

        # Check if user is already in an active game
        for game in game_manager.games.values():
          if game.state == GameState.FINISHED:
            continue
          for game_player in game.players:
            if getattr(game_player, 'user_id', None) == user_id:
              await sio.emit('error', {'message': 'You are already in a game'}, room=sid)
              return

      # Fetch user's ELO rating if user_id is provided
      elo_rating = None
      is_guest = None
      if user_id:
        try:
          user = db.get_user_by_id(user_id)
          if user:
            elo_rating = user.elo_rating
            is_guest = user.is_guest
        except Exception as e:
          logger.warning(f"Failed to fetch ELO for user {user_id}: {e}")

      # Create new player
      player = Player(
          id=str(uuid.uuid4()),
          name=player_name,
          socket_id=sid,
          state=PlayerState.WAITING,
          elo_rating=elo_rating,
          is_guest=is_guest
      )
      
      # Initialize last_seen timestamp
      player.last_seen = time.time()

      # Add user_id and room_code to player object if provided
      if user_id:
        player.user_id = user_id
      if room_code:
        player.room_code = room_code

      # Handle private room joining
      if room_code:
        await handle_private_room_join(sio, game_manager, player, room_code)
        return

      # Regular matchmaking - add to waiting queue
      game_manager.add_waiting_player(player)

      await sio.emit('player_created', {
          'player_id': player.id,
          'name': player.name,
          'status': 'waiting_for_opponent',
          'user_id': player.user_id
      }, room=sid)

      # Try to find a match
      game = game_manager.find_match()
      if game:
        logger.info(f"Game created with ID: {game.id}")

        # Join both players to game room
        for game_player in game.players:
          await sio.enter_room(game_player.socket_id, f"game_{game.id}")
          # Reset last_seen to current time to prevent immediate timeout detection
          game_player.last_seen = time.time()
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
              'players': [{
                  'id': p.id,
                  'name': p.name,
                  'elo_rating': p.elo_rating,
                  'is_cpu': p.is_cpu,
                  'is_guest': p.is_guest,
                  'user_id': p.user_id
              } for p in game.players],
              'your_cards': [{'country_code': c.country.code, 'country_name': c.country.name}
                             for c in game_player.cards]
          }, room=game_player.socket_id)

        # Start first round
        await start_round(sio, game_manager, game.id, 1)

    except Exception as e:
      logger.error(f"Error in join_game: {e}")
      await sio.emit('error', {'message': 'Failed to join game'}, room=sid)

  @sio.event
  async def rejoin_game(sid, data):
    """Handle player rejoining an active game within grace period"""
    try:
      game_id = data.get('game_id')
      player_id = data.get('player_id')
      if not game_id or not player_id:
        await sio.emit('error', {'message': 'Game ID and player ID are required'}, room=sid)
        return

      game = game_manager.games.get(game_id)
      if not game:
        await sio.emit('error', {'message': 'Game not found'}, room=sid)
        return

      player = game.get_player_by_id(player_id)
      if not player:
        await sio.emit('error', {'message': 'Player not found in game'}, room=sid)
        return

      player.socket_id = sid
      player.state = PlayerState.IN_GAME
      player.last_seen = time.time()

      await sio.enter_room(sid, f"game_{game.id}")
      _cancel_grace_task(player.id)

      # If everyone is back, resume the game
      all_active = all(p.is_cpu or p.state != PlayerState.DISCONNECTED for p in game.players)
      if all_active and game.state == GameState.PAUSED:
        game.state = GameState.IN_PROGRESS
        game.pause_expires_at = None
        await sio.emit('opponent_reconnected', {
            'player_id': player.id,
            'player_name': player.name
        }, room=f"game_{game.id}")
        # If the round already completed during the interstitial, advance now.
        current_round = game.rounds[game.current_round - 1] if game.current_round > 0 else None
        if current_round and current_round.is_complete:
          if game.current_round >= len(game.rounds):
            await end_game(sio, game_manager, game.id)
          else:
            await start_round(sio, game_manager, game.id, game.current_round + 1)
      elif all_active and game.pending_pause:
        game.pending_pause = False
        game.pending_disconnected_player_id = None
        game.pending_remaining_player_id = None
        current_round = game.rounds[game.current_round - 1] if game.current_round > 0 else None
        if current_round and current_round.is_complete:
          if game.current_round >= len(game.rounds):
            await end_game(sio, game_manager, game.id)
          else:
            await start_round(sio, game_manager, game.id, game.current_round + 1)

      await sio.emit('game_state', _build_game_state_payload(game, player), room=sid)

    except Exception as e:
      logger.error(f"Error in rejoin_game: {e}")
      await sio.emit('error', {'message': 'Failed to rejoin game'}, room=sid)

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

      # Reset last_seen to current time to prevent immediate timeout detection
      player.last_seen = time.time()

      # Start the game
      game_manager.start_game(game.id)

      # Send game_found event to human player
      await sio.emit('game_found', {
          'game_id': game.id,
          'players': [{
              'id': p.id,
              'name': p.name,
              'is_cpu': p.is_cpu,
              'elo_rating': p.elo_rating,
              'is_guest': p.is_guest,
              'user_id': p.user_id
          } for p in game.players],
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

      # Update last seen timestamp for activity tracking
      player.last_seen = time.time()

      if game.state != GameState.IN_PROGRESS:
        logger.error(f"Game {game.id} not in progress, current state: {game.state}")
        if game.state == GameState.FINISHED:
          # Check if this was a forfeit by looking for disconnected players
          disconnected_players = [p for p in game.players if p.state == PlayerState.DISCONNECTED]
          if disconnected_players:
            await sio.emit('error', {'message': 'Game ended due to opponent disconnect'}, room=sid)
          else:
            await sio.emit('error', {'message': 'Game has already finished'}, room=sid)
        else:
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

      await sio.emit('game_state', _build_game_state_payload(game, player), room=sid)

    except Exception as e:
      logger.error(f"Error in get_game_state: {e}")
      await sio.emit('error', {'message': 'Failed to get game state'}, room=sid)


async def start_round(sio: socketio.AsyncServer, game_manager: GameManager, game_id: str, round_number: int):
  """Start a new round"""
  game = game_manager.games.get(game_id)
  if not game or game.state != GameState.IN_PROGRESS:
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
          'players': [{
              'id': p.id,
              'name': p.name,
              'score': p.score,
              'cards_remaining': len([c for c in p.cards if not c.is_played]),
              'elo_rating': p.elo_rating,
              'is_cpu': p.is_cpu,
              'is_guest': p.is_guest,
              'user_id': p.user_id
          } for p in game.players],
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
  if not game or game.state != GameState.IN_PROGRESS:
    return

  current_round = game.rounds[game.current_round - 1]

  # Calculate export values for each played card
  for player_id, card in current_round.player_cards.items():
    export_value = await game_manager.get_export_value(card.country.code, current_round.product.id)
    current_round.export_data[card.country.code] = export_value
    player = game.get_player_by_id(player_id)
    player_type = "CPU" if player.is_cpu else "Human"
    logger.info(
        f"{player_type} ({player.name}) played {card.country.code} with {export_value:.2f}B exports for {current_round.product.name}")

  # Determine winner(s) - handle ties when export values are equal
  player_export_values = {}
  for player_id, card in current_round.player_cards.items():
    player_export_values[player_id] = current_round.export_data.get(card.country.code, 0)

  if not player_export_values:
    return

  max_export_value = max(player_export_values.values())
  winner_player_ids = [player_id for player_id, value in player_export_values.items()
                       if value == max_export_value]

  winner_country = ""
  if len(winner_player_ids) == 1:
    winner_country = current_round.player_cards[winner_player_ids[0]].country.code

  logger.info(f"Winning export value: {max_export_value:.2f}B exports")

  for player_id in winner_player_ids:
    player = game.get_player_by_id(player_id)
    player_type = "CPU" if player.is_cpu else "Human"
    player_country = current_round.player_cards[player_id].country.code
    logger.info(f"{player_type} ({player.name}) wins this round with {player_country}")

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
          'elo_rating': p.elo_rating,
          'is_cpu': p.is_cpu,
          'is_guest': p.is_guest,
          'user_id': p.user_id,
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
    await asyncio.sleep(5)
    if game.pending_pause:
      disconnected_id = game.pending_disconnected_player_id
      remaining_id = game.pending_remaining_player_id
      if disconnected_id and remaining_id:
        await _start_grace_period(sio, game_manager, game_id, disconnected_id, remaining_id)
      return
    if game.state == GameState.IN_PROGRESS:
      await end_game(sio, game_manager, game_id)
  else:
    # Start next round after showing results for 5 seconds
    import asyncio
    await asyncio.sleep(5)
    if game.pending_pause:
      disconnected_id = game.pending_disconnected_player_id
      remaining_id = game.pending_remaining_player_id
      if disconnected_id and remaining_id:
        await _start_grace_period(sio, game_manager, game_id, disconnected_id, remaining_id)
      return
    if game.state == GameState.IN_PROGRESS:
      await start_round(sio, game_manager, game_id, game.current_round + 1)


async def handle_game_forfeit(sio: socketio.AsyncServer, game_manager: GameManager, game_id: str, forfeiting_player_id: str, winning_player_id: str):
  """Handle game forfeit when a player disconnects"""
  
  game = game_manager.games.get(game_id)
  if not game:
    return

  _cancel_grace_task(forfeiting_player_id)
  game.pause_expires_at = None
  game.state = GameState.FINISHED
  game.winner_id = winning_player_id

  # Remove players from active game map immediately so they can re-queue.
  for player in game.players:
    if player.id in game_manager.player_game_map:
      del game_manager.player_game_map[player.id]
  
  logger.info(f"Handling forfeit in game {game_id}: {forfeiting_player_id} forfeited, {winning_player_id} wins")
  
  # Get player objects
  winning_player = None
  forfeiting_player = None
  
  for player in game.players:
    if player.id == winning_player_id:
      winning_player = player
    elif player.id == forfeiting_player_id:
      forfeiting_player = player
  
  if not winning_player or not forfeiting_player:
    logger.error(f"Could not find players for forfeit in game {game_id}")
    return
  
  # Check if players have database user IDs
  winning_user_id = getattr(winning_player, 'user_id', None)
  forfeiting_user_id = getattr(forfeiting_player, 'user_id', None)
  
  if not winning_user_id or not forfeiting_user_id:
    logger.warning(f"Forfeit involves guest players - skipping ELO recording. Winner user_id: {winning_user_id}, Loser user_id: {forfeiting_user_id}")
    # Still send the forfeit notification but don't record ELO
    # Continue to game state update and cleanup without ELO recording
  else:
    logger.info(f"Forfeit with database users - Winner: {winning_user_id}, Loser: {forfeiting_user_id}")
  
  # Calculate scores for forfeit: winner gets 9 (max possible), loser gets 0
  forfeit_winner_score = 9
  forfeit_loser_score = 0
  
  # Update player scores
  winning_player.score = forfeit_winner_score
  forfeiting_player.score = forfeit_loser_score
  
  # Notify players about forfeit BEFORE changing game state
  forfeit_event_data = {
      'reason': 'opponent_disconnected',
      'winner_id': winning_player_id,
      'winner_name': winning_player.name,
      'forfeiting_player_name': forfeiting_player.name,
      'final_scores': [{
          'id': winning_player.id,
          'name': winning_player.name,
          'score': forfeit_winner_score,
          'elo_rating': winning_player.elo_rating,
          'is_cpu': winning_player.is_cpu,
          'is_guest': winning_player.is_guest,
          'user_id': winning_user_id
      }, {
          'id': forfeiting_player.id,
          'name': forfeiting_player.name,
          'score': forfeit_loser_score,
          'elo_rating': forfeiting_player.elo_rating,
          'is_cpu': forfeiting_player.is_cpu,
          'is_guest': forfeiting_player.is_guest,
          'user_id': forfeiting_user_id
      }]
  }
  
  # Send to game room
  await sio.emit('game_forfeited', forfeit_event_data, room=f"game_{game_id}")
  
  # Also send directly to remaining player as fallback
  if winning_player.socket_id:
    logger.info(f"Sending forfeit notification directly to winner {winning_player.name} (socket: {winning_player.socket_id})")
    try:
      # Check if socket is still connected
      connected_sockets = await sio.get_session(winning_player.socket_id)
      logger.info(f"Winner socket {winning_player.socket_id} session exists: {connected_sockets is not None}")
    except Exception as e:
      logger.warning(f"Winner socket {winning_player.socket_id} not found: {e}")
    
    await sio.emit('game_forfeited', forfeit_event_data, room=winning_player.socket_id)
    
    # Send a test event to make sure the socket is receiving events
    await sio.emit('forfeit_test', {'message': 'If you see this, socket events are working'}, room=winning_player.socket_id)
  
  # Give a small delay to ensure notification is received before changing game state
  import asyncio
  await asyncio.sleep(0.1)

  # Remove players from active game map immediately so they can re-queue.
  for player in game.players:
    if player.id in game_manager.player_game_map:
      del game_manager.player_game_map[player.id]
  
  # Record game result with forfeit via internal API call (only for database users)
  if winning_user_id and forfeiting_user_id:
    try:
      logger.info(f"Recording forfeit result: winner={winning_user_id}, loser={forfeiting_user_id}, scores={forfeit_winner_score}-{forfeit_loser_score}")
      
      # Import here to avoid circular imports
      from main import record_game_result
      from main import GameResultRequest
      
      # Create request object for internal API call using database user IDs
      forfeit_request = GameResultRequest(
          player1_id=winning_user_id,
          player2_id=forfeiting_user_id,
          player1_score=forfeit_winner_score,
          player2_score=forfeit_loser_score,
          game_duration=None
      )
      
      logger.debug(f"Calling record_game_result with request: {forfeit_request}")
      
      # Call the API function directly instead of making HTTP request
      result = await record_game_result(forfeit_request)
      logger.info(f"Successfully recorded forfeit result for game {game_id}: {result}")
        
    except Exception as e:
      logger.error(f"Error recording forfeit result for game {game_id}: {e}")
      import traceback
      logger.error(f"Traceback: {traceback.format_exc()}")
  else:
    logger.info(f"Skipping ELO recording for forfeit in game {game_id} - guest players involved")
  
  # Clean up game after a delay
  import asyncio
  await asyncio.sleep(10)
  if game_id in game_manager.games:
    # Remove game
    del game_manager.games[game_id]
    logger.info(f"Cleaned up forfeited game {game_id}")


async def end_game(sio: socketio.AsyncServer, game_manager: GameManager, game_id: str):
  """End the game and determine overall winner"""
  game = game_manager.games.get(game_id)
  if not game:
    return

  game.pause_expires_at = None
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
          'score': p.score,
          'elo_rating': p.elo_rating,
          'is_cpu': p.is_cpu,
          'is_guest': p.is_guest,
          'user_id': p.user_id
      } for p in game.players]
  }, room=f"game_{game_id}")

  # Remove players from active game map immediately so they can re-queue.
  for player in game.players:
    if player.id in game_manager.player_game_map:
      del game_manager.player_game_map[player.id]

  # Clean up game after a delay
  import asyncio
  await asyncio.sleep(10)
  if game_id in game_manager.games:
    # Remove game
    del game_manager.games[game_id]
    logger.info(f"Cleaned up completed game {game_id}")


async def handle_private_room_join(sio: socketio.AsyncServer, game_manager: GameManager, player: Player, room_code: str):
  """Handle player joining a private room"""
  try:
    # Verify the private room exists and is active
    room = db.get_private_room_by_code(room_code)
    if not room:
      await sio.emit('error', {'message': 'Room not found or expired'}, room=player.socket_id)
      return

    # Check if room is full
    if room.current_players >= room.max_players:
      await sio.emit('error', {'message': 'Room is full'}, room=player.socket_id)
      return

    # Check if there's already someone waiting in this room
    waiting_in_room = [p for p in game_manager.waiting_players if getattr(p, 'room_code', None) == room_code]
    
    if waiting_in_room:
      # Match with the waiting player
      other_player = waiting_in_room[0]
      game_manager.waiting_players.remove(other_player)
      
      # Create new game
      game = game_manager.create_game()
      
      # Add both players to game
      game.add_player(other_player)
      game.add_player(player)
      game_manager.player_game_map[other_player.id] = game.id
      game_manager.player_game_map[player.id] = game.id
      
      # Deal cards to players
      game_manager._deal_cards(game)
      
      # Update room player count
      db.update_room_player_count(room_code, 2)
      
      # Join both players to game room
      await sio.enter_room(other_player.socket_id, f"game_{game.id}")
      await sio.enter_room(player.socket_id, f"game_{game.id}")
      
      # Reset last_seen to current time to prevent immediate timeout detection
      other_player.last_seen = time.time()
      player.last_seen = time.time()
      
      logger.info(f"Private room game created with ID: {game.id} for room {room_code}")
      
      # Start the game
      game_manager.start_game(game.id)
      
      # Send personalized game_found event to each player
      for game_player in game.players:
        await sio.emit('game_found', {
            'game_id': game.id,
            'players': [{
                'id': p.id,
                'name': p.name,
                'elo_rating': p.elo_rating,
                'is_cpu': p.is_cpu,
                'is_guest': p.is_guest,
                'user_id': p.user_id
            } for p in game.players],
            'your_cards': [{'country_code': c.country.code, 'country_name': c.country.name}
                           for c in game_player.cards],
            'room_code': room_code
        }, room=game_player.socket_id)
      
      # Start first round
      await start_round(sio, game_manager, game.id, 1)
      
      # Deactivate the room since it's now in use
      db.deactivate_private_room(room_code)
      
    else:
      # First player in the room - add to waiting queue
      game_manager.add_waiting_player(player)
      
      # Update room player count
      db.update_room_player_count(room_code, 1)
      
      await sio.emit('player_created', {
          'player_id': player.id,
          'name': player.name,
          'status': 'waiting_for_friend',
          'room_code': room_code,
          'is_guest': player.is_guest,
          'user_id': player.user_id,
          'message': f'Waiting for your friend to join room {room_code}'
      }, room=player.socket_id)
      
      logger.info(f"Player {player.name} waiting in private room {room_code}")
      
  except Exception as e:
    logger.error(f"Error in private room join: {e}")
    await sio.emit('error', {'message': 'Failed to join private room'}, room=player.socket_id)
