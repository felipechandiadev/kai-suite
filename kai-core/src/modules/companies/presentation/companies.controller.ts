import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { PersonBankAccountDto } from '@modules/persons/application/dto/person-bank-account.dto';
import {
  AdminOnly,
  AllowAdminWithoutCompany,
  CurrentCompany,
  CurrentUser,
  CurrentUserPayload,
  OptionalCurrentCompany,
  SkipTenant,
  SuperAdminOnly,
} from '@common/tenant';
import { UpdateCompanyDto } from '../application/dto/update-company.dto';
import { CreateCompanyDto } from '../application/dto/create-company.dto';
import { CompaniesService } from '../application/companies.service';

@Controller()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  /**
   * Compat. con clientes single-company: devuelve la empresa "activa".
   * - ADMIN/OPERATOR: su company.
   * - SUPER_ADMIN: la company seleccionada via X-Active-Company-Id, o la primera activa.
   */
  @Get('company')
  async getCompany(@OptionalCurrentCompany() activeCompanyId: string | null) {
    if (activeCompanyId) {
      return this.companiesService.getCompanyById(activeCompanyId);
    }
    return this.companiesService.getCompany();
  }

  /**
   * Listado público de empresas activas (sin auth ni tenant).
   * Pensado para la pantalla de setup del POS donde el operario
   * elige a qué empresa se conecta antes de iniciar sesión.
   * Devuelve solo campos mínimos para identificarlas en UI.
   */
  @Get('companies/public/list')
  @SkipTenant()
  async listPublicCompanies() {
    const companies = await this.companiesService.listCompanies(false);
    return {
      success: true,
      companies: companies.map((c) => ({
        id: c.id,
        razonSocial: c.razonSocial,
        nombreFantasia: c.nombreFantasia,
        rut: c.rut ?? null,
      })),
    };
  }

  /**
   * Lista todas las empresas (solo SUPER_ADMIN).
   * ADMIN/OPERATOR no acceden al listado global.
   */
  @Get('companies')
  @SuperAdminOnly()
  @AllowAdminWithoutCompany()
  async listCompanies(
    @Query('includeInactive') includeInactive?: string,
    @CurrentUser() _user?: CurrentUserPayload,
  ) {
    const include = includeInactive === 'true' || includeInactive === '1';
    const companies = await this.companiesService.listCompanies(include);
    return { success: true, companies };
  }

  /**
   * Detalle de una empresa por id (solo SUPER_ADMIN).
   */
  @Get('companies/:id')
  @SuperAdminOnly()
  @AllowAdminWithoutCompany()
  async getById(@Param('id') id: string) {
    const company = await this.companiesService.getCompanyById(id);
    return { success: true, company };
  }

  /**
   * Crear una nueva empresa (solo SUPER_ADMIN).
   */
  @Post('companies')
  @SuperAdminOnly()
  @AllowAdminWithoutCompany()
  async create(@Body() body: CreateCompanyDto) {
    const company = await this.companiesService.createCompany(body);
    return { success: true, company };
  }

  /**
   * Actualizar empresa por id (solo SUPER_ADMIN).
   */
  @Patch('companies/:id')
  @SuperAdminOnly()
  @AllowAdminWithoutCompany()
  async updateById(
    @Param('id') id: string,
    @Body() body: UpdateCompanyDto & { isActive?: boolean },
  ) {
    const company = await this.companiesService.updateCompanyById(id, body);
    return { success: true, company };
  }

  /**
   * Soft delete (desactivar) empresa (solo SUPER_ADMIN).
   */
  @Delete('companies/:id')
  @SuperAdminOnly()
  @AllowAdminWithoutCompany()
  async remove(@Param('id') id: string) {
    return this.companiesService.softDeleteCompany(id);
  }

  /**
   * Compat. legacy: actualizar la empresa "activa" actual.
   */
  @Patch('company')
  async updateCompany(
    @Body() body: UpdateCompanyDto,
    @OptionalCurrentCompany() activeCompanyId: string | null,
  ) {
    if (activeCompanyId) {
      return this.companiesService.updateCompanyById(activeCompanyId, body);
    }
    return this.companiesService.updateCompany(body);
  }

  /**
   * Cuentas bancarias de la empresa activa.
   */
  @Post('company/bank-accounts')
  async addBankAccount(
    @Body() body: PersonBankAccountDto,
    @CurrentCompany() activeCompanyId: string,
  ) {
    return this.companiesService.addBankAccount(activeCompanyId, body);
  }

  /**
   * Saldo libro de una cuenta bancaria (calculado desde transacciones).
   */
  @Get('company/bank-accounts/:key/balance')
  async getBankAccountBalance(
    @Param('key') key: string,
    @CurrentCompany() activeCompanyId: string,
  ) {
    const bookBalance = await this.companiesService.getBankAccountBookBalance(
      activeCompanyId,
      key,
    );
    return { bookBalance };
  }

  /**
   * Actualiza el saldo cartola (currentBalance) de una cuenta bancaria.
   */
  @Patch('company/bank-accounts/:key/balance')
  async updateBankAccountBalance(
    @Param('key') key: string,
    @Body() body: { currentBalance: number },
    @CurrentCompany() activeCompanyId: string,
  ) {
    const updated = await this.companiesService.updateBankAccountBalance(
      activeCompanyId,
      key,
      Number(body.currentBalance ?? 0),
    );
    return updated;
  }

  /**
   * Catálogo de medios de pago de una empresa (solo ADMIN).
   * Si la empresa aún no lo tiene definido, devuelve el set por defecto.
   */
  @Get('companies/:id/payment-methods')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyPaymentMethods(@Param('id') id: string) {
    const paymentMethods = await this.companiesService.getPaymentMethods(id);
    return { success: true, paymentMethods };
  }

  /**
   * Reemplaza el catálogo completo de medios de pago de una empresa.
   * Body: `{ paymentMethods: CompanyPaymentMethodConfig[] }` o el array directo.
   */
  @Put('companies/:id/payment-methods')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyPaymentMethods(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming = Array.isArray(body)
      ? body
      : Array.isArray((body as any)?.paymentMethods)
        ? (body as any).paymentMethods
        : [];
    const paymentMethods = await this.companiesService.replacePaymentMethods(
      id,
      incoming,
    );
    return { success: true, paymentMethods };
  }

  /**
   * Tipos de voucher de una empresa (`settings.voucherKinds`).
   */
  @Get('companies/:id/voucher-kinds')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyVoucherKinds(@Param('id') id: string) {
    const voucherKinds = await this.companiesService.getVoucherKinds(id);
    return { success: true, voucherKinds };
  }

  /**
   * Reemplaza el catálogo de tipos de voucher.
   * Body: `{ voucherKinds: CompanyVoucherKind[] }` o el array directo.
   */
  @Put('companies/:id/voucher-kinds')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyVoucherKinds(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming = Array.isArray(body)
      ? body
      : Array.isArray((body as any)?.voucherKinds)
        ? (body as any).voucherKinds
        : [];
    const voucherKinds = await this.companiesService.replaceVoucherKinds(
      id,
      incoming,
    );
    return { success: true, voucherKinds };
  }

  /**
   * Configuración de cheques de una empresa (solo ADMIN). Si la empresa
   * aún no la tiene definida, devuelve un default todo-desactivado.
   */
  @Get('companies/:id/check-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyCheckSettings(@Param('id') id: string) {
    const checkSettings = await this.companiesService.getCheckSettings(id);
    return { success: true, checkSettings };
  }

  /**
   * Reemplaza la configuración de cheques de una empresa.
   * Body: `{ checkSettings: CompanyCheckSettings }` o el objeto directo.
   */
  @Put('companies/:id/check-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyCheckSettings(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body && typeof body === 'object' && 'checkSettings' in (body as any)
        ? (body as any).checkSettings
        : body;
    const checkSettings = await this.companiesService.replaceCheckSettings(
      id,
      incoming,
    );
    return { success: true, checkSettings };
  }

  @Get('companies/:id/mercado-pago-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyMercadoPagoSettings(@Param('id') id: string) {
    const mercadoPagoSettings = await this.companiesService.getMercadoPagoSettings(id);
    return { success: true, mercadoPagoSettings };
  }

  @Put('companies/:id/mercado-pago-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyMercadoPagoSettings(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body && typeof body === 'object' && 'mercadoPagoSettings' in (body as object)
        ? (body as { mercadoPagoSettings: unknown }).mercadoPagoSettings
        : body;
    const mercadoPagoSettings = await this.companiesService.replaceMercadoPagoSettings(
      id,
      incoming,
    );
    return { success: true, mercadoPagoSettings };
  }

  /**
   * Configuración de cotizaciones de una empresa (solo ADMIN). Si la
   * empresa aún no la tiene definida, devuelve los defaults.
   */
  @Get('companies/:id/quotation-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyQuotationSettings(@Param('id') id: string) {
    const quotationSettings =
      await this.companiesService.getQuotationSettings(id);
    return { success: true, quotationSettings };
  }

  /**
   * Reemplaza la configuración de cotizaciones de una empresa.
   * Body: `{ quotationSettings: CompanyQuotationSettings }` o el objeto directo.
   */
  @Put('companies/:id/quotation-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyQuotationSettings(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body && typeof body === 'object' && 'quotationSettings' in (body as any)
        ? (body as any).quotationSettings
        : body;
    const quotationSettings =
      await this.companiesService.replaceQuotationSettings(id, incoming);
    return { success: true, quotationSettings };
  }

  /**
   * Configuración de propinas KaiFood (solo ADMIN).
   * Defaults: enabled false, suggestPercent 10.
   */
  @Get('companies/:id/tip-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyTipSettings(@Param('id') id: string) {
    const tipSettings = await this.companiesService.getTipSettings(id);
    return { success: true, tipSettings };
  }

  /**
   * Body: `{ tipSettings: CompanyTipSettings }` o el objeto directo.
   */
  @Put('companies/:id/tip-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyTipSettings(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body && typeof body === 'object' && 'tipSettings' in (body as any)
        ? (body as any).tipSettings
        : body;
    const tipSettings = await this.companiesService.replaceTipSettings(
      id,
      incoming,
    );
    return { success: true, tipSettings };
  }

  @Get('companies/:id/presale-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyPresaleSettings(@Param('id') id: string) {
    const presaleSettings =
      await this.companiesService.getPresaleSettings(id);
    return { success: true, presaleSettings };
  }

  @Put('companies/:id/presale-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyPresaleSettings(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body && typeof body === 'object' && 'presaleSettings' in (body as any)
        ? (body as any).presaleSettings
        : body;
    const presaleSettings =
      await this.companiesService.replacePresaleSettings(id, incoming);
    return { success: true, presaleSettings };
  }

  @Get('companies/:id/deferred-payment-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyDeferredPaymentSettings(@Param('id') id: string) {
    const deferredPayment =
      await this.companiesService.getDeferredPaymentSettings(id);
    return { success: true, deferredPayment };
  }

  @Put('companies/:id/deferred-payment-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyDeferredPaymentSettings(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body && typeof body === 'object' && 'deferredPayment' in (body as any)
        ? (body as any).deferredPayment
        : body;
    const deferredPayment =
      await this.companiesService.replaceDeferredPaymentSettings(id, incoming);
    return { success: true, deferredPayment };
  }

  /**
   * Política de crédito interno de la empresa activa (ADMIN/OPERATOR/POS).
   * Incluye el medio empresa `INTERNAL_CREDIT` si está habilitado.
   */
  @Get('company/internal-customer-credit-settings')
  async getActiveCompanyInternalCustomerCreditSettings(
    @CurrentCompany() activeCompanyId: string,
  ) {
    const ctx =
      await this.companiesService.getInternalCustomerCreditContext(
        activeCompanyId,
      );
    return { success: true, ...ctx };
  }

  /**
   * Configuración de cotizaciones de la empresa activa (ADMIN/OPERATOR/POS).
   */
  @Get('company/quotation-settings')
  async getActiveCompanyQuotationSettings(
    @CurrentCompany() activeCompanyId: string,
  ) {
    const quotationSettings =
      await this.companiesService.getQuotationSettings(activeCompanyId);
    return { success: true, quotationSettings };
  }

  /** Tip settings de la empresa activa (POS / admin). */
  @Get('company/tip-settings')
  async getActiveCompanyTipSettings(
    @CurrentCompany() activeCompanyId: string,
  ) {
    const tipSettings =
      await this.companiesService.getTipSettings(activeCompanyId);
    return { success: true, tipSettings };
  }

  @Get('company/presale-settings')
  async getActiveCompanyPresaleSettings(
    @CurrentCompany() activeCompanyId: string,
  ) {
    const presaleSettings =
      await this.companiesService.getPresaleSettings(activeCompanyId);
    return { success: true, presaleSettings };
  }

  @Get('company/deferred-payment-settings')
  async getActiveCompanyDeferredPaymentSettings(
    @CurrentCompany() activeCompanyId: string,
  ) {
    const deferredPayment =
      await this.companiesService.getDeferredPaymentSettings(activeCompanyId);
    return { success: true, deferredPayment };
  }

  @Get('company/mercado-pago-settings')
  async getActiveCompanyMercadoPagoSettings(
    @CurrentCompany() activeCompanyId: string,
  ) {
    const mercadoPagoSettings =
      await this.companiesService.getMercadoPagoSettings(activeCompanyId);
    return { success: true, mercadoPagoSettings };
  }

  /**
   * Política global de crédito interno para clientes (`settings.internalCustomerCredit`).
   */
  @Get('companies/:id/internal-customer-credit-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyInternalCustomerCreditSettings(@Param('id') id: string) {
    const ctx =
      await this.companiesService.getInternalCustomerCreditContext(id);
    return { success: true, ...ctx };
  }

  /**
   * Body: `{ internalCustomerCredit: { enabled: boolean } }` o el objeto directo.
   */
  @Put('companies/:id/internal-customer-credit-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyInternalCustomerCreditSettings(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body &&
      typeof body === 'object' &&
      'internalCustomerCredit' in (body as any)
        ? (body as any).internalCustomerCredit
        : body;
    const internalCustomerCredit =
      await this.companiesService.replaceInternalCustomerCreditSettings(
        id,
        incoming,
      );
    const ctx =
      await this.companiesService.getInternalCustomerCreditContext(id);
    return {
      success: true,
      internalCustomerCredit,
      internalCreditPaymentMethod: ctx.internalCreditPaymentMethod,
    };
  }

  @Get('companies/:id/public-contact-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyPublicContactSettings(@Param('id') id: string) {
    const publicContact =
      await this.companiesService.getPublicContactSettings(id);
    return { success: true, publicContact };
  }

  @Put('companies/:id/public-contact-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyPublicContactSettings(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body && typeof body === 'object' && 'publicContact' in (body as object)
        ? (body as { publicContact: unknown }).publicContact
        : body;
    const publicContact =
      await this.companiesService.replacePublicContactSettings(id, incoming);
    return { success: true, publicContact };
  }

  @Get('companies/:id/company-identity-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyIdentitySettings(@Param('id') id: string) {
    const companyIdentity =
      await this.companiesService.getCompanyIdentitySettings(id);
    return { success: true, companyIdentity };
  }

  @Put('companies/:id/company-identity-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyIdentitySettings(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body && typeof body === 'object' && 'companyIdentity' in (body as object)
        ? (body as { companyIdentity: unknown }).companyIdentity
        : body;
    const companyIdentity =
      await this.companiesService.replaceCompanyIdentitySettings(id, incoming);
    return { success: true, companyIdentity };
  }

  @Get('companies/:id/e-shop-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyEShopSettings(@Param('id') id: string) {
    const eShopSettings = await this.companiesService.getEShopFlatSettings(id);
    return { success: true, eShopSettings };
  }

  @Put('companies/:id/e-shop-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyEShopSettings(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body && typeof body === 'object' && 'eShopSettings' in (body as object)
        ? (body as { eShopSettings: Record<string, unknown> }).eShopSettings
        : (body as Record<string, unknown>);
    const eShopSettings = await this.companiesService.replaceEShopFlatSettings(
      id,
      incoming as unknown as import('../domain/company-eshop-flat.types').CompanyEShopFlatSettings,
    );
    return { success: true, eShopSettings };
  }

  @Get('companies/:id/eshop-theme')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyEShopTheme(@Param('id') id: string) {
    const data = await this.companiesService.getEShopThemeSettings(id);
    return { success: true, ...data };
  }

  @Patch('companies/:id/eshop-theme')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyEShopTheme(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body && typeof body === 'object' && 'theme' in (body as object)
        ? (body as { theme: Record<string, unknown> }).theme
        : (body as Record<string, unknown>);
    const theme = await this.companiesService.replaceEShopThemeSettings(id, {
      templateId:
        typeof incoming.templateId === 'string'
          ? (incoming.templateId as import('../domain/company-eshop-theme.types').EShopTemplateId)
          : undefined,
      tokenOverrides:
        incoming.tokenOverrides && typeof incoming.tokenOverrides === 'object'
          ? (incoming.tokenOverrides as import('../domain/company-eshop-theme.types').EShopThemeTokenOverrides)
          : undefined,
    });
    const resolved = (
      await this.companiesService.getEShopThemeSettings(id)
    ).resolved;
    return { success: true, theme, resolved };
  }

  @Get('companies/:id/eshop-topbar')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyEShopTopBar(@Param('id') id: string) {
    const data = await this.companiesService.getEShopTopBarSettings(id);
    return { success: true, ...data };
  }

  @Patch('companies/:id/eshop-topbar')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyEShopTopBar(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body && typeof body === 'object' && 'topBar' in (body as object)
        ? (body as { topBar: Record<string, unknown> }).topBar
        : (body as Record<string, unknown>);
    const topBar = await this.companiesService.replaceEShopTopBarSettings(
      id,
      incoming as import('../domain/company-eshop-topbar.types').CompanyEShopTopBarSettings,
    );
    const resolved = (
      await this.companiesService.getEShopTopBarSettings(id)
    ).resolved;
    return { success: true, topBar, resolved };
  }

  @Get('companies/:id/eshop-footer')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyEShopFooter(@Param('id') id: string) {
    const data = await this.companiesService.getEShopFooterSettings(id);
    return { success: true, ...data };
  }

  @Patch('companies/:id/eshop-footer')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyEShopFooter(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body && typeof body === 'object' && 'footer' in (body as object)
        ? (body as { footer: Record<string, unknown> }).footer
        : (body as Record<string, unknown>);
    const footer = await this.companiesService.replaceEShopFooterSettings(
      id,
      incoming as import('../domain/company-eshop-footer.types').CompanyEShopFooterSettings,
    );
    const resolved = (
      await this.companiesService.getEShopFooterSettings(id)
    ).resolved;
    return { success: true, footer, resolved };
  }

  @Get('companies/:id/menu-topbar')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyMenuTopBar(@Param('id') id: string) {
    const data = await this.companiesService.getMenuTopBarSettings(id);
    return { success: true, ...data };
  }

  @Patch('companies/:id/menu-topbar')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyMenuTopBar(@Param('id') id: string, @Body() body: unknown) {
    const incoming =
      body && typeof body === 'object' && 'topBar' in (body as object)
        ? (body as { topBar: Record<string, unknown> }).topBar
        : (body as Record<string, unknown>);
    const topBar = await this.companiesService.replaceMenuTopBarSettings(
      id,
      incoming as import('../domain/company-menu-topbar.types').CompanyMenuTopBarSettings,
    );
    const resolved = (await this.companiesService.getMenuTopBarSettings(id)).resolved;
    return { success: true, topBar, resolved };
  }

  @Get('companies/:id/menu-about')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyMenuAbout(@Param('id') id: string) {
    const data = await this.companiesService.getMenuAboutSettings(id);
    return { success: true, ...data };
  }

  @Patch('companies/:id/menu-about')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyMenuAbout(@Param('id') id: string, @Body() body: unknown) {
    const about = await this.companiesService.replaceMenuAboutSettings(
      id,
      body as import('../domain/company-menu-about.types').CompanyMenuAboutSettings,
    );
    const resolved = (await this.companiesService.getMenuAboutSettings(id)).resolved;
    return { success: true, about, resolved };
  }

  @Get('companies/:id/menu-find-us')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyMenuFindUs(@Param('id') id: string) {
    const data = await this.companiesService.getMenuFindUsSettings(id);
    return { success: true, ...data };
  }

  @Patch('companies/:id/menu-find-us')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyMenuFindUs(@Param('id') id: string, @Body() body: unknown) {
    const findUs = await this.companiesService.replaceMenuFindUsSettings(
      id,
      body as import('../domain/company-menu-find-us.types').CompanyMenuFindUsSettings,
    );
    const resolved = (await this.companiesService.getMenuFindUsSettings(id)).resolved;
    return { success: true, findUs, resolved };
  }

  @Get('companies/:id/menu-theme')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyMenuTheme(@Param('id') id: string) {
    const data = await this.companiesService.getMenuThemeSettings(id);
    return { success: true, ...data };
  }

  @Patch('companies/:id/menu-theme')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyMenuTheme(@Param('id') id: string, @Body() body: unknown) {
    const theme = await this.companiesService.replaceMenuThemeSettings(
      id,
      body as import('../domain/company-menu-theme.types').CompanyMenuThemeSettings,
    );
    const resolved = (await this.companiesService.getMenuThemeSettings(id)).resolved;
    return { success: true, theme, resolved };
  }
}
