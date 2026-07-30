import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetalPrice } from '@modules/metal-prices/domain/metal-price.entity';
import { MetalType } from '@modules/metal-prices/domain/metal.enum';

export interface MetalPriceDTO {
  id?: string;
  date: string;
  valueCLP: number;
  notes?: string;
  metal: string;
}

@Injectable()
export class MetalPriceService {
  constructor(
    @InjectRepository(MetalPrice)
    private readonly metalPriceRepository: Repository<MetalPrice>,
  ) {}

  async getMetalPrices(): Promise<MetalPriceDTO[]> {
    try {
      const prices = await this.metalPriceRepository.find({
        order: { date: 'DESC' },
      });
      const result = prices.map((p) => ({
        id: p.id,
        date: p.date.toISOString(),
        valueCLP: Number(p.valueCLP),
        notes: p.notes,
        metal: p.metal,
      }));
      console.log('MetalPriceService - getMetalPrices result:', result);
      return result;
    } catch (err) {
      console.error('MetalPriceService - Error getting prices:', err);
      return [];
    }
  }

  async saveMetalPrice(
    data: MetalPriceDTO,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let entity: MetalPrice;
      if (data.id) {
        const found = await this.metalPriceRepository.findOneBy({ id: data.id });
        if (!found) return { success: false, error: 'Record not found' };
        entity = found;
      } else {
        entity = this.metalPriceRepository.create();
      }
      entity.date = new Date(data.date);
      entity.valueCLP = data.valueCLP;
      entity.notes = data.notes;
      entity.metal = data.metal;
      await this.metalPriceRepository.save(entity);
      return { success: true };
    } catch (err) {
      console.error('MetalPriceService - Error saving price:', err);
      return { success: false, error: String(err) };
    }
  }
}
