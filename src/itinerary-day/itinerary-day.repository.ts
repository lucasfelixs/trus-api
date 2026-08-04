import type { ItineraryDay } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreateItineraryDayDto } from './dto/create-itinerary-day.dto';
import type { UpdateItineraryDayDto } from './dto/update-itinerary-day.dto';

export class ItineraryDayRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ItineraryDay | null> {
    return this.prisma.itineraryDay.findUnique({
      where: { id },
    });
  }

  async findAllByItineraryId(itineraryId: string): Promise<ItineraryDay[]> {
    return this.prisma.itineraryDay.findMany({
      where: { itineraryId },
    });
  }

  async create(
    itineraryId: string,
    dto: CreateItineraryDayDto,
  ): Promise<ItineraryDay> {
    return this.prisma.itineraryDay.create({
      data: {
        itineraryId,
        title: dto.title,
        date: dto.date,
      },
    });
  }

  async update(id: string, dto: UpdateItineraryDayDto): Promise<ItineraryDay> {
    return this.prisma.itineraryDay.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.date !== undefined && { date: dto.date }),
      },
    });
  }

  async delete(id: string): Promise<ItineraryDay> {
    return this.prisma.itineraryDay.delete({
      where: { id },
    });
  }
}
