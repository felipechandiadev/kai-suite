"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEED_SAN_SEBASTIAN_SHAREHOLDER = exports.SEED_SAN_SEBASTIAN_POS_FISCAL = exports.SEED_OPERATOR_EMAIL = exports.SEED_ADMIN_EMAIL = exports.SEED_OPERATOR_USERNAME = exports.SEED_ADMIN_USERNAME = exports.SEED_CASH_HUB_NAME = exports.SEED_CASH_HUB_CODE = exports.SEED_PRESALE_POS_NAME = exports.SEED_POS_NAME = exports.SEED_PRICE_LIST_NAME = exports.SEED_STORAGE_CODE = exports.SEED_STORAGE_NAME = exports.SEED_BRANCH_LOCATION = exports.SEED_BRANCH_PHONE = exports.SEED_BRANCH_ADDRESS = exports.SEED_BRANCH_NAME = exports.SEED_SAN_SEBASTIAN_COMPANY = void 0;
exports.loadSanSebastianSiiEmisor = loadSanSebastianSiiEmisor;
exports.getSeedSanSebastianSiiEmisorFields = getSeedSanSebastianSiiEmisorFields;
exports.buildSeedCompanyBankAccounts = buildSeedCompanyBankAccounts;
exports.buildSeedCompanyPaymentCatalog = buildSeedCompanyPaymentCatalog;
exports.buildSeedPosPaymentList = buildSeedPosPaymentList;
exports.buildSeedSanSebastianCompanySettings = buildSeedSanSebastianCompanySettings;
const person_entity_1 = require("../../backend/src/modules/persons/domain/person.entity");
const transaction_entity_1 = require("../../backend/src/modules/transactions/domain/transaction.entity");
const payment_method_config_helpers_1 = require("../../backend/src/modules/payment-methods-config/domain/payment-method-config.helpers");
const person_entity_2 = require("../../backend/src/modules/persons/domain/person.entity");
const fs = require("fs");
const path = require("path");
exports.SEED_SAN_SEBASTIAN_COMPANY = {
    razonSocial: 'Supermercado San Sebastián',
    nombreFantasia: 'San Sebastián',
    rut: '78.543.570-2',
    mail: 'san.sebastian@kai.local',
    phone: '+56984488195',
    address: 'Población Ajial S/N',
    businessActivity: 'Supermercado y abastecimiento',
    defaultCurrency: 'CLP',
};
exports.SEED_BRANCH_NAME = 'Local San Sebastián';
exports.SEED_BRANCH_ADDRESS = exports.SEED_SAN_SEBASTIAN_COMPANY.address;
exports.SEED_BRANCH_PHONE = exports.SEED_SAN_SEBASTIAN_COMPANY.phone;
exports.SEED_BRANCH_LOCATION = { lat: -36.606, lng: -72.103 };
exports.SEED_STORAGE_NAME = 'Sala de venta';
exports.SEED_STORAGE_CODE = 'SEED-SS-SALA';
exports.SEED_PRICE_LIST_NAME = 'UNICA';
exports.SEED_POS_NAME = 'CAJA SAN SEBASTIAN';
exports.SEED_PRESALE_POS_NAME = 'PREVENTA SAN SEBASTIAN';
exports.SEED_CASH_HUB_CODE = 'CEV-SS-01';
exports.SEED_CASH_HUB_NAME = 'Caja principal';
exports.SEED_ADMIN_USERNAME = 'admin';
exports.SEED_OPERATOR_USERNAME = 'operador';
exports.SEED_ADMIN_EMAIL = 'admin@san.sebastian.kai.local';
exports.SEED_OPERATOR_EMAIL = 'operador@san.sebastian.kai.local';
const FISCAL_EMISOR_PATH = path.join(__dirname, 'data/fiscal/emisor.json');
function loadSanSebastianSiiEmisor() {
    if (!fs.existsSync(FISCAL_EMISOR_PATH)) {
        throw new Error(`No se encontró ${FISCAL_EMISOR_PATH}. Ejecute: cd backend && npm run fiscal:export-ss-seed`);
    }
    const raw = JSON.parse(fs.readFileSync(FISCAL_EMISOR_PATH, 'utf8'));
    if (!raw.commune?.trim() ||
        !raw.city?.trim() ||
        !raw.siiResolutionNumber?.trim() ||
        !raw.siiResolutionDate?.trim()) {
        throw new Error(`emisor.json incompleto: ${FISCAL_EMISOR_PATH}`);
    }
    return {
        commune: raw.commune.trim(),
        city: raw.city.trim(),
        siiResolutionNumber: raw.siiResolutionNumber.trim(),
        siiResolutionDate: raw.siiResolutionDate.trim().slice(0, 10),
    };
}
function getSeedSanSebastianSiiEmisorFields() {
    return loadSanSebastianSiiEmisor();
}
exports.SEED_SAN_SEBASTIAN_POS_FISCAL = {
    allowedDocumentKinds: ['TICKET', 'BOLETA'],
    defaultDocumentKind: 'BOLETA',
};
exports.SEED_SAN_SEBASTIAN_SHAREHOLDER = {
    firstName: 'María Marcela Del Rosario',
    lastName: 'Tapia Cofré',
    documentType: person_entity_2.DocumentType.RUT,
    documentNumber: '10.708.387-1',
    ownershipPercentage: 100,
    partnerType: 'FOUNDING_PARTNER',
    joinDate: '2020-01-01',
    notes: 'Nacionalidad: Chilena. Sexo: F. Nacimiento: 1968-08-11. N° documento: 516.731.893',
};
const COMPANY_PAYMENT_METHODS = [
    transaction_entity_1.PaymentMethod.CASH,
    transaction_entity_1.PaymentMethod.CREDIT_CARD,
    transaction_entity_1.PaymentMethod.DEBIT_CARD,
    transaction_entity_1.PaymentMethod.TRANSFER,
    transaction_entity_1.PaymentMethod.INTERNAL_CREDIT,
];
function buildSeedCompanyBankAccounts(accountHolderName) {
    return [
        {
            accountKey: 'seed-ss-banco-estado-cc',
            bankName: person_entity_1.BankName.BANCO_ESTADO,
            accountType: person_entity_1.AccountTypeName.CUENTA_CORRIENTE,
            accountNumber: '12345678901',
            accountHolderName,
            isPrimary: true,
        },
    ];
}
function buildSeedCompanyPaymentCatalog() {
    return COMPANY_PAYMENT_METHODS.map((method, displayOrder) => ({
        id: (0, payment_method_config_helpers_1.defaultCompanyPaymentMethodId)(method),
        method,
        alias: method === transaction_entity_1.PaymentMethod.INTERNAL_CREDIT ? 'Crédito interno' : null,
        displayOrder,
        isActive: true,
        requireReference: false,
        bankAccountKey: null,
        metadata: null,
    }));
}
const POS_METHOD_SEED = {
    [transaction_entity_1.PaymentMethod.CASH]: {
        preloadOnPaymentScreen: true,
        preloadOrder: 0,
        isDefaultForChange: true,
    },
    [transaction_entity_1.PaymentMethod.CREDIT_CARD]: { preloadOnPaymentScreen: true, preloadOrder: 1 },
    [transaction_entity_1.PaymentMethod.DEBIT_CARD]: { preloadOnPaymentScreen: true, preloadOrder: 2 },
    [transaction_entity_1.PaymentMethod.TRANSFER]: { preloadOnPaymentScreen: true, preloadOrder: 3 },
    [transaction_entity_1.PaymentMethod.INTERNAL_CREDIT]: { preloadOnPaymentScreen: true, preloadOrder: 4 },
};
function buildSeedPosPaymentList(catalog) {
    return catalog.map((cmp) => {
        const cfg = POS_METHOD_SEED[cmp.method] ?? {
            preloadOnPaymentScreen: false,
            preloadOrder: null,
        };
        return {
            companyPaymentMethodId: cmp.id,
            isEnabled: cmp.method === transaction_entity_1.PaymentMethod.INTERNAL_CREDIT ? true : true,
            preloadOnPaymentScreen: cfg.preloadOnPaymentScreen,
            preloadOrder: cfg.preloadOrder,
            isDefaultForChange: cmp.method === transaction_entity_1.PaymentMethod.CASH && cfg.isDefaultForChange === true,
            bankAccountKey: cmp.bankAccountKey ?? null,
            requireReference: null,
        };
    });
}
function buildSeedSanSebastianCompanySettings(existing, paymentMethods) {
    const base = existing && typeof existing === 'object' ? { ...existing } : {};
    return {
        ...base,
        paymentMethods,
        presales: { enabled: true },
        internalCustomerCredit: { enabled: true },
        checks: {
            enabled: false,
            receiveChecks: false,
            issueChecks: false,
            allowPostdatedReceived: false,
            allowPostdatedIssued: false,
            defaultDepositBankAccountKey: null,
            defaultIssueBankAccountKey: null,
        },
        quotations: {
            enabled: false,
            defaultValidityDays: 10,
            maxValidityDays: 20,
            allowCustomValidity: false,
            defaultTerms: null,
        },
        eShopEnabled: false,
        eShopPublicSlug: null,
        eShopFeaturedProductVariantIds: [],
        eShopFeaturedProductIds: [],
        eShopFreeShippingThreshold: null,
        eShopShippingMode: 'disabled',
        eShopDefaultBranchId: null,
        eShopDefaultPriceListId: null,
        eShopDefaultStorageId: null,
    };
}
//# sourceMappingURL=seed-san-sebastian-config.js.map