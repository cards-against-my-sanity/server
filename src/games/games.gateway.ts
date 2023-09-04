import { OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { GamesService } from './games.service';
import { Server, Socket } from 'socket.io';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Permission } from 'src/permission/permission.class';
import { UseGuards } from '@nestjs/common';
import { PermissionsGuard } from 'src/permission/permissions.guard';

@WebSocketGateway()
@UseGuards(PermissionsGuard)
export class GamesGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  constructor(private readonly gamesService: GamesService) {
  }

  @SubscribeMessage("resetRooms")
  resetRooms(client: Socket) {
    client.rooms.forEach(room => client.leave(room));
    client.join("game-browser");
  }

  @SubscribeMessage("createGame")
  @HasPermissions(Permission.CreateGame)
  createGame(client: Socket) {
    const gameId = this.gamesService.createGame(client.session?.user);
  }

  @SubscribeMessage("findAllGames")
  @HasPermissions(Permission.ViewGames)
  findAllGames() {
    return this.gamesService.getGames().map(g => g.getId());
  }

  handleDisconnect(client: Socket) {
      if (!client.session) {
        return;
      }

      const game = this.gamesService.getGameHostedBy(client.session.user);
      if (!game) {
        return;
      }

      this.server.to(`game:${game.getId()}`).emit('hostDisconnected');

      this.gamesService.removeGame(game.getId());
      
      this.server.to('game-browser').emit('refresh');
  }
}
