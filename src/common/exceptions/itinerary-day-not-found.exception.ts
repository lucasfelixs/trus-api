import { NotFoundException } from '@nestjs/common';

export class ItineraryDayNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Itinerary day ${id} not found`);
    this.name = 'ItineraryDayNotFoundException';
  }
}
