import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { LogoutCommandHandler } from '@modules/auth/application/handlers/commands/logout.handler';
import { LogoutCommand } from '@modules/auth/application/commands/logout.command';

describe('LogoutCommandHandler', () => {
  let handler: LogoutCommandHandler;
  let eventBus: EventBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutCommandHandler,
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<LogoutCommandHandler>(LogoutCommandHandler);
    eventBus = module.get<EventBus>(EventBus);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should logout successfully', async () => {
      const command = new LogoutCommand('user-id');

      jest.spyOn(eventBus, 'publish').mockImplementation();

      const result = await handler.execute(command);

      expect(result.success).toBe(true);
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });
});
