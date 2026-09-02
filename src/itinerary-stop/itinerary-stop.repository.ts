import { Injectable } from '@nestjs/common';
import { ItineraryStop } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItineraryStopDto } from './dto/create-itinerary-stop.dto';
import { UpdateItineraryStopDto } from './dto/update-itinerary-stop.dto';

@Injectable()
export class ItineraryStopRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ItineraryStop | null> {
    return this.prisma.itineraryStop.findUnique({
      where: { id },
    });
  }

  async findAllByItineraryDayId(
    itineraryDayId: string,
  ): Promise<ItineraryStop[]> {
    return this.prisma.itineraryStop.findMany({
      where: { itineraryDayId },
    });
  }

  async create(
    itineraryDayId: string,
    dto: CreateItineraryStopDto,
  ): Promise<ItineraryStop> {
    return this.prisma.itineraryStop.create({
      data: {
        itineraryDayId,
        name: dto.name,
        googlePlaceId: dto.googlePlaceId,
        location: dto.location,
        order: dto.order,
        note: dto.note ?? null,
        scheduledTime: dto.scheduledTime ? new Date(dto.scheduledTime) : null,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateItineraryStopDto,
  ): Promise<ItineraryStop> {
    return this.prisma.itineraryStop.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.googlePlaceId !== undefined && {
          googlePlaceId: dto.googlePlaceId,
        }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(dto.scheduledTime !== undefined && {
          scheduledTime: dto.scheduledTime ? new Date(dto.scheduledTime) : null,
        }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.itineraryStop.delete({
      where: { id },
    });
  }
}
