import {
  Body,
  Controller,
  Headers,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { SkipTenant } from '@common/tenant/tenant.decorators';
import { DiningBoardService } from '@modules/dining/application/dining-board.service';
import { LiraSpeakDto } from '../application/dto/lira-speak.dto';
import { LiraVoiceService } from '../application/lira-voice.service';

/**
 * Facade TTS para Kai Board (display token).
 * Proxifica a `services/kai-voice` si `KAI_VOICE_URL` (o legacy `LIRA_VOICE_URL`) está definida.
 */
@Controller('lira/voice')
@SkipTenant()
export class LiraVoiceController {
  constructor(
    private readonly liraVoice: LiraVoiceService,
    private readonly boardService: DiningBoardService,
  ) {}

  @Post('speak')
  async speak(
    @Body() dto: LiraSpeakDto,
    @Headers('x-board-display-token') displayToken: string | undefined,
    @Res() res: Response,
  ) {
    const token = displayToken?.trim() ?? '';
    if (!token) {
      throw new UnauthorizedException('Token de pantalla requerido');
    }
    const display = await this.boardService.findActiveByRawToken(token);
    if (!display) {
      throw new UnauthorizedException('Token de pantalla inválido o revocado');
    }
    void this.boardService.touchLastSeen(display.id);

    const result = await this.liraVoice.speak({
      text: dto.text,
      voice: dto.voice,
    });
    if ('fallback' in result) {
      return res.status(200).json({ success: true, fallback: 'browser' });
    }
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(result.buffer);
  }
}
