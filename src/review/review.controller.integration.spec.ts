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

interface ReviewApiResponse {
  id: string;
  rating: number;
  comment: string | null;
  userId: string;
  itineraryId: string;
}

interface ItineraryApiResponse {
  id: string;
  averageRating: number | null;
  reviewCount: number;
}

describe('ReviewController (integration)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;
  let authService: AuthService;
  let ownerId: string;
  let reviewerId: string;
  let publishedItineraryId: string;
  let draftItineraryId: string;
  let ownerAccessTokenCookie: string;
  let reviewerAccessTokenCookie: string;

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

    const owner = await prisma.user.create({
      data: { email: 'owner@example.com', name: 'Owner', googleId: 'google-1' },
    });
    ownerId = owner.id;

    const reviewer = await prisma.user.create({
      data: {
        email: 'reviewer@example.com',
        name: 'Reviewer',
        googleId: 'google-2',
      },
    });
    reviewerId = reviewer.id;

    const trip = await prisma.trip.create({
      data: {
        userId: ownerId,
        title: 'Trip to Paris',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-07'),
      },
    });

    const publishedItinerary = await prisma.itinerary.create({
      data: {
        tripId: trip.id,
        title: 'Published plan',
        publishedAt: new Date(),
      },
    });
    publishedItineraryId = publishedItinerary.id;

    const draftItinerary = await prisma.itinerary.create({
      data: { tripId: trip.id, title: 'Draft plan' },
    });
    draftItineraryId = draftItinerary.id;

    const ownerTokens = await authService.issueTokens(ownerId);
    ownerAccessTokenCookie = `access_token=${ownerTokens.accessToken}`;

    const reviewerTokens = await authService.issueTokens(reviewerId);
    reviewerAccessTokenCookie = `access_token=${reviewerTokens.accessToken}`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /itineraries/:itineraryId/reviews', () => {
    it('rejects requests with no auth cookie', async () => {
      await request(httpServer)
        .post(`/itineraries/${publishedItineraryId}/reviews`)
        .send({ rating: 5 })
        .expect(401);
    });

    it('creates a review for a published itinerary', async () => {
      const response = await request(httpServer)
        .post(`/itineraries/${publishedItineraryId}/reviews`)
        .set('Cookie', reviewerAccessTokenCookie)
        .send({ rating: 5, comment: 'Amazing trip' })
        .expect(201);

      const body = response.body as ReviewApiResponse;
      expect(body).toMatchObject({
        rating: 5,
        comment: 'Amazing trip',
        userId: reviewerId,
        itineraryId: publishedItineraryId,
      });
    });

    it('returns 400 when the rating is out of range', async () => {
      await request(httpServer)
        .post(`/itineraries/${publishedItineraryId}/reviews`)
        .set('Cookie', reviewerAccessTokenCookie)
        .send({ rating: 6 })
        .expect(400);
    });

    it('returns 404 when the itinerary is not published', async () => {
      await request(httpServer)
        .post(`/itineraries/${draftItineraryId}/reviews`)
        .set('Cookie', reviewerAccessTokenCookie)
        .send({ rating: 5 })
        .expect(404);
    });

    it('returns 404 when the itinerary does not exist', async () => {
      await request(httpServer)
        .post(`/itineraries/${randomUUID()}/reviews`)
        .set('Cookie', reviewerAccessTokenCookie)
        .send({ rating: 5 })
        .expect(404);
    });

    it('returns 403 when the owner tries to review their own itinerary', async () => {
      await request(httpServer)
        .post(`/itineraries/${publishedItineraryId}/reviews`)
        .set('Cookie', ownerAccessTokenCookie)
        .send({ rating: 5 })
        .expect(403);
    });

    it('returns 409 when the user has already reviewed the itinerary', async () => {
      await request(httpServer)
        .post(`/itineraries/${publishedItineraryId}/reviews`)
        .set('Cookie', reviewerAccessTokenCookie)
        .send({ rating: 5 })
        .expect(201);

      await request(httpServer)
        .post(`/itineraries/${publishedItineraryId}/reviews`)
        .set('Cookie', reviewerAccessTokenCookie)
        .send({ rating: 3 })
        .expect(409);
    });
  });

  describe('GET /itineraries/:itineraryId/reviews', () => {
    it('does not require an auth cookie', async () => {
      await request(httpServer)
        .get(`/itineraries/${publishedItineraryId}/reviews`)
        .expect(200);
    });

    it('returns reviews for the itinerary', async () => {
      await prisma.review.create({
        data: {
          itineraryId: publishedItineraryId,
          userId: reviewerId,
          rating: 4,
          comment: 'Nice',
        },
      });

      const response = await request(httpServer)
        .get(`/itineraries/${publishedItineraryId}/reviews`)
        .expect(200);

      const body = response.body as ReviewApiResponse[];
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ rating: 4, comment: 'Nice' });
    });

    it('returns 404 when the itinerary is not published', async () => {
      await request(httpServer)
        .get(`/itineraries/${draftItineraryId}/reviews`)
        .expect(404);
    });
  });

  describe('PATCH /reviews/:reviewId', () => {
    it('updates the review when owned by the user', async () => {
      const review = await prisma.review.create({
        data: {
          itineraryId: publishedItineraryId,
          userId: reviewerId,
          rating: 3,
        },
      });

      const response = await request(httpServer)
        .patch(`/reviews/${review.id}`)
        .set('Cookie', reviewerAccessTokenCookie)
        .send({ rating: 5, comment: 'Changed my mind, loved it' })
        .expect(200);

      expect(response.body).toMatchObject({
        rating: 5,
        comment: 'Changed my mind, loved it',
      });
    });

    it('returns 404 when the review does not exist', async () => {
      await request(httpServer)
        .patch(`/reviews/${randomUUID()}`)
        .set('Cookie', reviewerAccessTokenCookie)
        .send({ rating: 5 })
        .expect(404);
    });

    it('returns 404 when updating a review owned by another user', async () => {
      const review = await prisma.review.create({
        data: {
          itineraryId: publishedItineraryId,
          userId: reviewerId,
          rating: 3,
        },
      });

      await request(httpServer)
        .patch(`/reviews/${review.id}`)
        .set('Cookie', ownerAccessTokenCookie)
        .send({ rating: 1 })
        .expect(404);
    });

    it('returns 400 when the rating is out of range', async () => {
      const review = await prisma.review.create({
        data: {
          itineraryId: publishedItineraryId,
          userId: reviewerId,
          rating: 3,
        },
      });

      await request(httpServer)
        .patch(`/reviews/${review.id}`)
        .set('Cookie', reviewerAccessTokenCookie)
        .send({ rating: 0 })
        .expect(400);
    });
  });

  describe('DELETE /reviews/:reviewId', () => {
    it('deletes the review and returns 204 when owned by the user', async () => {
      const review = await prisma.review.create({
        data: {
          itineraryId: publishedItineraryId,
          userId: reviewerId,
          rating: 3,
        },
      });

      await request(httpServer)
        .delete(`/reviews/${review.id}`)
        .set('Cookie', reviewerAccessTokenCookie)
        .expect(204);

      const stored = await prisma.review.findUnique({
        where: { id: review.id },
      });
      expect(stored).toBeNull();
    });

    it('returns 404 when deleting a review owned by another user', async () => {
      const review = await prisma.review.create({
        data: {
          itineraryId: publishedItineraryId,
          userId: reviewerId,
          rating: 3,
        },
      });

      await request(httpServer)
        .delete(`/reviews/${review.id}`)
        .set('Cookie', ownerAccessTokenCookie)
        .expect(404);
    });

    it('rejects requests with no auth cookie', async () => {
      const review = await prisma.review.create({
        data: {
          itineraryId: publishedItineraryId,
          userId: reviewerId,
          rating: 3,
        },
      });

      await request(httpServer).delete(`/reviews/${review.id}`).expect(401);
    });
  });

  describe('averageRating / reviewCount on GET /itineraries/:itineraryId', () => {
    it('reflects created and deleted reviews', async () => {
      const noReviews = await request(httpServer)
        .get(`/itineraries/${publishedItineraryId}`)
        .set('Cookie', ownerAccessTokenCookie)
        .expect(200);
      expect((noReviews.body as ItineraryApiResponse).averageRating).toBeNull();
      expect((noReviews.body as ItineraryApiResponse).reviewCount).toBe(0);

      const secondReviewer = await prisma.user.create({
        data: {
          email: 'second@example.com',
          name: 'Second',
          googleId: 'google-3',
        },
      });
      await prisma.review.create({
        data: {
          itineraryId: publishedItineraryId,
          userId: reviewerId,
          rating: 5,
        },
      });
      await prisma.review.create({
        data: {
          itineraryId: publishedItineraryId,
          userId: secondReviewer.id,
          rating: 3,
        },
      });

      const withReviews = await request(httpServer)
        .get(`/itineraries/${publishedItineraryId}`)
        .set('Cookie', ownerAccessTokenCookie)
        .expect(200);

      expect((withReviews.body as ItineraryApiResponse).averageRating).toBe(4);
      expect((withReviews.body as ItineraryApiResponse).reviewCount).toBe(2);
    });
  });
});
