import type { ItineraryDay } from '@prisma/client';
import type { ItineraryDayRepository } from './itinerary-day.repository';
import type { CreateItineraryDayDto } from './dto/create-itinerary-day.dto';
import type { UpdateItineraryDayDto } from './dto/update-itinerary-day.dto';

export class ItineraryDayService {
  constructor(
    private readonly itineraryDayRepository: ItineraryDayRepository,
  ) {}

  async findById(id: string): Promise<ItineraryDay | null> {
    return this.itineraryDayRepository.findById(id);
  }

  async findAllByItineraryId(itineraryId: string): Promise<ItineraryDay[]> {
    return this.itineraryDayRepository.findAllByItineraryId(itineraryId);
  }

  async create(
    itineraryId: string,
    dto: CreateItineraryDayDto,
  ): Promise<ItineraryDay> {
    return this.itineraryDayRepository.create(itineraryId, dto);
  }

  async update(id: string, dto: UpdateItineraryDayDto): Promise<ItineraryDay> {
    return this.itineraryDayRepository.update(id, dto);
  }

  async delete(id: string): Promise<ItineraryDay> {
    return this.itineraryDayRepository.delete(id);
  }
}
