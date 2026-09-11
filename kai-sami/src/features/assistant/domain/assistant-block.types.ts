export type AssistantChartKind = "line" | "area" | "bar" | "pie";

export type AssistantBlock =
  | { type: "markdown"; content: string }
  | {
      type: "kpi";
      items: Array<{ label: string; value: string | number; hint?: string }>;
    }
  | {
      type: "table";
      columns: Array<{ key: string; label: string; align?: "left" | "right" }>;
      rows: Record<string, unknown>[];
      title?: string;
    }
  | {
      type: "chart";
      chart: AssistantChartKind;
      title?: string;
      series: Array<{
        id: string;
        label: string;
        points: Array<{ x: string; y: number; y2?: number }>;
      }>;
    }
  | { type: "query_echo"; query: Record<string, unknown> }
  | { type: "report"; reportId: string; title: string }
  | {
      type: "download";
      format: "xlsx" | "pdf";
      reportId: string;
      filename: string;
    };

export type AssistantChatResponse = {
  success: true;
  conversationId: string;
  assistantMessage: {
    role: "assistant";
    content: string;
    blocks: AssistantBlock[];
    meta: {
      toolsUsed: string[];
      queryEcho: Record<string, unknown> | null;
      lastAuditId?: string | null;
    };
  };
};

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  blocks?: AssistantBlock[];
  lastAuditId?: string | null;
};
