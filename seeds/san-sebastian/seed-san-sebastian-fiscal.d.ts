import type { INestApplicationContext } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
export declare function seedSanSebastianFiscal(args: {
    app: INestApplicationContext;
    companyId: string;
    posId: string;
    posRepo: Repository<PointOfSale>;
}): Promise<void>;
