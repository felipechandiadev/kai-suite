"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinimalSeedModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_config_1 = require("../../kai-core/src/config/typeorm.config");
const config_module_1 = require("../../kai-core/src/config/config.module");
const config_service_1 = require("../../kai-core/src/config/config.service");
const user_entity_1 = require("../../kai-core/src/modules/users/domain/user.entity");
const person_entity_1 = require("../../kai-core/src/modules/persons/domain/person.entity");
const company_entity_1 = require("../../kai-core/src/modules/companies/domain/company.entity");
const tax_entity_1 = require("../../kai-core/src/modules/taxes/domain/tax.entity");
const branch_entity_1 = require("../../kai-core/src/modules/branches/domain/branch.entity");
const unit_entity_1 = require("../../kai-core/src/modules/units/domain/unit.entity");
const category_entity_1 = require("../../kai-core/src/modules/categories/domain/category.entity");
const attribute_entity_1 = require("../../kai-core/src/modules/attributes/domain/attribute.entity");
const price_list_entity_1 = require("../../kai-core/src/modules/price-lists/domain/price-list.entity");
const point_of_sale_entity_1 = require("../../kai-core/src/modules/points-of-sale/domain/point-of-sale.entity");
const cash_hub_entity_1 = require("../../kai-core/src/modules/cash-hubs/domain/cash-hub.entity");
const expense_category_entity_1 = require("../../kai-core/src/modules/expense-categories/domain/expense-category.entity");
const supplier_entity_1 = require("../../kai-core/src/modules/suppliers/domain/supplier.entity");
const shareholder_entity_1 = require("../../kai-core/src/modules/shareholders/domain/shareholder.entity");
const accounting_account_entity_1 = require("../../kai-core/src/modules/accounting-accounts/domain/accounting-account.entity");
const accounting_rule_entity_1 = require("../../kai-core/src/modules/accounting-rules/domain/accounting-rule.entity");
const accounting_rule_line_entity_1 = require("../../kai-core/src/modules/accounting-rules/domain/accounting-rule-line.entity");
const product_entity_1 = require("../../kai-core/src/modules/products/domain/product.entity");
const brand_entity_1 = require("../../kai-core/src/modules/brands/domain/brand.entity");
const product_variant_entity_1 = require("../../kai-core/src/modules/product-variants/domain/product-variant.entity");
const price_list_item_entity_1 = require("../../kai-core/src/modules/price-list-items/domain/price-list-item.entity");
const storage_entity_1 = require("../../kai-core/src/modules/storages/domain/storage.entity");
const stock_level_entity_1 = require("../../kai-core/src/modules/stock-levels/domain/stock-level.entity");
const multimedia_asset_entity_1 = require("../../kai-core/src/modules/multimedia/domain/multimedia-asset.entity");
const multimedia_link_entity_1 = require("../../kai-core/src/modules/multimedia/domain/multimedia-link.entity");
const e_shop_hero_slide_entity_1 = require("../../kai-core/src/modules/e-shop/domain/e-shop-hero-slide.entity");
const e_shop_testimonial_entity_1 = require("../../kai-core/src/modules/e-shop/domain/e-shop-testimonial.entity");
const operational_expenses_module_1 = require("../../kai-core/src/modules/operational-expenses/operational-expenses.module");
const fiscal_module_1 = require("../../kai-core/src/modules/fiscal/fiscal.module");
let MinimalSeedModule = class MinimalSeedModule {
};
exports.MinimalSeedModule = MinimalSeedModule;
exports.MinimalSeedModule = MinimalSeedModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_module_1.AppConfigModule,
            event_emitter_1.EventEmitterModule.forRoot(),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_module_1.AppConfigModule],
                useFactory: typeorm_config_1.typeOrmConfig,
                inject: [config_service_1.AppConfigService],
            }),
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                person_entity_1.Person,
                company_entity_1.Company,
                tax_entity_1.Tax,
                branch_entity_1.Branch,
                unit_entity_1.Unit,
                category_entity_1.Category,
                attribute_entity_1.Attribute,
                price_list_entity_1.PriceList,
                point_of_sale_entity_1.PointOfSale,
                cash_hub_entity_1.CashHub,
                expense_category_entity_1.ExpenseCategory,
                supplier_entity_1.Supplier,
                shareholder_entity_1.Shareholder,
                accounting_account_entity_1.AccountingAccount,
                accounting_rule_entity_1.AccountingRule,
                accounting_rule_line_entity_1.AccountingRuleLine,
                product_entity_1.Product,
                brand_entity_1.Brand,
                product_variant_entity_1.ProductVariant,
                price_list_item_entity_1.PriceListItem,
                storage_entity_1.Storage,
                stock_level_entity_1.StockLevel,
                multimedia_asset_entity_1.MultimediaAsset,
                multimedia_link_entity_1.MultimediaLink,
                e_shop_hero_slide_entity_1.EShopHeroSlide,
                e_shop_testimonial_entity_1.EShopTestimonial,
            ]),
            operational_expenses_module_1.OperationalExpensesModule,
            fiscal_module_1.FiscalModule,
        ],
    })
], MinimalSeedModule);
//# sourceMappingURL=minimal-seed.module.js.map