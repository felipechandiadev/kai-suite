import { createHash } from 'crypto';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

type CacheEntry = { buffer: Buffer; contentType: string; expiresAt: number };

@Injectable()
export class LiraVoiceService {
  private readonly logger = new Logger(LiraVoiceService.name);
  private readonly cache = new Map<string, CacheEntry>();

  async speak(params: {
    text: string;
    voice?: string;
  }): Promise<{ buffer: Buffer; contentType: string } | { fallback: 'browser' }> {
    const text = String(params.text ?? '').trim();
    if (!text) {
      throw new ServiceUnavailableException('Texto vacío');
    }
    const voice = (params.voice ?? 'es-CL-CatalinaNeural').trim();
    const base =
      process.env.KAI_VOICE_URL?.trim() ||
      process.env.LIRA_VOICE_URL?.trim();
    if (!base) {
      return { fallback: 'browser' };
    }

    const cacheKey = createHash('sha256')
      .update(`v2\n${voice}\n${text}`)
      .digest('hex');
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { buffer: cached.buffer, contentType: cached.contentType };
    }

    const url = `${base.replace(/\/$/, '')}/voice/speak`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });
      if (!res.ok) {
        this.logger.warn(`Kai Voice speak HTTP ${res.status}`);
        return { fallback: 'browser' };
      }
      const contentType =
        res.headers.get('content-type') || 'audio/mpeg';
      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      this.cache.set(cacheKey, {
        buffer,
        contentType,
        expiresAt: Date.now() + 1000 * 60 * 60,
      });
      return { buffer, contentType };
    } catch (e) {
      this.logger.warn(
        `Kai Voice speak failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return { fallback: 'browser' };
    }
  }
}

