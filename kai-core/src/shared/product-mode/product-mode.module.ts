import { Global, Module } from '@nestjs/common';
import { ProductModeService } from './product-mode.service';

@Global()
@Module({
  providers: [ProductModeService],
  exports: [ProductModeService],
})
export class ProductModeModule {}
