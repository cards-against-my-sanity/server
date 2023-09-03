import { PartialType } from '@nestjs/mapped-types';
import { CreateBlackCardDto } from './create-black-card.dto';

export class UpdateBlackCardDto extends PartialType(CreateBlackCardDto) {}
