import { Module } from '@nestjs/common';
import { DecksService } from './decks.service';
import { DecksGateway } from './decks.gateway';
import { DecksController } from './decks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deck } from './entities/deck.entity';
import { PermissionModule } from 'src/permission/permission.module';

@Module({
  imports: [TypeOrmModule.forFeature([Deck]), PermissionModule],
  controllers: [DecksController],
  providers: [DecksGateway, DecksService],
  exports: [DecksService]
})
export class DecksModule {}
