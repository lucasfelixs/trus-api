import { Injectable } from '@nestjs/common';
import { ItineraryDay } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { ItineraryDayNotFoundException } from '../common/exceptions/itinerary-day-not-found.exception';
import { CreateItineraryDayDto } from './dto/create-itinerary-day.dto';
import { UpdateItineraryDayDto } from './dto/update-itinerary-day.dto';
import { ItineraryDayResponseDto } from './dto/itinerary-day-response.dto';
import { ItineraryDayRepository } from './itinerary-day.repository';
import { ItineraryService } from '../itinerary/itinerary.service';

@Injectable()
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

  async findById(id: string, userId: string): Promise<ItineraryDayResponseDto> {
    const itineraryDay = await this.verifyOwnership(id, userId);

    return plainToInstance(ItineraryDayResponseDto, itineraryDay, {
      excludeExtraneousValues: true,
    });
  }

  async findAllByItineraryId(
    itineraryId: string,
    userId: string,
  ): Promise<ItineraryDayResponseDto[]> {
    await this.itineraryService.verifyOwnership(itineraryId, userId);

    const days =
      await this.itineraryDayRepository.findAllByItineraryId(itineraryId);

    return days.map((day) =>
      plainToInstance(ItineraryDayResponseDto, day, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async create(
    itineraryId: string,
    userId: string,
    dto: CreateItineraryDayDto,
  ): Promise<ItineraryDayResponseDto> {
    await this.itineraryService.verifyOwnership(itineraryId, userId);

    const day = await this.itineraryDayRepository.create(itineraryId, dto);

    return plainToInstance(ItineraryDayResponseDto, day, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateItineraryDayDto,
  ): Promise<ItineraryDayResponseDto> {
    await this.verifyOwnership(id, userId);

    const updated = await this.itineraryDayRepository.update(id, dto);

    return plainToInstance(ItineraryDayResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.verifyOwnership(id, userId);

    await this.itineraryDayRepository.delete(id);
  }
}
