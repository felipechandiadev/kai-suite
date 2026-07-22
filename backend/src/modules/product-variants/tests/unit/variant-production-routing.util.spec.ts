import { BadRequestException } from '@nestjs/common';
import {
  ProductionUnitPurpose,
  ProductionUnitScope,
} from '@modules/production-units/domain/production-unit.enums';
import { ProductType } from '@modules/products/domain/product.entity';
import {
  assertRoutingDefaultsPerBranch,
  assertUnitAllowedForBranch,
  assertUnitPurposeMatchesProductType,
  expectedProductionUnitPurposeForProductType,
} from '../../application/helpers/variant-production-routing.util';

describe('variant-production-routing.util', () => {
  describe('assertRoutingDefaultsPerBranch', () => {
    it('accepts exactly one default per branch', () => {
      expect(() =>
        assertRoutingDefaultsPerBranch([
          { branchId: 'b1', isDefault: true },
          { branchId: 'b1', isDefault: false },
          { branchId: 'b2', isDefault: true },
        ]),
      ).not.toThrow();
    });

    it('rejects missing default', () => {
      expect(() =>
        assertRoutingDefaultsPerBranch([
          { branchId: 'b1', isDefault: false },
          { branchId: 'b1', isDefault: false },
        ]),
      ).toThrow(BadRequestException);
    });

    it('rejects two defaults on same branch', () => {
      expect(() =>
        assertRoutingDefaultsPerBranch([
          { branchId: 'b1', isDefault: true },
          { branchId: 'b1', isDefault: true },
        ]),
      ).toThrow(BadRequestException);
    });
  });

  describe('assertUnitAllowedForBranch', () => {
    it('allows BRANCH unit on matching branch', () => {
      expect(() =>
        assertUnitAllowedForBranch({
          unitScope: ProductionUnitScope.BRANCH,
          unitBranchId: 'b1',
          itemBranchId: 'b1',
        }),
      ).not.toThrow();
    });

    it('rejects BRANCH unit on other branch', () => {
      expect(() =>
        assertUnitAllowedForBranch({
          unitScope: ProductionUnitScope.BRANCH,
          unitBranchId: 'b1',
          itemBranchId: 'b2',
        }),
      ).toThrow(BadRequestException);
    });

    it('allows COMPANY unit on any branch', () => {
      expect(() =>
        assertUnitAllowedForBranch({
          unitScope: ProductionUnitScope.COMPANY,
          unitBranchId: null,
          itemBranchId: 'b2',
        }),
      ).not.toThrow();
    });
  });

  describe('expectedProductionUnitPurposeForProductType', () => {
    it('maps PREPARADO to KITCHEN and finished goods to BATCH', () => {
      expect(
        expectedProductionUnitPurposeForProductType(ProductType.PREPARADO),
      ).toBe(ProductionUnitPurpose.KITCHEN);
      expect(
        expectedProductionUnitPurposeForProductType(ProductType.ELABORADO),
      ).toBe(ProductionUnitPurpose.BATCH);
      expect(
        expectedProductionUnitPurposeForProductType(ProductType.MANUFACTURADO),
      ).toBe(ProductionUnitPurpose.BATCH);
      expect(
        expectedProductionUnitPurposeForProductType(ProductType.PHYSICAL),
      ).toBeNull();
    });
  });

  describe('assertUnitPurposeMatchesProductType', () => {
    it('accepts matching purpose', () => {
      expect(() =>
        assertUnitPurposeMatchesProductType({
          productType: ProductType.PREPARADO,
          unitPurpose: ProductionUnitPurpose.KITCHEN,
        }),
      ).not.toThrow();
      expect(() =>
        assertUnitPurposeMatchesProductType({
          productType: ProductType.MANUFACTURADO,
          unitPurpose: ProductionUnitPurpose.BATCH,
        }),
      ).not.toThrow();
    });

    it('rejects mismatched purpose', () => {
      expect(() =>
        assertUnitPurposeMatchesProductType({
          productType: ProductType.PREPARADO,
          unitPurpose: ProductionUnitPurpose.BATCH,
          unitName: 'Taller',
        }),
      ).toThrow(BadRequestException);
      expect(() =>
        assertUnitPurposeMatchesProductType({
          productType: ProductType.ELABORADO,
          unitPurpose: ProductionUnitPurpose.KITCHEN,
        }),
      ).toThrow(BadRequestException);
    });
  });
});
