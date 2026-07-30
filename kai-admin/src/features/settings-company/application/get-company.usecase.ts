import "server-only";
import {
  CompanyRequest,
  type CompanyDetails,
} from "@/features/settings-branches/infrastructure/company.request";

export class GetCompanyUseCase {
  static async execute(): Promise<CompanyDetails | null> {
    return CompanyRequest.getDetails();
  }
}
