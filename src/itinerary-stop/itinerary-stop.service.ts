import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ItineraryStopNotFoundException } from '../common/exceptions/itinerary-stop-not-found.exception';
import { CreateItineraryStopDto } from './dto/create-itinerary-stop.dto';
import { UpdateItineraryStopDto } from './dto/update-itinerary-stop.dto';
import { ItineraryStopResponseDto } from './dto/itinerary-stop-response.dto';
import { ItineraryStopRepository } from './itinerary-stop.repository';
import { ItineraryDayService } from '../itinerary-day/itinerary-day.service';

@Injectable()
export class ItineraryStopService {
  constructor(
    private readonly itineraryStopRepository: ItineraryStopRepository,
    private readonly itineraryDayService: ItineraryDayService,
  ) {}

  async findById(
    id: string,
    userId: string,
  ): Promise<ItineraryStopResponseDto> {
    const stop = await this.itineraryStopRepository.findById(id);

    if (!stop) {
      throw new ItineraryStopNotFoundException(id);
    }

    await this.itineraryDayService.verifyOwnership(stop.itineraryDayId, userId);

    return plainToInstance(ItineraryStopResponseDto, stop, {
      excludeExtraneousValues: true,
    });
  }

  async findAllByItineraryDayId(
    itineraryDayId: string,
    userId: string,
  ): Promise<ItineraryStopResponseDto[]> {
    await this.itineraryDayService.verifyOwnership(itineraryDayId, userId);

    const stops =
      await this.itineraryStopRepository.findAllByItineraryDayId(
        itineraryDayId,
      );

    return stops.map((stop) =>
      plainToInstance(ItineraryStopResponseDto, stop, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async create(
    itineraryDayId: string,
    userId: string,
    dto: CreateItineraryStopDto,
  ): Promise<ItineraryStopResponseDto> {
    await this.itineraryDayService.verifyOwnership(itineraryDayId, userId);

    const stop = await this.itineraryStopRepository.create(itineraryDayId, dto);

    return plainToInstance(ItineraryStopResponseDto, stop, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateItineraryStopDto,
  ): Promise<ItineraryStopResponseDto> {
    const stop = await this.itineraryStopRepository.findById(id);

    if (!stop) {
      throw new ItineraryStopNotFoundException(id);
    }

    await this.itineraryDayService.verifyOwnership(stop.itineraryDayId, userId);

    const updated = await this.itineraryStopRepository.update(id, dto);

    return plainToInstance(ItineraryStopResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const stop = await this.itineraryStopRepository.findById(id);

    if (!stop) {
      throw new ItineraryStopNotFoundException(id);
    }

    await this.itineraryDayService.verifyOwnership(stop.itineraryDayId, userId);

    await this.itineraryStopRepository.delete(id);
  }
}
