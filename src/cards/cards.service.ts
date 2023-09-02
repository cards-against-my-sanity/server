import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Card } from './entities/card.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateCardDto } from './dto/update-card.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { CardType } from './card-type.enum';
import { DecksService } from 'src/decks/decks.service';
import { Deck } from 'src/decks/entities/deck.entity';

interface UpdatePayload {
  deck?: Promise<Deck>,
  card_type?: CardType,
  content?: string,
  num_answers?: number
}

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card) private cardsRepository: Repository<Card>,
    private decksService: DecksService
  ) {}

  countAllInDeck(deckId: string) {
    return this.cardsRepository.countBy({ deck: { id: deckId }})
  }

  findAllInDeck(deckId: string, offset: number, limit: number) {
    return this.cardsRepository.find({ where: { deck: { id: deckId } }, skip: offset, take: limit });
  }

  findOne(id: string) {
    return this.cardsRepository.findOneBy({ id })
  }

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

    if (card_type === CardType.Black && num_answers === 0) {
      throw new BadRequestException("black cards cannot have num_answers === 0")
    } else if (card_type === CardType.White && num_answers !== 0) {
      throw new BadRequestException("white cards must have num_answers === 0")
    }

    const card = new Card();
    card.card_type = card_type;
    card.content = content;
    card.num_answers = num_answers;
    card.deck = Promise.resolve(deck);

    this.cardsRepository.save(card)
  }

  async update(id: string, updateCardDto: UpdateCardDto) {
    const payload: UpdatePayload = {};

    const currentCard = await this.cardsRepository.findOneBy({ id });
    const currentCardDeck = await currentCard.deck;

    const { card_type, content, num_answers, deck_id } = updateCardDto;

    // moving decks
    if (deck_id && deck_id !== currentCardDeck.id) {
      const deck = await this.decksService.findOne(deck_id);
      if (!deck) {
        throw new NotFoundException("deck does not exist");
      }

      payload.deck = Promise.resolve(deck);
    }

    // changing card_type (implies changing num_answers)
    if (card_type && card_type !== currentCard.card_type) {
      if (num_answers === undefined || num_answers === null) {
        throw new BadRequestException("cannot change card type without also changing num_answers");
      }

      if (card_type === CardType.Black && num_answers === 0) {
        throw new BadRequestException("black cards cannot have num_answers === 0")
      } else if (card_type === CardType.White && num_answers !== 0) {
        throw new BadRequestException("white cards must have num_answers === 0")
      }

      payload.card_type = card_type;
      payload.num_answers = num_answers;
    }

    // changing num_answers but not changing card_type
    if (num_answers !== undefined && num_answers !== null && num_answers !== currentCard.num_answers && !card_type) {
      if (currentCard.card_type === CardType.Black && num_answers === 0) {
        throw new BadRequestException("black cards cannot have num_answers === 0")
      } else if (currentCard.card_type === CardType.White && num_answers !== 0) {
        throw new BadRequestException("white cards must have num_answers === 0")
      }

      payload.num_answers = num_answers;
    }

    // changing content
    if (content) {
      // check whether content && currentCard.content are different
      // card content equality is case and accent sensitive
      if (content.localeCompare(currentCard.content, undefined, { sensitivity: 'variant' }) !== 0) {
        payload.content = content;
      }
    }

    if (Object.keys(payload).length === 0) {
      throw new BadRequestException("no effective update (update parameters match existing card)")
    }

    // check for an existing card based on the properties actually being changed
    const where: Record<string, any> = {};

    if (payload.card_type) {
      where.card_type = payload.card_type;
    } else {
      where.card_type = currentCard.card_type;
    }

    if (payload.num_answers !== undefined && payload.num_answers !== null) {
      where.num_answers = payload.num_answers;
    } else {
      where.num_answers = currentCard.num_answers;
    }
    
    if (payload.content) {
      where.content = payload.content;
    } else {
      where.content = currentCard.content;
    }

    const existing = await this.cardsRepository.findOneBy(where);
    
    // an existing card was found (and it is not the current card, which we already OK'd)
    if (existing && existing.id !== currentCard.id) {
      throw new ConflictException("exact card already exists");
    }

    await this.cardsRepository.update({ id }, payload);
  }

  async remove(id: string) {
    await this.cardsRepository.delete({ id })
  }
}
