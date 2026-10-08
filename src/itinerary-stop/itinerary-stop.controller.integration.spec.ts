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

interface ItineraryStopApiResponse {
  id: string;
  name: string;
  googlePlaceId: string;
  location: string;
  order: number;
  note: string | null;
}

describe('ItineraryStopController (integration)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;
  let authService: AuthService;
  let userId: string;
  let tripId: string;
  let itineraryId: string;
  let dayId: string;
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
        destination: 'Lisbon',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-07'),
      },
    });
    tripId = trip.id;

    const itinerary = await prisma.itinerary.create({
      data: { tripId, title: 'Day-by-day plan' },
    });
    itineraryId = itinerary.id;

    const day = await prisma.itineraryDay.create({
      data: { itineraryId, title: 'Day 1', date: new Date('2026-01-01') },
    });
    dayId = day.id;

    const { accessToken } = await authService.issueTokens(userId);
    accessTokenCookie = `access_token=${accessToken}`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  async function createOtherUserDay(): Promise<{ otherDayId: string }> {
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
    const otherItinerary = await prisma.itinerary.create({
      data: { tripId: otherTrip.id, title: 'Not yours' },
    });
    const otherDay = await prisma.itineraryDay.create({
      data: {
        itineraryId: otherItinerary.id,
        title: 'Not yours',
        date: new Date('2026-01-01'),
      },
    });

    return { otherDayId: otherDay.id };
  }

  describe('GET /itinerary-days/:dayId/stops', () => {
    it('rejects requests with no auth cookie', async () => {
      await request(httpServer)
        .get(`/itinerary-days/${dayId}/stops`)
        .expect(401);
    });

    it('returns stops for the day when owned by the user', async () => {
      await prisma.itineraryStop.create({
        data: {
          itineraryDayId: dayId,
          name: 'Eiffel Tower',
          googlePlaceId: 'place-id',
          location: '48.8583701,2.2944813',
          order: 1,
        },
      });

      const response = await request(httpServer)
        .get(`/itinerary-days/${dayId}/stops`)
        .set('Cookie', accessTokenCookie)
        .expect(200);

      const body = response.body as ItineraryStopApiResponse[];
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ name: 'Eiffel Tower' });
    });

    it('returns 404 when the day is not owned by the user', async () => {
      const { otherDayId } = await createOtherUserDay();

      await request(httpServer)
        .get(`/itinerary-days/${otherDayId}/stops`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });
  });

  describe('GET /itinerary-stops/:stopId', () => {
    it('returns the stop when owned by the user', async () => {
      const stop = await prisma.itineraryStop.create({
        data: {
          itineraryDayId: dayId,
          name: 'Eiffel Tower',
          googlePlaceId: 'place-id',
          location: '48.8583701,2.2944813',
          order: 1,
        },
      });

      const response = await request(httpServer)
        .get(`/itinerary-stops/${stop.id}`)
        .set('Cookie', accessTokenCookie)
        .expect(200);

      expect(response.body).toMatchObject({
        id: stop.id,
        name: 'Eiffel Tower',
      });
    });

    it('returns 404 when the stop does not exist', async () => {
      await request(httpServer)
        .get(`/itinerary-stops/${randomUUID()}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });

    it('returns 404 when fetching a stop owned by another user', async () => {
      const { otherDayId } = await createOtherUserDay();
      const otherStop = await prisma.itineraryStop.create({
        data: {
          itineraryDayId: otherDayId,
          name: 'Not yours',
          googlePlaceId: 'place-id',
          location: '0,0',
          order: 1,
        },
      });

      await request(httpServer)
        .get(`/itinerary-stops/${otherStop.id}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });
  });

  describe('POST /itinerary-days/:dayId/stops', () => {
    it('creates and returns a stop for the day', async () => {
      const response = await request(httpServer)
        .post(`/itinerary-days/${dayId}/stops`)
        .set('Cookie', accessTokenCookie)
        .send({
          name: 'Eiffel Tower',
          googlePlaceId: 'place-id',
          location: '48.8583701,2.2944813',
          order: 1,
        })
        .expect(201);

      const body = response.body as ItineraryStopApiResponse;
      expect(body).toMatchObject({ name: 'Eiffel Tower' });

      const stored = await prisma.itineraryStop.findUnique({
        where: { id: body.id },
      });
      expect(stored?.itineraryDayId).toBe(dayId);
    });

    it('returns 400 when required fields are missing', async () => {
      await request(httpServer)
        .post(`/itinerary-days/${dayId}/stops`)
        .set('Cookie', accessTokenCookie)
        .send({ name: 'Eiffel Tower' })
        .expect(400);
    });

    it('returns 400 when the payload has unknown fields', async () => {
      await request(httpServer)
        .post(`/itinerary-days/${dayId}/stops`)
        .set('Cookie', accessTokenCookie)
        .send({
          name: 'Eiffel Tower',
          googlePlaceId: 'place-id',
          location: '0,0',
          order: 1,
          notAField: 'nope',
        })
        .expect(400);
    });

    it('returns 404 when the day is not owned by the user', async () => {
      const { otherDayId } = await createOtherUserDay();

      await request(httpServer)
        .post(`/itinerary-days/${otherDayId}/stops`)
        .set('Cookie', accessTokenCookie)
        .send({
          name: 'Hijacked',
          googlePlaceId: 'place-id',
          location: '0,0',
          order: 1,
        })
        .expect(404);
    });
  });

  describe('PATCH /itinerary-stops/:stopId', () => {
    it('updates and returns the stop when owned by the user', async () => {
      const stop = await prisma.itineraryStop.create({
        data: {
          itineraryDayId: dayId,
          name: 'Original name',
          googlePlaceId: 'place-id',
          location: '0,0',
          order: 1,
        },
      });

      const response = await request(httpServer)
        .patch(`/itinerary-stops/${stop.id}`)
        .set('Cookie', accessTokenCookie)
        .send({ name: 'Updated name' })
        .expect(200);

      expect(response.body).toMatchObject({ name: 'Updated name' });

      const stored = await prisma.itineraryStop.findUnique({
        where: { id: stop.id },
      });
      expect(stored?.name).toBe('Updated name');
    });

    it('returns 404 when the stop does not exist', async () => {
      await request(httpServer)
        .patch(`/itinerary-stops/${randomUUID()}`)
        .set('Cookie', accessTokenCookie)
        .send({ name: 'Updated name' })
        .expect(404);
    });

    it('returns 404 when updating a stop owned by another user', async () => {
      const { otherDayId } = await createOtherUserDay();
      const otherStop = await prisma.itineraryStop.create({
        data: {
          itineraryDayId: otherDayId,
          name: 'Not yours',
          googlePlaceId: 'place-id',
          location: '0,0',
          order: 1,
        },
      });

      await request(httpServer)
        .patch(`/itinerary-stops/${otherStop.id}`)
        .set('Cookie', accessTokenCookie)
        .send({ name: 'Hijacked' })
        .expect(404);
    });

    it('returns 400 when name is explicitly set to null', async () => {
      const stop = await prisma.itineraryStop.create({
        data: {
          itineraryDayId: dayId,
          name: 'Original name',
          googlePlaceId: 'place-id',
          location: '0,0',
          order: 1,
        },
      });

      await request(httpServer)
        .patch(`/itinerary-stops/${stop.id}`)
        .set('Cookie', accessTokenCookie)
        .send({ name: null })
        .expect(400);
    });
  });

  describe('DELETE /itinerary-stops/:stopId', () => {
    it('deletes the stop and returns 204 when owned by the user', async () => {
      const stop = await prisma.itineraryStop.create({
        data: {
          itineraryDayId: dayId,
          name: 'To be deleted',
          googlePlaceId: 'place-id',
          location: '0,0',
          order: 1,
        },
      });

      await request(httpServer)
        .delete(`/itinerary-stops/${stop.id}`)
        .set('Cookie', accessTokenCookie)
        .expect(204);

      const stored = await prisma.itineraryStop.findUnique({
        where: { id: stop.id },
      });
      expect(stored).toBeNull();
    });

    it('returns 404 when the stop does not exist', async () => {
      await request(httpServer)
        .delete(`/itinerary-stops/${randomUUID()}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });

    it('returns 404 when deleting a stop owned by another user', async () => {
      const { otherDayId } = await createOtherUserDay();
      const otherStop = await prisma.itineraryStop.create({
        data: {
          itineraryDayId: otherDayId,
          name: 'Not yours',
          googlePlaceId: 'place-id',
          location: '0,0',
          order: 1,
        },
      });

      await request(httpServer)
        .delete(`/itinerary-stops/${otherStop.id}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);

      const stored = await prisma.itineraryStop.findUnique({
        where: { id: otherStop.id },
      });
      expect(stored).not.toBeNull();
    });
  });
});
