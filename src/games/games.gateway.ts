import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { GamesService } from './games.service';
import { Server, Socket } from 'socket.io';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Permission } from 'src/permission/permission.class';
import { UseGuards } from '@nestjs/common';
import { PermissionsGuard } from 'src/permission/permissions.guard';
import { GameStatusCode } from './game-status-code';
import { GameChannel } from './game-channel';
import { SessionService } from 'src/session/session.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { Session } from 'src/session/entities/session.entity';
import { ObjectUtil } from 'src/util/misc/object-util';
import { GameSettingsSerializer } from 'src/util/serialization/game-settings.serializer';
import { GameSerializer } from 'src/util/serialization/game.serializer';
import { SocketResponseBuilder } from 'src/util/net/socket-response-builder.class';
import { Game } from './game.entity';
import SocketResponse from 'src/types/socket-response.class';
import GameIdPayload from 'src/shared-types/game/game-id.payload';
import { GameSettings } from './game-settings';
import JudgeIdPayload from 'src/shared-types/game/component/judge-id.payload';
import RoundNumberPayload from 'src/shared-types/game/component/round-number.payload';
import SecondsPayload from 'src/shared-types/game/component/seconds.payload';
import StateTransitionPayload from 'src/shared-types/game/component/state-transition.payload';
import ConnectionStatusPayload from 'src/shared-types/misc/connection-status.payload';
import GameSettingsPayload from 'src/shared-types/game/game-settings.payload';
import PartialPlayerPayload from 'src/shared-types/game/player/partial-player.payload';
import DecksPayload from 'src/shared-types/deck/decks.payload';
import IGame from 'src/shared-types/game/game.interface';
import { IChatMessage } from 'src/shared-types/game/component/message/chat-message.interface';
import WhiteCardPayload from 'src/shared-types/card/white/white-card.payload';
import BlackCardPayload from 'src/shared-types/card/black/black-card.payload';
import WhiteCardsPayload from 'src/shared-types/card/white/white-cards.payload';
import CardIdsPayload from 'src/shared-types/card/id/card-ids.payload';
import PlayerPayload from 'src/shared-types/game/player/player.payload';
import SpectatorPayload from 'src/shared-types/game/spectator/spectator.payload';
import SpectatorIdPayload from 'src/shared-types/game/spectator/spectator-id.payload';
import PlayerIdPayload from 'src/shared-types/game/player/player-id.payload';
import SystemMessagePayload from 'src/shared-types/game/component/message/system-message.payload';
import ISystemMessage from 'src/shared-types/game/component/message/system-message.interface';

