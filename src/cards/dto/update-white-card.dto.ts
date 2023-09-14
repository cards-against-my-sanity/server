import { PartialType } from '@nestjs/mapped-types';
import { CreateWhiteCardDto } from './create-white-card.dto';

export class UpdateWhiteCardDto extends PartialType(CreateWhiteCardDto) { }
