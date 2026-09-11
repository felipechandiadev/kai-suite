import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  AdminOnly,
  CurrentCompany,
  CurrentUser,
  type CurrentUserPayload,
} from '@common/tenant';
import { LiraVoiceService } from '@modules/lira/application/lira-voice.service';
import { AssistantOrchestrator } from '../application/assistant-orchestrator.service';
import { AssistantPersistenceService } from '../application/assistant-persistence.service';
import { AssistantCatalogService } from '../application/assistant-catalog.service';
import { AssistantRateLimiter } from '../application/assistant-rate-limiter.service';
import { AssistantExportService } from '../application/assistant-export.service';
import type { SamiExportFormat } from '../application/assistant-export.service';
import {
  AssistantChatDto,
  AssistantFavoriteDto,
  AssistantFeedbackDto,
  AssistantScheduledDto,
  AssistantSpeakDto,
} from './dto/chat.dto';

@Controller('assistant')
@AdminOnly()
export class AssistantController {
  constructor(
    private readonly orchestrator: AssistantOrchestrator,
    private readonly persistence: AssistantPersistenceService,
    private readonly catalog: AssistantCatalogService,
    private readonly rateLimiter: AssistantRateLimiter,
    private readonly voice: LiraVoiceService,
    private readonly exporter: AssistantExportService,
  ) {}

  @Post('chat')
  async chat(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: AssistantChatDto,
  ) {
    this.rateLimiter.assertAllowed(user.id);
    return this.orchestrator.chat({
      companyId,
      user,
      message: body.message,
      conversationId: body.conversationId,
    });
  }

  @Post('voice/speak')
  async speak(@Body() body: AssistantSpeakDto) {
    const clipped = body.text.trim().slice(0, 800);
    const result = await this.voice.speak({ text: clipped });
    if ('fallback' in result) {
      return { fallback: 'browser' as const };
    }
    // JSON (no audio binario): las Server Actions de Next no proxifican bien MPEG.
    return {
      audioBase64: result.buffer.toString('base64'),
      contentType: result.contentType,
    };
  }

  @Get('catalog')
  catalogEndpoint() {
    return this.catalog.getCatalog();
  }

  @Get('conversations')
  async conversations(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const rows = await this.persistence.listConversations(companyId, user.id);
    return {
      conversations: rows.map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt,
      })),
    };
  }

  @Get('conversations/:id')
  async conversation(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.persistence.getConversationWithMessages(companyId, user.id, id);
  }

  @Get('reports/:id/export')
  async exportReport(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') formatRaw: string,
  ) {
    const format = String(formatRaw ?? '').trim().toLowerCase();
    if (format !== 'xlsx' && format !== 'pdf') {
      throw new BadRequestException('format debe ser xlsx o pdf');
    }
    const row = await this.persistence.getReport(companyId, user.id, id);
    const file = await this.exporter.export({
      blocks: row.blocks,
      format: format as SamiExportFormat,
      title: row.title,
    });
    return {
      filename: file.filename,
      contentType: file.contentType,
      fileBase64: file.buffer.toString('base64'),
    };
  }

  @Get('reports/:id')
  async report(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.persistence.getReport(companyId, user.id, id);
  }

  @Post('feedback')
  async feedback(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: AssistantFeedbackDto,
  ) {
    await this.persistence.setFeedback(body.auditId, companyId, user.id, body.feedback);
    return { success: true };
  }

  @Get('favorites')
  async favorites(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return { favorites: await this.persistence.listFavorites(companyId, user.id) };
  }

  @Post('favorites')
  async addFavorite(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: AssistantFavoriteDto,
  ) {
    const row = await this.persistence.addFavorite(
      companyId,
      user.id,
      body.title,
      body.prompt,
    );
    return { favorite: row };
  }

  @Delete('favorites/:id')
  async removeFavorite(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.persistence.removeFavorite(companyId, user.id, id);
    return { success: true };
  }

  @Get('scheduled-reports')
  async scheduled(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return { items: await this.persistence.listScheduled(companyId, user.id) };
  }

  @Post('scheduled-reports')
  async addScheduled(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: AssistantScheduledDto,
  ) {
    const row = await this.persistence.addScheduled({
      companyId,
      userId: user.id,
      title: body.title,
      prompt: body.prompt,
      cronExpr: body.cronExpr,
    });
    return { item: row, note: 'La ejecución automática queda pendiente de cola.' };
  }

  @Patch('scheduled-reports/:id')
  async patchScheduled(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isActive?: boolean },
  ) {
    const row = await this.persistence.setScheduledActive(
      companyId,
      user.id,
      id,
      Boolean(body.isActive),
    );
    return { item: row };
  }
}
