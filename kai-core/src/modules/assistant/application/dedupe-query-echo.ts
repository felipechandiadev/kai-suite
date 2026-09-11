import type { AssistantBlock } from '../domain/assistant-block.types';

/** Como máximo un `query_echo` visible (el primero). */
export function dedupeQueryEchoBlocks(blocks: AssistantBlock[]): AssistantBlock[] {
  let kept = false;
  return blocks.filter((b) => {
    if (b.type !== 'query_echo') return true;
    if (kept) return false;
    kept = true;
    return true;
  });
}
