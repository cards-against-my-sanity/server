import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DecksService } from 'src/decks/decks.service';
import { Deck } from 'src/decks/entities/deck.entity';
import { CardType } from './card-type.enum';
import { WhiteCard } from './entities/white-card.entity';
import { BlackCard } from './entities/black-card.entity';
import { CreateBlackCardDto } from './dto/create-black-card.dto';
import { UpdateWhiteCardDto } from './dto/update-white-card.dto';
import { CreateWhiteCardDto } from './dto/create-white-card.dto';
import { UpdateBlackCardDto } from './dto/update-black-card.dto';

interface UpdateBlackCardPayload {
  decks?: Promise<Deck[]>,
  content?: string,
  pick?: number
}

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(WhiteCard) private whiteCardRepository: Repository<WhiteCard>,
    @InjectRepository(BlackCard) private blackCardRepository: Repository<BlackCard>,
    private decksService: DecksService
  ) {}

  countAllInDeck(deckId: string, card_type: CardType) {
    switch (card_type) {
      case CardType.Black:
        return this.blackCardRepository.createQueryBuilder('blackCard')
          .innerJoin('blackCard.decks', 'deck')
          .where('deck.id = :deckId', { deckId })
          .getCount();
      case CardType.White:
        return this.whiteCardRepository.createQueryBuilder('whiteCard')
          .innerJoin('whiteCard.decks', 'deck')
          .where('deck.id = :deckId', { deckId })
          .getCount();
    }
  }

  findAllWhiteCardsInDeck(deckId: string): Promise<WhiteCard[]> {
    return this.whiteCardRepository
      .createQueryBuilder('whiteCard')
      .innerJoin('whiteCard.decks', 'deck')
      .where('deck.id = :deckId', { deckId })
      .getMany();
  }

  findSomeWhiteCardsInDeck(deckId: string, offset: number, limit: number): Promise<WhiteCard[]> {
    return this.whiteCardRepository
      .createQueryBuilder('whiteCard')
      .innerJoin('whiteCard.decks', 'deck')
      .where('deck.id = :deckId', { deckId })
      .offset(offset)
      .limit(limit)
      .getMany();
  }

  findAllBlackCardsInDeck(deckId: string): Promise<BlackCard[]> {
    return this.blackCardRepository
      .createQueryBuilder('blackCard')
      .innerJoin('blackCard.decks', 'deck')
      .where('deck.id = :deckId', { deckId })
      .getMany();
  }

  findSomeBlackCardsInDeck(deckId: string, offset: number, limit: number): Promise<WhiteCard[]> {
    return this.blackCardRepository
      .createQueryBuilder('blackCard')
      .innerJoin('blackCard.decks', 'deck')
      .where('deck.id = :deckId', { deckId })
      .offset(offset)
      .limit(limit)
      .getMany();
  }

  findOne(id: string, card_type: CardType) {
    switch (card_type) {
      case CardType.Black:
        return this.blackCardRepository.findOneBy({ id });
      case CardType.White:
        return this.whiteCardRepository.findOneBy({ id });
    }
  }
  
  async createWhiteCard(dto: CreateWhiteCardDto) {
    if (!Array.isArray(dto.deck_ids)) {
      dto.deck_ids = [dto.deck_ids];
    }

    const decks = await Promise.all(dto.deck_ids.map(id => this.decksService.findOne(id)));
    if (decks.some(d => !d)) {
      throw new NotFoundException("one of the decks specified was not valid");
    }

    const card = new WhiteCard();
    card.content = dto.content;
    card.decks = Promise.resolve(decks);

    this.whiteCardRepository.save(card);
  }

  async createBlackCard(dto: CreateBlackCardDto) {
    if (!Array.isArray(dto.deck_ids)) {
      dto.deck_ids = [dto.deck_ids];
    }

    const decks = await Promise.all(dto.deck_ids.map(id => this.decksService.findOne(id)));
    if (decks.some(d => !d)) {
      throw new NotFoundException("one of the decks specified was not valid");
    }

    const card = new BlackCard();
    card.content = dto.content;
    card.pick = dto.pick;
    card.decks = Promise.resolve(decks);

    this.blackCardRepository.save(card);
  }

  async updateWhiteCard(id: string, dto: UpdateWhiteCardDto) {
    const currentCard = await this.whiteCardRepository.findOne({ where: { id }, relations: ['decks']});

    if (!currentCard) {
      throw new NotFoundException("card not found");
    }

    if (dto.deck_ids) {
      if (!Array.isArray(dto.deck_ids)) {
        dto.deck_ids = [dto.deck_ids];
      }

      const decks = await Promise.all(dto.deck_ids.map(id => this.decksService.findOne(id)));
      if (decks.some(d => !d)) {
        throw new NotFoundException("one of the decks specified was not valid");
      }

      currentCard.decks = Promise.resolve(decks);
    }

    if (dto.content) {
      currentCard.content = dto.content;
    }

    this.whiteCardRepository.save(currentCard);
  }

  async updateBlackCard(id: string, dto: UpdateBlackCardDto) {
    const currentCard = await this.blackCardRepository.findOne({ where: { id }, relations: ['decks']});

    if (!currentCard) {
      throw new NotFoundException("card not found");
    }

    if (dto.deck_ids) {
      if (!Array.isArray(dto.deck_ids)) {
        dto.deck_ids = [dto.deck_ids];
      }

      const decks = await Promise.all(dto.deck_ids.map(id => this.decksService.findOne(id)));
      if (decks.some(d => !d)) {
        throw new NotFoundException("one of the decks specified was not valid");
      }

      currentCard.decks = Promise.resolve(decks);
    }

    if (dto.content) {
      currentCard.content = dto.content;
    }

    if (dto.pick) {
      currentCard.pick = dto.pick;
    }

    this.blackCardRepository.save(currentCard);
  }

  async remove(id: string, card_type: CardType) {
    switch (card_type) {
      case CardType.Black:
        return this.blackCardRepository.delete({ id });
      case CardType.White:
        return this.whiteCardRepository.delete({ id });
    }
  }
}
