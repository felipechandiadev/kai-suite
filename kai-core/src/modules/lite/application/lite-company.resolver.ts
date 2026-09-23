import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@modules/users/domain/user.entity';

export type LiteAuthContext = {
  userId: string;
  companyId: string;
};

@Injectable()
export class LiteCompanyResolver {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async fromBearer(authHeader?: string): Promise<string> {
    const ctx = await this.resolve(authHeader);
    return ctx.companyId;
  }

  async resolve(authHeader?: string): Promise<LiteAuthContext> {
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      throw new UnauthorizedException('Authorization Bearer requerido');
    }
    const user = await this.userRepo.findOne({ where: { id: token } });
    if (!user) {
      throw new UnauthorizedException('Token inválido');
    }
    return {
      userId: user.id,
      companyId: user.companyId ?? '00000000-0000-4000-8000-000000000001',
    };
  }
}
