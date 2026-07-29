import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { LaundryGarmentType } from './domain/laundry-garment-type.entity';
import { LaundryGarmentAttribute } from './domain/laundry-garment-attribute.entity';
import { LaundryGarmentAttributeValue } from './domain/laundry-garment-attribute-value.entity';
import { LaundryCareTemplate } from './domain/laundry-care-template.entity';
import { LaundryReception } from './domain/laundry-reception.entity';
import { LaundryReceptionGarment } from './domain/laundry-reception-garment.entity';
import { LaundryReceptionServiceLine } from './domain/laundry-reception-service-line.entity';
import { LaundryCatalogService } from './application/laundry-catalog.service';
import { LaundryReceptionCodeService } from './application/laundry-reception-code.service';
import { LaundryReceptionsService } from './application/laundry-receptions.service';
import { LaundryCatalogController } from './presentation/laundry-catalog.controller';
import { LaundryReceptionsController } from './presentation/laundry-receptions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LaundryGarmentType,
      LaundryGarmentAttribute,
      LaundryGarmentAttributeValue,
      LaundryCareTemplate,
      LaundryReception,
      LaundryReceptionGarment,
      LaundryReceptionServiceLine,
      ProductVariant,
      Product,
      Customer,
    ]),
  ],
  controllers: [LaundryCatalogController, LaundryReceptionsController],
  providers: [
    LaundryCatalogService,
    LaundryReceptionCodeService,
    LaundryReceptionsService,
  ],
  exports: [
    LaundryCatalogService,
    LaundryReceptionCodeService,
    LaundryReceptionsService,
  ],
})
export class LaundryModule {}
