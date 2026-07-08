"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSanSebastianFiscal = seedSanSebastianFiscal;
const fs = require("fs");
const path = require("path");
const typeorm_1 = require("typeorm");
const company_entity_1 = require("../../backend/src/modules/companies/domain/company.entity");
const fiscal_service_1 = require("../../backend/src/modules/fiscal/application/fiscal.service");
const fiscal_caf_package_service_1 = require("../../backend/src/modules/fiscal/application/fiscal-caf-package.service");
const pos_folio_allocation_service_1 = require("../../backend/src/modules/fiscal/application/pos-folio-allocation.service");
const fiscal_enums_1 = require("../../backend/src/modules/fiscal/domain/fiscal.enums");
const fiscal_emisor_from_company_1 = require("../../backend/src/modules/fiscal/domain/fiscal-emisor-from-company");
const seed_san_sebastian_config_1 = require("./seed-san-sebastian-config");
const FISCAL_DATA_DIR = path.join(__dirname, 'data/fiscal');
const DEFAULT_PFX_PATH = path.join(FISCAL_DATA_DIR, 'certificado.pfx');
const DEFAULT_CAF_PATH = path.join(FISCAL_DATA_DIR, 'caf-boleta-39.xml');
function resolveFiscalAssetPath(envKey, defaultPath) {
    const override = process.env[envKey]?.trim();
    if (!override)
        return defaultPath;
    return path.isAbsolute(override) ? override : path.resolve(process.cwd(), override);
}
function requireFiscalAsset(filePath, label) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`No se encontró ${label} en ${filePath}. ` +
            'Copie certificado.pfx y caf-boleta-39.xml según seeds/san-sebastian/data/fiscal/README.md ' +
            'o ejecute: cd backend && npm run fiscal:export-ss-seed');
    }
    return fs.readFileSync(filePath);
}
async function seedSanSebastianFiscal(args) {
    const { app, companyId, posId, posRepo } = args;
    const pfxPath = resolveFiscalAssetPath('SAN_SEBASTIAN_SII_PFX_PATH', DEFAULT_PFX_PATH);
    const cafPath = resolveFiscalAssetPath('SAN_SEBASTIAN_SII_CAF_PATH', DEFAULT_CAF_PATH);
    const pfxPassword = process.env.SAN_SEBASTIAN_SII_PFX_PASSWORD?.trim();
    if (!pfxPassword) {
        throw new Error('SAN_SEBASTIAN_SII_PFX_PASSWORD no configurada en backend/.env (contraseña del certificado PFX).');
    }
    const pfxBuffer = requireFiscalAsset(pfxPath, 'certificado PFX');
    const cafBuffer = requireFiscalAsset(cafPath, 'CAF boleta 39');
    const dataSource = app.get(typeorm_1.DataSource);
    const companyRepo = dataSource.getRepository(company_entity_1.Company);
    const company = await companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
        throw new Error(`Empresa seed no encontrada: ${companyId}`);
    }
    if (!(0, fiscal_emisor_from_company_1.isEmisorCompleteFromCompany)(company)) {
        throw new Error('Emisor SII incompleto en company seed. Verifique commune, city, siiResolutionNumber y siiResolutionDate.');
    }
    const fiscalService = app.get(fiscal_service_1.FiscalService);
    const cafPackageService = app.get(fiscal_caf_package_service_1.FiscalCafPackageService);
    const allocationService = app.get(pos_folio_allocation_service_1.PosFolioAllocationService);
    await fiscalService.updateProfile(companyId, {
        environment: fiscal_enums_1.SiiEnvironment.PRODUCTION,
        portalPostulationDone: true,
        portalPermissionsDone: true,
    });
    await fiscalService.uploadCertificate(companyId, pfxBuffer, pfxPassword);
    console.log('✅ Certificado digital SII cargado');
    const cafPackage = await cafPackageService.uploadPackage(companyId, cafBuffer, fiscal_enums_1.SiiEnvironment.PRODUCTION);
    console.log(`✅ CAF producción: ${cafPackage.packageCode} folios ${cafPackage.rangeFrom}–${cafPackage.rangeTo}`);
    await fiscalService.acknowledgePortalCertification(companyId);
    await fiscalService.enableProduction(companyId, {
        productionEnabled: true,
        environment: fiscal_enums_1.SiiEnvironment.PRODUCTION,
    });
    console.log('✅ Perfil fiscal: certificado y producción habilitados');
    await allocationService.createSubPack(companyId, cafPackage.id, {
        pointOfSaleId: posId,
        rangeFrom: cafPackage.rangeFrom,
        rangeTo: cafPackage.rangeTo,
        label: seed_san_sebastian_config_1.SEED_POS_NAME,
    });
    console.log(`✅ Sub-paquete folios asignado a «${seed_san_sebastian_config_1.SEED_POS_NAME}»`);
    const posRow = await posRepo.findOne({ where: { id: posId } });
    if (!posRow) {
        throw new Error(`POS seed no encontrado: ${posId}`);
    }
    const currentSettings = posRow.settings && typeof posRow.settings === 'object'
        ? posRow.settings
        : {};
    posRow.settings = {
        ...currentSettings,
        fiscal: seed_san_sebastian_config_1.SEED_SAN_SEBASTIAN_POS_FISCAL,
    };
    await posRepo.save(posRow);
    console.log('✅ POS fiscal: TICKET + BOLETA (default BOLETA)');
}
//# sourceMappingURL=seed-san-sebastian-fiscal.js.map