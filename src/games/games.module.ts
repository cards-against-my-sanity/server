import { Module } from '@nestjs/common';
import { GamesGateway } from './games.gateway';
import { GamesService } from './games.service';
import { UsersModule } from 'src/users/users.module';
import { DecksModule } from 'src/decks/decks.module';
import { PermissionModule } from 'src/permission/permission.module';
import { CardsModule } from 'src/cards/cards.module';
import { SessionModule } from 'src/session/session.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [UsersModule, DecksModule, CardsModule, PermissionModule, SessionModule, ConfigModule, ScheduleModule],
  providers: [GamesGateway, GamesService]
})
export class GamesModule { }
