import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetAllUsersQuery } from '../../queries/get-all-users.query';
import { User } from '../../../domain/user.entity';
import { UserRepositoryPort } from '../../ports/user.repository.port';

@QueryHandler(GetAllUsersQuery)
export class GetAllUsersQueryHandler implements IQueryHandler<
  GetAllUsersQuery,
  { data: User[]; total: number }
> {
  private readonly logger = new Logger(GetAllUsersQueryHandler.name);

  constructor(
    @Inject('UserRepositoryPort')
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(
    query: GetAllUsersQuery,
  ): Promise<{ data: User[]; total: number }> {
    this.logger.debug(
      `[${query.id}] Fetching users with limit=${query.limit}, offset=${query.offset}`,
    );

    return this.userRepository.findAll({
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });
  }
}
