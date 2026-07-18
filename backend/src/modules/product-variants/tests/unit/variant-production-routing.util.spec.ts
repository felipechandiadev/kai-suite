import { BadRequestException } from '@nestjs/common';
import { ProductionUnitScope } from '@modules/production-units/domain/production-unit.enums';
import {
  assertRoutingDefaultsPerBranch,
  assertUnitAllowedForBranch,
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
});
