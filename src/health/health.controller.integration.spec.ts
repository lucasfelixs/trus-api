import type { Server } from 'http';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { assertLocalDatabase } from '../../test/assert-local-database';

assertLocalDatabase(process.env.DATABASE_URL);

describe('HealthController (integration)', () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    httpServer = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.$disconnect();
    await app.close();
  });

  it('does not require an auth cookie', async () => {
    await request(httpServer).get('/health').expect(200);
  });

  it('returns ok when the database connection is healthy', async () => {
    const response = await request(httpServer).get('/health').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });
});
