import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Promotion } from './domain/promotion.entity';
import { PromotionScopeBranch } from './domain/promotion-scope-branch.entity';
import { PromotionScopePos } from './domain/promotion-scope-pos.entity';
import { PromotionScopeProduct } from './domain/promotion-scope-product.entity';
import { PromotionScopeVariant } from './domain/promotion-scope-variant.entity';
import { PromotionScopeCategory } from './domain/promotion-scope-category.entity';
import { PromotionScopeCustomer } from './domain/promotion-scope-customer.entity';
import { PromotionScopePaymentMethod } from './domain/promotion-scope-payment-method.entity';
import { PromotionRedemption } from './domain/promotion-redemption.entity';
import { PromotionsBootstrap } from './infrastructure/promotions.bootstrap';
import { PromotionsService } from './application/promotions.service';
import { PromotionsAdminController } from './presentation/promotions.admin.controller';
import { PromotionsPosController } from './presentation/promotions.pos.controller';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      Promotion,
      PromotionScopeBranch,
      PromotionScopePos,
      PromotionScopeProduct,
      PromotionScopeVariant,
      PromotionScopeCategory,
      PromotionScopeCustomer,
      PromotionScopePaymentMethod,
      PromotionRedemption,
    ]),
  ],
  controllers: [PromotionsAdminController, PromotionsPosController],
  providers: [PromotionsBootstrap, PromotionsService],
  exports: [PromotionsService, TypeOrmModule],
})
export class PromotionsModule {}
