import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import type { PrintableCompanyInfo } from "@/shared/components/PrintDocuments/PrintableDocumentLayout";

export function printableCompanyFromDetails(
  details: CompanyDetails | null,
): PrintableCompanyInfo {
  const razonSocial = details?.razonSocial?.trim() || "Empresa";
  const displayName = details?.nombreFantasia?.trim()
    ? details.nombreFantasia.trim()
    : null;
  const rut = details?.rut?.trim() ? details.rut.trim() : null;
  const settings = (details?.settings ?? {}) as Record<string, unknown>;

  const columnAddress = details?.address?.trim() ? details.address.trim() : "";
  const addressRaw =
    columnAddress ||
    (typeof settings["address"] === "string" ? settings["address"].trim() : "") ||
    (typeof settings["direccion"] === "string" ? settings["direccion"].trim() : "") ||
    (typeof settings["companyAddress"] === "string"
      ? settings["companyAddress"].trim()
      : "");
  const cityRaw = settings["city"] ?? settings["ciudad"];
  const columnPhone = details?.phone?.trim() ? details.phone.trim() : "";
  const phoneRaw =
    columnPhone || settings["phone"] || settings["telefono"] || settings["companyPhone"];
  const columnMail = details?.mail?.trim() ? details.mail.trim() : "";
  const emailRaw =
    columnMail ||
    (typeof settings["email"] === "string" ? settings["email"].trim() : "") ||
    (typeof settings["correo"] === "string" ? settings["correo"].trim() : "") ||
    (typeof settings["companyEmail"] === "string"
      ? settings["companyEmail"].trim()
      : "");

  const address = typeof addressRaw === "string" ? addressRaw.trim() : "";
  const city = typeof cityRaw === "string" ? cityRaw.trim() : "";
  const phone = typeof phoneRaw === "string" ? phoneRaw.trim() : null;
  const email = typeof emailRaw === "string" ? emailRaw.trim() : null;

  return {
    razonSocial,
    displayName,
    rut,
    addressLines: [address, city].filter(Boolean),
    phone,
    email,
  };
}
