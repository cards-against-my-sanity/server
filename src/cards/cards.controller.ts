import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Permission } from 'src/permission/permission.class';
import { RequiredQuery } from 'src/util/required-query.decorator';
import { DecksService } from 'src/decks/decks.service';

@Controller('cards')
export class CardsController {
    constructor(
      private readonly cardsService: CardsService,
      private readonly decksService: DecksService
    ) {}

    @Get()
    @HasPermissions(Permission.ViewCards)
    async findAll(@RequiredQuery('deck') deck: string, @RequiredQuery('per_page') perPage: number, @RequiredQuery('page') page: number) {
      if (!(await this.decksService.findOne(deck))) {
        throw new NotFoundException("unknown deck");
      }

      perPage = Math.floor(perPage);
      perPage = perPage > 25 ? 25 : perPage;
      
      page = Math.floor(page);
      page = page < 1 ? 1 : page;

      const total = await this.cardsService.countAllInDeck(deck);
      const totalPages = Math.ceil(total / perPage) || 1;
      
      if (page > totalPages) {
        throw new BadRequestException("page is beyond total pages available");
      }

      const cards = await this.cardsService.findAllInDeck(deck, page == 1 ? 0 : (page - 1) * perPage, perPage);

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
    findOne(@Param('id') id: string) {
      return this.cardsService.findOne(id);
    }

    @Post()
    @HasPermissions(Permission.CreateCard)
    create(@Body() createCardDto: CreateCardDto) {
      return this.cardsService.create(createCardDto);
    }
  
    @Patch(':id')
    @HasPermissions(Permission.UpdateCard)
    update(@Param('id') id: string, @Body() updateCardDto: UpdateCardDto) {
      return this.cardsService.update(id, updateCardDto);
    }
  
    @Delete(':id')
    @HasPermissions(Permission.DeleteCard)
    remove(@Param('id') id: string) {
      return this.cardsService.remove(id);
    }
}
