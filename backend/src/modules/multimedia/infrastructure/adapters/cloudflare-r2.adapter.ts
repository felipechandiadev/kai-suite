import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { AppConfigService } from '../../../../config/config.service';
import {
  StorageProviderPort,
  StoredFileResult,
  UploadStoragePayload,
} from '../../application/ports/storage-provider.port';

@Injectable()
export class CloudflareR2Adapter implements StorageProviderPort {
  private readonly client: S3Client;

  constructor(private readonly configService: AppConfigService) {
    const { r2 } = this.configService.storage;

    this.client = new S3Client({
      region: 'auto',
      endpoint: r2.endpoint,
      credentials: {
        accessKeyId: r2.accessKeyId ?? '',
        secretAccessKey: r2.secretAccessKey ?? '',
      },
    });
  }

  async upload(payload: UploadStoragePayload): Promise<StoredFileResult> {
    const extension = path.extname(payload.originalName);
    const storedName = `${randomUUID()}${extension}`;
    const bucket = this.configService.storage.r2.bucketName;

    if (!bucket) {
      throw new Error('R2 bucket name is not configured');
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storedName,
        Body: payload.buffer,
        ContentType: payload.mimeType,
      }),
    );

    return {
      storageKey: storedName,
      storedName,
      publicUrl: this.buildPublicUrl(storedName),
    };
  }

  async delete(storageKey: string): Promise<void> {
    const bucket = this.configService.storage.r2.bucketName;

    if (!bucket) {
      throw new Error('R2 bucket name is not configured');
    }

    await this.client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }),
    );
  }

  /**
   * Vacía el bucket R2 configurado (todas las keys).
   * Pensado para seeds de desarrollo; no forma parte del puerto de storage de producción.
   */
  async emptyBucket(): Promise<{ deleted: number }> {
    const bucket = this.configService.storage.r2.bucketName;

    if (!bucket) {
      throw new Error('R2 bucket name is not configured');
    }

    let deleted = 0;
    let continuationToken: string | undefined;

    do {
      const listed = await this.client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        }),
      );

      const keys = (listed.Contents ?? [])
        .map((obj) => obj.Key)
        .filter((key): key is string => Boolean(key));

      for (let i = 0; i < keys.length; i += 1000) {
        const chunk = keys.slice(i, i + 1000);
        if (chunk.length === 0) {
          continue;
        }
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: chunk.map((Key) => ({ Key })),
              Quiet: true,
            },
          }),
        );
        deleted += chunk.length;
      }

      continuationToken = listed.IsTruncated
        ? listed.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return { deleted };
  }

  async exists(storageKey: string): Promise<boolean> {
    const bucket = this.configService.storage.r2.bucketName;

    if (!bucket) {
      return false;
    }

    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: storageKey }),
      );
      return true;
    } catch {
      return false;
    }
  }

  buildPublicUrl(storageKey: string): string {
    const publicUrl = this.configService.storage.r2.publicUrl;

    if (!publicUrl) {
      throw new Error('R2 public URL is not configured');
    }

    return `${publicUrl.replace(/\/$/, '')}/${storageKey}`;
  }
}