import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeRepositoryPort } from '../../application/ports/employee.repository.port';
import { Employee } from '@modules/employees/domain/employee.entity';

@Injectable()
export class TypeOrmEmployeeRepository implements EmployeeRepositoryPort {
  constructor(
    @InjectRepository(Employee)
    private readonly repository: Repository<Employee>,
  ) {}

  async findById(id: string): Promise<Employee | null> {
    return await this.repository.findOne({ where: { id } }) ?? null;
  }

  createQueryBuilder(alias: string): any {
    return this.repository.createQueryBuilder(alias);
  }
}