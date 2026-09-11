import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AssistantConversation } from '../domain/assistant-conversation.entity';
import { AssistantMessage } from '../domain/assistant-message.entity';
import { AssistantAuditLog } from '../domain/assistant-audit-log.entity';
import { AssistantReport } from '../domain/assistant-report.entity';
import { AssistantFavorite } from '../domain/assistant-favorite.entity';
import { AssistantScheduledReport } from '../domain/assistant-scheduled-report.entity';
import type { AssistantBlock } from '../domain/assistant-block.types';
import { conversationTitleFromUserText, nextConversationTitle } from './sami-greeting';

@Injectable()
export class AssistantPersistenceService {
  constructor(
    @InjectRepository(AssistantConversation)
    private readonly conversations: Repository<AssistantConversation>,
    @InjectRepository(AssistantMessage)
    private readonly messages: Repository<AssistantMessage>,
    @InjectRepository(AssistantAuditLog)
    private readonly audit: Repository<AssistantAuditLog>,
    @InjectRepository(AssistantReport)
    private readonly reports: Repository<AssistantReport>,
    @InjectRepository(AssistantFavorite)
    private readonly favorites: Repository<AssistantFavorite>,
    @InjectRepository(AssistantScheduledReport)
    private readonly scheduled: Repository<AssistantScheduledReport>,
  ) {}

  async getOrCreateConversation(
    companyId: string,
    userId: string,
    conversationId?: string | null,
    titleHint?: string,
  ): Promise<AssistantConversation> {
    if (conversationId) {
      const existing = await this.conversations.findOne({
        where: { id: conversationId, companyId, userId, deletedAt: IsNull() },
      });
      if (!existing) {
        throw new NotFoundException('Conversación no encontrada');
      }
      return existing;
    }
    const title = (conversationTitleFromUserText(titleHint ?? '') ?? 'Nueva conversación').slice(
      0,
      80,
    );
    return this.conversations.save(
      this.conversations.create({ companyId, userId, title }),
    );
  }

  async listConversations(companyId: string, userId: string) {
    return this.conversations.find({
      where: { companyId, userId, deletedAt: IsNull() },
      order: { updatedAt: 'DESC' },
      take: 50,
    });
  }

  async getConversationWithMessages(
    companyId: string,
    userId: string,
    conversationId: string,
  ) {
    const conversation = await this.conversations.findOne({
      where: { id: conversationId, companyId, userId, deletedAt: IsNull() },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');
    const messages = await this.messages.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      take: 80,
    });
    return { conversation, messages };
  }

  async addMessage(input: {
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    blocks?: AssistantBlock[] | null;
    meta?: Record<string, unknown> | null;
  }) {
    return this.messages.save(this.messages.create(input));
  }

  async maybeUpdateTitle(conversation: AssistantConversation, userText: string) {
    const next = nextConversationTitle(conversation.title, userText);
    if (!next) return;
    conversation.title = next;
    await this.conversations.save(conversation);
  }

  async logAudit(input: {
    companyId: string;
    userId: string;
    conversationId?: string | null;
    toolName?: string | null;
    params?: Record<string, unknown> | null;
    rowCount?: number | null;
    durationMs?: number | null;
  }) {
    return this.audit.save(this.audit.create(input));
  }

  async setFeedback(auditId: string, companyId: string, userId: string, feedback: string) {
    const row = await this.audit.findOne({ where: { id: auditId, companyId, userId } });
    if (!row) throw new NotFoundException('Registro no encontrado');
    row.feedback = feedback.slice(0, 40);
    return this.audit.save(row);
  }

  async saveReport(input: {
    companyId: string;
    userId: string;
    conversationId?: string | null;
    title: string;
    blocks: AssistantBlock[];
    meta?: Record<string, unknown> | null;
  }) {
    return this.reports.save(this.reports.create(input));
  }

  async getLatestReport(
    companyId: string,
    userId: string,
    conversationId: string,
  ): Promise<AssistantReport | null> {
    return this.reports.findOne({
      where: { companyId, userId, conversationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getReport(companyId: string, userId: string, id: string) {
    const row = await this.reports.findOne({ where: { id, companyId, userId } });
    if (!row) throw new NotFoundException('Informe no encontrado');
    return row;
  }

  async listFavorites(companyId: string, userId: string) {
    return this.favorites.find({
      where: { companyId, userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async addFavorite(companyId: string, userId: string, title: string, prompt: string) {
    return this.favorites.save(
      this.favorites.create({ companyId, userId, title: title.slice(0, 255), prompt }),
    );
  }

  async removeFavorite(companyId: string, userId: string, id: string) {
    const row = await this.favorites.findOne({ where: { id, companyId, userId } });
    if (!row) throw new NotFoundException('Favorito no encontrado');
    await this.favorites.remove(row);
  }

  async listScheduled(companyId: string, userId: string) {
    return this.scheduled.find({
      where: { companyId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async addScheduled(input: {
    companyId: string;
    userId: string;
    title: string;
    prompt: string;
    cronExpr?: string;
  }) {
    return this.scheduled.save(
      this.scheduled.create({
        ...input,
        cronExpr: input.cronExpr ?? '0 8 * * 1',
        isActive: true,
      }),
    );
  }

  async setScheduledActive(
    companyId: string,
    userId: string,
    id: string,
    isActive: boolean,
  ) {
    const row = await this.scheduled.findOne({ where: { id, companyId, userId } });
    if (!row) throw new NotFoundException('Informe programado no encontrado');
    row.isActive = isActive;
    return this.scheduled.save(row);
  }
}
