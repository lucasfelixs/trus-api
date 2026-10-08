import type { Server } from 'http';
import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { Prisma, Trip } from '@prisma/client';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { assertLocalDatabase } from '../../test/assert-local-database';

assertLocalDatabase(process.env.DATABASE_URL);

interface TripApiResponse {
  id: string;
  title: string;
  destination: string;
  itineraryCount: number;
  publishedItineraryCount: number;
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

  async function createTrip(
    overrides: Partial<Prisma.TripUncheckedCreateInput> = {},
  ): Promise<Trip> {
    return prisma.trip.create({
      data: {
        userId,
        title: 'My trip',
        destination: 'Lisbon',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-05'),
        ...overrides,
      },
    });
  }

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
        destination: 'Lisbon',
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
          destination: 'Lisbon',
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

    it('returns an empty array when the user has no trips', async () => {
      const response = await request(httpServer)
        .get('/trips')
        .set('Cookie', accessTokenCookie)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('returns zeroed counts for a trip without itineraries', async () => {
      await createTrip({ title: 'Empty trip' });

      const response = await request(httpServer)
        .get('/trips')
        .set('Cookie', accessTokenCookie)
        .expect(200);

      const body = response.body as TripApiResponse[];
      expect(body[0]).toMatchObject({
        title: 'Empty trip',
        itineraryCount: 0,
        publishedItineraryCount: 0,
      });
    });

    it('counts itineraries and published itineraries per trip', async () => {
      const withItineraries = await createTrip({
        title: 'Counted trip',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-05'),
      });
      const withoutItineraries = await createTrip({
        title: 'Lonely trip',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-05'),
      });

      await prisma.itinerary.createMany({
        data: [
          { tripId: withItineraries.id, title: 'Draft' },
          {
            tripId: withItineraries.id,
            title: 'Published A',
            publishedAt: new Date('2026-02-01'),
          },
          {
            tripId: withItineraries.id,
            title: 'Published B',
            publishedAt: new Date('2026-02-02'),
          },
        ],
      });

      const response = await request(httpServer)
        .get('/trips')
        .set('Cookie', accessTokenCookie)
        .expect(200);

      const body = response.body as TripApiResponse[];
      expect(body).toEqual([
        expect.objectContaining({
          id: withItineraries.id,
          itineraryCount: 3,
          publishedItineraryCount: 2,
        }),
        expect.objectContaining({
          id: withoutItineraries.id,
          itineraryCount: 0,
          publishedItineraryCount: 0,
        }),
      ]);
    });

    it('does not count itineraries owned by another user', async () => {
      const trip = await createTrip({ title: 'Mine' });
      const { tripId: otherTripId } = await createOtherUserTrip();
      await prisma.itinerary.create({
        data: {
          tripId: otherTripId,
          title: 'Not mine',
          publishedAt: new Date('2026-02-01'),
        },
      });

      const response = await request(httpServer)
        .get('/trips')
        .set('Cookie', accessTokenCookie)
        .expect(200);

      const body = response.body as TripApiResponse[];
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        id: trip.id,
        itineraryCount: 0,
        publishedItineraryCount: 0,
      });
    });

    it('orders trips by start date ascending', async () => {
      const later = await createTrip({
        title: 'Later',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-05'),
      });
      const earlier = await createTrip({
        title: 'Earlier',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-05'),
      });

      const response = await request(httpServer)
        .get('/trips')
        .set('Cookie', accessTokenCookie)
        .expect(200);

      const body = response.body as TripApiResponse[];
      expect(body.map((trip) => trip.id)).toEqual([earlier.id, later.id]);
    });

    it('does not expose internal fields in the list payload', async () => {
      await createTrip({ title: 'My trip' });

      const response = await request(httpServer)
        .get('/trips')
        .set('Cookie', accessTokenCookie)
        .expect(200);

      const body = response.body as TripApiResponse[];
      expect(Object.keys(body[0] ?? {}).sort()).toEqual([
        'destination',
        'endDate',
        'id',
        'itineraryCount',
        'publishedItineraryCount',
        'startDate',
        'title',
      ]);
    });
  });

  describe('GET /trips/:tripId', () => {
    it('returns the trip when owned by the user', async () => {
      const trip = await prisma.trip.create({
        data: {
          userId,
          title: 'My trip',
          destination: 'Lisbon',
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

    it('returns 404 when fetching a trip owned by another user', async () => {
      const { tripId } = await createOtherUserTrip();

      await request(httpServer)
        .get(`/trips/${tripId}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });
  });

  describe('POST /trips', () => {
    it('creates and returns a trip for the authenticated user', async () => {
      const response = await request(httpServer)
        .post('/trips')
        .set('Cookie', accessTokenCookie)
        .send({
          title: 'Trip to Lisbon',
          destination: 'Lisbon',
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

    it('returns 400 when destination is missing', async () => {
      await request(httpServer)
        .post('/trips')
        .set('Cookie', accessTokenCookie)
        .send({
          title: 'Trip to Lisbon',
          startDate: '2026-08-01',
          endDate: '2026-08-10',
        })
        .expect(400);
    });

    it('returns 400 when the payload has unknown fields', async () => {
      await request(httpServer)
        .post('/trips')
        .set('Cookie', accessTokenCookie)
        .send({
          title: 'Trip to Lisbon',
          destination: 'Lisbon',
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
          destination: 'Lisbon',
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

    it('returns 404 when updating a trip owned by another user', async () => {
      const { tripId } = await createOtherUserTrip();

      await request(httpServer)
        .patch(`/trips/${tripId}`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Hijacked' })
        .expect(404);
    });
  });

  describe('DELETE /trips/:tripId', () => {
    it('deletes the trip and returns 204 when owned by the user', async () => {
      const trip = await prisma.trip.create({
        data: {
          userId,
          title: 'To be deleted',
          destination: 'Lisbon',
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

    it('returns 404 when deleting a trip owned by another user', async () => {
      const { tripId } = await createOtherUserTrip();

      await request(httpServer)
        .delete(`/trips/${tripId}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);

      const stored = await prisma.trip.findUnique({ where: { id: tripId } });
      expect(stored).not.toBeNull();
    });
  });
});
