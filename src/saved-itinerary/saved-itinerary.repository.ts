import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type SavedItineraryWithItinerary = Prisma.SavedItineraryGetPayload<{
  include: { itinerary: true };
}>;

@Injectable()
export class SavedItineraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    userId: string,
    itineraryId: string,
  ): Promise<SavedItineraryWithItinerary> {
    return this.prisma.savedItinerary.upsert({
      where: { userId_itineraryId: { userId, itineraryId } },
      update: {},
      create: { userId, itineraryId },
      include: { itinerary: true },
    });
  }

  async deleteIfExists(userId: string, itineraryId: string): Promise<void> {
    await this.prisma.savedItinerary.deleteMany({
      where: { userId, itineraryId },
    });
  }

  async findAllByUserId(
    userId: string,
  ): Promise<SavedItineraryWithItinerary[]> {
    return this.prisma.savedItinerary.findMany({
      where: { userId },
      include: { itinerary: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
