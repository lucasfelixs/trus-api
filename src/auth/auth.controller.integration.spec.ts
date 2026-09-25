import type { Server } from 'http';
import { Test } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { User } from '@prisma/client';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { assertLocalDatabase } from '../../test/assert-local-database';

assertLocalDatabase(process.env.DATABASE_URL);

function parseCookie(setCookie: string[], name: string): string | undefined {
  return setCookie.find((cookie) => cookie.startsWith(`${name}=`));
}

function cookieValue(setCookie: string[], name: string): string | undefined {
  return parseCookie(setCookie, name)
    ?.split(';')[0]
    ?.slice(name.length + 1);
}

describe('AuthController (integration)', () => {
  describe('GET /auth/google', () => {
    let app: INestApplication;
    let httpServer: Server;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication();
      app.use(cookieParser());
      await app.init();
      httpServer = app.getHttpServer() as Server;
    });

    afterAll(async () => {
      await app.close();
    });

    it('redirects to Google without requiring authentication', async () => {
      const response = await request(httpServer)
        .get('/auth/google')
        .expect(302);

      expect(response.headers.location).toContain('accounts.google.com');
    });
  });

  describe('GET /auth/google/callback', () => {
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
      await prisma.$executeRawUnsafe(
        'TRUNCATE "users" RESTART IDENTITY CASCADE',
      );

      user = await prisma.user.create({
        data: {
          email: 'google-user@example.com',
          name: 'Google User',
          googleId: 'google-1',
        },
      });
    });

    afterAll(async () => {
      await prisma.$disconnect();
      await app.close();
    });

    it('issues tokens, sets auth cookies, and redirects to the frontend', async () => {
      const response = await request(httpServer)
        .get('/auth/google/callback')
        .expect(302);

      expect(response.headers.location).toBe(process.env.FRONTEND_URL);

      const setCookie = response.headers['set-cookie'] as unknown as string[];
      expect(parseCookie(setCookie, 'access_token')).toBeDefined();
      expect(parseCookie(setCookie, 'refresh_token')).toBeDefined();

      const stored = await prisma.refreshToken.findFirst({
        where: { userId: user.id },
      });
      expect(stored).not.toBeNull();
    });
  });

  describe('POST /auth/refresh and POST /auth/logout', () => {
    let app: INestApplication;
    let httpServer: Server;
    let prisma: PrismaService;
    let authService: AuthService;
    let userId: string;
    let refreshTokenCookie: string;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication();
      app.use(cookieParser());
      await app.init();

      httpServer = app.getHttpServer() as Server;
      prisma = moduleRef.get(PrismaService);
      authService = moduleRef.get(AuthService);
    });

    beforeEach(async () => {
      await prisma.$executeRawUnsafe(
        'TRUNCATE "users" RESTART IDENTITY CASCADE',
      );

      const user = await prisma.user.create({
        data: {
          email: 'refresh-user@example.com',
          name: 'Refresh User',
          googleId: 'google-2',
        },
      });
      userId = user.id;

      const { refreshToken } = await authService.issueTokens(userId);
      refreshTokenCookie = `refresh_token=${refreshToken}`;
    });

    afterAll(async () => {
      await prisma.$disconnect();
      await app.close();
    });

    describe('POST /auth/refresh', () => {
      it('rejects requests with no refresh cookie', async () => {
        await request(httpServer).post('/auth/refresh').expect(401);
      });

      it('rejects an invalid refresh token', async () => {
        await request(httpServer)
          .post('/auth/refresh')
          .set('Cookie', 'refresh_token=not-a-real-token')
          .expect(401);
      });

      it('rotates the refresh token and sets fresh cookies', async () => {
        const response = await request(httpServer)
          .post('/auth/refresh')
          .set('Cookie', refreshTokenCookie)
          .expect(200);

        const setCookie = response.headers['set-cookie'] as unknown as string[];
        const newAccessCookie = parseCookie(setCookie, 'access_token');
        const newRefreshCookie = parseCookie(setCookie, 'refresh_token');

        expect(newAccessCookie).toBeDefined();
        expect(newAccessCookie).toContain('HttpOnly');
        expect(newAccessCookie).toContain('SameSite=Lax');
        expect(newAccessCookie).not.toContain('Secure');

        expect(newRefreshCookie).toBeDefined();
        expect(newRefreshCookie).toContain('Path=/auth');

        const oldRefreshValue = refreshTokenCookie.replace(
          'refresh_token=',
          '',
        );
        expect(cookieValue(setCookie, 'refresh_token')).not.toBe(
          oldRefreshValue,
        );
      });

      it('rejects reuse of an already-rotated refresh token', async () => {
        await request(httpServer)
          .post('/auth/refresh')
          .set('Cookie', refreshTokenCookie)
          .expect(200);

        await request(httpServer)
          .post('/auth/refresh')
          .set('Cookie', refreshTokenCookie)
          .expect(401);
      });
    });

    describe('POST /auth/logout', () => {
      it('rejects requests with no refresh cookie', async () => {
        await request(httpServer).post('/auth/logout').expect(401);
      });

      it('revokes the refresh token and clears both cookies', async () => {
        const response = await request(httpServer)
          .post('/auth/logout')
          .set('Cookie', refreshTokenCookie)
          .expect(204);

        const setCookie = response.headers['set-cookie'] as unknown as string[];
        expect(parseCookie(setCookie, 'access_token')).toBeDefined();
        expect(parseCookie(setCookie, 'refresh_token')).toBeDefined();

        const stored = await prisma.refreshToken.findMany({
          where: { userId },
        });
        expect(stored).toHaveLength(0);
      });

      it('is idempotent: a second logout with the same (already-revoked) refresh token still succeeds', async () => {
        await request(httpServer)
          .post('/auth/logout')
          .set('Cookie', refreshTokenCookie)
          .expect(204);

        // The JWT itself is still valid (revocation only removes the DB
        // record), so the guard lets the request through; revokeToken's
        // deleteMany is a no-op on an already-removed jti, not an error.
        await request(httpServer)
          .post('/auth/logout')
          .set('Cookie', refreshTokenCookie)
          .expect(204);
      });
    });
  });
});
