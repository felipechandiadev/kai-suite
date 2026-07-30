import { Injectable, Logger } from '@nestjs/common';
import {
  EventStoreRepository,
  EventDescriptor,
} from './event-store.repository';
import { BaseDomainEvent } from '@shared/cqrs/base.domain-event';

@Injectable()
export class EventStore {
  private readonly logger = new Logger(EventStore.name);

  constructor(private readonly repository: EventStoreRepository) {}

  /**
   * Save a single domain event to the event store
   */
  async save(
    event: BaseDomainEvent,
    aggregateId: string,
    aggregateType: string,
    version: number = 1,
  ): Promise<void> {
    try {
      this.logger.debug(
        `Saving event ${event.constructor.name} for aggregate ${aggregateId}`,
      );
      await this.repository.save(event, aggregateId, aggregateType, version);
      this.logger.debug(`Event ${event.constructor.name} saved successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to save event ${event.constructor.name}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Save multiple domain events atomically
   */
  async saveMultiple(
    events: BaseDomainEvent[],
    aggregateId: string,
    aggregateType: string,
  ): Promise<void> {
    if (events.length === 0) return;

    try {
      this.logger.debug(
        `Saving ${events.length} events for aggregate ${aggregateId}`,
      );
      await this.repository.saveMultiple(events, aggregateId, aggregateType);
      this.logger.debug(`Events saved successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to save multiple events: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all events for a specific aggregate
   */
  async getEvents(
    aggregateId: string,
    aggregateType: string,
  ): Promise<EventDescriptor[]> {
    try {
      this.logger.debug(
        `Retrieving events for aggregate ${aggregateId} (${aggregateType})`,
      );
      const events = await this.repository.getEvents(
        aggregateId,
        aggregateType,
      );
      this.logger.debug(`Retrieved ${events.length} events`);
      return events;
    } catch (error) {
      this.logger.error(
        `Failed to get events for aggregate ${aggregateId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get events by event type
   */
  async getEventsByType(
    eventType: string,
    limit: number = 100,
  ): Promise<EventDescriptor[]> {
    try {
      this.logger.debug(
        `Retrieving events of type ${eventType} (limit: ${limit})`,
      );
      const events = await this.repository.getEventsByType(eventType, limit);
      this.logger.debug(`Retrieved ${events.length} events`);
      return events;
    } catch (error) {
      this.logger.error(
        `Failed to get events by type ${eventType}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all events (for debugging/admin purposes)
   */
  async getAllEvents(limit: number = 1000): Promise<EventDescriptor[]> {
    try {
      this.logger.debug(`Retrieving all events (limit: ${limit})`);
      const events = await this.repository.getAllEvents(limit);
      this.logger.debug(`Retrieved ${events.length} events`);
      return events;
    } catch (error) {
      this.logger.error(
        `Failed to get all events: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Rebuild aggregate state from events
   */
  async rebuildAggregate<T>(
    aggregateId: string,
    aggregateType: string,
    initialState: T,
    eventApplier: (state: T, event: EventDescriptor) => T,
  ): Promise<T> {
    try {
      this.logger.debug(
        `Rebuilding aggregate ${aggregateId} (${aggregateType})`,
      );
      const events = await this.getEvents(aggregateId, aggregateType);

      let state = initialState;
      for (const event of events) {
        state = eventApplier(state, event);
      }

      this.logger.debug(`Aggregate rebuilt with ${events.length} events`);
      return state;
    } catch (error) {
      this.logger.error(
        `Failed to rebuild aggregate ${aggregateId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
