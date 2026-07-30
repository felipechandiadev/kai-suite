import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoredEventOrmEntity } from './orm-mappers/stored-event.orm-entity';
import { BaseDomainEvent } from '@shared/cqrs/base.domain-event';

export interface EventDescriptor {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: any;
  metadata?: any;
  occurredOn: Date;
  version: number;
  correlationId?: string;
  causationId?: string;
}

@Injectable()
export class EventStoreRepository {
  constructor(
    @InjectRepository(StoredEventOrmEntity)
    private readonly repository: Repository<StoredEventOrmEntity>,
  ) {}

  async save(
    event: BaseDomainEvent,
    aggregateId: string,
    aggregateType: string,
    version: number = 1,
  ): Promise<void> {
    const storedEvent = this.repository.create({
      aggregateId,
      aggregateType,
      eventType: event.constructor.name,
      eventData: event,
      metadata: {
        id: event.id,
        occurredAt: event.occurredAt,
      },
      version,
      correlationId: event.correlationId,
      causationId: event.causationId,
    });

    await this.repository.save(storedEvent);
  }

  async saveMultiple(
    events: BaseDomainEvent[],
    aggregateId: string,
    aggregateType: string,
  ): Promise<void> {
    const storedEvents = events.map((event, index) => {
      const version = index + 1;
      return this.repository.create({
        aggregateId,
        aggregateType,
        eventType: event.constructor.name,
        eventData: event,
        metadata: {
          id: event.id,
          occurredAt: event.occurredAt,
        },
        version,
        correlationId: event.correlationId,
        causationId: event.causationId,
      });
    });

    await this.repository.save(storedEvents);
  }

  async getEvents(
    aggregateId: string,
    aggregateType: string,
  ): Promise<EventDescriptor[]> {
    const events = await this.repository.find({
      where: { aggregateId, aggregateType },
      order: { version: 'ASC' },
    });

    return events.map((event) => ({
      id: event.id,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      eventData: event.eventData,
      metadata: event.metadata,
      occurredOn: event.occurredOn,
      version: event.version,
      correlationId: event.correlationId,
      causationId: event.causationId,
    }));
  }

  async getEventsByType(
    eventType: string,
    limit: number = 100,
  ): Promise<EventDescriptor[]> {
    const events = await this.repository.find({
      where: { eventType },
      order: { occurredOn: 'DESC' },
      take: limit,
    });

    return events.map((event) => ({
      id: event.id,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      eventData: event.eventData,
      metadata: event.metadata,
      occurredOn: event.occurredOn,
      version: event.version,
      correlationId: event.correlationId,
      causationId: event.causationId,
    }));
  }

  async getAllEvents(limit: number = 1000): Promise<EventDescriptor[]> {
    const events = await this.repository.find({
      order: { occurredOn: 'DESC' },
      take: limit,
    });

    return events.map((event) => ({
      id: event.id,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      eventData: event.eventData,
      metadata: event.metadata,
      occurredOn: event.occurredOn,
      version: event.version,
      correlationId: event.correlationId,
      causationId: event.causationId,
    }));
  }
}
