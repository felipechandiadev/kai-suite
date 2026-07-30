import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { DiningBoardDisplay } from '../domain/dining-board-display.entity';

export const BoardDisplay = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DiningBoardDisplay => {
    const request = ctx.switchToHttp().getRequest();
    return request.boardDisplay as DiningBoardDisplay;
  },
);