@WebSocketGateway({
  cors: {
    origin: 'http://localho.st:3000',
    credentials: true
  }
})
@UseGuards(PermissionsGuard)
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly service: GamesService,
    private readonly sessionService: SessionService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService
  ) {
    service.on('playerJoinedGame', this.handlePlayerJoinedGame.bind(this));
    service.on('playerLeftGame', this.handlePlayerLeftGame.bind(this));
    service.on('gameRemoved', this.handleGameRemoved.bind(this));
    service.on('spectatorJoinedGame', this.handleSpectatorJoinedGame.bind(this));
    service.on('spectatorLeftGame', this.handleSpectatorLeftGame.bind(this));
    service.on('systemMessage', this.handleSystemMessage.bind(this));
    service.on('beginNextRound', this.handleBeginNextRound.bind(this));
    service.on('dealCardToPlayer', this.handleDealCardToPlayer.bind(this));
    service.on('dealBlackCard', this.handleDealBlackCard.bind(this));
    service.on('roundWinner', this.handleRoundWinner.bind(this));
    service.on('stateTransition', this.handleStateTransition.bind(this));
    service.on('illegalStateTransition', this.handleIllegalStateTransition.bind(this));
  }

  /**
   * =========================================================
   * Message handlers
   * =========================================================
   */

  /**
   * Lists all games and their details.
   * @returns the list of currently hosted games
   */
  @SubscribeMessage("listGames")
  listGames(): SocketResponse<IGame[]> {
    return SocketResponseBuilder.start<IGame[]>()
      .data(this.service.getGames().map(g => GameSerializer.serialize(g)))
      .build();
  }

  /**
   * Creates a new game hosted by the caller.
   * The caller leaves the {@link GAME_BROWSER} room
   * and joins the {@link GAME_ROOM} and private 
   * {@link GAME_USER_ROOM}.
   * 
   * @param client the client
   * @emits gameAdded if the game has been created
   * @returns null if the game was not created
   *          the serialized game if it was created
   */
  @SubscribeMessage("createGame")
  @HasPermissions(Permission.CreateGame)
  createGame(client: Socket): SocketResponse<IGame> {
    const { user } = client.session;

    const game = this.service.createGame(user);
    if (!game) {
      return SocketResponseBuilder.error("You're already hosting a game");
    }

    client.leave(GameChannel.GAME_BROWSER);

    client.join([
      GameChannel.GAME_ROOM(game.getId()),
      GameChannel.GAME_USER_ROOM(game.getId(), user.id)
    ]);

    const out = SocketResponseBuilder.start<IGame>()
      .data(GameSerializer.serialize(game))
      .channel('gameAdded')
      .build();

    out.emitToRoom(this.server, GameChannel.GAME_BROWSER);

    return out;
  }

  /**
   * Allows the host to start the game they
   * are hosting. If the player is not hosting 
   * a game, or the game is not currently in the 
   * lobby state, or there are not enough players,
   * or there are not enough black cards, or there
   * are not enough white cards, nothing happens
   * and the user receives an error message.
   * 
   * @param client the client
   * @returns empty object (always)
   */
  @SubscribeMessage("startGame")
  @HasPermissions(Permission.StartGame)
  async startGame(client: Socket): Promise<SocketResponse<null>> {
    const game = this.service.getGameHostedBy(client.session.user);

    if (!game) {
      return SocketResponseBuilder.error("You're not hosting a game.");
    }

    const status = await this.service.startGame(game.getId());

    const out = SocketResponseBuilder.start<null>()
      .useGameStatusCode(status)
      .channel('gameStarted')
      .build();

    if (status === GameStatusCode.ACTION_OK) {
      out.emitToRoom(this.server, GameChannel.GAME_ROOM(game.getId()));
    }

    return out;
  }

  /**
   * Allows the host to stop the game they are
   * hosting. If the player is not hosting 
   * a game, or the game is currently in the
   * lobby state, nothing happens.
   * @param client 
   */
  @SubscribeMessage("stopGame")
  @HasPermissions(Permission.StopGame)
  stopGame(client: Socket): SocketResponse<null> {
    const game = this.service.getGameHostedBy(client.session.user);
    if (!game) {
      return SocketResponseBuilder.error("You're not hosting a game.");
    }

    return SocketResponseBuilder.start<null>().useGameStatusCode(game.stop()).build();
  }

  /**
   * Allows the host to add card decks to the
   * game while it is in lobby state. If the
   * player is not hosting a game, or the game
   * is not currently in the lobby state, or
   * the deck does not exist, nothing happens
   * and the user receives an error message.
   * 
   * @param client the client
   */
  @SubscribeMessage("addDeckToGame")
  @HasPermissions(Permission.ChangeGameSettings)
  async addDeckToGame(@ConnectedSocket() client: Socket, @MessageBody('deckId') deckId: string): Promise<SocketResponse<GameIdPayload & DecksPayload>> {
    const game = this.service.getGameHostedBy(client.session.user);

    if (!game) {
      return SocketResponseBuilder.error("You're not hosting a game");
    }

    if (!game.canChangeSettings()) {
      return SocketResponseBuilder.error("The game is already in progress.");
    }

    const status = await this.service.addDeckToGame(game.getId(), deckId);

    const out = SocketResponseBuilder.start<GameIdPayload & DecksPayload>()
      .useGameStatusCode(status)
      .data(status === GameStatusCode.ACTION_OK ?
        { gameId: game.getId(), decks: game.getDecks() } : null
      )
      .channel('decksUpdated')
      .build()

    if (status === GameStatusCode.ACTION_OK) {
      out.emitToRooms(this.server, [
        GameChannel.GAME_BROWSER,
        GameChannel.GAME_ROOM(game.getId())
      ]);
    }

    return out;
  }

  /**
   * Allows the host to remove card decks from the
   * game while it is in lobby state. If the
   * player is not hosting a game, or the game
   * is not currently in the lobby state, or
   * the deck does not exist, nothing happens
   * and the user receives an error message.
   * 
   * @param client the client
   */
  @SubscribeMessage("removeDeckFromGame")
  @HasPermissions(Permission.ChangeGameSettings)
  async removeDeckFromGame(@ConnectedSocket() client: Socket, @MessageBody('deckId') deckId: string): Promise<SocketResponse<GameIdPayload & DecksPayload>> {
    const game = this.service.getGameHostedBy(client.session.user);
    if (!game) {
      return SocketResponseBuilder.error("You're not hosting a game.");
    }

    if (!game.canChangeSettings()) {
      return SocketResponseBuilder.error("The game is already in progress.");
    }

    const status = await this.service.removeDeckFromGame(game.getId(), deckId);

    const out = SocketResponseBuilder.start<GameIdPayload & DecksPayload>()
      .useGameStatusCode(status)
      .data(status === GameStatusCode.ACTION_OK ? { gameId: game.getId(), decks: game.getDecks() } : null)
      .channel('decksUpdated')
      .build()

    if (status === GameStatusCode.ACTION_OK) {
      out.emitToRooms(this.server, [
        GameChannel.GAME_BROWSER,
        GameChannel.GAME_ROOM(game.getId())
      ])
    }

    return out;
  }

  /**
   * Allows the host to change game settings
   * while the game is in lobby state. If the
   * player is not hosting a game, or the game
   * is not currently in the lobby state, 
   * nothing happens and the user receives an
   * error message.
   * 
   * @param client the client
   */
  @SubscribeMessage("changeGameSettings")
  @HasPermissions(Permission.ChangeGameSettings)
  async changeGameSettings(@ConnectedSocket() client: Socket, @MessageBody('settings') settings: Partial<GameSettings>): Promise<SocketResponse<null>> {
    const game = this.service.getGameHostedBy(client.session.user);
    if (!game) {
      return SocketResponseBuilder.error("You're not hosting a game.");
    }

    if (!game.canChangeSettings()) {
      return SocketResponseBuilder.error("The game is already in progress.");
    }

    if (ObjectUtil.notUndefOrNull(settings.maxPlayers)) {
      if (game.getPlayerCount() > settings.maxPlayers) {
        return SocketResponseBuilder.error("You can't set max players lower than the current player count.");
      } else if (settings.maxPlayers < Game.MINIMUM_PLAYERS) {
        return SocketResponseBuilder.error(`You can't set max players lower than ${Game.MINIMUM_PLAYERS}.`);
      } else {
        game.setMaxPlayers(Math.floor(settings.maxPlayers));
      }
    }

    if (ObjectUtil.notUndefOrNull(settings.maxSpectators)) {
      if (game.getSpectatorCount() > settings.maxSpectators) {
        return SocketResponseBuilder.error("You can't set max spectators lower than the current spectator count.");
      } else if (settings.maxPlayers < 0) {
        return SocketResponseBuilder.error("You can't set max spectators lower than 0.");
      } else {
        game.setMaxSpectators(Math.floor(settings.maxSpectators));
      }
    }

    if (ObjectUtil.notUndefOrNull(settings.maxScore)) {
      if (settings.maxScore < 1) {
        return SocketResponseBuilder.error("You can't set the max score lower than 1.");
      } else {
        game.setMaxScore(Math.floor(settings.maxScore));
      }
    }

    if (ObjectUtil.notUndefOrNull(settings.roundIntermissionSeconds)) {
      if (settings.roundIntermissionSeconds < 0) {
        settings.roundIntermissionSeconds = 0;
      }

      game.setRoundIntermissionSeconds(settings.roundIntermissionSeconds);
    }

    if (ObjectUtil.notUndefOrNull(settings.gameWinIntermissionSeconds)) {
      if (settings.gameWinIntermissionSeconds < 0) {
        settings.gameWinIntermissionSeconds = 0;
      }

      game.setGameWinIntermissionSeconds(settings.gameWinIntermissionSeconds);
    }

    if (ObjectUtil.notUndefOrNull(settings.allowPlayersToJoinMidGame)) {
      game.setAllowPlayersToJoinMidGame(settings.allowPlayersToJoinMidGame);
    }

    SocketResponseBuilder.start<GameIdPayload & GameSettingsPayload>()
      .data({ gameId: game.getId(), settings: GameSettingsSerializer.serialize(game.getSettings()) })
      .channel('settingsUpdated')
      .build()
      .emitToRooms(this.server, [
        GameChannel.GAME_BROWSER,
        GameChannel.GAME_ROOM(game.getId())
      ]);

    return SocketResponseBuilder.start<null>().build();
  }

  /**
   * Causes a player to join a game as a player.
   * If the game does not exist or if they are 
   * already in or spectating a game, nothing happens 
   * and they will receive an error message.
   * 
   * The caller leaves the {@link GAME_BROWSER} room
   * and joins the {@link GAME_ROOM} and private 
   * {@link GAME_USER_ROOM}.
   * 
   * @param client the client
   * @param gameId the game id to join
   */
  @SubscribeMessage("joinGame")
  @HasPermissions(Permission.JoinGame)
  joinGame(@ConnectedSocket() client: Socket, @MessageBody('gameId') gameId: string): SocketResponse<IGame> {
    const game = this.service.getGame(gameId);
    if (!game) {
      return SocketResponseBuilder.error(`Unknown game: ${gameId}`)
    }

    const { user } = client.session;

    const status = this.service.addPlayerToGame(game.getId(), user);

    if (status === GameStatusCode.ACTION_OK) {
      client.leave(GameChannel.GAME_BROWSER);

      client.join([
        GameChannel.GAME_ROOM(game.getId()),
        GameChannel.GAME_USER_ROOM(game.getId(), user.id)
      ]);
    }

    return SocketResponseBuilder.start<IGame>()
      .useGameStatusCode(status)
      .data(status === GameStatusCode.ACTION_OK ? GameSerializer.serialize(game) : null)
      .build();
  }

  /**
   * Causes a player to join a game as a spectator.
   * If the game does not exist or if they are 
   * already spectating or in a game, nothing happens 
   * and they will receive an error message.
   * 
   * The caller leaves the {@link GAME_BROWSER} room
   * and joins the {@link GAME_ROOM} and private 
   * {@link GAME_USER_ROOM}.
   * 
   * @param client the client
   * @param gameId the game id to spectate
   */
  @SubscribeMessage("spectateGame")
  @HasPermissions(Permission.JoinGame)
  spectateGame(@ConnectedSocket() client: Socket, @MessageBody('gameId') gameId: string): SocketResponse<IGame> {
    const game = this.service.getGame(gameId);
    if (!game) {
      return SocketResponseBuilder.error(`Unknown game: ${gameId}`)
    }

    const { user } = client.session;

    const status = this.service.addSpectatorToGame(game.getId(), user);

    if (status === GameStatusCode.ACTION_OK) {
      client.leave(GameChannel.GAME_BROWSER);

      client.join([
        GameChannel.GAME_ROOM(game.getId()),
        GameChannel.GAME_USER_ROOM(game.getId(), user.id)
      ]);
    }

    return SocketResponseBuilder.start<IGame>()
      .useGameStatusCode(status)
      .data(status === GameStatusCode.ACTION_OK ? GameSerializer.serialize(game) : null)
      .build();
  }

  /**
   * Causes a client to leave the game they are
   * a member of. If they are not a member of a
   * game, nothing happens and they will receive
   * an error message.
   * 
   * The caller leaves the {@link GAME_ROOM} 
   * and private {@link GAME_USER_ROOM} and joins 
   * the {@link GAME_BROWSER} room.
   * 
   * @param client the client
   */
  @SubscribeMessage("leaveGame")
  @HasPermissions(Permission.JoinGame)
  leaveGame(client: Socket): SocketResponse<null> {
    const { user } = client.session;

    const game = this.service.getGameWithPlayer(user);
    if (!game) {
      return SocketResponseBuilder.error("You are not playing any game.");
    }

    const status = this.service.removePlayerFromGame(game.getId(), user.id);

    const out = SocketResponseBuilder.start<null>()
      .useGameStatusCode(status)
      .build();

    if (status === GameStatusCode.ACTION_OK) {
      client.leave(GameChannel.GAME_ROOM(game.getId()));
      client.leave(GameChannel.GAME_USER_ROOM(game.getId(), user.id));
      client.join(GameChannel.GAME_BROWSER);
    }

    return out;
  }

  /**
   * Causes a client to leave the game they are
   * a spectating. If they are not spectating a
   * game, nothing happens and they will receive
   * an error message.
   * 
   * The caller leaves the {@link GAME_ROOM} 
   * and private {@link GAME_USER_ROOM} and joins 
   * the {@link GAME_BROWSER} room.
   * 
   * @param client the client
   */
  @SubscribeMessage("unspectateGame")
  @HasPermissions(Permission.JoinGame)
  unspectateGame(client: Socket): SocketResponse<null> {
    const { user } = client.session;

    const game = this.service.getGameWithSpectator(user);
    if (!game) {
      return SocketResponseBuilder.error("You are not spectating any game.");
    }

    const status = this.service.removeSpectatorFromGame(game.getId(), user.id);

    const out = SocketResponseBuilder.start<null>()
      .useGameStatusCode(status)
      .channel('gameUnspectated')
      .build();

    if (status === GameStatusCode.ACTION_OK) {
      client.leave(GameChannel.GAME_ROOM(game.getId()));
      client.leave(GameChannel.GAME_USER_ROOM(game.getId(), user.id));
      client.join(GameChannel.GAME_BROWSER);
    }

    return out;
  }

  /**
   * Broadcasts a chat message to the game the player is
   * currently playing in or spectating. If they are not
   * playing or spectating a game, nothing happens and they
   * get an error message.
   * 
   * @param client the client
   * @param message the message to send
   */
  @SubscribeMessage("sendGameChat")
  @HasPermissions(Permission.SendChat)
  sendGameChat(@ConnectedSocket() client: Socket, @MessageBody("message") message: string): SocketResponse<null> {
    const { user } = client.session;

    const game = this.service.getGameWithPlayerOrSpectator(user);
    if (!game) {
      return SocketResponseBuilder.error("You are not playing or spectating any game.");
    }

    SocketResponseBuilder.start<IChatMessage>()
      .channel("chat")
      .data({
        content: message,
        context: {
          player: {
            id: user.id,
            nickname: user.nickname
          },
          timestamp: new Date().getTime()
        }
      })
      .build()
      .emitToRoom(this.server, GameChannel.GAME_ROOM(game.getId()));

    return SocketResponseBuilder.start<null>().build();
  }

  /**
   * Applies a user's chosen cards to play to the game the
   * user is currently playing or specating. If they are not
   * playing or spectating a game, nothing happens and they
   * get an error message.
   * 
   * @param client the client
   * @param gameId the game id in which the
   *               card application is happening
   * @param cardIds the card ids to put into play
   */
  @SubscribeMessage("playCards")
  @HasPermissions(Permission.JoinGame)
  playCards(@ConnectedSocket() client: Socket, @MessageBody("cardIds") cardIds: string[]): SocketResponse<null> {
    const { user } = client.session;

    const game = this.service.getGameWithPlayer(user);
    if (!game) {
      return SocketResponseBuilder.error("You are not playing any game.");
    }

    const status = game.playCards(game.getPlayer(user.id), cardIds);

    if (status === GameStatusCode.ACTION_OK) {
      SocketResponseBuilder.start<CardIdsPayload & PartialPlayerPayload>()
        .useGameStatusCode(status)
        .data(status === GameStatusCode.ACTION_OK ? { cardIds, player: { id: user.id } } : null)
        .channel("cardsPlayed")
        .build()
        .emitToRoom(this.server, GameChannel.GAME_ROOM(game.getId()));
    }

    return SocketResponseBuilder.start<null>().build();
  }

  /**
   * Applies a judgement on who wins a round.
   * User must be playing in the given game,
   * must be the current judge, and the game
   * must be in the judging state.
   * 
   * @param client the client
   * @param gameId the game id receiving the judgement
   * @param winningUser the user who wins the round
   */
  @SubscribeMessage("judgeCards")
  @HasPermissions(Permission.JoinGame)
  judgeCards(@ConnectedSocket() client: Socket, @MessageBody("cardIds") cards: string[]): SocketResponse<null> {
    const { user } = client.session;

    const game = this.service.getGameWithPlayer(user);
    if (!game) {
      return SocketResponseBuilder.error("You are not playing any game.");
    }

    const status = game.judgeCards(game.getPlayer(user.id), cards);

    return SocketResponseBuilder.start<null>()
      .useGameStatusCode(status)
      .build();
  }

  /**
   * =========================================================
   * Event handlers
   * =========================================================
   */

  /**
   * Handles a player joining a game.
   * 
   * @param payload the game and player information
   */
  private handlePlayerJoinedGame(payload: GameIdPayload & PlayerPayload): void {
    SocketResponseBuilder.start<GameIdPayload & PlayerPayload>()
      .data(payload)
      .channel("playerJoined")
      .build()
      .emitToRooms(this.server, [
        GameChannel.GAME_BROWSER,
        GameChannel.GAME_ROOM(payload.gameId)
      ]);
  }

  /**
   * Handles a player leaving a game.
   * 
   * @param payload the game and player information
   */
  private handlePlayerLeftGame(payload: GameIdPayload & PlayerIdPayload): void {
    SocketResponseBuilder.start<GameIdPayload & PlayerIdPayload>()
      .data(payload)
      .channel("playerLeft")
      .build()
      .emitToRooms(this.server, [
        GameChannel.GAME_BROWSER,
        GameChannel.GAME_ROOM(payload.gameId)
      ]);
  }

  /**
   * Handles when a game is removed by the game service
   * 
   * @param payload the game removal information
   */
  private handleGameRemoved(payload: GameIdPayload) {
    SocketResponseBuilder.start<GameIdPayload>()
      .data(payload)
      .channel("gameRemoved")
      .build()
      .emitToRoom(this.server, GameChannel.GAME_BROWSER);
  }

  /**
   * Handles a spectator joining a game.
   * 
   * @param payload the game and spectator information
   */
  private handleSpectatorJoinedGame(payload: GameIdPayload & SpectatorPayload) {
    SocketResponseBuilder.start<GameIdPayload & SpectatorPayload>()
      .data(payload)
      .channel("spectatorJoined")
      .build()
      .emitToRooms(this.server, [
        GameChannel.GAME_BROWSER,
        GameChannel.GAME_ROOM(payload.gameId)
      ]);
  }

  /**
   * Handles a spectator leaving a game.
   * 
   * @param payload the game and player information
   */
  private handleSpectatorLeftGame(payload: GameIdPayload & SpectatorIdPayload) {
    SocketResponseBuilder.start<GameIdPayload & SpectatorIdPayload>()
      .data(payload)
      .channel("spectatorLeft")
      .build()
      .emitToRooms(this.server, [
        GameChannel.GAME_BROWSER,
        GameChannel.GAME_ROOM(payload.gameId)
      ]);
  }

  /**
   * Handles a system message broadcast
   * 
   * @param payload the system message information
   */
  private handleSystemMessage(payload: GameIdPayload & SystemMessagePayload) {
    SocketResponseBuilder.start<ISystemMessage>()
      .data(payload.message)
      .channel("systemMessage")
      .build()
      .emitToRoom(this.server, GameChannel.GAME_ROOM(payload.gameId));
  }

  /**
   * Handles when a new round begins.
   * 
   * @param payload the new round information
   */
  private handleBeginNextRound(payload: GameIdPayload & JudgeIdPayload & RoundNumberPayload) {
    SocketResponseBuilder.start<GameIdPayload & JudgeIdPayload & RoundNumberPayload>()
      .data(payload)
      .channel('beginNextRound')
      .build()
      .emitToRooms(this.server, [
        GameChannel.GAME_BROWSER,
        GameChannel.GAME_ROOM(payload.gameId)
      ]);
  }

  /**
   * Deals a white card to a player.
   * 
   * @param payload the white card payload
   */
  private handleDealCardToPlayer(payload: WhiteCardPayload & GameIdPayload & PartialPlayerPayload) {
    SocketResponseBuilder.start<WhiteCardPayload>()
      .data(payload)
      .channel("dealCard")
      .build()
      .emitToRoom(this.server, GameChannel.GAME_USER_ROOM(payload.gameId, payload.player.id));
  }

  /**
   * Deals a black card to a game.
   * 
   * @param payload the black card payload
   */
  private handleDealBlackCard(payload: BlackCardPayload & GameIdPayload) {
    SocketResponseBuilder.start<BlackCardPayload>()
      .data(payload)
      .channel("dealBlackCard")
      .build()
      .emitToRoom(this.server, GameChannel.GAME_ROOM(payload.gameId));
  }

  /**
   * Handles when there is a round winner.
   * 
   * @param payload the round winner payload
   */
  private handleRoundWinner(payload: GameIdPayload & PartialPlayerPayload & WhiteCardsPayload) {
    SocketResponseBuilder.start<GameIdPayload & PartialPlayerPayload & WhiteCardsPayload>()
      .data(payload)
      .channel("roundWinner")
      .build()
      .emitToRoom(this.server, GameChannel.GAME_ROOM(payload.gameId));
  }

  /**
   * Handles when a (legal) state transition occurs.
   * Notifies the frontends to prepare for the new
   * game state.
   * 
   * @param payload the state transition payload
   */
  private handleStateTransition(payload: GameIdPayload & StateTransitionPayload<any>) {
    SocketResponseBuilder.start<GameIdPayload & StateTransitionPayload<any>>()
      .data(payload)
      .channel("stateTransition")
      .build()
      .emitToRooms(this.server, [
        GameChannel.GAME_BROWSER,
        GameChannel.GAME_ROOM(payload.gameId)
      ]);
  }

  /**
   * Handles when an illegal state transition occurs.
   * When this happens, the game is reset. This notification
   * serves to inform users about what is happening and why
   * the game has been reset.
   * 
   * @param payload the illegal state transition information
   */
  private handleIllegalStateTransition(payload: GameIdPayload & StateTransitionPayload<null>) {
    SocketResponseBuilder.start<GameIdPayload & StateTransitionPayload<null>>()
      .data(payload)
      .channel("illegalStateTransition")
      .build()
      .emitToRoom(this.server, GameChannel.GAME_ROOM(payload.gameId));
  }

  /**
   * =========================================================
   * Connection handlers
   * =========================================================
   */

  /**
   * Handles a client connecting to the websocket server.
   * Puts the user into the game-browser room so they can
   * list games and receive updates when game details
   * change.
   * 
   * @param client the client who has connected
   */
  async handleConnection(client: Socket) {
    const rawCookies: { [key: string]: string } = {};

    decodeURIComponent(client.handshake.headers.cookie)
      .split(";")
      .map(rawCookie => {
        const keyVal = rawCookie.split("=");
        return { key: keyVal[0], val: keyVal[1] }
      })
      .forEach(rawCookie => rawCookies[rawCookie.key] = rawCookie.val);

    const signedCookies = cookieParser.signedCookies(
      rawCookies,
      this.configService.get<string>("SIGNED_COOKIE_SECRET")
    );

    if (!signedCookies.sid) {
      SocketResponseBuilder.start<ConnectionStatusPayload>()
        .data({ status: "open", type: "guest" })
        .channel("connectionStatus")
        .build()
        .emitToClient(client);

      client.join(GameChannel.GAME_BROWSER);
      return;
    }

    const session = await this.getSessionById(client, signedCookies.sid);
    if (!session) {
      return;
    }

    // check if they're already logged in
    if (this.schedulerRegistry.doesExist("interval", `ws-reauth:${session.id}`)) {
      SocketResponseBuilder.start<ConnectionStatusPayload>()
        .data({ status: "closed", message: "You are already logged in somewhere else." })
        .channel("connectionStatus")
        .build()
        .emitToClient(client);

      client.disconnect(true);
      return;
    }

    // reauthorize the connection every 5 minutes automatically
    this.schedulerRegistry.addInterval(
      `ws-reauth:${session.id}`,
      setInterval(async () => {
        if (!(await this.getSessionById(client, session.id))) {
          return;
        }
      }, 5 * 60 * 1000)
    );

    client.session = {
      id: session.id,
      user: session.user
    };

    SocketResponseBuilder.start<ConnectionStatusPayload>()
      .data({ status: "open", type: "user" })
      .channel("connectionStatus")
      .build()
      .emitToClient(client);

    client.join(GameChannel.GAME_BROWSER);
  }

  /**
   * Handles a client disconnecting from the websocket server.
   * Facilitates a user cleanly leaving a game either as host,
   * player, or spectator.
   * 
   * @param client the client who has disconnected
   */
  handleDisconnect(client: Socket) {
    if (!client.session) {
      return;
    }

    const { id } = client.session;

    if (this.schedulerRegistry.doesExist('interval', `ws-reauth:${id}`)) {
      this.schedulerRegistry.deleteInterval(`ws-reauth:${id}`);
    }

    client.rooms.forEach(room => client.leave(room));

    const { user } = client.session;

    const game = this.service.getGameWithPlayerOrSpectator(user);
    if (game) {
      if (game.hasPlayer(user.id)) {
        game.removePlayer(user.id);
      } else if (game.hasSpectator(user.id)) {
        game.removeSpectator(user.id);
      }
    }
  }

  private async getSessionById(client: Socket, id: string | string[]): Promise<Session> {
    let actual_id: string;
    if (Array.isArray(id)) {
      actual_id = id[0];
    } else {
      actual_id = id;
    }

    const session = await this.sessionService.findOne(actual_id);
    if (!session) {
      SocketResponseBuilder.start<ConnectionStatusPayload>()
        .data({ status: "closed", message: "Session expired or revoked. Please log in again." })
        .channel("connectionStatus")
        .build()
        .emitToClient(client);

      client.disconnect(true);
      return null;
    }

    return session;
  }
}