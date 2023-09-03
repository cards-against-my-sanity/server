import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { CardsService } from './cards.service';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Permission } from 'src/permission/permission.class';
import { RequiredQuery } from 'src/util/required-query.decorator';
import { DecksService } from 'src/decks/decks.service';
import { CardType } from './card-type.enum';
import { CreateBlackCardDto } from './dto/create-black-card.dto';
import { CreateWhiteCardDto } from './dto/create-white-card.dto';
import { UpdateWhiteCardDto } from './dto/update-white-card.dto';
import { UpdateBlackCardDto } from './dto/update-black-card.dto';

@Controller('cards')
export class CardsController {
    constructor(
      private readonly cardsService: CardsService,
      private readonly decksService: DecksService
    ) {}

    @Get()
    @HasPermissions(Permission.ViewCards)
    async findAll(@RequiredQuery('deck') deck: string, @RequiredQuery("card_type") cardType: CardType, @RequiredQuery('per_page') perPage: number, @RequiredQuery('page') page: number) {
      if (!(await this.decksService.findOne(deck))) {
        throw new NotFoundException("unknown deck");
      }

      perPage = Math.floor(perPage);
      perPage = perPage > 25 ? 25 : perPage;
      
      page = Math.floor(page);
      page = page < 1 ? 1 : page;

      const total = await this.cardsService.countAllInDeck(deck, cardType);
      const totalPages = Math.ceil(total / perPage) || 1;
      
      if (page > totalPages) {
        throw new BadRequestException("page is beyond total pages available");
      }

      const cards = await this.cardsService.findAllInDeck(deck, cardType, page == 1 ? 0 : (page - 1) * perPage, perPage);

      return {
        pagination: {
          total,
          page,
          total_pages: totalPages
        },
        cards
      }
    }

    @Get(':id')
    @HasPermissions(Permission.ViewCard)
    findOne(@Param('id') id: string, @RequiredQuery("card_type") cardType: CardType) {
      return this.cardsService.findOne(id, cardType);
    }

    @Post("white")
    @HasPermissions(Permission.CreateCard)
    createWhiteCard(@Body() dto: CreateWhiteCardDto) {
      return this.cardsService.createWhiteCard(dto);
    }

    @Post("black")
    @HasPermissions(Permission.CreateCard)
    createBlackCard(@Body() dto: CreateBlackCardDto) {
      return this.cardsService.createBlackCard(dto);
    }
  
    @Patch('white/:id')
    @HasPermissions(Permission.UpdateCard)
    updateWhiteCard(@Param('id') id: string, @Body() dto: UpdateWhiteCardDto) {
      return this.cardsService.updateWhiteCard(id, dto);
    }

    @Patch('black/:id')
    @HasPermissions(Permission.UpdateCard)
    updateBlackCard(@Param('id') id: string, @Body() dto: UpdateBlackCardDto) {
      return this.cardsService.updateBlackCard(id, dto);
    }
  
    @Delete(':id')
    @HasPermissions(Permission.DeleteCard)
    remove(@Param('id') id: string, @RequiredQuery("card_type") cardType: CardType) {
      return this.cardsService.remove(id, cardType);
    }
}
