import { Injectable } from '@nestjs/common';
import { Itinerary, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';

export type ItineraryWithTripOwner = Prisma.ItineraryGetPayload<{
  include: { trip: { select: { userId: true } } };
}>;

@Injectable()
export class ItineraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ItineraryWithTripOwner | null> {
    return this.prisma.itinerary.findUnique({
      include: {
        trip: {
          select: {
            userId: true,
          },
        },
      },
      where: { id },
    });
  }

  async findAllByTripId(tripId: string): Promise<ItineraryWithTripOwner[]> {
    return this.prisma.itinerary.findMany({
      include: {
        trip: {
          select: {
            userId: true,
          },
        },
      },
      where: { tripId },
    });
  }

  async findByShareToken(shareToken: string): Promise<Itinerary | null> {
    return this.prisma.itinerary.findUnique({
      where: { shareToken, publishedAt: { not: null } },
    });
  }

  async getReviewStats(
    itineraryId: string,
  ): Promise<{ averageRating: number | null; reviewCount: number }> {
    const result = await this.prisma.review.aggregate({
      where: { itineraryId },
      _avg: { rating: true },
      _count: true,
    });

    return { averageRating: result._avg.rating, reviewCount: result._count };
  }

  async publishItinerary(itineraryId: string): Promise<Itinerary> {
    return this.prisma.itinerary.update({
      where: { id: itineraryId },
      data: { publishedAt: new Date() },
    });
  }

  async unpublishItinerary(itineraryId: string): Promise<Itinerary> {
    return this.prisma.itinerary.update({
      where: { id: itineraryId },
      data: { publishedAt: null },
    });
  }

  async create(tripId: string, dto: CreateItineraryDto): Promise<Itinerary> {
    return this.prisma.itinerary.create({
      data: {
        tripId,
        title: dto.title,
        description: dto.description ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateItineraryDto): Promise<Itinerary> {
    return this.prisma.itinerary.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.itinerary.delete({
      where: { id },
    });
  }
}
