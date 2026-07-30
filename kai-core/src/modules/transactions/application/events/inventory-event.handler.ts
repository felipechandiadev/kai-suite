import { Injectable } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InventoryCountCreatedEvent,
  InventoryReservationCreatedEvent,
  InventoryBlockCreatedEvent,
  InventoryUnblockCreatedEvent,
} from '../../domain/events/inventory-events';

@Injectable()
@EventsHandler(
  InventoryCountCreatedEvent,
  InventoryReservationCreatedEvent,
  InventoryBlockCreatedEvent,
  InventoryUnblockCreatedEvent,
)
export class InventoryEventHandler
  implements
    IEventHandler<InventoryCountCreatedEvent>,
    IEventHandler<InventoryReservationCreatedEvent>,
    IEventHandler<InventoryBlockCreatedEvent>,
    IEventHandler<InventoryUnblockCreatedEvent>
{
  constructor() {
    // Here we would inject inventory service or repository
    // For now, we'll just log the events
  }

  async handle(event: any): Promise<void> {
    if (event instanceof InventoryCountCreatedEvent) {
      await this.handleInventoryCountCreated(event);
    } else if (event instanceof InventoryReservationCreatedEvent) {
      await this.handleInventoryReservationCreated(event);
    } else if (event instanceof InventoryBlockCreatedEvent) {
      await this.handleInventoryBlockCreated(event);
    } else if (event instanceof InventoryUnblockCreatedEvent) {
      await this.handleInventoryUnblockCreated(event);
    }
  }

  private async handleInventoryCountCreated(
    event: InventoryCountCreatedEvent,
  ): Promise<void> {
    // Update inventory counts in the inventory service
    // This would typically update the physical count for the product/variant
    console.log(
      `Inventory count created: ${event.transactionId} - Branch: ${event.branchId}, Storage: ${event.storageId}, Total Lines: ${event.totalLines}, Lines with differences: ${event.linesWithDifferences}`,
    );
  }

  private async handleInventoryReservationCreated(
    _event: InventoryReservationCreatedEvent,
  ): Promise<void> {
    // Stock commitment is applied in CreateInventoryReservation(s)UseCase.
  }

  private async handleInventoryBlockCreated(
    event: InventoryBlockCreatedEvent,
  ): Promise<void> {
    // Block inventory from being sold
    // This would typically mark the inventory as blocked/unavailable
    console.log(
      `Inventory block created: ${event.transactionId} - Product: ${event.productId}, Quantity: ${event.quantity}, Reason: ${event.reason}`,
    );
  }

  private async handleInventoryUnblockCreated(
    event: InventoryUnblockCreatedEvent,
  ): Promise<void> {
    // Unblock previously blocked inventory
    // This would typically mark the inventory as available again
    console.log(
      `Inventory unblock created: ${event.transactionId} - Block Transaction: ${event.blockTransactionId}, Quantity: ${event.quantity}, Reason: ${event.reason}`,
    );
  }
}
