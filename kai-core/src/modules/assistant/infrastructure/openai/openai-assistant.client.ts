import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import { SAMI_CHAT_TOOLS } from '../../application/prompts/tools-description';

export type OpenAIChatParams = {
  messages: ChatCompletionMessageParam[];
  model?: string;
};

export abstract class OpenAIAssistantPort {
  abstract complete(params: OpenAIChatParams): Promise<ChatCompletion>;
}

@Injectable()
export class OpenAIAssistantClient extends OpenAIAssistantPort {
  private readonly logger = new Logger(OpenAIAssistantClient.name);
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY no está configurada en el servidor.',
      );
    }
    if (!this.client) {
      this.client = new OpenAI({ apiKey: key });
    }
    return this.client;
  }

  async complete(params: OpenAIChatParams): Promise<ChatCompletion> {
    const model =
      params.model?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4.1';
    try {
      return await this.getClient().chat.completions.create({
        model,
        messages: params.messages,
        tools: SAMI_CHAT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.2,
      });
    } catch (e) {
      if (e instanceof ServiceUnavailableException) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`OpenAI error: ${msg}`);
      throw new ServiceUnavailableException(
        'No se pudo contactar al modelo. Reintentá en un momento.',
      );
    }
  }
}
