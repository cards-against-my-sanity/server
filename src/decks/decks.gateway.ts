import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection } from '@nestjs/websockets';
import { DecksService } from './decks.service';
import { UseGuards } from '@nestjs/common';
import { Socket } from 'socket.io';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Permission } from 'src/permission/permission.class';
import { PermissionsWebsocketGuard } from 'src/permission/permissions.ws.guard';

@WebSocketGateway()
@UseGuards(PermissionsWebsocketGuard)
export class DecksGateway {
  constructor(private readonly decksService: DecksService) {}
  
  @SubscribeMessage('findOneDeck')
  @HasPermissions(Permission.ViewDeck)
  findOne(@MessageBody() id: string) {
    return this.decksService.findOne(id)
  }

  @SubscribeMessage('findAllDecks')
  @HasPermissions(Permission.ViewDecks)
  findAll(@ConnectedSocket() client: Socket) {
    console.log("Hello from findAll - user is:");
    console.log(client.session.user);
    return this.decksService.findAll();
  }
}
