import type { AssistantBlock } from './assistant-block.types';

export type AssistantToolResult = {
  toolName: string;
  ok: boolean;
  summary: string;
  blocks: AssistantBlock[];
  rowCount?: number;
  errorCode?: string;
};

export type AssistantToolExecuteContext = {
  conversationId: string;
  conversationTitle: string;
  priorBlocks: AssistantBlock[];
};
