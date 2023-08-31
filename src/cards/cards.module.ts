import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';
import { PermissionModule } from 'src/permission/permission.module';
import { DecksModule } from 'src/decks/decks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Card]), PermissionModule, DecksModule],
  controllers: [CardsController],
  providers: [CardsService]
})
export class CardsModule {}
