import { Module } from '@nestjs/common';
import { GamesGateway } from './games.gateway';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule],
  providers: [GamesGateway, GamesService],
  controllers: [GamesController]
})
export class GamesModule {}
