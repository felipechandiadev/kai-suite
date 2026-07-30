import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Branch } from '@modules/branches/domain/branch.entity';
import {
  PrintAgent,
  type PrintAgentPlatform,
} from '../domain/print-agent.entity';
import {
  generatePrintAgentToken,
  hashPrintAgentToken,
  normalizePrintAgentToken,
} from './print-agent-token.util';

/** Agente online si heartbeat reciente (ms). */
export const PRINT_AGENT_ONLINE_MS = 90_000;

export type PrintAgentPublicRow = {
  id: string;
  companyId: string;
  branchId: string | null;
  displayName: string;
  lanHost: string | null;
  wsPort: number | null;
  wssPort: number | null;
  useTls: boolean;
  platform: PrintAgentPlatform;
  online: boolean;
  lastSeenAt: string | null;
  pairedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

@Injectable()
export class PrintAgentsService {
  constructor(
    @InjectRepository(PrintAgent)
    private readonly agentRepo: Repository<PrintAgent>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
  ) {}

  private requireCompanyId(): string {
    const companyId = TenantContext.getCompanyId()?.trim();
    if (!companyId) {
      throw new BadRequestException('Empresa activa requerida');
    }
    return companyId;
  }

  private isOnline(lastSeenAt?: Date | null): boolean {
    if (!lastSeenAt) return false;
    return Date.now() - lastSeenAt.getTime() < PRINT_AGENT_ONLINE_MS;
  }

  private toPublicRow(a: PrintAgent): PrintAgentPublicRow {
    return {
      id: a.id,
      companyId: a.companyId,
      branchId: a.branchId ?? null,
      displayName: a.displayName,
      lanHost: a.lanHost ?? null,
      wsPort: a.wsPort ?? null,
      wssPort: a.wssPort ?? null,
      useTls: Boolean(a.useTls),
      platform: a.platform ?? 'unknown',
      online: this.isOnline(a.lastSeenAt),
      lastSeenAt: a.lastSeenAt ? a.lastSeenAt.toISOString() : null,
      pairedAt: a.pairedAt ? a.pairedAt.toISOString() : null,
      revokedAt: a.revokedAt ? a.revokedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
    };
  }

  async findActiveByRawToken(rawToken: string): Promise<PrintAgent | null> {
    const token = normalizePrintAgentToken(rawToken);
    if (!token) return null;
    const tokenHash = hashPrintAgentToken(token);
    return this.agentRepo.findOne({
      where: {
        tokenHash,
        isActive: true,
        revokedAt: IsNull(),
      },
    });
  }

  async list(branchId?: string): Promise<PrintAgentPublicRow[]> {
    const companyId = this.requireCompanyId();
    const qb = this.agentRepo
      .createQueryBuilder('a')
      .where('a.company_id = :companyId', { companyId })
      .andWhere('a.revoked_at IS NULL')
      .orderBy('a.display_name', 'ASC');
    if (branchId?.trim()) {
      qb.andWhere('(a.branch_id = :branchId OR a.branch_id IS NULL)', {
        branchId: branchId.trim(),
      });
    }
    const rows = await qb.getMany();
    return rows.map((a) => this.toPublicRow(a));
  }

  async create(input: {
    displayName: string;
    branchId?: string | null;
  }): Promise<PrintAgentPublicRow & { pairingToken: string }> {
    const companyId = this.requireCompanyId();
    const displayName = String(input.displayName ?? '').trim();
    if (displayName.length < 2) {
      throw new BadRequestException('Indique un nombre para el agente');
    }

    let branchId: string | null = input.branchId?.trim() || null;
    if (branchId) {
      const branch = await this.branchRepo.findOne({
        where: { id: branchId, companyId },
      });
      if (!branch) {
        throw new NotFoundException('Sucursal no encontrada');
      }
    }

    let pairingToken = '';
    let tokenHash = '';
    for (let attempt = 0; attempt < 24; attempt++) {
      pairingToken = generatePrintAgentToken();
      tokenHash = hashPrintAgentToken(pairingToken);
      const clash = await this.agentRepo.findOne({ where: { tokenHash } });
      if (!clash) break;
      pairingToken = '';
    }
    if (!pairingToken) {
      throw new BadRequestException('No se pudo generar token de emparejamiento');
    }

    const agent = this.agentRepo.create({
      companyId,
      branchId,
      displayName,
      tokenHash,
      useTls: false,
      platform: 'unknown',
      isActive: true,
    });
    const saved = await this.agentRepo.save(agent);
    return { ...this.toPublicRow(saved), pairingToken };
  }

  async update(
    id: string,
    input: {
      displayName?: string;
      branchId?: string | null;
      revoke?: boolean;
    },
  ): Promise<PrintAgentPublicRow> {
    const companyId = this.requireCompanyId();
    const agent = await this.agentRepo.findOne({
      where: { id, companyId },
    });
    if (!agent || agent.revokedAt) {
      throw new NotFoundException('Agente no encontrado');
    }

    if (input.displayName != null) {
      const name = String(input.displayName).trim();
      if (name.length < 2) {
        throw new BadRequestException('Nombre inválido');
      }
      agent.displayName = name;
    }

    if (input.branchId !== undefined) {
      const branchId = input.branchId?.trim() || null;
      if (branchId) {
        const branch = await this.branchRepo.findOne({
          where: { id: branchId, companyId },
        });
        if (!branch) {
          throw new NotFoundException('Sucursal no encontrada');
        }
      }
      agent.branchId = branchId;
    }

    if (input.revoke === true) {
      agent.isActive = false;
      agent.revokedAt = new Date();
    }

    const saved = await this.agentRepo.save(agent);
    return this.toPublicRow(saved);
  }

  async pair(rawToken: string): Promise<{
    id: string;
    displayName: string;
    companyId: string;
    pairingToken: string;
  }> {
    const token = normalizePrintAgentToken(rawToken);
    if (!token) {
      throw new BadRequestException('Token de emparejamiento inválido');
    }
    const agent = await this.findActiveByRawToken(token);
    if (!agent) {
      throw new NotFoundException('Token inválido o agente revocado');
    }
    agent.pairedAt = new Date();
    agent.lastSeenAt = new Date();
    await this.agentRepo.save(agent);
    return {
      id: agent.id,
      displayName: agent.displayName,
      companyId: agent.companyId,
      pairingToken: token,
    };
  }

  async heartbeat(
    agent: PrintAgent,
    input: {
      displayName?: string;
      lanHost: string;
      wsPort: number;
      wssPort: number;
      useTls?: boolean;
      platform?: PrintAgentPlatform;
    },
  ): Promise<PrintAgentPublicRow> {
    const lanHost = String(input.lanHost ?? '').trim();
    if (!lanHost) {
      throw new BadRequestException('lanHost es obligatorio');
    }
    if (input.displayName != null) {
      const name = String(input.displayName).trim();
      if (name.length >= 2) {
        agent.displayName = name;
      }
    }
    agent.lanHost = lanHost;
    agent.wsPort = input.wsPort;
    agent.wssPort = input.wssPort;
    agent.useTls = Boolean(input.useTls);
    if (input.platform) {
      agent.platform = input.platform;
    }
    agent.lastSeenAt = new Date();
    if (!agent.pairedAt) {
      agent.pairedAt = new Date();
    }
    const saved = await this.agentRepo.save(agent);
    return this.toPublicRow(saved);
  }
}
