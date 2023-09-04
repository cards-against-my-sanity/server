import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { GamesService } from './games.service';
import { Server, Socket } from 'socket.io';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Permission } from 'src/permission/permission.class';
import { UseGuards } from '@nestjs/common';
import { PermissionsGuard } from 'src/permission/permissions.guard';
import { GameSerializer } from 'src/util/game.serializer';
import { GameStatusCode } from './game-status-code.constants';

@WebSocketGateway()
@UseGuards(PermissionsGuard)
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  constructor(private readonly gamesService: GamesService) {
  }

  /**
   * Lists all games and their details.
   */
  @SubscribeMessage("listGames")
  listGames() {
    return this.gamesService.getGames().map(g => GameSerializer.serializeForGameBrowser(g));
  }

  /**
   * Creates a new game hosted by the caller.
   * 
   * @param client the client
   */
  @SubscribeMessage("createGame")
  @HasPermissions(Permission.CreateGame)
  createGame(client: Socket) {
    const game = this.gamesService.createGame(client.session.user);
    if (!game) {
      client.emit("gameNotCreated", { reason: "You are already hosting a game." });
      return;
    }

    const serialized = GameSerializer.serializeForGameBrowser(game);

    client.emit("gameSuccessfullyCreated", serialized);
    this.server.to("game-browser").emit("newGameAdded", serialized)
  }

  /**
   * Causes a player to join a game. If the
   * game does not exist or if they are already
   * in a game, nothing happens and they will
   * receive an error message.
   * 
   * @param client the client
   * @param gameId the game id to join
   */
  @SubscribeMessage("joinGame")
  @HasPermissions(Permission.JoinGame)
  joinGame(@ConnectedSocket() client: Socket, @MessageBody('game_id') gameId: string) {
    const game = this.gamesService.getGame(gameId);
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    const status = this.gamesService.addPlayerToGame(game.getId(), client.session.user);
    if (status != GameStatusCode.ACTION_OK) {
      client.emit("gameNotJoined", { reason: status.getMessage() });
    } else {
      client.emit("gameJoined");
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

    const game = this.gamesService.getGames().find(g => g.hasPlayer(userId));
    if (!game) {
      client.emit("gameNotFound");
      return;
    }

    const status = this.gamesService.removePlayerFromGame(game.getId(), userId);
    if (status != GameStatusCode.ACTION_OK) {
      client.emit("complianceImpossible", { reason: status.getMessage() });
    } else {
      client.emit("gameLeft");
    }
  }

  /**
   * Delivers a game action on behalf of the client.
   * Game actions include chatting, playing cards,
   * etc.
   * 
   * @param client the client
   */
  @SubscribeMessage("sendGameAction")
  sendGameAction(client: Socket) {

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

      const hostedGame = this.gamesService.getGameHostedBy(user);
      if (hostedGame) {
        hostedGame.removePlayer(user.id);
        return;
      }

      const memberGame = this.gamesService.getGames().find(g => g.hasPlayer(user.id));
      if (memberGame) {
        memberGame.removePlayer(user.id);
      }

      const spectatedGame = this.gamesService.getGames().find(g => g.hasSpectator(user.id));
      if (spectatedGame) {
        spectatedGame.removeSpectator(user.id);
      }
  }
}
