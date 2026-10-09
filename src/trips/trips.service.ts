import { Injectable } from '@nestjs/common';
import { Trip } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { TripNotFoundException } from '../common/exceptions/trip-not-found.exception';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripResponseDto } from './dto/trip-response.dto';
import { TripSummaryResponseDto } from './dto/trip-summary-response.dto';
import { TripsRepository } from './trips.repository';

@Injectable()
export class TripsService {
  constructor(private readonly tripsRepository: TripsRepository) {}

  async verifyOwnership(tripId: string, userId: string): Promise<Trip> {
    const trip = await this.tripsRepository.findById(tripId);

    if (!trip || trip.userId !== userId) {
      throw new TripNotFoundException(tripId);
    }

    return trip;
  }

  async findAll(userId: string): Promise<TripSummaryResponseDto[]> {
    const trips = await this.tripsRepository.findAllByUserId(userId);

    return trips.map((trip) =>
      plainToInstance(TripSummaryResponseDto, trip, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async findById(userId: string, tripId: string): Promise<TripResponseDto> {
    const trip = await this.verifyOwnership(tripId, userId);

    return plainToInstance(TripResponseDto, trip, {
      excludeExtraneousValues: true,
    });
  }

  async create(userId: string, dto: CreateTripDto): Promise<TripResponseDto> {
    const trip = await this.tripsRepository.create(userId, dto);

    return plainToInstance(TripResponseDto, trip, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    userId: string,
    tripId: string,
    dto: UpdateTripDto,
  ): Promise<TripResponseDto> {
    await this.verifyOwnership(tripId, userId);

    const trip = await this.tripsRepository.update(tripId, dto);

    return plainToInstance(TripResponseDto, trip, {
      excludeExtraneousValues: true,
    });
  }

  async delete(userId: string, tripId: string): Promise<void> {
    await this.verifyOwnership(tripId, userId);

    await this.tripsRepository.delete(tripId);
  }
}
