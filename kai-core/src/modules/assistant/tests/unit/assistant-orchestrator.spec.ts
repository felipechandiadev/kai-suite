import { AssistantOrchestrator } from '../../application/assistant-orchestrator.service';
import type { OpenAIAssistantPort } from '../../infrastructure/openai/openai-assistant.client';
import type { AssistantToolExecutor } from '../../application/assistant-tool-executor.service';
import type { AssistantPersistenceService } from '../../application/assistant-persistence.service';
import type { CurrentUserPayload } from '@common/tenant';
import type { ChatCompletion } from 'openai/resources/chat/completions';

function user(): CurrentUserPayload {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    userName: 'admin',
    rol: 'ADMIN',
    companyId: '22222222-2222-2222-2222-222222222222',
    roles: ['ADMIN'],
  };
}

describe('AssistantOrchestrator', () => {
  it('runs sales tool then returns assistant text with blocks', async () => {
    const openai: OpenAIAssistantPort = {
      complete: jest
        .fn()
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_1',
                    type: 'function',
                    function: {
                      name: 'run_sales_report',
                      arguments: JSON.stringify({
                        reportId: 'sales-by-period',
                        dateFrom: '2026-08-11',
                        dateTo: '2026-08-18',
                      }),
                    },
                  },
                ],
              },
            },
          ],
        } as ChatCompletion)
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Esta semana se vendieron $1.200.000.',
              },
            },
          ],
        } as ChatCompletion),
    };

    const tools = {
      execute: jest.fn().mockResolvedValue({
        toolName: 'run_sales_report',
        ok: true,
        summary: 'Ventas',
        rowCount: 2,
        blocks: [
          { type: 'kpi', items: [{ label: 'Neto', value: '$1.200.000' }] },
          {
            type: 'table',
            columns: [{ key: 'day', label: 'Día' }],
            rows: [{ day: '2026-08-18' }],
          },
        ],
      }),
    } as unknown as AssistantToolExecutor;

    const conversation = {
      id: 'conv-1',
      title: 'Nueva conversación',
    };
    const persistence = {
      getOrCreateConversation: jest.fn().mockResolvedValue(conversation),
      maybeUpdateTitle: jest.fn(),
      addMessage: jest.fn(),
      getConversationWithMessages: jest.fn().mockResolvedValue({
        conversation,
        messages: [{ role: 'user', content: '¿cuánto vendimos esta semana?' }],
      }),
      logAudit: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      saveReport: jest.fn().mockResolvedValue({ id: 'rep-1', title: 'Ventas' }),
    } as unknown as AssistantPersistenceService;

    const branches = {
      getAllBranches: jest.fn().mockResolvedValue([{ id: 'b1', name: 'Centro' }]),
    };
    const productMode = {
      getProductMode: () => 'kaisuite',
      isKaiFood: () => true,
    };

    const orch = new AssistantOrchestrator(
      openai,
      tools,
      persistence,
      branches as never,
      productMode as never,
    );
    const res = await orch.chat({
      companyId: user().companyId!,
      user: user(),
      message: '¿cuánto vendimos esta semana?',
    });

    expect(res.success).toBe(true);
    expect(res.assistantMessage.content).toContain('vendieron');
    expect(res.assistantMessage.meta.toolsUsed).toEqual(['run_sales_report']);
    expect(res.assistantMessage.blocks.some((b) => b.type === 'kpi')).toBe(true);
    expect(tools.execute).toHaveBeenCalledTimes(1);
  });

  it('keeps download block from export_report', async () => {
    const openai: OpenAIAssistantPort = {
      complete: jest
        .fn()
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_x',
                    type: 'function',
                    function: {
                      name: 'export_report',
                      arguments: JSON.stringify({ format: 'xlsx' }),
                    },
                  },
                ],
              },
            },
          ],
        } as ChatCompletion)
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Listo, descargá el Excel.',
              },
            },
          ],
        } as ChatCompletion),
    };
    const tools = {
      execute: jest.fn().mockResolvedValue({
        toolName: 'export_report',
        ok: true,
        summary: 'Archivo listo: sami-ventas.xlsx',
        blocks: [
          {
            type: 'download',
            format: 'xlsx',
            reportId: 'rep-9',
            filename: 'sami-ventas.xlsx',
          },
        ],
      }),
    } as unknown as AssistantToolExecutor;
    const conversation = { id: 'conv-2', title: 'Excel' };
    const persistence = {
      getOrCreateConversation: jest.fn().mockResolvedValue(conversation),
      maybeUpdateTitle: jest.fn(),
      addMessage: jest.fn(),
      getConversationWithMessages: jest.fn().mockResolvedValue({
        conversation,
        messages: [{ role: 'user', content: 'pasame el excel' }],
      }),
      logAudit: jest.fn().mockResolvedValue({ id: 'audit-2' }),
      saveReport: jest.fn(),
    } as unknown as AssistantPersistenceService;
    const orch = new AssistantOrchestrator(
      openai,
      tools,
      persistence,
      { getAllBranches: jest.fn().mockResolvedValue([]) } as never,
      { getProductMode: () => 'kaistore', isKaiFood: () => false } as never,
    );
    const res = await orch.chat({
      companyId: user().companyId!,
      user: user(),
      message: 'pasame el excel',
    });
    expect(res.assistantMessage.blocks.some((b) => b.type === 'download')).toBe(
      true,
    );
    expect(persistence.saveReport).not.toHaveBeenCalled();
  });
});
