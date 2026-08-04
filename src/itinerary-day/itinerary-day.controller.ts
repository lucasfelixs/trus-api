import type { CreateItineraryDayDto } from './dto/create-itinerary-day.dto';
import type { UpdateItineraryDayDto } from './dto/update-itinerary-day.dto';
import type { ItineraryDayService } from './itinerary-day.service';

export class ItineraryDayController {
  constructor(private readonly itineraryDayService: ItineraryDayService) {}

  async findById(id: string) {
    return this.itineraryDayService.findById(id);
  }

  async findAllByItineraryId(itineraryId: string) {
    return this.itineraryDayService.findAllByItineraryId(itineraryId);
  }

  async create(itineraryId: string, dto: CreateItineraryDayDto) {
    return this.itineraryDayService.create(itineraryId, dto);
  }

  async update(id: string, dto: UpdateItineraryDayDto) {
    return this.itineraryDayService.update(id, dto);
  }

  async delete(id: string) {
    return this.itineraryDayService.delete(id);
  }
}
