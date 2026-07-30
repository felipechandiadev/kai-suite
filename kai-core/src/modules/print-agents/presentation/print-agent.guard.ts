import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrintAgentsService } from '../application/print-agents.service';
import type { PrintAgent } from '../domain/print-agent.entity';

export const PRINT_AGENT_TOKEN_HEADER = 'x-print-agent-token';

export type PrintAgentRequest = {
  printAgent: PrintAgent;
};

@Injectable()
export class PrintAgentGuard implements CanActivate {
  constructor(private readonly agentsService: PrintAgentsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const raw =
      (request.headers[PRINT_AGENT_TOKEN_HEADER] as string | undefined)?.trim() ||
      (request.headers['X-Print-Agent-Token'] as string | undefined)?.trim() ||
      (typeof request.query?.token === 'string'
        ? request.query.token.trim()
        : '');

    if (!raw) {
      throw new UnauthorizedException('Token de agente de impresión requerido');
    }

    const agent = await this.agentsService.findActiveByRawToken(raw);
    if (!agent) {
      throw new UnauthorizedException('Token de agente inválido o revocado');
    }

    request.printAgent = agent;
    return true;
  }
}
