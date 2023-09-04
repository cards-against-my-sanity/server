import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { GamesService } from './games.service';
import { Server, Socket } from 'socket.io';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Permission } from 'src/permission/permission.class';
import { UseGuards } from '@nestjs/common';
import { PermissionsGuard } from 'src/permission/permissions.guard';
import { GameSerializer } from 'src/util/game.serializer';
import { GameStatusCode } from './game-status-code.constants';
import { GameAction } from './game-action.enum';

@WebSocketGateway()
@UseGuards(PermissionsGuard)
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  constructor(private readonly service: GamesService) {
    service.on('playerJoinedGame', this.handlePlayerJoinedGame);
    service.on('playerLeftGame', this.handlePlayerLeftGame);
    service.on('hostLeftGame', this.handleHostLeftGame);
    service.on('spectatorJoinedGame', this.handleSpectatorJoinedGame);
    service.on('spectatorLeftGame', this.handleSpectatorLeftGame);
    service.on('gameStateChanged', this.handleGameStateChanged);
    service.on('gameStarted', this.handleGameStarted);
  }

  /**
   * Lists all games and their details.
   */
  @SubscribeMessage("listGames")
  listGames() {
    return this.service.getGames().map(g => GameSerializer.serializeForGameBrowser(g));
  }

  /**
   * Creates a new game hosted by the caller.
   * 
   * @param client the client
   */
  @SubscribeMessage("createGame")
  @HasPermissions(Permission.CreateGame)
  createGame(client: Socket) {
    const game = this.service.createGame(client.session.user);
    if (!game) {
      client.emit("gameNotCreated", { reason: "You are already hosting a game." });
      return;
    }

    const serialized = GameSerializer.serializeForGameBrowser(game);

    client.emit("gameSuccessfullyCreated", serialized);
    this.server.to("game-browser").emit("newGameAdded", serialized)
  }

  /**
   * Causes a player to join a game as a player.
   * If the game does not exist or if they are 
   * already in or spectating a game, nothing happens 
   * and they will receive an error message.
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

    const status = this.service.addPlayerToGame(game.getId(), client.session.user);

    if (status != GameStatusCode.ACTION_OK) {
      client.emit("gameNotJoined", { reason: status.getMessage() });
    } else {
      client.emit("gameJoined");
    }
  }

  /**
   * Causes a player to join a game as a spectator.
   * If the game does not exist or if they are 
   * already spectating or in a game, nothing happens 
   * and they will receive an error message.
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

    const status = this.service.addSpectatorToGame(game.getId(), client.session.user);

    if (status != GameStatusCode.ACTION_OK) {
      client.emit("gameNotSpectated", { reason: status.getMessage() });
    } else {
      client.emit("gameSpectated");
    }
  }

  /**
   * Causes a client to leave the game they are
   * a member of. If they are not a member of a
   * game, nothing happens and they will receive
   * an error message.
   * 
   * @param client the client
   */
  @SubscribeMessage("leaveGame")
  leaveGame(client: Socket) {
    const { id: userId } = client.session.user;

    const game = this.service.getGames().find(g => g.hasPlayer(userId));
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    const status = this.service.removePlayerFromGame(game.getId(), userId);
    if (status != GameStatusCode.ACTION_OK) {
      client.emit("complianceImpossible", { reason: status.getMessage() });
    } else {
      client.emit("gameLeft");
    }
  }

  /**
   * Causes a client to leave the game they are
   * a spectating. If they are not spectating a
   * game, nothing happens and they will receive
   * an error message.
   * 
   * @param client the client
   */
  @SubscribeMessage("unspectateGame")
  unspectateGame(client: Socket) {
    const { id: userId } = client.session.user;

    const game = this.service.getGames().find(g => g.hasSpectator(userId));
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    const status = this.service.removeSpectatorFromGame(game.getId(), userId);
    if (status != GameStatusCode.ACTION_OK) {
      client.emit("complianceImpossible", { reason: status.getMessage() });
    } else {
      client.emit("gameUnspectated");
    }
  }

  /**
   * Delivers a game action on behalf of the client.
   * Game actions include chatting, playing cards,
   * etc.
   * 
   * Forwards execution to one of {@link sendChat},
   * {@link sendPlayCards}, or {@link sendJudgement}
   * depending on the action provided.
   * 
   * @param client the client
   */
  @SubscribeMessage("sendGameAction")
  sendGameAction(@ConnectedSocket() client: Socket, @MessageBody("action") action: GameAction, @MessageBody('game_id') gameId: string, @MessageBody("data") data: Record<string, any>) {
    switch (action) {
      case GameAction.Chat:
        this.sendChat(client, gameId, data.message);
        break;
      case GameAction.PlayCard:
        this.sendPlayCards(client, gameId, data.cards);
        break;
      case GameAction.JudgeCard:
        this.sendJudgement(client, gameId, data.winning_user);
        break;
    }
  }

  /**
   * Broadcasts a chat message to the game room specified by the
   * given game id.
   * 
   * @param client the client
   * @param gameId the game to broadcast to
   * @param message the message to send
   */
  private sendChat(client: Socket, gameId: string, message: string) {
    client.to(`game:${gameId}`).emit("chat", { message });
  }

  /**
   * Applies a user's chosen cards to play
   * 
   * @param client the client
   * @param gameId the game id in which the
   *               card application is happening
   * @param cardIds the card ids to put into play
   */
  private sendPlayCards(client: Socket, gameId: string, cardIds: string[]) {
    // TODO: put card(s) into play, game must be in playing state
  }

  /**
   * Applies a judgement on who wins a round.
   * 
   * @param client the client
   * @param gameId the game id receiving the judgement
   * @param winningUser the user who wins the round
   */
  private sendJudgement(client: Socket, gameId: string, winningUser: string) {
    // TODO: apply judgement to played cards, game must be in judging state
  }

  /**
   * Resets the rooms for the caller, subscribing
   * them only to game browser events.
   * 
   * @param client the client
   */
  @SubscribeMessage("resetRooms")
  resetRooms(client: Socket) {
    client.rooms.forEach(room => client.leave(room));
    client.join("game-browser");
  }

  /**
   * Handles a client connecting to the websocket server.
   * Puts the user into the game-browser room so they can
   * list games and receive updates when game details
   * change.
   * 
   * @param client the client who has connected
   */
  handleConnection(client: Socket) {
      client.join("game-browser");
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

      const { user } = client.session;

      const hostedGame = this.service.getGameHostedBy(user);
      if (hostedGame) {
        hostedGame.removePlayer(user.id);
        return;
      }

      const memberGame = this.service.getGames().find(g => g.hasPlayer(user.id));
      if (memberGame) {
        memberGame.removePlayer(user.id);
      }

      const spectatedGame = this.service.getGames().find(g => g.hasSpectator(user.id));
      if (spectatedGame) {
        spectatedGame.removeSpectator(user.id);
      }
  }
  
  /**
   * Handles a player joining a game.
   * 
   * @param payload the game and player information
   */
  private handlePlayerJoinedGame(payload: Record<string, any>) {
    throw new Error('Method not implemented.');
  }

  /**
   * Handles a player leaving a game.
   * 
   * @param payload the game and player information
   */
  private handlePlayerLeftGame(payload: Record<string, any>) {
    throw new Error('Method not implemented.');
  }

  /**
   * Handles a host leaving a game.
   * 
   * @param payload the game and player information
   */
  private handleHostLeftGame(payload: Record<string, any>) {
    throw new Error('Method not implemented.');
  }

  /**
   * Handles a spectator joining a game.
   * 
   * @param payload the game and spectator information
   */
  private handleSpectatorJoinedGame(payload: Record<string, any>) {
    throw new Error('Method not implemented.');
  }

  /**
   * Handles a spectator leaving a game.
   * 
   * @param payload the game and player information
   */
  private handleSpectatorLeftGame(payload: Record<string, any>) {
    throw new Error('Method not implemented.');
  }

  /**
   * Handles a change to the game state.
   * 
   * @param payload the game information
   */
  private handleGameStateChanged(payload: Record<string, any>) {
    throw new Error('Method not implemented.');
  }

  /**
   * Handles a game starting.
   * 
   * @param payload the game information
   */
  private handleGameStarted(payload: Record<string, any>) {
    throw new Error('Method not implemented.');
  }
}