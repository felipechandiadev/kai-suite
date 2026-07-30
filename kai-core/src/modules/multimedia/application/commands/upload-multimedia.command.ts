import { BaseCommand } from '@shared/cqrs';

export class UploadMultimediaCommand extends BaseCommand {
  constructor(
    public readonly file: {
      buffer: Buffer;
      originalName: string;
      mimeType: string;
      size: number;
    },
    public readonly entityType?: string,
    public readonly entityId?: string,
    public readonly usageType: string = 'default',
    public readonly isPrimary: boolean = false,
    public readonly metadata?: Record<string, unknown>,
    public readonly attributeId?: string | null,
  ) {
    super();
  }
}