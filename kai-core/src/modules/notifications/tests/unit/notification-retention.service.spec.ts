import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationRetentionService } from '../../application/notification-retention.service';
import { NotificationDelivery } from '../../domain/notification-delivery.entity';
import { Notification } from '../../domain/notification.entity';

describe('NotificationRetentionService', () => {
  let service: NotificationRetentionService;
  const deliveryRepo = {
    update: jest.fn().mockResolvedValue({ affected: 0 }),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
  };
  const notificationRepo = {
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
  };
  const dataSource = {
    query: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationRetentionService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(NotificationDelivery), useValue: deliveryRepo },
        { provide: getRepositoryToken(Notification), useValue: notificationRepo },
      ],
    }).compile();
    service = module.get(NotificationRetentionService);
  });

  it('auto-dismisses stale unread deliveries', async () => {
    await service.runRetention();
    expect(deliveryRepo.update).toHaveBeenCalled();
    expect(dataSource.query).toHaveBeenCalled();
  });
});
