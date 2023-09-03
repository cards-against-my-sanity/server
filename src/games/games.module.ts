import { Module } from '@nestjs/common';
import { GamesGateway } from './games.gateway';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoricalGame } from './entities/historical-game.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HistoricalGame])],
  providers: [GamesGateway, GamesService],
  controllers: [GamesController]
})
export class GamesModule {}
