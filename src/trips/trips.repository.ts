import { Injectable } from '@nestjs/common';
import { Trip } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

export interface TripWithCounts extends Trip {
  readonly itineraryCount: number;
  readonly publishedItineraryCount: number;
}

@Injectable()
export class TripsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Trip | null> {
    return this.prisma.trip.findUnique({
      where: { id },
    });
  }

  async findAllByUserId(userId: string): Promise<TripWithCounts[]> {
    const trips = await this.prisma.trip.findMany({
      where: { userId },
      orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
      include: {
        _count: { select: { itineraries: true } },
      },
    });

    const publishedCounts = await this.prisma.itinerary.groupBy({
      by: ['tripId'],
      where: { trip: { userId }, publishedAt: { not: null } },
      _count: true,
    });

    const publishedByTripId = new Map(
      publishedCounts.map((group) => [group.tripId, group._count]),
    );

    return trips.map(({ _count, ...trip }) => ({
      ...trip,
      itineraryCount: _count.itineraries,
      publishedItineraryCount: publishedByTripId.get(trip.id) ?? 0,
    }));
  }

  async create(userId: string, dto: CreateTripDto): Promise<Trip> {
    return this.prisma.trip.create({
      data: {
        userId,
        title: dto.title,
        destination: dto.destination,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async update(id: string, dto: UpdateTripDto): Promise<Trip> {
    return this.prisma.trip.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.destination !== undefined && { destination: dto.destination }),
        ...(dto.startDate !== undefined && {
          startDate: new Date(dto.startDate),
        }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.trip.delete({
      where: { id },
    });
  }
}
