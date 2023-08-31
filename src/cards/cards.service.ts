import { Injectable } from '@nestjs/common';
import { Card } from './entities/card.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateCardDto } from './dto/update-card.dto';
import { CreateCardDto } from './dto/create-card.dto';

@Injectable()
export class CardsService {
  constructor(@InjectRepository(Card) private cardsRepository: Repository<Card>) {}

  create(createCardDto: CreateCardDto) {
    this.cardsRepository.create(createCardDto)
  }

  async update(id: string, updateCardDto: UpdateCardDto) {
    await this.cardsRepository.update({ id }, updateCardDto)
  }

  async remove(id: string) {
    await this.cardsRepository.delete({ id })
  }
}
