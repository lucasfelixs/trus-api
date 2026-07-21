import { Injectable } from '@nestjs/common';
import { Itinerary, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';

type ItineraryWithTripOwner = Prisma.ItineraryGetPayload<{
  include: { trip: { select: { userId: true } } };
}>;

@Injectable()
export class ItineraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ItineraryWithTripOwner | null> {
    return await this.prisma.itinerary.findUnique({
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
    return await this.prisma.itinerary.findMany({
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

  async create(tripId: string, dto: CreateItineraryDto): Promise<Itinerary> {
    return await this.prisma.itinerary.create({
      data: {
        tripId,
        title: dto.title,
        description: dto.description ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateItineraryDto): Promise<Itinerary> {
    return await this.prisma.itinerary.update({
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
