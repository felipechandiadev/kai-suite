import { apiFailure, type ApiFailure } from "@/lib/auth/api-response";
import { apiUrl, authHeaders } from "@/lib/auth/auth-headers";
import type {
  AssistantBlock,
  AssistantChatResponse,
} from "../domain/assistant-block.types";

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export class AssistantRequest {
  static async chat(input: {
    message: string;
    conversationId?: string | null;
  }): Promise<AssistantChatResponse | ApiFailure> {
    const res = await fetch(apiUrl("assistant/chat"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(input),
      cache: "no-store",
    });
    const data = await parseJson(res);
    if (!res.ok) return apiFailure(res, data);
    return data as AssistantChatResponse;
  }

  static async speak(
    text: string,
  ): Promise<
    | { success: true; fallback: "browser" }
    | { success: true; audioBase64: string; contentType: string }
    | { success: false; error: string; unauthorized?: boolean }
  > {
    const clipped = text.trim().slice(0, 800);
    if (!clipped) {
      return { success: true, fallback: "browser" };
    }
    try {
      const res = await fetch(apiUrl("assistant/voice/speak"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ text: clipped }),
        cache: "no-store",
      });
      const data = await parseJson(res);
      if (!res.ok) {
        return apiFailure(res, data);
      }
      if (data.fallback === "browser") {
        return { success: true, fallback: "browser" };
      }
      if (typeof data.audioBase64 === "string" && data.audioBase64.length > 0) {
        return {
          success: true,
          audioBase64: data.audioBase64,
          contentType:
            typeof data.contentType === "string" && data.contentType
              ? data.contentType
              : "audio/mpeg",
        };
      }
      return { success: true, fallback: "browser" };
    } catch {
      return { success: true, fallback: "browser" };
    }
  }

  static async catalog() {
    const res = await fetch(apiUrl("assistant/catalog"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    if (!res.ok) return apiFailure(res, data);
    return { success: true as const, catalog: data };
  }

  static async conversations() {
    const res = await fetch(apiUrl("assistant/conversations"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    if (!res.ok) return apiFailure(res, data);
    return {
      success: true as const,
      conversations: (data.conversations as Array<{
        id: string;
        title: string;
        updatedAt: string;
      }>) ?? [],
    };
  }

  static async conversation(id: string) {
    const res = await fetch(apiUrl(`assistant/conversations/${id}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    if (!res.ok) return apiFailure(res, data);
    return {
      success: true as const,
      messages: (data.messages as Array<{
        id: string;
        role: "user" | "assistant";
        content: string;
        blocks?: AssistantBlock[];
      }>) ?? [],
    };
  }

  static async report(id: string) {
    const res = await fetch(apiUrl(`assistant/reports/${id}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    if (!res.ok) return apiFailure(res, data);
    return {
      success: true as const,
      report: data as { id: string; title: string; blocks: AssistantBlock[] },
    };
  }

  static async export(reportId: string, format: "xlsx" | "pdf") {
    try {
      const res = await fetch(
        apiUrl(
          `assistant/reports/${encodeURIComponent(reportId)}/export?format=${format}`,
        ),
        {
          headers: await authHeaders(),
          cache: "no-store",
        },
      );
      const data = await parseJson(res);
      if (!res.ok) return apiFailure(res, data);
      if (typeof data.fileBase64 !== "string" || typeof data.filename !== "string") {
        return { success: false as const, error: "Respuesta de export inválida" };
      }
      return {
        success: true as const,
        filename: data.filename,
        contentType:
          typeof data.contentType === "string"
            ? data.contentType
            : "application/octet-stream",
        fileBase64: data.fileBase64,
      };
    } catch {
      return { success: false as const, error: "No se pudo generar el archivo." };
    }
  }

  static async feedback(auditId: string, feedback: string) {
    const res = await fetch(apiUrl("assistant/feedback"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ auditId, feedback }),
      cache: "no-store",
    });
    const data = await parseJson(res);
    if (!res.ok) return apiFailure(res, data);
    return { success: true as const };
  }

  static async favorites() {
    const res = await fetch(apiUrl("assistant/favorites"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    if (!res.ok) return apiFailure(res, data);
    return {
      success: true as const,
      favorites: (data.favorites as Array<{
        id: string;
        title: string;
        prompt: string;
      }>) ?? [],
    };
  }

  static async addFavorite(title: string, prompt: string) {
    const res = await fetch(apiUrl("assistant/favorites"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ title, prompt }),
      cache: "no-store",
    });
    const data = await parseJson(res);
    if (!res.ok) return apiFailure(res, data);
    return { success: true as const };
  }

  static async removeFavorite(id: string) {
    const res = await fetch(apiUrl(`assistant/favorites/${id}`), {
      method: "DELETE",
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    if (!res.ok) return apiFailure(res, data);
    return { success: true as const };
  }

  static async scheduledReports() {
    const res = await fetch(apiUrl("assistant/scheduled-reports"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    if (!res.ok) return apiFailure(res, data);
    return {
      success: true as const,
      items: (data.items as Array<{
        id: string;
        title: string;
        prompt: string;
        cronExpr: string;
        isActive: boolean;
      }>) ?? [],
    };
  }

  static async addScheduled(title: string, prompt: string, cronExpr?: string) {
    const res = await fetch(apiUrl("assistant/scheduled-reports"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ title, prompt, cronExpr }),
      cache: "no-store",
    });
    const data = await parseJson(res);
    if (!res.ok) return apiFailure(res, data);
    return { success: true as const };
  }
}
