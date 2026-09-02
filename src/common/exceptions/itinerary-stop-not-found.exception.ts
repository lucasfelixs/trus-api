import { NotFoundException } from '@nestjs/common';

export class ItineraryStopNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Itinerary stop ${id} not found`);
    this.name = 'ItineraryStopNotFoundException';
  }
}
