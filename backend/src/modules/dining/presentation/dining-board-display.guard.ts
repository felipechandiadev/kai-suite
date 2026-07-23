import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DiningBoardService } from '../application/dining-board.service';
import type { DiningBoardDisplay } from '../domain/dining-board-display.entity';

export const BOARD_DISPLAY_HEADER = 'x-board-display-token';

export type DiningBoardDisplayRequest = {
  boardDisplay: DiningBoardDisplay;
};

@Injectable()
export class DiningBoardDisplayGuard implements CanActivate {
  constructor(private readonly boardService: DiningBoardService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const raw =
      (request.headers[BOARD_DISPLAY_HEADER] as string | undefined)?.trim() ||
      (request.headers['X-Board-Display-Token'] as string | undefined)?.trim() ||
      (typeof request.query?.token === 'string'
        ? request.query.token.trim()
        : '');

    if (!raw) {
      throw new UnauthorizedException('Token de pantalla requerido');
    }

    const display = await this.boardService.findActiveByRawToken(raw);
    if (!display) {
      throw new UnauthorizedException('Token de pantalla inválido o revocado');
    }

    void this.boardService.touchLastSeen(display.id);
    request.boardDisplay = display;
    return true;
  }
}
