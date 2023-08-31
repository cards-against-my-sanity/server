import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Deck } from './entities/deck.entity';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { Repository } from 'typeorm';

@Injectable()
export class DecksService {
  constructor(@InjectRepository(Deck) private decksRepository: Repository<Deck>) {}

  async create(createDeckDto: CreateDeckDto) {
    const existing = await this.decksRepository.findOneBy({ name: createDeckDto.name });
    if (existing != null) {
      throw new ConflictException("deck already exists");
    }

    this.decksRepository.save(createDeckDto)
  }

  findAll() {
    return this.decksRepository.find()
  }

  findOne(id: string) {
    return this.decksRepository.findOneBy({ id })
  }

  async update(id: string, updateDeckDto: UpdateDeckDto) {
    await this.decksRepository.update({ id }, updateDeckDto)
  }

  async remove(id: string) {
    await this.decksRepository.delete({ id })
  }
}
