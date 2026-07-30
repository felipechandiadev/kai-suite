import { BadRequestException } from '@nestjs/common';
import { Company } from '@modules/companies/domain/company.entity';
import type { EmisorData } from '../infrastructure/boleta-envio.builder';
import type { FiscalBoletaPrintPreviewEmisor } from './fiscal-boleta-print-preview';
import type { UpdateFiscalProfileDto } from '../application/dto/update-fiscal-profile.dto';

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t === '' ? null : t;
}

function resolutionDateIso(company: Company): string | null {
  const raw = company.siiResolutionDate;
  if (raw == null) return null;
  return String(raw).slice(0, 10);
}

export function companyToEmisorPreview(company: Company | null): FiscalBoletaPrintPreviewEmisor {
  if (!company) {
    return {
      rut: null,
      legalName: null,
      businessActivity: null,
      address: null,
      commune: null,
      city: null,
      resolutionNumber: null,
      resolutionDate: null,
    };
  }
  return {
    rut: trimOrNull(company.rut),
    legalName: trimOrNull(company.razonSocial),
    businessActivity: trimOrNull(company.businessActivity),
    address: trimOrNull(company.address),
    commune: trimOrNull(company.commune),
    city: trimOrNull(company.city),
    resolutionNumber: trimOrNull(company.siiResolutionNumber),
    resolutionDate: resolutionDateIso(company),
  };
}

export function isEmisorCompleteFromCompany(company: Company | null): boolean {
  const e = companyToEmisorPreview(company);
  return !!(
    e.rut &&
    e.legalName &&
    e.businessActivity &&
    e.address &&
    e.commune &&
    e.city &&
    e.resolutionNumber &&
    e.resolutionDate
  );
}

export function emisorFromCompany(company: Company): EmisorData {
  const e = companyToEmisorPreview(company);
  if (!isEmisorCompleteFromCompany(company)) {
    throw new BadRequestException('Complete datos de emisor y resolución');
  }
  return {
    rut: e.rut!,
    legalName: e.legalName!,
    businessActivity: e.businessActivity!,
    address: e.address!,
    commune: e.commune!,
    city: e.city!,
    resolutionNumber: e.resolutionNumber!,
    resolutionDate: e.resolutionDate!,
  };
}

export function applyEmisorDtoToCompany(company: Company, dto: UpdateFiscalProfileDto): void {
  if (dto.legalName !== undefined) {
    company.razonSocial = dto.legalName.trim();
  }
  if (dto.rut !== undefined) {
    company.rut = dto.rut.trim();
  }
  if (dto.businessActivity !== undefined) {
    const v = dto.businessActivity.trim();
    company.businessActivity = v === '' ? null : v;
  }
  if (dto.address !== undefined) {
    const v = dto.address.trim();
    company.address = v === '' ? null : v;
  }
  if (dto.commune !== undefined) {
    const v = dto.commune.trim();
    company.commune = v === '' ? null : v;
  }
  if (dto.city !== undefined) {
    const v = dto.city.trim();
    company.city = v === '' ? null : v;
  }
  if (dto.resolutionNumber !== undefined) {
    const v = dto.resolutionNumber.trim();
    company.siiResolutionNumber = v === '' ? null : v;
  }
  if (dto.resolutionDate !== undefined) {
    company.siiResolutionDate = dto.resolutionDate.trim() === '' ? null : dto.resolutionDate;
  }
}
