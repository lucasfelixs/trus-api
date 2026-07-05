import { Injectable } from '@nestjs/common';
import { Trip } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Injectable()
export class TripsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Trip | null> {
    return this.prisma.trip.findUnique({
      where: { id },
    });
  }

  async findAllByUserId(userId: string): Promise<Trip[]> {
    return this.prisma.trip.findMany({
      where: { userId },
    });
  }

  async create(userId: string, dto: CreateTripDto): Promise<Trip> {
    return this.prisma.trip.create({
      data: {
        userId,
        title: dto.title,
        destination: dto.destination ?? null,
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
