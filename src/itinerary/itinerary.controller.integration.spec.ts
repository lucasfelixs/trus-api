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

interface ItineraryApiResponse {
  id: string;
  title: string;
  description: string | null;
  shareToken: string;
  publishedAt: string | null;
}

describe('ItineraryController (integration)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;
  let authService: AuthService;
  let userId: string;
  let tripId: string;
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

    const { accessToken } = await authService.issueTokens(userId);
    accessTokenCookie = `access_token=${accessToken}`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  async function createOtherUserItinerary(): Promise<{
    otherTripId: string;
    itineraryId: string;
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

    return { otherTripId: otherTrip.id, itineraryId: otherItinerary.id };
  }

  describe('GET /trips/:tripId/itineraries', () => {
    it('rejects requests with no auth cookie', async () => {
      await request(httpServer).get(`/trips/${tripId}/itineraries`).expect(401);
    });

    it('returns itineraries for the trip when owned by the user', async () => {
      await prisma.itinerary.create({ data: { tripId, title: 'Day 1' } });

      const response = await request(httpServer)
        .get(`/trips/${tripId}/itineraries`)
        .set('Cookie', accessTokenCookie)
        .expect(200);

      const body = response.body as ItineraryApiResponse[];
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ title: 'Day 1' });
    });

    it('returns 404 when the trip is not owned by the user', async () => {
      const { otherTripId } = await createOtherUserItinerary();

      await request(httpServer)
        .get(`/trips/${otherTripId}/itineraries`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });
  });

  describe('GET /itineraries/:itineraryId', () => {
    it('returns the itinerary when owned by the user', async () => {
      const itinerary = await prisma.itinerary.create({
        data: { tripId, title: 'Day 1' },
      });

      const response = await request(httpServer)
        .get(`/itineraries/${itinerary.id}`)
        .set('Cookie', accessTokenCookie)
        .expect(200);

      expect(response.body).toMatchObject({ id: itinerary.id, title: 'Day 1' });
    });

    it('returns 404 when the itinerary does not exist', async () => {
      await request(httpServer)
        .get(`/itineraries/${randomUUID()}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });

    it('returns 404 when fetching an itinerary owned by another user', async () => {
      const { itineraryId } = await createOtherUserItinerary();

      await request(httpServer)
        .get(`/itineraries/${itineraryId}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });
  });

  describe('POST /trips/:tripId/itineraries', () => {
    it('creates and returns an itinerary for the trip', async () => {
      const response = await request(httpServer)
        .post(`/trips/${tripId}/itineraries`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Day 1: Arrival' })
        .expect(201);

      const body = response.body as ItineraryApiResponse;
      expect(body).toMatchObject({ title: 'Day 1: Arrival' });

      const stored = await prisma.itinerary.findUnique({
        where: { id: body.id },
      });
      expect(stored?.tripId).toBe(tripId);
    });

    it('returns 400 when required fields are missing', async () => {
      await request(httpServer)
        .post(`/trips/${tripId}/itineraries`)
        .set('Cookie', accessTokenCookie)
        .send({})
        .expect(400);
    });

    it('returns 400 when the payload has unknown fields', async () => {
      await request(httpServer)
        .post(`/trips/${tripId}/itineraries`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Day 1', notAField: 'nope' })
        .expect(400);
    });

    it('returns 404 when the trip is not owned by the user', async () => {
      const { otherTripId } = await createOtherUserItinerary();

      await request(httpServer)
        .post(`/trips/${otherTripId}/itineraries`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Hijacked' })
        .expect(404);
    });
  });

  describe('PATCH /itineraries/:itineraryId', () => {
    it('updates and returns the itinerary when owned by the user', async () => {
      const itinerary = await prisma.itinerary.create({
        data: { tripId, title: 'Original title' },
      });

      const response = await request(httpServer)
        .patch(`/itineraries/${itinerary.id}`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Updated title' })
        .expect(200);

      expect(response.body).toMatchObject({ title: 'Updated title' });

      const stored = await prisma.itinerary.findUnique({
        where: { id: itinerary.id },
      });
      expect(stored?.title).toBe('Updated title');
    });

    it('returns 404 when the itinerary does not exist', async () => {
      await request(httpServer)
        .patch(`/itineraries/${randomUUID()}`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Updated title' })
        .expect(404);
    });

    it('returns 404 when updating an itinerary owned by another user', async () => {
      const { itineraryId } = await createOtherUserItinerary();

      await request(httpServer)
        .patch(`/itineraries/${itineraryId}`)
        .set('Cookie', accessTokenCookie)
        .send({ title: 'Hijacked' })
        .expect(404);
    });

    it('returns 400 when title is explicitly set to null', async () => {
      const itinerary = await prisma.itinerary.create({
        data: { tripId, title: 'Original title' },
      });

      await request(httpServer)
        .patch(`/itineraries/${itinerary.id}`)
        .set('Cookie', accessTokenCookie)
        .send({ title: null })
        .expect(400);
    });
  });

  describe('PATCH /itineraries/:itineraryId/publish', () => {
    it('publishes the itinerary when owned by the user', async () => {
      const itinerary = await prisma.itinerary.create({
        data: { tripId, title: 'Day 1' },
      });

      await request(httpServer)
        .patch(`/itineraries/${itinerary.id}/publish`)
        .set('Cookie', accessTokenCookie)
        .expect(200);

      const stored = await prisma.itinerary.findUnique({
        where: { id: itinerary.id },
      });
      expect(stored?.publishedAt).not.toBeNull();
    });

    it('returns 404 when the itinerary does not exist', async () => {
      await request(httpServer)
        .patch(`/itineraries/${randomUUID()}/publish`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });

    it('returns 404 when publishing an itinerary owned by another user', async () => {
      const { itineraryId } = await createOtherUserItinerary();

      await request(httpServer)
        .patch(`/itineraries/${itineraryId}/publish`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });
  });

  describe('PATCH /itineraries/:itineraryId/unpublish', () => {
    it('unpublishes the itinerary when owned by the user', async () => {
      const itinerary = await prisma.itinerary.create({
        data: { tripId, title: 'Day 1', publishedAt: new Date() },
      });

      await request(httpServer)
        .patch(`/itineraries/${itinerary.id}/unpublish`)
        .set('Cookie', accessTokenCookie)
        .expect(200);

      const stored = await prisma.itinerary.findUnique({
        where: { id: itinerary.id },
      });
      expect(stored?.publishedAt).toBeNull();
    });

    it('returns 404 when the itinerary does not exist', async () => {
      await request(httpServer)
        .patch(`/itineraries/${randomUUID()}/unpublish`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });

    it('returns 404 when unpublishing an itinerary owned by another user', async () => {
      const { itineraryId } = await createOtherUserItinerary();

      await request(httpServer)
        .patch(`/itineraries/${itineraryId}/unpublish`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });
  });

  describe('GET /itineraries/shared/:shareToken', () => {
    it('returns the itinerary when it is published', async () => {
      const itinerary = await prisma.itinerary.create({
        data: { tripId, title: 'Public itinerary', publishedAt: new Date() },
      });

      const response = await request(httpServer)
        .get(`/itineraries/shared/${itinerary.shareToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: itinerary.id,
        title: 'Public itinerary',
      });
    });

    it('does not require an auth cookie', async () => {
      const itinerary = await prisma.itinerary.create({
        data: { tripId, title: 'Public itinerary', publishedAt: new Date() },
      });

      await request(httpServer)
        .get(`/itineraries/shared/${itinerary.shareToken}`)
        .expect(200);
    });

    it('returns 404 when the itinerary is not published', async () => {
      const itinerary = await prisma.itinerary.create({
        data: { tripId, title: 'Draft itinerary' },
      });

      await request(httpServer)
        .get(`/itineraries/shared/${itinerary.shareToken}`)
        .expect(404);
    });

    it('returns 404 when the share token does not exist', async () => {
      await request(httpServer)
        .get(`/itineraries/shared/${randomUUID()}`)
        .expect(404);
    });
  });

  describe('DELETE /itineraries/:itineraryId', () => {
    it('deletes the itinerary and returns 204 when owned by the user', async () => {
      const itinerary = await prisma.itinerary.create({
        data: { tripId, title: 'To be deleted' },
      });

      await request(httpServer)
        .delete(`/itineraries/${itinerary.id}`)
        .set('Cookie', accessTokenCookie)
        .expect(204);

      const stored = await prisma.itinerary.findUnique({
        where: { id: itinerary.id },
      });
      expect(stored).toBeNull();
    });

    it('returns 404 when the itinerary does not exist', async () => {
      await request(httpServer)
        .delete(`/itineraries/${randomUUID()}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });

    it('returns 404 when deleting an itinerary owned by another user', async () => {
      const { itineraryId } = await createOtherUserItinerary();

      await request(httpServer)
        .delete(`/itineraries/${itineraryId}`)
        .set('Cookie', accessTokenCookie)
        .expect(404);

      const stored = await prisma.itinerary.findUnique({
        where: { id: itineraryId },
      });
      expect(stored).not.toBeNull();
    });
  });
});
