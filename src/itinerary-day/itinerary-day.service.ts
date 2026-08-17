import type { ItineraryDay } from '@prisma/client';
import type { ItineraryDayRepository } from './itinerary-day.repository';
import type { CreateItineraryDayDto } from './dto/create-itinerary-day.dto';
import type { UpdateItineraryDayDto } from './dto/update-itinerary-day.dto';
import { ItineraryDayNotFoundException } from 'src/common/exceptions/itinerary-day-not-found.exception';
import type { ItineraryService } from '../itinerary/itinerary.service';

export class ItineraryDayService {
  constructor(
    private readonly itineraryDayRepository: ItineraryDayRepository,
    private readonly itineraryService: ItineraryService,
  ) {}

  async verifyOwnership(dayId: string, userId: string): Promise<ItineraryDay> {
    const day = await this.itineraryDayRepository.findById(dayId);

    if (!day) {
      throw new ItineraryDayNotFoundException(dayId);
    }

    await this.itineraryService.verifyOwnership(day.itineraryId, userId);

    return day;
  }

  async findById(id: string, userId: string): Promise<ItineraryDay | null> {
    const itineraryDay = await this.verifyOwnership(id, userId);

    if (!itineraryDay) {
      throw new ItineraryDayNotFoundException(id);
    }

    return itineraryDay;
  }

  async findAllByItineraryId(
    itineraryId: string,
    userId: string,
  ): Promise<ItineraryDay[]> {
    await this.itineraryService.verifyOwnership(itineraryId, userId);

    return this.itineraryDayRepository.findAllByItineraryId(itineraryId);
  }

  async create(
    itineraryId: string,
    userId: string,
    dto: CreateItineraryDayDto,
  ): Promise<ItineraryDay> {
    await this.itineraryService.verifyOwnership(itineraryId, userId);

    return this.itineraryDayRepository.create(itineraryId, dto);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateItineraryDayDto,
  ): Promise<ItineraryDay> {
    const itineraryDay = await this.verifyOwnership(id, userId);

    if (!itineraryDay) {
      throw new ItineraryDayNotFoundException(id);
    }

    return this.itineraryDayRepository.update(id, dto);
  }

  async delete(id: string, userId: string): Promise<ItineraryDay> {
    await this.verifyOwnership(id, userId);

    return this.itineraryDayRepository.delete(id);
  }
}
