import { Module } from '@nestjs/common';
import { GamesGateway } from './games.gateway';
import { GamesService } from './games.service';
import { UsersModule } from 'src/users/users.module';
import { DecksService } from 'src/decks/decks.service';
import { DecksModule } from 'src/decks/decks.module';
import { PermissionModule } from 'src/permission/permission.module';

@Module({
  imports: [UsersModule, DecksModule, PermissionModule],
  providers: [GamesGateway, GamesService]
})
export class GamesModule {}
