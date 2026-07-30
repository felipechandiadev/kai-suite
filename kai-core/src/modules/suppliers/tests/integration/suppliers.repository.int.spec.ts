import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersRepository } from '../../infrastructure/suppliers.repository';
import { SupplierOrmEntity } from '../../infrastructure/orm-mappers/supplier.orm-entity';
import { PersonOrmEntity } from '@modules/persons/infrastructure/orm-mappers/person.orm-entity';
import { DataSource } from 'typeorm';

describe('SuppliersRepository (integration)', () => {
  let repository: SuppliersRepository;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [SupplierOrmEntity, PersonOrmEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([SupplierOrmEntity, PersonOrmEntity]),
      ],
      providers: [SuppliersRepository],
    }).compile();

    repository = moduleRef.get(SuppliersRepository);
    dataSource = moduleRef.get(DataSource);
    // Ensure a person exists for FK
    const personRepo = dataSource.getRepository(PersonOrmEntity);
    const savedPerson = await personRepo.save({
      firstName: 'Test Person',
    } as any);
    (global as any).__TEST_PERSON_ID = savedPerson.id;
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('creates and finds supplier', async () => {
    const personId = (global as any).__TEST_PERSON_ID || 'p1';
    const created = await repository.create({
      personId,
      supplierType: 'LOCAL',
    } as any);
    const found = await repository.findOne(created.id);
    expect(found).not.toBeNull();
  });
});
