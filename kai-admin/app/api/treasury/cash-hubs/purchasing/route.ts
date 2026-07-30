import { CashHubsRequest } from "@/features/treasury-cash-hubs/infrastructure/cash-hubs.request";
import { getCompanyDetailsAction } from "@/features/settings-company/actions/company.action";

export async function GET() {
  const details = await getCompanyDetailsAction();
  const companyId = details?.id?.trim() ?? "";
  if (!companyId) {
    return Response.json([], { status: 200 });
  }
  const hubs = await CashHubsRequest.list(companyId);
  return Response.json(hubs, { status: 200 });
}

