"use server";

import { revalidatePath } from "next/cache";
import { FiscalRequest } from "../infrastructure/fiscal.request";
import type { EmisorFormValues, FiscalEmissionsListParams, SiiEnvironment } from "../types/fiscal.types";

const SII_PATHS = [
  "/settings/sii",
  "/settings/sii/certificacion",
  "/settings/sii/emisor",
  "/settings/sii/credenciales",
  "/settings/sii/folios",
  "/settings/sii/produccion",
];

function revalidateSii() {
  for (const p of SII_PATHS) revalidatePath(p);
}

export async function getFiscalSummaryAction() {
  return FiscalRequest.getSummary();
}

export async function getFiscalProfileAction() {
  return FiscalRequest.getProfile();
}

export async function updateFiscalEmisorAction(values: EmisorFormValues) {
  const res = await FiscalRequest.updateProfile({
    legalName: values.legalName,
    rut: values.rut,
    businessActivity: values.businessActivity,
    address: values.address,
    commune: values.commune,
    city: values.city,
    resolutionNumber: values.resolutionNumber,
    resolutionDate: values.resolutionDate || undefined,
    portalPostulationDone: values.portalPostulationDone,
    portalPermissionsDone: values.portalPermissionsDone,
  });
  if (res.success) revalidateSii();
  return res;
}

export async function uploadFiscalCertificateAction(formData: FormData) {
  const file = formData.get("file");
  const password = String(formData.get("password") ?? "");
  if (!(file instanceof File) || !password) {
    return { success: false as const, error: "Archivo PFX y contraseña requeridos" };
  }
  const res = await FiscalRequest.uploadCertificate(file, password);
  if (res.success) revalidateSii();
  return res;
}

export async function deleteFiscalCertificateAction() {
  const res = await FiscalRequest.deleteCertificate();
  if (res.success) revalidateSii();
  return res;
}

export async function uploadFiscalCafAction(formData: FormData) {
  const file = formData.get("file");
  const environment = formData.get("environment");
  if (!(file instanceof File)) {
    return { success: false as const, error: "Archivo CAF requerido" };
  }
  const res = await FiscalRequest.uploadCaf(
    file,
    environment === "production" || environment === "certification"
      ? environment
      : undefined,
  );
  if (res.success) revalidateSii();
  return res;
}

export async function listFiscalCafsAction() {
  return FiscalRequest.listCafs();
}

export async function listFiscalEmissionsAction(params: FiscalEmissionsListParams = {}) {
  return FiscalRequest.listEmissions(params);
}

export async function retryFiscalBoletaEmissionAction(transactionId: string) {
  const res = await FiscalRequest.retryBoletaEmission(transactionId);
  if (res.success) revalidatePath("/settings/sii/folios");
  return res;
}

export async function refreshFiscalEmissionSiiStatusAction(emissionId: string) {
  const res = await FiscalRequest.refreshEmissionSiiStatus(emissionId);
  if (res.success) revalidatePath("/settings/sii/folios");
  return res;
}

export async function getBoletaPrintPreviewAction(caso?: string) {
  return FiscalRequest.getBoletaPrintPreview(caso);
}

export async function testFiscalSiiTokenAction() {
  return FiscalRequest.testSiiToken();
}

export async function createCertificationRunAction() {
  const res = await FiscalRequest.createCertificationRun();
  if (res.success) revalidateSii();
  return res;
}

export async function generateCertificationSetAction(runId: string) {
  const res = await FiscalRequest.generateSet(runId);
  if (res.success) revalidateSii();
  return res;
}

export async function sendCertificationBoletasAction(runId: string) {
  const res = await FiscalRequest.sendBoletas(runId);
  if (res.success) revalidateSii();
  return res;
}

export async function sendCertificationRcoAction(runId: string) {
  const res = await FiscalRequest.sendRco(runId);
  if (res.success) revalidateSii();
  return res;
}

export async function queryCertificationStatusAction(runId: string) {
  const res = await FiscalRequest.queryStatus(runId);
  if (res.success) revalidateSii();
  return res;
}

export async function completeCertificationAction(
  runId: string,
  portalValidated: boolean,
  portalDeclarationDone: boolean,
) {
  const res = await FiscalRequest.completeCertification(
    runId,
    portalValidated,
    portalDeclarationDone,
  );
  if (res.success) revalidateSii();
  return res;
}

export async function enableFiscalProductionAction(
  productionEnabled: boolean,
  environment: SiiEnvironment,
) {
  const res = await FiscalRequest.enableProduction(productionEnabled, environment);
  if (res.success) revalidateSii();
  return res;
}

export async function acknowledgePortalCertificationAction() {
  const res = await FiscalRequest.acknowledgePortalCertification();
  if (res.success) revalidateSii();
  return res;
}
