import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { CardsService } from './cards.service';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Permission } from 'src/permission/permission.class';
import { RequiredQuery } from 'src/util/decorator/required-query.decorator';
import { DecksService } from 'src/decks/decks.service';
import { UpdateWhiteCardDto } from './dto/update-white-card.dto';
import { UpdateBlackCardDto } from './dto/update-black-card.dto';
import PaginatedWhiteCardsPayload from 'src/shared-types/card/white/paginated-white-cards.payload';
import PaginatedBlackCardsPayload from 'src/shared-types/card/black/paginated-black-cards.payload';
import IWhiteCard from 'src/shared-types/card/white/white-card.interface';
import IBlackCard from 'src/shared-types/card/black/black-card.interface';
import CreateWhiteCardDto from './dto/create-white-card.dto';
import CreateBlackCardDto from './dto/create-black-card.dto';

@Controller('cards')
export class CardsController {
  constructor(
    private readonly cardsService: CardsService,
    private readonly decksService: DecksService
  ) { }

  @Get("white")
  async findSomeWhiteCardsInDeck(@RequiredQuery('deck') deck: string, @RequiredQuery('per_page') perPage: number, @RequiredQuery('page') page: number): Promise<PaginatedWhiteCardsPayload> {
    if (!(await this.decksService.findOne(deck))) {
      throw new NotFoundException("unknown deck");
    }

    const { normalPerPage, normalPage } = this.normalizeParams(perPage, page);

    const results = await this.cardsService.countWhiteCardsInDeck(deck);
    const pages = Math.ceil(results / normalPerPage) || 1;

    if (normalPage > pages) {
      throw new BadRequestException("page is beyond total pages available");
    }

    const offset = normalPage === 1 ? 0 : (normalPage - 1) * normalPerPage;

    const cards = await this.cardsService.findSomeWhiteCardsInDeck(deck, offset, normalPerPage);

    return {
      pagination: {
        results,
        page: normalPage,
        pages
      },
      cards
    }
  }

  @Get("black")
  async findSomeBlackCardsInDeck(@RequiredQuery('deck') deck: string, @RequiredQuery('per_page') perPage: number, @RequiredQuery('page') page: number): Promise<PaginatedBlackCardsPayload> {
    if (!(await this.decksService.findOne(deck))) {
      throw new NotFoundException("unknown deck");
    }

    const { normalPerPage, normalPage } = this.normalizeParams(perPage, page);

    const results = await this.cardsService.countBlackCardsInDeck(deck);
    const pages = Math.ceil(results / normalPerPage) || 1;

    if (normalPage > pages) {
      throw new BadRequestException("page is beyond total pages available");
    }

    const offset = normalPage === 1 ? 0 : (normalPage - 1) * normalPerPage;

    const cards = await this.cardsService.findSomeBlackCardsInDeck(deck, offset, normalPerPage);

    return {
      pagination: {
        results,
        page: normalPage,
        pages
      },
      cards
    }
  }

  private normalizeParams(perPage: number, page: number): Record<string, number> {
    perPage = Math.floor(perPage);
    perPage = perPage > 25 ? 25 : perPage;

    page = Math.floor(page);
    page = page < 1 ? 1 : page;

    return { normalPerPage: perPage, normalPage: page };
  }

  @Get("white/:id")
  findOneWhiteCard(@Param('id') id: string): Promise<IWhiteCard> {
    return this.cardsService.findOneWhiteCard(id);
  }

  @Get("black/:id")
  findOneBlackCard(@Param('id') id: string): Promise<IBlackCard> {
    return this.cardsService.findOneBlackCard(id);
  }

  @Post("white")
  @HasPermissions(Permission.CreateCard)
  createWhiteCard(@Body() dto: CreateWhiteCardDto): void {
    this.cardsService.createWhiteCard(dto);
  }

  @Post("black")
  @HasPermissions(Permission.CreateCard)
  createBlackCard(@Body() dto: CreateBlackCardDto): void {
    this.cardsService.createBlackCard(dto);
  }

  @Patch('white/:id')
  @HasPermissions(Permission.UpdateCard)
  updateWhiteCard(@Param('id') id: string, @Body() dto: UpdateWhiteCardDto): void {
    this.cardsService.updateWhiteCard(id, dto);
  }

  @Patch('black/:id')
  @HasPermissions(Permission.UpdateCard)
  updateBlackCard(@Param('id') id: string, @Body() dto: UpdateBlackCardDto): void {
    this.cardsService.updateBlackCard(id, dto);
  }

  @Delete('white/:id')
  @HasPermissions(Permission.DeleteCard)
  removeWhiteCard(@Param('id') id: string): void {
    this.cardsService.removeWhiteCard(id);
  }

  @Delete('black/:id')
  @HasPermissions(Permission.DeleteCard)
  removeBlackCard(@Param('id') id: string): void {
    this.cardsService.removeBlackCard(id);
  }
}
