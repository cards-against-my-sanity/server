import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Deck } from './entities/deck.entity';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { Repository } from 'typeorm';
import { CardsService } from 'src/cards/cards.service';

@Injectable()
export class DecksService {
  constructor(
    @InjectRepository(Deck) private readonly decksRepository: Repository<Deck>
  ) {}

  async create(createDeckDto: CreateDeckDto) {
    const existing = await this.decksRepository.findOneBy({ name: createDeckDto.name });
    if (existing != null) {
      throw new ConflictException("deck already exists");
    }

    this.decksRepository.save(createDeckDto)
  }

  findAll() {
    return this.decksRepository.find({order: {weight: 'asc', name: 'asc'}})
  }

  findOne(id: string) {
    return this.decksRepository.findOneBy({ id })
  }

  exist(id: string) {
    return this.decksRepository.exist({ where: { id }})
  }

  async update(id: string, updateDeckDto: UpdateDeckDto) {
    if (updateDeckDto.name) {
      const existing = await this.decksRepository.findOneBy({ name: updateDeckDto.name });
      if (existing != null) {
        throw new ConflictException("deck already exists");
      }
    }

    await this.decksRepository.update({ id }, updateDeckDto)
  }

  async remove(id: string) {
    await this.decksRepository.delete({ id })
  }
}
