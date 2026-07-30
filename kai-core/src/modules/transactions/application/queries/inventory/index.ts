import { IQuery } from '@nestjs/cqrs';
import {
  GetActiveInventoryReservationsQuery,
  GetActiveInventoryReservationsQueryHandler,
} from './get-active-inventory-reservations.query';
import {
  GetInventoryBlocksQuery,
  GetInventoryBlocksQueryHandler,
} from './get-inventory-blocks.query';
import {
  GetInventoryCountsQuery,
  GetInventoryCountsQueryHandler,
} from './get-inventory-counts.query';

export {
  GetActiveInventoryReservationsQuery,
  GetInventoryBlocksQuery,
  GetInventoryCountsQuery,
};

export const inventoryQueryHandlers = [
  GetActiveInventoryReservationsQueryHandler,
  GetInventoryBlocksQueryHandler,
  GetInventoryCountsQueryHandler,
];

export {
  GetActiveInventoryReservationsQueryHandler,
  GetInventoryBlocksQueryHandler,
  GetInventoryCountsQueryHandler,
};
