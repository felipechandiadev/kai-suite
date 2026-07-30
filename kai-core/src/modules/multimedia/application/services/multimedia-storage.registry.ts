import { Injectable } from '@nestjs/common';
import { MultimediaStorageProvider } from '../../domain/multimedia-asset.entity';
import { CloudflareR2Adapter } from '../../infrastructure/adapters/cloudflare-r2.adapter';
import { LocalStorageAdapter } from '../../infrastructure/adapters/local-storage.adapter';
import { StorageProviderPort } from '../ports/storage-provider.port';

/**
 * Resuelve el adaptador de almacenamiento según el proveedor persistido en el asset
 * (`local` | `cloudflare`), no solo la estrategia activa del deploy.
 */
@Injectable()
export class MultimediaStorageRegistry {
  constructor(
    private readonly localStorage: LocalStorageAdapter,
    private readonly cloudflareStorage: CloudflareR2Adapter,
  ) {}

  forProvider(provider: MultimediaStorageProvider | string): StorageProviderPort {
    return provider === 'cloudflare' ? this.cloudflareStorage : this.localStorage;
  }
}
