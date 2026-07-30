/**
 * Global Providers Module
 *
 * Provides all domain entity repository mappings globally so that
 * @InjectRepository(DomainEntity) works across all modules.
 */

import { Global, Module } from '@nestjs/common';
import { REPOSITORY_PROVIDERS } from './repository-providers';

@Global()
@Module({
  providers: REPOSITORY_PROVIDERS,
  exports: REPOSITORY_PROVIDERS.map((p) => p.provide),
})
export class GlobalProvidersModule {}
