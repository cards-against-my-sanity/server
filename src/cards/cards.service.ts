import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Card } from './entities/card.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateCardDto } from './dto/update-card.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { CardType } from './card-type.enum';
import { DecksService } from 'src/decks/decks.service';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card) private cardsRepository: Repository<Card>,
    private decksService: DecksService
  ) {}

  async create(createCardDto: CreateCardDto) {
    const { card_type, content, num_answers, deck_id } = createCardDto;

    const deck = await this.decksService.findOne(deck_id);
    if (!deck) {
      throw new NotFoundException("deck does not exist");
    }
    
    const existing = await this.cardsRepository.findOneBy({ card_type, content, num_answers });
    if (existing != null) {
      throw new ConflictException("exact card already exists");
    }

    console.log("creating card with details");
    console.log(createCardDto);

    if (card_type === CardType.Black && num_answers === 0) {
      throw new BadRequestException("black cards cannot have num_answers === 0")
    } else if (card_type === CardType.White && num_answers !== 0) {
      throw new BadRequestException("white cards must have num_answers === 0")
    }

    const card = new Card();
    card.card_type = card_type;
    card.content = content;
    card.num_answers = num_answers;
    card.deck = deck;

    this.cardsRepository.save(card)
  }

  async update(id: string, updateCardDto: UpdateCardDto) {
    await this.cardsRepository.update({ id }, updateCardDto)
  }

  async remove(id: string) {
    await this.cardsRepository.delete({ id })
  }
}
