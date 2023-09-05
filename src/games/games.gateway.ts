import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { GamesService } from './games.service';
import { Server, Socket } from 'socket.io';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Permission } from 'src/permission/permission.class';
import { UseGuards } from '@nestjs/common';
import { PermissionsGuard } from 'src/permission/permissions.guard';
import { GameSerializer } from 'src/util/game.serializer';
import { GameStatusCode } from './game-status-code';
import { GameChannel } from './game_channel';
import { GameSettings } from './game_settings';

@WebSocketGateway()
@UseGuards(PermissionsGuard)
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  constructor(private readonly service: GamesService) {
    service.on('playerJoinedGame', this.handlePlayerJoinedGame);
    service.on('playerLeftGame', this.handlePlayerLeftGame);
    service.on('spectatorJoinedGame', this.handleSpectatorJoinedGame);
    service.on('spectatorLeftGame', this.handleSpectatorLeftGame);
    service.on('beginNextRound', this.handleBeginNextRound);
    service.on('dealCardToPlayer', this.handleDealCardToPlayer);
    service.on('dealBlackCard', this.handleDealBlackCard);
    service.on('roundWinner', this.handleRoundWinner);
    service.on('gameWinner', this.handleGameWinner);
    service.on('resetWarning', this.handleResetWarning);
    service.on('illegalStateTransition', this.handleIllegalStateTransition);
    service.on('stateTransition', this.handleStateTransition);
  }

  /**
   * =========================================================
   * Message handlers
   * =========================================================
   */

  /**
   * Lists all games and their details.
   */
  @SubscribeMessage("listGames")
  listGames() {
    return this.service.getGames().map(g => GameSerializer.serializeForGameBrowser(g));
  }

  /**
   * Creates a new game hosted by the caller.
   * The caller leaves the {@link GAME_BROWSER} room
   * and joins the {@link GAME_ROOM} and private 
   * {@link GAME_USER_ROOM}.
   * 
   * @param client the client
   */
  @SubscribeMessage("createGame")
  @HasPermissions(Permission.CreateGame)
  createGame(client: Socket) {
    const { user } = client.session;

    const game = this.service.createGame(user);
    if (!game) {
      client.emit("gameNotCreated", { reason: "You are already hosting a game." });
      return;
    }

    client.leave(GameChannel.GAME_BROWSER);
      
    client.join([
      GameChannel.GAME_ROOM(game.getId()), 
      GameChannel.GAME_USER_ROOM(game.getId(), user.id)
    ]);

    const serialized = GameSerializer.serializeForGameBrowser(game);
    client.emit("gameCreated", serialized);

    this.server.to(GameChannel.GAME_BROWSER).emit("gameAdded", serialized)
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
  changeGameSettings(client: Socket, @MessageBody('settings') settings: Partial<GameSettings>) {
    const game = this.service.getGameHostedBy(client.session.user);
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    if (!game.canChangeSettings()) {
      client.emit("gameInProgress");
      return;
    }

    if (settings.maxPlayers) {
      game.setMaxPlayers(Math.floor(settings.maxPlayers));
    }

    if (settings.maxSpectators) {
      game.setMaxSpectators(Math.floor(settings.maxSpectators));
    }

    if (settings.maxScore) {
      game.setMaxScore(Math.floor(settings.maxScore));
    }
    
    this.server.to(GameChannel.GAME_ROOM(game.getId())).emit("settingsUpdated", game.getSettings());
    this.server.to(GameChannel.GAME_BROWSER).emit("settingsUpdated", { id: game.getId(), settings: game.getSettings() })
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
  joinGame(@ConnectedSocket() client: Socket, @MessageBody('game_id') gameId: string) {
    const game = this.service.getGame(gameId);
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    const { user } = client.session;

    const status = this.service.addPlayerToGame(game.getId(), user);

    if (status != GameStatusCode.ACTION_OK) {
      client.emit("gameNotJoined", { reason: status.getMessage() });
    } else {
      client.leave(GameChannel.GAME_BROWSER);
      
      client.join([
        GameChannel.GAME_ROOM(game.getId()), 
        GameChannel.GAME_USER_ROOM(game.getId(), user.id)
      ]);

      client.emit("gameJoined");
    }
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
  spectateGame(@ConnectedSocket() client: Socket, @MessageBody('game_id') gameId: string) {
    const game = this.service.getGame(gameId);
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    const { user } = client.session;

    const status = this.service.addSpectatorToGame(game.getId(), user);

    if (status != GameStatusCode.ACTION_OK) {
      client.emit("gameNotSpectated", { reason: status.getMessage() });
    } else {
      client.leave(GameChannel.GAME_BROWSER);
      
      client.join([
        GameChannel.GAME_ROOM(game.getId()), 
        GameChannel.GAME_USER_ROOM(game.getId(), user.id)
      ]);

      client.emit("gameSpectated");
    }
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
  leaveGame(client: Socket) {
    const { user } = client.session;

    const game = this.service.getGames().find(g => g.hasPlayer(user.id));
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    const status = this.service.removePlayerFromGame(game.getId(), user.id);
    if (status != GameStatusCode.ACTION_OK) {
      client.emit("complianceImpossible", { reason: status.getMessage() });
    } else {
      client.leave(GameChannel.GAME_ROOM(game.getId()));
      client.leave(GameChannel.GAME_USER_ROOM(game.getId(), user.id));
      client.join(GameChannel.GAME_BROWSER);
      client.emit("gameLeft");

      if (game.getPlayerCount() === 0) {
        this.service.removeGame(game.getId());
        this.server.to(GameChannel.GAME_BROWSER).emit("gameRemoved", { id: game.getId() });
      }
    }
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
  unspectateGame(client: Socket) {
    const { user } = client.session;

    const game = this.service.getGames().find(g => g.hasSpectator(user.id));
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    const status = this.service.removeSpectatorFromGame(game.getId(), user.id);
    if (status != GameStatusCode.ACTION_OK) {
      client.emit("complianceImpossible", { reason: status.getMessage() });
    } else {
      client.leave(GameChannel.GAME_ROOM(game.getId()));
      client.leave(GameChannel.GAME_USER_ROOM(game.getId(), user.id));

      client.join(GameChannel.GAME_BROWSER);

      client.emit("gameUnspectated");
    }
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
  sendGameChat(@ConnectedSocket() client: Socket, @MessageBody("message") message: string) {
    const { user } = client.session;

    const game = this.service.getGames().find(g => g.hasPlayer(user.id) || g.hasSpectator(user.id));
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    client.to(GameChannel.GAME_ROOM(game.getId())).emit("chat", { 
      user: {
        id: user.id,
        nickname: user.nickname
      },
      message
    });
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
  playCards(@ConnectedSocket() client: Socket, @MessageBody("cards") cardIds: string[]) {
    const { user } = client.session;

    const game = this.service.getGames().find(g => g.hasPlayer(user.id));
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    const status = game.playCards(game.getPlayer(user.id), cardIds);
    if (status !== GameStatusCode.ACTION_OK) {
      client.emit("cardsNotPlayed", { reason: status.getMessage() });
    } else {
      this.server.to(GameChannel.GAME_ROOM(game.getId())).emit("cardsPlayed", { user: user.id });
    }
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
  @SubscribeMessage("judgeCard")
  @HasPermissions(Permission.JoinGame)
  judgeCards(@ConnectedSocket() client: Socket, @MessageBody("cards") cardIds: string[]) {
    const { user } = client.session;

    const game = this.service.getGames().find(g => g.hasPlayer(user.id));
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    const status = game.judgeCards(game.getPlayer(user.id), cardIds);
    if (status !== GameStatusCode.ACTION_OK) {
      client.emit("cardsNotJudged", { reason: status.getMessage() });
    }
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
  handleConnection(client: Socket) {
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
      
      client.rooms.forEach(room => client.leave(room));

      const { user } = client.session;

      const memberGame = this.service.getGames().find(g => g.hasPlayer(user.id));
      if (memberGame) {
        memberGame.removePlayer(user.id);
        return;
      }

      const spectatedGame = this.service.getGames().find(g => g.hasSpectator(user.id));
      if (spectatedGame) {
        spectatedGame.removeSpectator(user.id);
      }
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
  private handlePlayerJoinedGame(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
      .emit("playerJoined", { id: payload.userId, nickname: payload.nickname });

    this.server.to(GameChannel.GAME_BROWSER)
      .emit("gameInfoUpdate", { gameId: payload.gameId, type: "playerCountIncrement" });
  }

  /**
   * Handles a player leaving a game.
   * 
   * @param payload the game and player information
   */
  private handlePlayerLeftGame(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
      .emit("playerLeft", { id: payload.userId, nickname: payload.nickname });

    this.server.to(GameChannel.GAME_BROWSER)
      .emit("gameInfoUpdate", { gameId: payload.gameId, type: "playerCountDecrement" });
  }

  /**
   * Handles a spectator joining a game.
   * 
   * @param payload the game and spectator information
   */
  private handleSpectatorJoinedGame(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
      .emit("spectatorJoined", { id: payload.userId, nickname: payload.nickname });

    this.server.to(GameChannel.GAME_BROWSER)
      .emit("gameInfoUpdate", { gameId: payload.gameId, type: "spectatorCountIncrement" });
  }

  /**
   * Handles a spectator leaving a game.
   * 
   * @param payload the game and player information
   */
  private handleSpectatorLeftGame(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
      .emit("spectatorLeft", { id: payload.userId, nickname: payload.nickname });

    this.server.to(GameChannel.GAME_BROWSER)
      .emit("gameInfoUpdate", { gameId: payload.gameId, type: "spectatorCountDecrement" });
  }

  /**
   * Handles when a new round begins.
   * 
   * @param payload the new round information
   */
  handleBeginNextRound(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
      .emit("beginNextRound", { roundNumber: payload.roundNumber });

    this.server.to(GameChannel.GAME_BROWSER)
      .emit("gameInfoUpdate", { gameId: payload.gameId, type: "roundNumberIncrement" });
  }
  
  /**
   * Deals a white card to a player.
   * 
   * @param payload the white card payload
   */
  handleDealCardToPlayer(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_USER_ROOM(payload.gameId, payload.userId))
      .emit("dealCard", payload.card);
  }

  /**
   * Deals a black card to a game.
   * 
   * @param payload the black card payload
   */
  handleDealBlackCard(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
      .emit("dealBlackCard", payload.card);
  }

  /**
   * Handles when there is a round winner.
   * 
   * @param payload the round winner payload
   */
  handleRoundWinner(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
      .emit("roundWinner", { 
        id: payload.userId, 
        nickname: payload.nickname, 
        winningCards: payload.winningCards 
      });
  }

  /**
   * Handles when there is a game winner.
   * 
   * @param payload the game winner payload
   */
  handleGameWinner(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
      .emit("gameWinner", { id: payload.userId, nickname: payload.nickname });
  }

  /**
   * Handles when the reset warning is sent before
   * the game is cleaned up and moves back to lobby.
   * 
   * @param payload the reset warning payload
   */
  handleResetWarning(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
      .emit("resetWarning", { resetInSeconds: payload.resetInSeconds });
  }

  /**
   * Handles when an illegal state transition occurs.
   * When this happens, the game is reset. This notification
   * serves to inform users about what is happening and why
   * the game has been reset.
   * 
   * @param payload the illegal state transition information
   */
  handleIllegalStateTransition(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.id))
      .emit("illegalStateTransition", { from: payload.from, to: payload.to });
  }
  
  /**
   * Handles when a (legal) state transition occurs.
   * Notifies the frontends to prepare for the new
   * game state.
   * 
   * @param payload the state transition payload
   */
  handleStateTransition(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.id))
      .emit("stateTransition", { to: payload.to });
  }
}