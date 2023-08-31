import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { DecksService } from './decks.service';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Permission } from 'src/permission/permission.class';

@Controller('decks')
export class DecksController {
    constructor(private readonly decksService: DecksService) {}

    @Post()
    @HasPermissions(Permission.CreateDeck)
    create(@Body() createDeckDto: CreateDeckDto) {
      return this.decksService.create(createDeckDto);
    }
  
    @Patch(':id')
    @HasPermissions(Permission.UpdateDeck)
    update(@Param('id') id: string, @Body() updateDeckDto: UpdateDeckDto) {
      return this.decksService.update(id, updateDeckDto);
    }
  
    @Delete(':id')
    @HasPermissions(Permission.DeleteDeck)
    remove(@Param('id') id: string) {
      return this.decksService.remove(id);
    }
}
