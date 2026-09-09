import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ItineraryNotFoundException } from '../common/exceptions/itinerary-not-found.exception';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { ItineraryResponseDto } from './dto/itinerary-response.dto';
import {
  ItineraryRepository,
  ItineraryWithTripOwner,
} from './itinerary.repository';
import { TripsService } from '../trips/trips.service';

@Injectable()
export class ItineraryService {
  constructor(
    private readonly itineraryRepository: ItineraryRepository,
    private readonly tripsService: TripsService,
  ) {}

  async verifyOwnership(
    itineraryId: string,
    userId: string,
  ): Promise<ItineraryWithTripOwner> {
    const itinerary = await this.itineraryRepository.findById(itineraryId);

    if (!itinerary || itinerary.trip.userId !== userId) {
      throw new ItineraryNotFoundException(itineraryId);
    }

    return itinerary;
  }

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
    const itinerary = await this.verifyOwnership(itineraryId, userId);
    const stats = await this.itineraryRepository.getReviewStats(itineraryId);

    return plainToInstance(
      ItineraryResponseDto,
      { ...itinerary, ...stats },
      { excludeExtraneousValues: true },
    );
  }

  async isOwnedBy(itineraryId: string, userId: string): Promise<boolean> {
    const itinerary = await this.itineraryRepository.findById(itineraryId);

    return itinerary?.trip.userId === userId;
  }

  async verifyPublished(itineraryId: string): Promise<ItineraryResponseDto> {
    const itinerary = await this.itineraryRepository.findById(itineraryId);

    if (!itinerary || !itinerary.publishedAt) {
      throw new ItineraryNotFoundException(itineraryId);
    }

    return plainToInstance(ItineraryResponseDto, itinerary, {
      excludeExtraneousValues: true,
    });
  }

  async findByShareToken(shareToken: string): Promise<ItineraryResponseDto> {
    const itinerary =
      await this.itineraryRepository.findByShareToken(shareToken);

    if (!itinerary) {
      throw new ItineraryNotFoundException(shareToken);
    }

    const stats = await this.itineraryRepository.getReviewStats(itinerary.id);

    return plainToInstance(
      ItineraryResponseDto,
      { ...itinerary, ...stats },
      { excludeExtraneousValues: true },
    );
  }

  async publishItinerary(itineraryId: string, userId: string): Promise<void> {
    await this.verifyOwnership(itineraryId, userId);

    await this.itineraryRepository.publishItinerary(itineraryId);
  }

  async unpublishItinerary(itineraryId: string, userId: string): Promise<void> {
    await this.verifyOwnership(itineraryId, userId);

    await this.itineraryRepository.unpublishItinerary(itineraryId);
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
    await this.verifyOwnership(itineraryId, userId);

    const updated = await this.itineraryRepository.update(itineraryId, dto);

    return plainToInstance(ItineraryResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async delete(itineraryId: string, userId: string): Promise<void> {
    await this.verifyOwnership(itineraryId, userId);

    await this.itineraryRepository.delete(itineraryId);
  }
}
