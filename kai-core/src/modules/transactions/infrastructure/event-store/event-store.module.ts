import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventStore } from './event-store.service';
import { EventStoreRepository } from './event-store.repository';
import { StoredEventOrmEntity } from './orm-mappers/stored-event.orm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([StoredEventOrmEntity])],
  providers: [EventStore, EventStoreRepository],
  exports: [EventStore],
})
export class EventStoreModule {}
