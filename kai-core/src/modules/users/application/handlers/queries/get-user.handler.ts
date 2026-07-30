import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { GetUserQuery } from '../../queries/get-user.query';
import { User } from '../../../domain/user.entity';
import { UserRepositoryPort } from '../../ports/user.repository.port';

@QueryHandler(GetUserQuery)
export class GetUserQueryHandler implements IQueryHandler<GetUserQuery, User> {
  private readonly logger = new Logger(GetUserQueryHandler.name);

  constructor(
    @Inject('UserRepositoryPort')
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(query: GetUserQuery): Promise<User> {
    this.logger.debug(`[${query.id}] Fetching user ${query.userId}`);

    const user = await this.userRepository.findById(query.userId);

    if (!user) {
      throw new NotFoundException(`User ${query.userId} not found`);
    }

    return user;
  }
}
