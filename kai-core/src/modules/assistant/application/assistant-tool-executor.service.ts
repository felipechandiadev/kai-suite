import { Injectable, Logger, HttpException } from '@nestjs/common';
import { BranchesService } from '@modules/branches/application/branches.service';
import { SalesReportRunner } from '@modules/sales-reports/application/sales-report.runner';
import { InventoryReportRunner } from '@modules/inventory-reports/application/inventory-report.runner';
import { PurchasingReportRunner } from '@modules/purchasing-reports/application/purchasing-report.runner';
import { DiningReportRunner } from '@modules/dining-reports/application/dining-report.runner';
import { HcmReportRunner } from '@modules/hcm-reports/application/hcm-report.runner';
import { ProductModeService } from '@shared/product-mode/product-mode.service';
import { PlatformRoleCode } from '@modules/users/domain/platform-role.codes';
import type { CurrentUserPayload } from '@common/tenant';
import { SamiQueryError } from '../domain/sami-query.types';
import type {
  AssistantToolExecuteContext,
  AssistantToolResult,
} from '../domain/tool-result.types';
import { reportResultToBlocks } from './report-to-blocks';
import { SemanticQueryValidator } from './semantic-query-validator.service';
import { SemanticQueryCompiler } from './semantic-query-compiler.service';
import { AssistantPersistenceService } from './assistant-persistence.service';
import {
  AssistantExportService,
  hasExportableBlocks,
  type SamiExportFormat,
} from './assistant-export.service';
import { mergeToolParams } from './assistant-tool-params';
import { CustomersServiceAdapter } from '@modules/customers/application/customers.service.adapter';

function isAdminUser(user: CurrentUserPayload): boolean {
  if (user.rol === PlatformRoleCode.SUPER_ADMIN || user.rol === PlatformRoleCode.ADMIN) {
    return true;
  }
  return (user.roles ?? []).some(
    (r) => r === PlatformRoleCode.SUPER_ADMIN || r === PlatformRoleCode.ADMIN,
  );
}

function fail(toolName: string, code: string, message: string): AssistantToolResult {
  return {
    toolName,
    ok: false,
    summary: message,
    blocks: [{ type: 'markdown', content: message }],
    errorCode: code,
  };
}

function httpStatus(e: unknown): number | null {
  if (
    e &&
    typeof e === 'object' &&
    typeof (e as HttpException).getStatus === 'function'
  ) {
    return (e as HttpException).getStatus();
  }
  return null;
}

