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

interface SavedItineraryApiResponse {
  id: string;
  createdAt: string;
  itinerary: { id: string; title: string };
}

describe('SavedItineraryController (integration)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;
  let authService: AuthService;
  let userId: string;
  let tripId: string;
  let publishedItineraryId: string;
  let draftItineraryId: string;
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

    const publishedItinerary = await prisma.itinerary.create({
      data: { tripId, title: 'Published plan', publishedAt: new Date() },
    });
    publishedItineraryId = publishedItinerary.id;

    const draftItinerary = await prisma.itinerary.create({
      data: { tripId, title: 'Draft plan' },
    });
    draftItineraryId = draftItinerary.id;

    const { accessToken } = await authService.issueTokens(userId);
    accessTokenCookie = `access_token=${accessToken}`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /itineraries/:itineraryId/saved', () => {
    it('rejects requests with no auth cookie', async () => {
      await request(httpServer)
        .post(`/itineraries/${publishedItineraryId}/saved`)
        .expect(401);
    });

    it('saves a published itinerary', async () => {
      const response = await request(httpServer)
        .post(`/itineraries/${publishedItineraryId}/saved`)
        .set('Cookie', accessTokenCookie)
        .expect(201);

      const body = response.body as SavedItineraryApiResponse;
      expect(body.itinerary).toMatchObject({
        id: publishedItineraryId,
        title: 'Published plan',
      });

      const stored = await prisma.savedItinerary.findMany({
        where: { userId, itineraryId: publishedItineraryId },
      });
      expect(stored).toHaveLength(1);
    });

    it('is idempotent when saving the same itinerary twice', async () => {
      await request(httpServer)
        .post(`/itineraries/${publishedItineraryId}/saved`)
        .set('Cookie', accessTokenCookie)
        .expect(201);

      await request(httpServer)
        .post(`/itineraries/${publishedItineraryId}/saved`)
        .set('Cookie', accessTokenCookie)
        .expect(201);

      const stored = await prisma.savedItinerary.findMany({
        where: { userId, itineraryId: publishedItineraryId },
      });
      expect(stored).toHaveLength(1);
    });

    it('returns 404 when the itinerary is not published', async () => {
      await request(httpServer)
        .post(`/itineraries/${draftItineraryId}/saved`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });

    it('returns 404 when the itinerary does not exist', async () => {
      await request(httpServer)
        .post(`/itineraries/${randomUUID()}/saved`)
        .set('Cookie', accessTokenCookie)
        .expect(404);
    });
  });

  describe('DELETE /itineraries/:itineraryId/saved', () => {
    it('removes a saved itinerary and returns 204', async () => {
      await prisma.savedItinerary.create({
        data: { userId, itineraryId: publishedItineraryId },
      });

      await request(httpServer)
        .delete(`/itineraries/${publishedItineraryId}/saved`)
        .set('Cookie', accessTokenCookie)
        .expect(204);

      const stored = await prisma.savedItinerary.findMany({
        where: { userId, itineraryId: publishedItineraryId },
      });
      expect(stored).toHaveLength(0);
    });

    it('returns 204 (idempotent) when the itinerary was never saved', async () => {
      await request(httpServer)
        .delete(`/itineraries/${publishedItineraryId}/saved`)
        .set('Cookie', accessTokenCookie)
        .expect(204);
    });

    it('rejects requests with no auth cookie', async () => {
      await request(httpServer)
        .delete(`/itineraries/${publishedItineraryId}/saved`)
        .expect(401);
    });
  });

  describe('GET /saved-itineraries', () => {
    it('rejects requests with no auth cookie', async () => {
      await request(httpServer).get('/saved-itineraries').expect(401);
    });

    it('returns an empty array when the user has no saved itineraries', async () => {
      const response = await request(httpServer)
        .get('/saved-itineraries')
        .set('Cookie', accessTokenCookie)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('returns saved itineraries for the current user only', async () => {
      await prisma.savedItinerary.create({
        data: { userId, itineraryId: publishedItineraryId },
      });

      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          name: 'Other',
          googleId: 'google-2',
        },
      });
      await prisma.savedItinerary.create({
        data: { userId: otherUser.id, itineraryId: publishedItineraryId },
      });

      const response = await request(httpServer)
        .get('/saved-itineraries')
        .set('Cookie', accessTokenCookie)
        .expect(200);

      const body = response.body as SavedItineraryApiResponse[];
      expect(body).toHaveLength(1);
      expect(body[0]?.itinerary).toMatchObject({ id: publishedItineraryId });
    });
  });
});
