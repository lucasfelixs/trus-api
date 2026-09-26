import type { Server } from 'http';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuthService } from '../../src/auth/auth.service';
import { assertLocalDatabase } from '../assert-local-database';

assertLocalDatabase(process.env.DATABASE_URL);

interface TripApiResponse {
  id: string;
}

interface ItineraryApiResponse {
  id: string;
  title: string;
  shareToken: string;
}

describe('Public itinerary share link (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;
  let accessTokenCookie: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    httpServer = app.getHttpServer() as Server;
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "users" RESTART IDENTITY CASCADE');

    const user = await prisma.user.create({
      data: {
        email: 'itinerary-owner@example.com',
        name: 'Itinerary Owner',
        googleId: 'google-e2e-2',
      },
    });

    const authService = app.get(AuthService);
    const { accessToken } = await authService.issueTokens(user.id);
    accessTokenCookie = `access_token=${accessToken}`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('goes from private draft to publicly shared and back to private', async () => {
    // 1. Create a trip and an itinerary under it (still a private draft).
    const tripResponse = await request(httpServer)
      .post('/trips')
      .set('Cookie', accessTokenCookie)
      .send({
        title: 'Trip to Lisbon',
        startDate: '2026-03-01',
        endDate: '2026-03-07',
      })
      .expect(201);
    const { id: tripId } = tripResponse.body as TripApiResponse;

    const itineraryResponse = await request(httpServer)
      .post(`/trips/${tripId}/itineraries`)
      .set('Cookie', accessTokenCookie)
      .send({ title: 'Day 1: Arrival' })
      .expect(201);
    const { id: itineraryId, shareToken } =
      itineraryResponse.body as ItineraryApiResponse;

    // 2. The share link is not publicly reachable while still a draft.
    await request(httpServer)
      .get(`/itineraries/shared/${shareToken}`)
      .expect(404);

    // 3. Publishing makes the exact same link publicly reachable, with no
    // auth cookie at all.
    await request(httpServer)
      .patch(`/itineraries/${itineraryId}/publish`)
      .set('Cookie', accessTokenCookie)
      .expect(200);

    const publicResponse = await request(httpServer)
      .get(`/itineraries/shared/${shareToken}`)
      .expect(200);
    expect(publicResponse.body).toMatchObject({
      id: itineraryId,
      title: 'Day 1: Arrival',
    });

    // 4. Unpublishing revokes public access to that same link again.
    await request(httpServer)
      .patch(`/itineraries/${itineraryId}/unpublish`)
      .set('Cookie', accessTokenCookie)
      .expect(200);

    await request(httpServer)
      .get(`/itineraries/shared/${shareToken}`)
      .expect(404);
  });
});