function httpExceptionMessage(e: unknown): string {
  if (e instanceof HttpException) {
    const res = e.getResponse();
    if (typeof res === 'string') return res;
    if (res && typeof res === 'object' && 'message' in res) {
      const m = (res as { message: string | string[] }).message;
      return Array.isArray(m) ? m.join(' ') : String(m);
    }
    return e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

type CatalogRow = { id: string; title: string; description?: string };

@Injectable()
export class AssistantToolExecutor {
  private readonly logger = new Logger(AssistantToolExecutor.name);

  constructor(
    private readonly branches: BranchesService,
    private readonly salesRunner: SalesReportRunner,
    private readonly inventoryRunner: InventoryReportRunner,
    private readonly purchasingRunner: PurchasingReportRunner,
    private readonly diningRunner: DiningReportRunner,
    private readonly hcmRunner: HcmReportRunner,
    private readonly productMode: ProductModeService,
    private readonly semanticValidator: SemanticQueryValidator,
    private readonly semanticCompiler: SemanticQueryCompiler,
    private readonly persistence: AssistantPersistenceService,
    private readonly exporter: AssistantExportService,
    private readonly customers: CustomersServiceAdapter,
  ) {}

  async execute(
    companyId: string,
    user: CurrentUserPayload,
    name: string,
    args: Record<string, unknown>,
    ctx?: AssistantToolExecuteContext,
  ): Promise<AssistantToolResult> {
    try {
      switch (name) {
        case 'list_branches':
          return await this.listBranches(companyId);
        case 'list_report_catalog':
          return this.listReportCatalog(user, args);
        case 'search_customers':
          return await this.searchCustomers(args);
        case 'run_sales_report':
          return await this.runSales(companyId, args);
        case 'run_inventory_report':
          return await this.runInventory(companyId, args);
        case 'run_purchasing_report':
          return await this.runPurchasing(companyId, args);
        case 'run_dining_report':
          return await this.runDining(companyId, args);
        case 'run_hcm_report':
          return await this.runHcm(companyId, user, args);
        case 'run_semantic_query':
          return await this.runSemantic(companyId, user, args);
        case 'export_report':
          return await this.runExport(companyId, user, args, ctx);
        default:
          return fail(name, 'SAMI_UNKNOWN_TOOL', `Herramienta desconocida: ${name}`);
      }
    } catch (e) {
      if (e instanceof SamiQueryError) {
        return fail(name, e.code, e.message);
      }
      const status = httpStatus(e);
      if (status === 404) {
        return fail(name, 'SAMI_UNKNOWN_REPORT', httpExceptionMessage(e));
      }
      if (status === 400) {
        return fail(name, 'SAMI_BAD_PARAMS', httpExceptionMessage(e));
      }
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Tool ${name} failed: ${msg}`);
      return fail(name, 'SAMI_TOOL_ERROR', msg);
    }
  }

  private async listBranches(companyId: string): Promise<AssistantToolResult> {
    const rows = await this.branches.getAllBranches(companyId, false);
    return {
      toolName: 'list_branches',
      ok: true,
      summary: `${rows.length} sucursales`,
      rowCount: rows.length,
      blocks: [
        {
          type: 'table',
          title: 'Sucursales',
          columns: [
            { key: 'name', label: 'Nombre' },
            { key: 'address', label: 'Dirección' },
          ],
          rows: rows.map((b) => ({
            id: b.id,
            name: b.name,
            address: b.address ?? '',
          })),
        },
      ],
    };
  }

  private async searchCustomers(args: Record<string, unknown>): Promise<AssistantToolResult> {
    const query = typeof args.query === 'string' ? args.query.trim() : '';
    const pageSizeRaw = Number(args.pageSize ?? 10);
    const pageSize = Math.min(
      Math.max(Number.isFinite(pageSizeRaw) ? pageSizeRaw : 10, 1),
      10,
    );
    const result = await this.customers.search({
      query,
      page: 1,
      pageSize,
      activeOnly: true,
    });
    const rows = (result.customers ?? []).map((c: {
      customerId?: string;
      displayName?: string;
      isActive?: boolean;
    }) => ({
      customerId: c.customerId ?? '',
      displayName: c.displayName ?? '',
      isActive: Boolean(c.isActive),
    }));
    return {
      toolName: 'search_customers',
      ok: true,
      summary: `${result.total ?? rows.length} clientes`,
      rowCount: rows.length,
      blocks: [
        {
          type: 'table',
          title: query ? `Clientes: ${query}` : 'Clientes',
          columns: [
            { key: 'displayName', label: 'Nombre' },
            { key: 'customerId', label: 'Id' },
            { key: 'isActive', label: 'Activo' },
          ],
          rows,
        },
      ],
    };
  }

  private listReportCatalog(
    user: CurrentUserPayload,
    args: Record<string, unknown>,
  ): AssistantToolResult {
    const domain = typeof args.domain === 'string' ? args.domain.trim() : '';
    const rows: Array<CatalogRow & { domain: string }> = [];
    const push = (dom: string, items: CatalogRow[]) => {
      for (const it of items) {
        rows.push({ domain: dom, id: it.id, title: it.title, description: it.description ?? '' });
      }
    };
    if (!domain || domain === 'sales') push('sales', this.salesRunner.listCatalog());
    if (!domain || domain === 'inventory') push('inventory', this.inventoryRunner.listCatalog());
    if (!domain || domain === 'purchasing') push('purchasing', this.purchasingRunner.listCatalog());
    if ((!domain || domain === 'dining') && this.productMode.isKaiFood()) {
      push('dining', this.diningRunner.listCatalog());
    }
    if ((!domain || domain === 'hcm') && isAdminUser(user)) {
      push('hcm', this.hcmRunner.listCatalog());
    }
    if (domain === 'hcm' && !isAdminUser(user)) {
      return fail(
        'list_report_catalog',
        'SAMI_FORBIDDEN',
        'Los reportes de RRHH solo están disponibles para ADMIN.',
      );
    }
    if (domain === 'dining' && !this.productMode.isKaiFood()) {
      return fail(
        'list_report_catalog',
        'SAMI_FOOD_ONLY',
        'Los reportes de salón están disponibles en KaiFood.',
      );
    }
    return {
      toolName: 'list_report_catalog',
      ok: true,
      summary: `${rows.length} reportes`,
      rowCount: rows.length,
      blocks: [
        {
          type: 'table',
          title: 'Catálogo de reportes',
          columns: [
            { key: 'domain', label: 'Dominio' },
            { key: 'id', label: 'Id' },
            { key: 'title', label: 'Título' },
            { key: 'description', label: 'Descripción' },
          ],
          rows,
        },
      ],
    };
  }

  private async runSales(
    companyId: string,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    return this.runRunner('run_sales_report', this.salesRunner, companyId, args);
  }

  private async runInventory(
    companyId: string,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    return this.runRunner('run_inventory_report', this.inventoryRunner, companyId, args);
  }

  private async runPurchasing(
    companyId: string,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    return this.runRunner('run_purchasing_report', this.purchasingRunner, companyId, args);
  }

  private async runDining(
    companyId: string,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    if (!this.productMode.isKaiFood()) {
      return fail(
        'run_dining_report',
        'SAMI_FOOD_ONLY',
        'Los reportes de salón están disponibles en KaiFood.',
      );
    }
    return this.runRunner('run_dining_report', this.diningRunner, companyId, args);
  }

  private async runHcm(
    companyId: string,
    user: CurrentUserPayload,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    if (!isAdminUser(user)) {
      return fail(
        'run_hcm_report',
        'SAMI_FORBIDDEN',
        'Los reportes de RRHH solo están disponibles para ADMIN.',
      );
    }
    return this.runRunner('run_hcm_report', this.hcmRunner, companyId, args);
  }

  private async runRunner(
    toolName: string,
    runner: {
      run: (
        companyId: string,
        reportId: string,
        params: Record<string, unknown>,
      ) => Promise<{ title: string; rows?: Record<string, unknown>[] } & Record<string, unknown>>;
    },
    companyId: string,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    const reportId = String(args.reportId ?? '').trim();
    if (!reportId) {
      return fail(toolName, 'SAMI_UNKNOWN_REPORT', 'Indicá el reportId.');
    }
    const result = await runner.run(companyId, reportId, mergeToolParams(args));
    return {
      toolName,
      ok: true,
      summary: result.title,
      rowCount: result.rows?.length ?? 0,
      blocks: reportResultToBlocks(result),
    };
  }

  private async runExport(
    companyId: string,
    user: CurrentUserPayload,
    args: Record<string, unknown>,
    ctx?: AssistantToolExecuteContext,
  ): Promise<AssistantToolResult> {
    const formatRaw = String(args.format ?? '').trim().toLowerCase();
    if (formatRaw !== 'xlsx' && formatRaw !== 'pdf') {
      return fail(
        'export_report',
        'SAMI_BAD_FORMAT',
        'Indicá el formato: excel (xlsx) o pdf.',
      );
    }
    const format = formatRaw as SamiExportFormat;
    const reportId =
      typeof args.reportId === 'string' && args.reportId.trim()
        ? args.reportId.trim()
        : '';
    let title = ctx?.conversationTitle?.trim() || 'Informe SaMI';
    let dataBlocks = (ctx?.priorBlocks ?? []).filter(
      (b) => b.type === 'kpi' || b.type === 'table' || b.type === 'chart',
    );

    if (reportId) {
      const row = await this.persistence.getReport(companyId, user.id, reportId);
      dataBlocks = row.blocks.filter(
        (b) => b.type === 'kpi' || b.type === 'table' || b.type === 'chart',
      );
      title = row.title || title;
      if (!hasExportableBlocks(dataBlocks)) {
        return fail(
          'export_report',
          'SAMI_NO_EXPORT_DATA',
          'Ese informe no tiene tablas ni indicadores para exportar.',
        );
      }
      const file = await this.exporter.export({ blocks: row.blocks, format, title });
      return {
        toolName: 'export_report',
        ok: true,
        summary: `Archivo listo: ${file.filename}`,
        blocks: [
          {
            type: 'download',
            format,
            reportId: row.id,
            filename: file.filename,
          },
        ],
      };
    }

    if (!hasExportableBlocks(dataBlocks) && ctx?.conversationId) {
      const latest = await this.persistence.getLatestReport(
        companyId,
        user.id,
        ctx.conversationId,
      );
      if (latest) {
        dataBlocks = latest.blocks.filter(
          (b) => b.type === 'kpi' || b.type === 'table' || b.type === 'chart',
        );
        title = latest.title || title;
        if (hasExportableBlocks(dataBlocks)) {
          const file = await this.exporter.export({
            blocks: latest.blocks,
            format,
            title,
          });
          return {
            toolName: 'export_report',
            ok: true,
            summary: `Archivo listo: ${file.filename}`,
            blocks: [
              {
                type: 'download',
                format,
                reportId: latest.id,
                filename: file.filename,
              },
            ],
          };
        }
      }
    }

    if (!hasExportableBlocks(dataBlocks)) {
      return fail(
        'export_report',
        'SAMI_NO_EXPORT_DATA',
        'Primero consultá un periodo (por ejemplo ventas de este mes) y después pedí el Excel o PDF.',
      );
    }

    const saved = await this.persistence.saveReport({
      companyId,
      userId: user.id,
      conversationId: ctx?.conversationId ?? null,
      title,
      blocks: dataBlocks,
      meta: { source: 'export_report' },
    });
    const file = await this.exporter.export({
      blocks: dataBlocks,
      format,
      title,
    });
    return {
      toolName: 'export_report',
      ok: true,
      summary: `Archivo listo: ${file.filename}`,
      blocks: [
        { type: 'report', reportId: saved.id, title },
        {
          type: 'download',
          format,
          reportId: saved.id,
          filename: file.filename,
        },
      ],
    };
  }

  private async runSemantic(
    companyId: string,
    user: CurrentUserPayload,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    const raw = args.query ?? args;
    const query = this.semanticValidator.validate(raw, {
      isAdmin: isAdminUser(user),
      maxRows: 200,
    });
    const { blocks, rowCount } = await this.semanticCompiler.run(companyId, query);
    return {
      toolName: 'run_semantic_query',
      ok: true,
      summary: `Consulta ${query.dataset}: ${rowCount} filas`,
      rowCount,
      blocks,
    };
  }
}
