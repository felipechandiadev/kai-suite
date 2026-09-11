import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

@Injectable()
export class AssistantRateLimiter {
  private readonly hits = new Map<string, number[]>();

  assertAllowed(userId: string): void {
    const now = Date.now();
    const prev = this.hits.get(userId) ?? [];
    const recent = prev.filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_PER_WINDOW) {
      throw new HttpException(
        'Demasiadas consultas. Esperá un momento.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(userId, recent);
  }
}
