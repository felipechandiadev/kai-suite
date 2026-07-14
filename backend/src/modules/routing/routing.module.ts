import { Module } from '@nestjs/common';
import { OsrmHttpClient } from './application/osrm-http.client';

@Module({
  providers: [OsrmHttpClient],
  exports: [OsrmHttpClient],
})
export class RoutingModule {}
