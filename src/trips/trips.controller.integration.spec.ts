import type { Server } from 'http';
import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { assertLocalDatabase } from '../../test/assert-local-database';

assertLocalDatabase(process.env.DATABASE_URL);

interface TripApiResponse {
  id: string;
  title: string;
  destination: string | null;
}

describe('TripsController (integration)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;
  let authService: AuthService;
  let userId: string;
  let accessTokenCookie: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    httpServer = app.getHttpServer() as Server;
    prisma = moduleRef.get(PrismaService);
    authService = moduleRef.get(AuthService, { strict: false });
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "trips", "users" RESTART IDENTITY CASCADE',
    );

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        googleId: 'google-1',
      },
    });
    userId = user.id;

    const { accessToken } = await authService.issueTokens(userId);
    accessTokenCookie = `access_token=${accessToken}`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  async function createOtherUserTrip(): Promise<{
    otherUserId: string;
    tripId: string;
  }> {
    const otherUser = await prisma.user.create({
      data: {
        email: 'other@example.com',
        name: 'Other',
        googleId: 'google-2',
      },
    });
    const otherTrip = await prisma.trip.create({
      data: {
        userId: otherUser.id,
        title: 'Not yours',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-05'),
      },
    });

    return { otherUserId: otherUser.id, tripId: otherTrip.id };
  }

  describe('GET /trips', () => {
    it('rejects requests with no auth cookie', async () => {
      await request(httpServer).get('/trips').expect(401);
    });

    it('returns only trips belonging to the authenticated user', async () => {
      await prisma.trip.create({
        data: {
          userId,
          title: 'My trip',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-05'),
        },
      });
      await createOtherUserTrip();

      const response = await request(httpServer)
        .get('/trips')
        .set('Cookie', accessTokenCookie)
        .expect(200);

      const body = response.body as TripApiResponse[];
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ title: 'My trip' });
    });
  });

  describe('GET /trips/:tripId', () => {
    it('returns the trip when owned by the user', async () => {
      const trip = await prisma.trip.create({
        data: {
          userId,
          title: 'My trip',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-05'),
        },
      });

      const response = await request(httpServer)
        .get(`/trips/${trip.id}`)
        .set('Cookie', accessTokenCookie)
        .expect(200);

      expect(response.body).toMatchObject({ id: trip.id, title: 'My trip' });
    });

    it('returns 404 when the trip does not exist', async () => {
      await request(httpServer)
        .get(`/trips/${randomUUID()}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });

    it('returns 403 when fetching a trip owned by another user', async () => {
      const { tripId } = await createOtherUserTrip();

      await request(httpServer)
        .get(`/trips/${tripId}`)
        .set('Cookie', accessTokenCookie)
        .expect(403);
    });
  });

  describe('POST /trips', () => {
    it('creates and returns a trip for the authenticated user', async () => {
      const response = await request(httpServer)
        .post('/trips')
        .set('Cookie', accessTokenCookie)
        .send({
          title: 'Trip to Lisbon',
          startDate: '2026-08-01',
          endDate: '2026-08-10',
        })
        .expect(201);

      const body = response.body as TripApiResponse;
      expect(body).toMatchObject({ title: 'Trip to Lisbon' });

      const stored = await prisma.trip.findUnique({
        where: { id: body.id },
      });
      expect(stored?.userId).toBe(userId);
    });

    it('returns 400 when required fields are missing', async () => {
      await request(httpServer)
        .post('/trips')
        .set('Cookie', accessTokenCookie)
        .send({ startDate: '2026-08-01', endDate: '2026-08-10' })
        .expect(400);
    });

    it('returns 400 when the payload has unknown fields', async () => {
      await request(httpServer)
        .post('/trips')
        .set('Cookie', accessTokenCookie)
        .send({
          title: 'Trip to Lisbon',
          startDate: '2026-08-01',
          endDate: '2026-08-10',
          notAField: 'nope',
        })
        .expect(400);
    });
  });

  describe('PATCH /trips/:tripId', () => {
    it('updates and returns the trip when owned by the user', async () => {
      const trip = await prisma.trip.create({
        data: {
          userId,
          title: 'Original title',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-05'),
        },
      });

      const response = await request(httpServer)
        .patch(`/trips/${trip.id}`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Updated title' })
        .expect(200);

      expect(response.body).toMatchObject({ title: 'Updated title' });

      const stored = await prisma.trip.findUnique({ where: { id: trip.id } });
      expect(stored?.title).toBe('Updated title');
    });

    it('returns 404 when the trip does not exist', async () => {
      await request(httpServer)
        .patch(`/trips/${randomUUID()}`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Updated title' })
        .expect(404);
    });

    it('returns 403 when updating a trip owned by another user', async () => {
      const { tripId } = await createOtherUserTrip();

      await request(httpServer)
        .patch(`/trips/${tripId}`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Hijacked' })
        .expect(403);
    });
  });

  describe('DELETE /trips/:tripId', () => {
    it('deletes the trip and returns 204 when owned by the user', async () => {
      const trip = await prisma.trip.create({
        data: {
          userId,
          title: 'To be deleted',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-05'),
        },
      });

      await request(httpServer)
        .delete(`/trips/${trip.id}`)
        .set('Cookie', accessTokenCookie)
        .expect(204);

      const stored = await prisma.trip.findUnique({ where: { id: trip.id } });
      expect(stored).toBeNull();
    });

    it('returns 404 when the trip does not exist', async () => {
      await request(httpServer)
        .delete(`/trips/${randomUUID()}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });

    it('returns 403 when deleting a trip owned by another user', async () => {
      const { tripId } = await createOtherUserTrip();

      await request(httpServer)
        .delete(`/trips/${tripId}`)
        .set('Cookie', accessTokenCookie)
        .expect(403);

      const stored = await prisma.trip.findUnique({ where: { id: tripId } });
      expect(stored).not.toBeNull();
    });
  });
});
