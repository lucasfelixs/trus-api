import { Injectable } from '@nestjs/common';
import { ItineraryDay } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItineraryDayDto } from './dto/create-itinerary-day.dto';
import { UpdateItineraryDayDto } from './dto/update-itinerary-day.dto';

@Injectable()
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
        title: dto.title ?? null,
        date: new Date(dto.date),
      },
    });
  }

  async update(id: string, dto: UpdateItineraryDayDto): Promise<ItineraryDay> {
    return this.prisma.itineraryDay.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.itineraryDay.delete({
      where: { id },
    });
  }
}
