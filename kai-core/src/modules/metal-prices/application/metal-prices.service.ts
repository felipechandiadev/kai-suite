import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetalPrice } from '../domain/metal-price.entity';
import { CreateMetalPriceDto } from './dto/create-metal-price.dto';
import { UpdateMetalPriceDto } from './dto/update-metal-price.dto';

@Injectable()
export class MetalPricesService {
  constructor(
    @InjectRepository(MetalPrice)
    private readonly metalPriceRepository: Repository<MetalPrice>,
  ) {}

  private toDto(p: MetalPrice) {
    return {
      id: p.id,
      companyId: p.companyId,
      date: p.date.toISOString(),
      valueCLP: Number(p.valueCLP),
      notes: p.notes ?? null,
      metal: p.metal,
    };
  }

  private async findOwned(id: string, companyId: string): Promise<MetalPrice> {
    const price = await this.metalPriceRepository.findOne({
      where: { id, companyId },
    });
    if (!price) {
      throw new NotFoundException('Metal price not found');
    }
    return price;
  }

  async findAll(companyId: string) {
    const prices = await this.metalPriceRepository.find({
      where: { companyId },
      order: { date: 'DESC' },
    });

    return {
      success: true,
      data: prices.map((p) => this.toDto(p)),
    };
  }

  async findOne(id: string, companyId: string) {
    const price = await this.findOwned(id, companyId);
    return {
      success: true,
      data: this.toDto(price),
    };
  }

  async create(companyId: string, createDto: CreateMetalPriceDto) {
    const price = this.metalPriceRepository.create({
      companyId,
      date: new Date(createDto.date),
      valueCLP: createDto.valueCLP,
      metal: createDto.metal,
      notes: createDto.notes,
    });

    const saved = await this.metalPriceRepository.save(price);

    return {
      success: true,
      data: this.toDto(saved),
    };
  }

  async update(id: string, companyId: string, updateDto: UpdateMetalPriceDto) {
    const price = await this.findOwned(id, companyId);

    if (updateDto.date) price.date = new Date(updateDto.date);
    if (updateDto.valueCLP !== undefined) price.valueCLP = updateDto.valueCLP;
    if (updateDto.metal) price.metal = updateDto.metal;
    if (updateDto.notes !== undefined) price.notes = updateDto.notes;

    const saved = await this.metalPriceRepository.save(price);

    return {
      success: true,
      data: this.toDto(saved),
    };
  }

  async remove(id: string, companyId: string) {
    const price = await this.findOwned(id, companyId);
    await this.metalPriceRepository.remove(price);

    return {
      success: true,
      message: 'Metal price deleted',
    };
  }
}
