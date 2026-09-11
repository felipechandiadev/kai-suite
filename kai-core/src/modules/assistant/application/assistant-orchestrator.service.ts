import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { CurrentUserPayload } from '@common/tenant';
import { BranchesService } from '@modules/branches/application/branches.service';
import { ProductModeService } from '@shared/product-mode/product-mode.service';
import type { AssistantBlock, AssistantChatResponse } from '../domain/assistant-block.types';
import { SAMI_SYSTEM_PROMPT } from './prompts/system.prompt';
import { buildSamiClockPrompt } from './prompts/sami-clock';
import { buildCatalogSummaryPrompt } from './prompts/catalog-summary.prompt';
import { buildPlatformContextPrompt } from './prompts/platform-context.prompt';
import { AssistantToolExecutor } from './assistant-tool-executor.service';
import { AssistantPersistenceService } from './assistant-persistence.service';
import { OpenAIAssistantPort } from '../infrastructure/openai/openai-assistant.client';
import { toolResultToLlmPayload } from './tool-result-to-llm-payload';
import { hasExportableBlocks } from './assistant-export.service';
import { dedupeQueryEchoBlocks } from './dedupe-query-echo';

function maxToolCalls(): number {
  const n = Number(process.env.SAMI_MAX_TOOL_CALLS ?? 5);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 8) : 5;
}

@Injectable()
export class AssistantOrchestrator {
  private readonly logger = new Logger(AssistantOrchestrator.name);

  constructor(
    @Inject(OpenAIAssistantPort) private readonly openai: OpenAIAssistantPort,
    private readonly tools: AssistantToolExecutor,
    private readonly persistence: AssistantPersistenceService,
    private readonly branches: BranchesService,
    private readonly productMode: ProductModeService,
  ) {}

  async chat(input: {
    companyId: string;
    user: CurrentUserPayload;
    message: string;
    conversationId?: string | null;
  }): Promise<AssistantChatResponse> {
    const started = Date.now();
    const text = input.message.trim();
    const conversation = await this.persistence.getOrCreateConversation(
      input.companyId,
      input.user.id,
      input.conversationId,
      text,
    );
    await this.persistence.maybeUpdateTitle(conversation, text);
    await this.persistence.addMessage({
      conversationId: conversation.id,
      role: 'user',
      content: text,
    });

    const history = await this.persistence.getConversationWithMessages(
      input.companyId,
      input.user.id,
      conversation.id,
    );

    let branchRows: Array<{ id: string; name: string }> = [];
    try {
      const all = await this.branches.getAllBranches(input.companyId, false);
      branchRows = all.slice(0, 20).map((b) => ({ id: b.id, name: b.name }));
    } catch (e) {
      this.logger.warn(
        `No se pudieron listar sucursales: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `${SAMI_SYSTEM_PROMPT}\n\n${buildSamiClockPrompt()}\n\n${buildPlatformContextPrompt(
          {
            productMode: this.productMode.getProductMode(),
            diningEnabled: this.productMode.isKaiFood(),
            branches: branchRows,
          },
        )}\n\n${buildCatalogSummaryPrompt()}`,
      },
      ...history.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const collectedBlocks: AssistantBlock[] = [];
    const toolsUsed: string[] = [];
    let queryEcho: Record<string, unknown> | null = null;
    let lastAuditId: string | null = null;
    let assistantText = '';
    const limit = maxToolCalls();

    for (let i = 0; i < limit + 1; i++) {
      const completion = await this.openai.complete({ messages });
      const choice = completion.choices[0];
      const msg = choice?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length && i < limit) {
        messages.push({
          role: 'assistant',
          content: msg.content ?? null,
          tool_calls: toolCalls,
        });
        for (const call of toolCalls) {
          if (call.type !== 'function') continue;
          const name = call.function.name;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
          } catch {
            args = {};
          }
          const t0 = Date.now();
          const result = await this.tools.execute(
            input.companyId,
            input.user,
            name,
            args,
            {
              conversationId: conversation.id,
              conversationTitle: conversation.title,
              priorBlocks: collectedBlocks,
            },
          );
          toolsUsed.push(name);
          collectedBlocks.push(...result.blocks);
          const echoBlock = result.blocks.find((b) => b.type === 'query_echo');
          if (echoBlock && echoBlock.type === 'query_echo') {
            queryEcho = echoBlock.query;
          }
          const audit = await this.persistence.logAudit({
            companyId: input.companyId,
            userId: input.user.id,
            conversationId: conversation.id,
            toolName: name,
            params: args,
            rowCount: result.rowCount ?? null,
            durationMs: Date.now() - t0,
          });
          lastAuditId = audit.id;
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(toolResultToLlmPayload(result, args)),
          });
        }
        continue;
      }

      assistantText = (msg.content ?? '').trim();
      break;
    }

    if (!assistantText) {
      assistantText = collectedBlocks.length
        ? 'Listo. Revisá el detalle abajo.'
        : 'No pude completar la consulta. Probá reformular la pregunta.';
    }

    const visibleBlocks = dedupeQueryEchoBlocks(collectedBlocks);
    const blocks: AssistantBlock[] = [
      { type: 'markdown', content: assistantText },
      ...visibleBlocks,
    ];

    const hasReportLink = visibleBlocks.some(
      (b) => b.type === 'report' || b.type === 'download',
    );
    if (hasExportableBlocks(visibleBlocks) && !hasReportLink) {
      const report = await this.persistence.saveReport({
        companyId: input.companyId,
        userId: input.user.id,
        conversationId: conversation.id,
        title: conversation.title,
        blocks: visibleBlocks.filter(
          (b) =>
            b.type === 'kpi' ||
            b.type === 'table' ||
            b.type === 'chart' ||
            b.type === 'query_echo',
        ),
        meta: { toolsUsed },
      });
      blocks.push({ type: 'report', reportId: report.id, title: report.title });
    }

    await this.persistence.addMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: assistantText,
      blocks,
      meta: { toolsUsed, queryEcho, lastAuditId },
    });

    this.logger.debug(
      `chat ${conversation.id} tools=${toolsUsed.join(',')} ${Date.now() - started}ms`,
    );

    return {
      success: true,
      conversationId: conversation.id,
      assistantMessage: {
        role: 'assistant',
        content: assistantText,
        blocks,
        meta: { toolsUsed, queryEcho, lastAuditId },
      },
    };
  }
}
