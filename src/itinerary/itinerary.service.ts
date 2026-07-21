import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ItineraryNotFoundException } from '../common/exceptions/itinerary-not-found.exception';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { ItineraryResponseDto } from './dto/itinerary-response.dto';
import { ItineraryRepository } from './itinerary.repository';
import type { TripsService } from 'src/trips/trips.service';

@Injectable()
export class ItineraryService {
  constructor(
    private readonly itineraryRepository: ItineraryRepository,
    private readonly tripsService: TripsService,
  ) {}

  async findAllByTripId(
    tripId: string,
    userId: string,
  ): Promise<ItineraryResponseDto[]> {
    await this.tripsService.verifyOwnership(tripId, userId);

    const itineraries = await this.itineraryRepository.findAllByTripId(tripId);

    return itineraries.map((itinerary) =>
      plainToInstance(ItineraryResponseDto, itinerary, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async findById(
    itineraryId: string,
    userId: string,
  ): Promise<ItineraryResponseDto> {
    const itinerary = await this.itineraryRepository.findById(itineraryId);

    if (!itinerary || itinerary.trip.userId !== userId) {
      throw new ItineraryNotFoundException(itineraryId);
    }

    return plainToInstance(ItineraryResponseDto, itinerary, {
      excludeExtraneousValues: true,
    });
  }

  async create(
    tripId: string,
    userId: string,
    dto: CreateItineraryDto,
  ): Promise<ItineraryResponseDto> {
    await this.tripsService.verifyOwnership(tripId, userId);

    const itinerary = await this.itineraryRepository.create(tripId, dto);

    return plainToInstance(ItineraryResponseDto, itinerary, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    itineraryId: string,
    userId: string,
    dto: UpdateItineraryDto,
  ): Promise<ItineraryResponseDto> {
    const itinerary = await this.itineraryRepository.findById(itineraryId);

    if (!itinerary || itinerary.trip.userId !== userId) {
      throw new ItineraryNotFoundException(itineraryId);
    }

    const updated = await this.itineraryRepository.update(itineraryId, dto);

    return plainToInstance(ItineraryResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async delete(itineraryId: string, userId: string): Promise<void> {
    const itinerary = await this.itineraryRepository.findById(itineraryId);

    if (!itinerary || itinerary.trip.userId !== userId) {
      throw new ItineraryNotFoundException(itineraryId);
    }

    await this.itineraryRepository.delete(itineraryId);
  }
}
