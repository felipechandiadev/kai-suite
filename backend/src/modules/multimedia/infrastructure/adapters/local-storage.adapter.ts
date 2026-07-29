import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { AppConfigService } from '../../../../config/config.service';
import {
  StorageProviderPort,
  StoredFileResult,
  UploadStoragePayload,
} from '../../application/ports/storage-provider.port';

function assertSafeRelativeKey(storageKey: string): string {
  const normalized = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..') || path.isAbsolute(normalized)) {
    throw new Error(`Invalid storage key: ${storageKey}`);
  }
  return normalized;
}

@Injectable()
export class LocalStorageAdapter implements StorageProviderPort {
  constructor(private readonly configService: AppConfigService) {}

  async upload(payload: UploadStoragePayload): Promise<StoredFileResult> {
    const extension = path.extname(payload.originalName) || '';
    const storageKey = payload.storageKey
      ? assertSafeRelativeKey(payload.storageKey)
      : `${randomUUID()}${extension}`;
    const storedName = path.basename(storageKey);
    const targetDir = path.resolve(this.configService.storage.local.path);
    const targetPath = path.join(targetDir, storageKey);

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, payload.buffer);

    return {
      storageKey,
      storedName,
      publicUrl: this.buildPublicUrl(storageKey),
    };
  }

  async delete(storageKey: string): Promise<void> {
    const safeKey = assertSafeRelativeKey(storageKey);
    const targetPath = path.join(
      path.resolve(this.configService.storage.local.path),
      safeKey,
    );

    await fs.rm(targetPath, { force: true });
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      const safeKey = assertSafeRelativeKey(storageKey);
      await fs.access(
        path.join(path.resolve(this.configService.storage.local.path), safeKey),
      );
      return true;
    } catch {
      return false;
    }
  }

  buildPublicUrl(storageKey: string): string {
    const basePath = this.configService.storage.publicBasePath.replace(/\/$/, '');
    const key = storageKey
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
    return `${basePath}/${key}`;
  }
}
