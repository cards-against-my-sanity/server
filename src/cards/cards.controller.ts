import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Permission } from 'src/permission/permission.class';

@Controller('cards')
export class CardsController {
    constructor(private readonly cardsService: CardsService) {}

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
