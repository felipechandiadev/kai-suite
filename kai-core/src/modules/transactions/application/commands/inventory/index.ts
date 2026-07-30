import {
  CreateInventoryCountUseCase,
  CreateInventoryCountCommand,
} from '../create-inventory-count.usecase';
import {
  CreateInventoryReservationUseCase,
  CreateInventoryReservationCommand,
} from '../create-inventory-reservation.usecase';
import {
  CreateInventoryReservationsUseCase,
  CreateInventoryReservationsCommand,
} from '../create-inventory-reservations.usecase';
import {
  CreateInventoryBlockUseCase,
  CreateInventoryBlockCommand,
} from '../create-inventory-block.usecase';
import {
  CreateInventoryUnblockUseCase,
  CreateInventoryUnblockCommand,
} from '../create-inventory-unblock.usecase';

export const inventoryCommandHandlers = [
  CreateInventoryCountUseCase,
  CreateInventoryReservationUseCase,
  CreateInventoryReservationsUseCase,
  CreateInventoryBlockUseCase,
  CreateInventoryUnblockUseCase,
];

export const inventoryCommands = [
  CreateInventoryCountCommand,
  CreateInventoryReservationCommand,
  CreateInventoryReservationsCommand,
  CreateInventoryBlockCommand,
  CreateInventoryUnblockCommand,
];

export {
  CreateInventoryCountUseCase,
  CreateInventoryCountCommand,
  CreateInventoryReservationUseCase,
  CreateInventoryReservationCommand,
  CreateInventoryReservationsUseCase,
  CreateInventoryReservationsCommand,
  CreateInventoryBlockUseCase,
  CreateInventoryBlockCommand,
  CreateInventoryUnblockUseCase,
  CreateInventoryUnblockCommand,
};
