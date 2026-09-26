import type { Server } from 'http';
import { Test } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { User } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { GoogleOAuthGuard } from '../../src/auth/guards/google-oauth.guard';
import { assertLocalDatabase } from '../assert-local-database';

assertLocalDatabase(process.env.DATABASE_URL);

function cookieHeaderFrom(setCookie: string[], names: string[]): string {
  return names
    .map((name) => {
      const raw = setCookie.find((cookie) => cookie.startsWith(`${name}=`));
      if (!raw) {
        throw new Error(`Expected a "${name}" cookie in the response`);
      }
      return raw.split(';')[0];
    })
    .join('; ');
}

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;
  let user: User;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(GoogleOAuthGuard)
      .useValue({
        // There is no real Google in CI. This stands in for the OAuth
        // handshake so the rest of the journey (cookies, refresh, protected
        // calls, logout) runs against real endpoints end to end.
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<{ user: User }>();
          req.user = user;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    httpServer = app.getHttpServer() as Server;
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "users" RESTART IDENTITY CASCADE');

    user = await prisma.user.create({
      data: {
        email: 'e2e-user@example.com',
        name: 'E2E User',
        googleId: 'google-e2e-1',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('logs in, uses the session, rotates it, and logout revokes it', async () => {
    // 1. Log in via the (stubbed) Google OAuth callback.
    const loginResponse = await request(httpServer)
      .get('/auth/google/callback')
      .expect(302);

    expect(loginResponse.headers.location).toBe(process.env.FRONTEND_URL);
    const loginCookies = loginResponse.headers['set-cookie'] as unknown as
      | string[]
      | undefined;
    expect(loginCookies).toBeDefined();

    // 2. The access cookie from login authenticates a real protected call.
    await request(httpServer)
      .get('/trips')
      .set('Cookie', cookieHeaderFrom(loginCookies!, ['access_token']))
      .expect(200)
      .expect([]);

    // 3. The refresh cookie from login rotates the session.
    const refreshResponse = await request(httpServer)
      .post('/auth/refresh')
      .set('Cookie', cookieHeaderFrom(loginCookies!, ['refresh_token']))
      .expect(200);

    const refreshedCookies = refreshResponse.headers[
      'set-cookie'
    ] as unknown as string[] | undefined;
    expect(refreshedCookies).toBeDefined();

    // 4. The freshly rotated access cookie still authenticates.
    await request(httpServer)
      .get('/trips')
      .set('Cookie', cookieHeaderFrom(refreshedCookies!, ['access_token']))
      .expect(200)
      .expect([]);

    // 5. Logout revokes the rotated refresh token.
    await request(httpServer)
      .post('/auth/logout')
      .set('Cookie', cookieHeaderFrom(refreshedCookies!, ['refresh_token']))
      .expect(204);

    // 6. The now-revoked refresh token can no longer mint new sessions.
    await request(httpServer)
      .post('/auth/refresh')
      .set('Cookie', cookieHeaderFrom(refreshedCookies!, ['refresh_token']))
      .expect(401);
  });
});
