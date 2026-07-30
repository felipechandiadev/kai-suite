import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { UsersModule } from './users.module';
import { User } from '@modules/users/domain/user.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { DatabaseTestHelper } from '../../../test/database-test-helper';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let dbHelper: DatabaseTestHelper;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE || 'flow_store_test',
          entities: [User, Person],
          synchronize: true,
          dropSchema: true,
        }),
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dbHelper = new DatabaseTestHelper();
    await dbHelper.setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/users (GET)', () => {
    it('should return all users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should filter users by search term', () => {
      return request(app.getHttpServer())
        .get('/users?search=test')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/users/:id (GET)', () => {
    it('should return user by id', () => {
      return request(app.getHttpServer())
        .get('/users/test-user-id')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
        });
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/users/non-existent-id')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toBe('User not found');
        });
    });
  });

  describe('/users (POST)', () => {
    it('should create a new user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          userId: 'new-user-id',
          userName: 'newuser',
          password: 'password123',
          mail: 'newuser@example.com',
          role: 'operator',
          personId: 'person-id',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.userName).toBe('newuser');
        });
    });

    it('should fail with invalid data', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          userName: 'invalid',
        })
        .expect(400);
    });
  });

  describe('/users/:id (PUT)', () => {
    it('should update user', () => {
      return request(app.getHttpServer())
        .put('/users/test-user-id')
        .send({
          userName: 'updateduser',
          mail: 'updated@example.com',
          role: 'admin',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
        });
    });
  });

  describe('/users/:id (DELETE)', () => {
    it('should delete user', () => {
      return request(app.getHttpServer())
        .delete('/users/test-user-id')
        .expect(200);
    });
  });

  describe('/users/:id/change-password (PUT)', () => {
    it('should change user password', () => {
      return request(app.getHttpServer())
        .put('/users/test-user-id/change-password')
        .send({
          newPassword: 'newpassword123',
        })
        .expect(200);
    });
  });
});
