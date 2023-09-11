import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
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
import { SessionService } from 'src/session/session.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { Session } from 'src/session/entities/session.entity';

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
    service.on('spectatorJoinedGame', this.handleSpectatorJoinedGame.bind(this));
    service.on('spectatorLeftGame', this.handleSpectatorLeftGame.bind(this));
    service.on('beginNextRound', this.handleBeginNextRound.bind(this));
    service.on('dealCardToPlayer', this.handleDealCardToPlayer.bind(this));
    service.on('dealBlackCard', this.handleDealBlackCard.bind(this));
    service.on('roundWinner', this.handleRoundWinner.bind(this));
    service.on('gameWinner', this.handleGameWinner.bind(this));
    service.on('resetWarning', this.handleResetWarning.bind(this));
    service.on('illegalStateTransition', this.handleIllegalStateTransition.bind(this));
    service.on('stateTransition', this.handleStateTransition.bind(this));
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
      client.emit("gameNotCreated");
      return;
    }

    client.leave(GameChannel.GAME_BROWSER);

    client.join([
      GameChannel.GAME_ROOM(game.getId()),
      GameChannel.GAME_USER_ROOM(game.getId(), user.id)
    ]);

    const serialized = GameSerializer.serializeForGameBrowser(game);
    client.emit("gameCreated", serialized);

    this.server.to(GameChannel.GAME_BROWSER).emit("gameAdded", serialized);

    return {};
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
   */
  @SubscribeMessage("startGame")
  @HasPermissions(Permission.StartGame)
  async startGame(client: Socket) {
    const game = this.service.getGameHostedBy(client.session.user);
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    const startStatus = await this.service.startGame(game.getId());
    if (startStatus != GameStatusCode.ACTION_OK) {
      client.emit("gameNotStarted", { reason: startStatus.getMessage() });
    }

    return {};
  }

  @SubscribeMessage("stopGame")
  @HasPermissions(Permission.StopGame)
  stopGame(client: Socket) {
    const game = this.service.getGameHostedBy(client.session.user);
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    game.stop();

    return {};
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
  async addDeckToGame(@ConnectedSocket() client: Socket, @MessageBody('deck_id') deckId: string) {
    const game = this.service.getGameHostedBy(client.session.user);
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    if (!game.canChangeSettings()) {
      client.emit("gameInProgress");
      return;
    }

    const status = await this.service.addDeckToGame(game.getId(), deckId);
    if (status !== GameStatusCode.ACTION_OK) {
      client.emit("deckNotAdded", { reason: status.getMessage() });
    } else {
      this.server.to(GameChannel.GAME_ROOM(game.getId())).emit("decksUpdated", { decks: game.getDecks() });
      this.server.to(GameChannel.GAME_BROWSER).emit("decksUpdated", { id: game.getId(), decks: game.getDecks() })
    }

    return {};
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
  async removeDeckFromGame(@ConnectedSocket() client: Socket, @MessageBody('deck_id') deckId: string) {
    const game = this.service.getGameHostedBy(client.session.user);
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    if (!game.canChangeSettings()) {
      client.emit("gameInProgress");
      return;
    }

    const status = await this.service.removeDeckFromGame(game.getId(), deckId);
    if (status !== GameStatusCode.ACTION_OK) {
      client.emit("deckNotRemoved", { reason: status.getMessage() });
    } else {
      this.server.to(GameChannel.GAME_ROOM(game.getId())).emit("decksUpdated", { decks: game.getDecks() });
      this.server.to(GameChannel.GAME_BROWSER).emit("decksUpdated", { id: game.getId(), decks: game.getDecks() })
    }

    return {};
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
  changeGameSettings(@ConnectedSocket() client: Socket, @MessageBody('settings') settings: Partial<GameSettings>) {
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
      if (game.getPlayerCount() > settings.maxPlayers) {
        client.emit('maxPlayersTooLow', { reason: "You can't set max players lower than current player count." });
      } else if (settings.maxPlayers < 3) {
        client.emit('maxPlayersTooLow', { reason: "You can't set max players lower than 3." });
      } else {
        game.setMaxPlayers(Math.floor(settings.maxPlayers));
      }
    }

    if (settings.maxSpectators) {
      if (game.getSpectatorCount() > settings.maxSpectators) {
        client.emit('maxSpectatorsTooLow', { reason: "You can't set max spectators lower than current spectator count." });
      } else if (settings.maxPlayers < 0) {
        client.emit('maxSpectatorsTooLow', { reason: "You can't set max spectators lower than 0." });
      } else {
        game.setMaxSpectators(Math.floor(settings.maxSpectators));
      }
    }

    if (settings.maxScore) {
      if (settings.maxScore < 1) {
        client.emit('maxScoreTooLow', { reason: "You can't set the max score lower than 1." });
      } else {
        game.setMaxScore(Math.floor(settings.maxScore));
      }
    }

    this.server.to(GameChannel.GAME_ROOM(game.getId())).emit("settingsUpdated", { settings: game.getSettings() });
    this.server.to(GameChannel.GAME_BROWSER).emit("settingsUpdated", { id: game.getId(), settings: game.getSettings() });

    return {};
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

      client.emit("gameJoined", GameSerializer.serializeForGameBrowser(game));
    }

    return {};
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

      client.emit("gameSpectated", GameSerializer.serializeForGameBrowser(game));
    }

    return {};
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

    return {};
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

    return {};
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

    return {};
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
      this.server.to(GameChannel.GAME_ROOM(game.getId())).emit("cardsPlayed", { id: user.id, nickname: user.nickname });
      client.emit('discardCards', { cards: cardIds });
    }

    return {};
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

    return {};
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
      .emit("playerJoined", { gameId: payload.gameId, id: payload.userId, nickname: payload.nickname });
  }

  /**
   * Handles a player leaving a game.
   * 
   * @param payload the game and player information
   */
  private handlePlayerLeftGame(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
      .emit("playerLeft", { id: payload.userId });

    this.server.to(GameChannel.GAME_BROWSER)
      .emit("playerLeft", { gameId: payload.gameId, id: payload.userId });
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
      .emit("spectatorJoined", { gameId: payload.gameId, id: payload.userId, nickname: payload.nickname });
  }

  /**
   * Handles a spectator leaving a game.
   * 
   * @param payload the game and player information
   */
  private handleSpectatorLeftGame(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
      .emit("spectatorLeft", { id: payload.userId });

    this.server.to(GameChannel.GAME_BROWSER)
      .emit("spectatorLeft", { gameId: payload.gameId, id: payload.userId });
  }

  /**
   * Handles when a new round begins.
   * 
   * @param payload the new round information
   */
  handleBeginNextRound(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
      .emit("beginNextRound", { roundNumber: payload.roundNumber, judgeUserId: payload.judgeUserId });

    this.server.to(GameChannel.GAME_BROWSER)
      .emit("roundNumberIncrement", { gameId: payload.gameId });
  }

  /**
   * Deals a white card to a player.
   * 
   * @param payload the white card payload
   */
  handleDealCardToPlayer(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_USER_ROOM(payload.gameId, payload.userId))
      .emit("dealCard", { card: payload.card });
  }

  /**
   * Deals a black card to a game.
   * 
   * @param payload the black card payload
   */
  handleDealBlackCard(payload: Record<string, any>) {
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
      .emit("dealBlackCard", { card: payload.card });
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
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
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
    this.server.to(GameChannel.GAME_ROOM(payload.gameId))
      .emit("stateTransition", { gameId: payload.gameId, to: payload.to, ...payload });

    this.server.to(GameChannel.GAME_BROWSER)
      .emit("stateTransition", { gameId: payload.gameId, to: payload.to });
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
      client.emit("connectionStatus", { state: "open", type: "guest" });
      client.join(GameChannel.GAME_BROWSER);
      return;
    }

    const session = await this.getSessionById(client, signedCookies.sid);
    if (!session) {
      client.emit("connectionStatus", { status: "closed", message: "Session expired or was revoked." });
      client.disconnect(true);
      return;
    }

    // check if they're already logged in
    if (this.schedulerRegistry.doesExist("interval", `ws-reauth:${session.id}`)) {
      client.emit("connectionStatus", { status: "closed", message: "You are already logged in somewhere else." });
      client.disconnect(true);
      return;
    }

    // reauthorize the connection every 5 minutes automatically
    this.schedulerRegistry.addInterval(
      `ws-reauth:${session.id}`,
      setInterval(async () => {
        if (!(await this.getSessionById(client, session.id))) {
          client.emit("connectionStatus", { status: "closed", message: "Session expired or was revoked." });
          client.disconnect(true);
          return;
        }
      }, 5 * 60 * 1000)
    );

    client.session = {
      id: session.id,
      user: session.user
    };

    client.emit("connectionStatus", { status: "open", type: "user" });

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

    const memberGame = this.service.getGames().find(g => g.hasPlayer(user.id));
    if (memberGame) {
      memberGame.removePlayer(user.id);

      if (memberGame.getPlayerCount() === 0) {
        this.service.removeGame(memberGame.getId());
        this.server.to(GameChannel.GAME_BROWSER).emit("gameRemoved", { id: memberGame.getId() });
      }

      return;
    }

    const spectatedGame = this.service.getGames().find(g => g.hasSpectator(user.id));
    if (spectatedGame) {
      spectatedGame.removeSpectator(user.id);
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
      client.emit("connectionStatus", { status: "closed", message: "Session expired or revoked. Please log in again." });
      client.disconnect(true);
      return null;
    }

    return session;
  }
}