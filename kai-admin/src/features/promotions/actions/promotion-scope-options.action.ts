"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { PointOfSaleRequest } from "@/features/sales-points-of-sale/infrastructure/point-of-sale.request";
import { listCategoriesForPage } from "@/features/inventory-categories/actions/category.action";
import { getCompanyPaymentMethodsAction } from "@/features/companies/actions/companies-payment-methods.action";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import type { CategoryListItem } from "@/features/inventory-categories/types/category.types";
import type { CompanyPaymentMethodConfig } from "@/features/companies/types/company-payment-methods.types";

export type PromotionScopeOptions = {
  companyId: string | null;
  branches: BranchListItem[];
  pointsOfSale: PointOfSaleListItem[];
  categories: CategoryListItem[];
  paymentMethods: CompanyPaymentMethodConfig[];
};

export async function loadPromotionScopeOptionsAction(): Promise<PromotionScopeOptions> {
  const session = await getServerSession(authOptions);
  const companyId =
    ((session?.user as { activeCompanyId?: string | null })?.activeCompanyId as
      | string
      | null
      | undefined) ?? null;

  const [branches, posRes, categories, pmRes] = await Promise.all([
    listBranchesForSettingsPage(),
    PointOfSaleRequest.findAll(),
    listCategoriesForPage(),
    companyId ? getCompanyPaymentMethodsAction(companyId) : Promise.resolve(null),
  ]);

  const paymentMethods: CompanyPaymentMethodConfig[] =
    pmRes && "success" in pmRes && pmRes.success ? pmRes.paymentMethods : [];

  return {
    companyId,
    branches,
    pointsOfSale: posRes.success ? posRes.pointsOfSale : [],
    categories,
    paymentMethods,
  };
}
