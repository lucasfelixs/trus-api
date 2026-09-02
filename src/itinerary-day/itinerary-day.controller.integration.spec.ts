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

interface ItineraryDayApiResponse {
  id: string;
  title: string | null;
  date: string;
}

describe('ItineraryDayController (integration)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;
  let authService: AuthService;
  let userId: string;
  let tripId: string;
  let itineraryId: string;
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
      'TRUNCATE "itineraries", "trips", "users" RESTART IDENTITY CASCADE',
    );

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        googleId: 'google-1',
      },
    });
    userId = user.id;

    const trip = await prisma.trip.create({
      data: {
        userId,
        title: 'Trip to Paris',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-07'),
      },
    });
    tripId = trip.id;

    const itinerary = await prisma.itinerary.create({
      data: { tripId, title: 'Day-by-day plan' },
    });
    itineraryId = itinerary.id;

    const { accessToken } = await authService.issueTokens(userId);
    accessTokenCookie = `access_token=${accessToken}`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  async function createOtherUserItinerary(): Promise<{
    otherItineraryId: string;
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
    const otherItinerary = await prisma.itinerary.create({
      data: { tripId: otherTrip.id, title: 'Not yours' },
    });

    return { otherItineraryId: otherItinerary.id };
  }

  describe('GET /itineraries/:itineraryId/days', () => {
    it('rejects requests with no auth cookie', async () => {
      await request(httpServer)
        .get(`/itineraries/${itineraryId}/days`)
        .expect(401);
    });

    it('returns days for the itinerary when owned by the user', async () => {
      await prisma.itineraryDay.create({
        data: { itineraryId, title: 'Day 1', date: new Date('2026-01-01') },
      });

      const response = await request(httpServer)
        .get(`/itineraries/${itineraryId}/days`)
        .set('Cookie', accessTokenCookie)
        .expect(200);

      const body = response.body as ItineraryDayApiResponse[];
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ title: 'Day 1' });
    });

    it('returns 404 when the itinerary is not owned by the user', async () => {
      const { otherItineraryId } = await createOtherUserItinerary();

      await request(httpServer)
        .get(`/itineraries/${otherItineraryId}/days`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });
  });

  describe('GET /itinerary-days/:dayId', () => {
    it('returns the day when owned by the user', async () => {
      const day = await prisma.itineraryDay.create({
        data: { itineraryId, title: 'Day 1', date: new Date('2026-01-01') },
      });

      const response = await request(httpServer)
        .get(`/itinerary-days/${day.id}`)
        .set('Cookie', accessTokenCookie)
        .expect(200);

      expect(response.body).toMatchObject({ id: day.id, title: 'Day 1' });
    });

    it('returns 404 when the day does not exist', async () => {
      await request(httpServer)
        .get(`/itinerary-days/${randomUUID()}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });

    it('returns 404 when fetching a day owned by another user', async () => {
      const { otherItineraryId } = await createOtherUserItinerary();
      const otherDay = await prisma.itineraryDay.create({
        data: {
          itineraryId: otherItineraryId,
          title: 'Not yours',
          date: new Date('2026-01-01'),
        },
      });

      await request(httpServer)
        .get(`/itinerary-days/${otherDay.id}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });
  });

  describe('POST /itineraries/:itineraryId/days', () => {
    it('creates and returns a day for the itinerary', async () => {
      const response = await request(httpServer)
        .post(`/itineraries/${itineraryId}/days`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Day 1: Arrival', date: '2026-01-01' })
        .expect(201);

      const body = response.body as ItineraryDayApiResponse;
      expect(body).toMatchObject({ title: 'Day 1: Arrival' });

      const stored = await prisma.itineraryDay.findUnique({
        where: { id: body.id },
      });
      expect(stored?.itineraryId).toBe(itineraryId);
    });

    it('creates a day without a title', async () => {
      const response = await request(httpServer)
        .post(`/itineraries/${itineraryId}/days`)
        .set('Cookie', accessTokenCookie)
        .send({ date: '2026-01-01' })
        .expect(201);

      const body = response.body as ItineraryDayApiResponse;
      expect(body.title).toBeNull();
    });

    it('returns 400 when the date is missing', async () => {
      await request(httpServer)
        .post(`/itineraries/${itineraryId}/days`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Day 1' })
        .expect(400);
    });

    it('returns 400 when the payload has unknown fields', async () => {
      await request(httpServer)
        .post(`/itineraries/${itineraryId}/days`)
        .set('Cookie', accessTokenCookie)
        .send({ date: '2026-01-01', notAField: 'nope' })
        .expect(400);
    });

    it('returns 404 when the itinerary is not owned by the user', async () => {
      const { otherItineraryId } = await createOtherUserItinerary();

      await request(httpServer)
        .post(`/itineraries/${otherItineraryId}/days`)
        .set('Cookie', accessTokenCookie)
        .send({ date: '2026-01-01' })
        .expect(404);
    });
  });

  describe('PATCH /itinerary-days/:dayId', () => {
    it('updates and returns the day when owned by the user', async () => {
      const day = await prisma.itineraryDay.create({
        data: {
          itineraryId,
          title: 'Original title',
          date: new Date('2026-01-01'),
        },
      });

      const response = await request(httpServer)
        .patch(`/itinerary-days/${day.id}`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Updated title' })
        .expect(200);

      expect(response.body).toMatchObject({ title: 'Updated title' });

      const stored = await prisma.itineraryDay.findUnique({
        where: { id: day.id },
      });
      expect(stored?.title).toBe('Updated title');
    });

    it('returns 404 when the day does not exist', async () => {
      await request(httpServer)
        .patch(`/itinerary-days/${randomUUID()}`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Updated title' })
        .expect(404);
    });

    it('returns 404 when updating a day owned by another user', async () => {
      const { otherItineraryId } = await createOtherUserItinerary();
      const otherDay = await prisma.itineraryDay.create({
        data: {
          itineraryId: otherItineraryId,
          title: 'Not yours',
          date: new Date('2026-01-01'),
        },
      });

      await request(httpServer)
        .patch(`/itinerary-days/${otherDay.id}`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Hijacked' })
        .expect(404);
    });

    it('returns 400 when the date is set to an invalid value', async () => {
      const day = await prisma.itineraryDay.create({
        data: {
          itineraryId,
          title: 'Original title',
          date: new Date('2026-01-01'),
        },
      });

      await request(httpServer)
        .patch(`/itinerary-days/${day.id}`)
        .set('Cookie', accessTokenCookie)
        .send({ date: 'not-a-date' })
        .expect(400);
    });
  });

  describe('DELETE /itinerary-days/:dayId', () => {
    it('deletes the day and returns 204 when owned by the user', async () => {
      const day = await prisma.itineraryDay.create({
        data: {
          itineraryId,
          title: 'To be deleted',
          date: new Date('2026-01-01'),
        },
      });

      await request(httpServer)
        .delete(`/itinerary-days/${day.id}`)
        .set('Cookie', accessTokenCookie)
        .expect(204);

      const stored = await prisma.itineraryDay.findUnique({
        where: { id: day.id },
      });
      expect(stored).toBeNull();
    });

    it('returns 404 when the day does not exist', async () => {
      await request(httpServer)
        .delete(`/itinerary-days/${randomUUID()}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });

    it('returns 404 when deleting a day owned by another user', async () => {
      const { otherItineraryId } = await createOtherUserItinerary();
      const otherDay = await prisma.itineraryDay.create({
        data: {
          itineraryId: otherItineraryId,
          title: 'Not yours',
          date: new Date('2026-01-01'),
        },
      });

      await request(httpServer)
        .delete(`/itinerary-days/${otherDay.id}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);

      const stored = await prisma.itineraryDay.findUnique({
        where: { id: otherDay.id },
      });
      expect(stored).not.toBeNull();
    });
  });
});
