import { PartialType } from '@nestjs/mapped-types';
import { CreateDeckDto } from './create-deck.dto';
import IUpdateDeckDto from 'src/shared-types/deck/update-deck.dto.interface';

export class UpdateDeckDto extends PartialType(CreateDeckDto) implements IUpdateDeckDto { }
