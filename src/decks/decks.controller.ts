import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { DecksService } from './decks.service';
import { HasPermissions } from 'src/permission/permissions.decorator';
import IDeck from 'src/shared-types/deck/deck.interface';
import Permission from 'src/shared-types/permission/permission.class';

@Controller('decks')
export class DecksController {
  constructor(private readonly decksService: DecksService) { }

  @Get()
  findAll(): Promise<IDeck[]> {
    return this.decksService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<IDeck> {
    const deck = await this.decksService.findOne(id);

    if (!deck) {
      throw new NotFoundException();
    }

    return deck;
  }

  @Post()
  @HasPermissions(Permission.CreateDeck)
  async create(@Body() createDeckDto: CreateDeckDto): Promise<void> {
    await this.decksService.create(createDeckDto);
  }

  @Patch(':id')
  @HasPermissions(Permission.UpdateDeck)
  async update(@Param('id') id: string, @Body() updateDeckDto: UpdateDeckDto): Promise<void> {
    await this.decksService.update(id, updateDeckDto);
  }

  @Delete(':id')
  @HasPermissions(Permission.DeleteDeck)
  remove(@Param('id') id: string): void {
    this.decksService.remove(id);
  }
}
