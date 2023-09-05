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

interface UpdateWhiteCardPayload {
  deck?: Promise<Deck>,
  content?: string
}

interface UpdateBlackCardPayload {
  deck?: Promise<Deck>,
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
    const criterion = { deck: { id: deckId }};
    switch (card_type) {
      case CardType.Black:
        return this.blackCardRepository.countBy(criterion);
      case CardType.White:
        return this.whiteCardRepository.countBy(criterion);
    }
  }

  findAllWhiteCardsInDeck(deckId: string): Promise<WhiteCard[]> {
    return this.whiteCardRepository.find({ where: { deck: { id: deckId }}});
  }

  findSomeWhiteCardsInDeck(deckId: string, offset: number, limit: number): Promise<WhiteCard[]> {
    return this.whiteCardRepository.find({ where: { deck: { id: deckId }}, skip: offset, take: limit });
  }

  findAllBlackCardsInDeck(deckId: string): Promise<BlackCard[]> {
    return this.blackCardRepository.find({ where: { deck: { id: deckId }}});
  }

  findSomeBlackCardsInDeck(deckId: string, offset: number, limit: number): Promise<WhiteCard[]> {
    return this.blackCardRepository.find({ where: { deck: { id: deckId }}, skip: offset, take: limit });
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
    const deck = await this.decksService.findOne(dto.deck_id);
    if (!deck) {
      throw new NotFoundException("deck does not exist");
    }

    this.whiteCardRepository.save({
      content: dto.content,
      deck: Promise.resolve(deck)
    })
  }

  async createBlackCard(dto: CreateBlackCardDto) {
    const deck = await this.decksService.findOne(dto.deck_id);
    if (!deck) {
      throw new NotFoundException("deck does not exist");
    }

    this.blackCardRepository.save({
      content: dto.content,
      pick: dto.pick,
      deck: Promise.resolve(deck)
    })
  }

  async updateWhiteCard(id: string, dto: UpdateWhiteCardDto) {
    const payload: UpdateWhiteCardPayload = {}

    const currentCard = await this.whiteCardRepository.findOneBy({ id });
    const currentDeck = await currentCard.deck;

    if (dto.deck_id && dto.deck_id !== currentDeck.id) {
      const deck = await this.decksService.findOne(dto.deck_id);
      if (!deck) {
        throw new NotFoundException("deck does not exist");
      }

      payload.deck = Promise.resolve(deck);
    }

    if (dto.content) {
      payload.content = dto.content;
    }

    this.whiteCardRepository.update({ id }, payload);
  }

  async updateBlackCard(id: string, dto: UpdateBlackCardDto) {
    const payload: UpdateBlackCardPayload = {}

    const currentCard = await this.whiteCardRepository.findOneBy({ id });
    const currentDeck = await currentCard.deck;

    if (dto.deck_id && dto.deck_id !== currentDeck.id) {
      const deck = await this.decksService.findOne(dto.deck_id);
      if (!deck) {
        throw new NotFoundException("deck does not exist");
      }

      payload.deck = Promise.resolve(deck);
    }

    if (dto.content) {
      payload.content = dto.content;
    }

    if (dto.pick) {
      payload.pick = dto.pick;
    }

    this.blackCardRepository.update({ id }, payload);
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
