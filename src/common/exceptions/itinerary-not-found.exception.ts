import { NotFoundException } from '@nestjs/common';

export class ItineraryNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Itinerary ${id} not found`);
    this.name = 'ItineraryNotFoundException';
  }
}
