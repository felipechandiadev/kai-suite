import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AuthModule } from './auth.module';
import { User } from '@modules/users/domain/user.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { DatabaseTestHelper } from '../../../test/database-test-helper';

describe('Auth (e2e)', () => {
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
        AuthModule,
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

  describe('/auth/login (POST)', () => {
    it('should login successfully with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          userName: 'testuser',
          password: 'testpass123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user).toHaveProperty('userName', 'testuser');
          expect(res.body).toHaveProperty('message', 'Login successful');
        });
    });

    it('should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          userName: 'testuser',
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Credenciales inválidas');
        });
    });

    it('should fail with non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          userName: 'nonexistent',
          password: 'testpass123',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Credenciales inválidas');
        });
    });

    it('should fail with missing username', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: 'testpass123',
        })
        .expect(400);
    });

    it('should fail with missing password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          userName: 'testuser',
        })
        .expect(400);
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should logout successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .send({
          userId: 'test-user-id',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('message', 'Logout successful');
        });
    });

    it('should fail with missing userId', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .send({})
        .expect(400);
    });
  });
});
