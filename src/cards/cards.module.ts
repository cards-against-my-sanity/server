import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionModule } from 'src/permission/permission.module';
import { DecksModule } from 'src/decks/decks.module';
import { WhiteCard } from './entities/white-card.entity';
import { BlackCard } from './entities/black-card.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhiteCard, BlackCard]),
    PermissionModule,
    DecksModule
  ],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService]
})
export class CardsModule { }
