import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DecksService } from 'src/decks/decks.service';
import { WhiteCard } from './entities/white-card.entity';
import { BlackCard } from './entities/black-card.entity';
import { UpdateWhiteCardDto } from './dto/update-white-card.dto';
import { UpdateBlackCardDto } from './dto/update-black-card.dto';
import IBlackCard from 'src/shared-types/card/black/black-card.interface';
import IWhiteCard from 'src/shared-types/card/white/white-card.interface';
import CreateWhiteCardDto from './dto/create-white-card.dto';
import CreateBlackCardDto from './dto/create-black-card.dto';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(WhiteCard) private whiteCardRepository: Repository<WhiteCard>,
    @InjectRepository(BlackCard) private blackCardRepository: Repository<BlackCard>,
    private decksService: DecksService
  ) { }

  countWhiteCardsInDeck(deckId: string): Promise<number> {
    return this.whiteCardRepository.createQueryBuilder('whiteCard')
      .innerJoin('whiteCard.decks', 'deck')
      .where('deck.id = :deckId', { deckId })
      .getCount();
  }

  countBlackCardsInDeck(deckId: string): Promise<number> {
    return this.blackCardRepository.createQueryBuilder('blackCard')
      .innerJoin('blackCard.decks', 'deck')
      .where('deck.id = :deckId', { deckId })
      .getCount();
  }

  findAllWhiteCardsInDeck(deckId: string): Promise<IWhiteCard[]> {
    return this.whiteCardRepository
      .createQueryBuilder('whiteCard')
      .innerJoin('whiteCard.decks', 'deck')
      .where('deck.id = :deckId', { deckId })
      .getMany();
  }

  findSomeWhiteCardsInDeck(deckId: string, offset: number, limit: number): Promise<IWhiteCard[]> {
    return this.whiteCardRepository
      .createQueryBuilder('whiteCard')
      .innerJoin('whiteCard.decks', 'deck')
      .where('deck.id = :deckId', { deckId })
      .offset(offset)
      .limit(limit)
      .getMany();
  }

  findAllBlackCardsInDeck(deckId: string): Promise<IBlackCard[]> {
    return this.blackCardRepository
      .createQueryBuilder('blackCard')
      .innerJoin('blackCard.decks', 'deck')
      .where('deck.id = :deckId', { deckId })
      .getMany();
  }

  findSomeBlackCardsInDeck(deckId: string, offset: number, limit: number): Promise<IBlackCard[]> {
    return this.blackCardRepository
      .createQueryBuilder('blackCard')
      .innerJoin('blackCard.decks', 'deck')
      .where('deck.id = :deckId', { deckId })
      .offset(offset)
      .limit(limit)
      .getMany();
  }

  findOneWhiteCard(id: string): Promise<IWhiteCard> {
    return this.whiteCardRepository.findOneBy({ id });
  }

  findOneBlackCard(id: string): Promise<IBlackCard> {
    return this.blackCardRepository.findOneBy({ id });
  }

  async createWhiteCard(dto: CreateWhiteCardDto): Promise<void> {
    if (!Array.isArray(dto.deckIds)) {
      dto.deckIds = [dto.deckIds];
    }

    const decks = await Promise.all(dto.deckIds.map(id => this.decksService.findOne(id)));
    if (decks.some(d => !d)) {
      throw new NotFoundException("one of the decks specified was not valid");
    }

    const card = new WhiteCard();
    card.content = dto.content;
    card.decks = Promise.resolve(decks);

    this.whiteCardRepository.save(card);
  }

  async createBlackCard(dto: CreateBlackCardDto): Promise<void> {
    if (!Array.isArray(dto.deckIds)) {
      dto.deckIds = [dto.deckIds];
    }

    const decks = await Promise.all(dto.deckIds.map(id => this.decksService.findOne(id)));
    if (decks.some(d => !d)) {
      throw new NotFoundException("one of the decks specified was not valid");
    }

    const card = new BlackCard();
    card.content = dto.content;
    card.pick = dto.pick;
    card.decks = Promise.resolve(decks);

    this.blackCardRepository.save(card);
  }

  async updateWhiteCard(id: string, dto: UpdateWhiteCardDto): Promise<void> {
    const currentCard = await this.whiteCardRepository.findOne({ where: { id }, relations: ['decks'] });

    if (!currentCard) {
      throw new NotFoundException("card not found");
    }

    if (dto.deckIds) {
      if (!Array.isArray(dto.deckIds)) {
        dto.deckIds = [dto.deckIds];
      }

      const decks = await Promise.all(dto.deckIds.map(id => this.decksService.findOne(id)));
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

  async updateBlackCard(id: string, dto: UpdateBlackCardDto): Promise<void> {
    const currentCard = await this.blackCardRepository.findOne({ where: { id }, relations: ['decks'] });

    if (!currentCard) {
      throw new NotFoundException("card not found");
    }

    if (dto.deckIds) {
      if (!Array.isArray(dto.deckIds)) {
        dto.deckIds = [dto.deckIds];
      }

      const decks = await Promise.all(dto.deckIds.map(id => this.decksService.findOne(id)));
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

  removeWhiteCard(id: string): void {
    this.whiteCardRepository.delete({ id });
  }

  removeBlackCard(id: string): void {
    this.blackCardRepository.delete({ id });
  }
}
