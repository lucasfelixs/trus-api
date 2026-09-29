import type { Server } from 'http';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertLocalDatabase } from '../../test/assert-local-database';

assertLocalDatabase(process.env.DATABASE_URL);

interface UserApiResponse {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

describe('UsersController (integration)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;
  let accessTokenCookie: string;
  let expectedUser: UserApiResponse;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    httpServer = app.getHttpServer() as Server;
    prisma = moduleRef.get(PrismaService);

    const authService = moduleRef.get(AuthService, { strict: false });

    await prisma.$executeRawUnsafe('TRUNCATE "users" RESTART IDENTITY CASCADE');

    const user = await prisma.user.create({
      data: {
        email: 'current-user@example.com',
        name: 'Current User',
        googleId: 'google-current-user',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    });

    const { accessToken } = await authService.issueTokens(user.id);
    accessTokenCookie = `access_token=${accessToken}`;
    expectedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /users/me', () => {
    it('rejects requests with no auth cookie', async () => {
      await request(httpServer).get('/users/me').expect(401);
    });

    it('returns the current authenticated user', async () => {
      const response = await request(httpServer)
        .get('/users/me')
        .set('Cookie', accessTokenCookie)
        .expect(200);

      expect(response.body).toEqual(expectedUser);
    });
  });
});
