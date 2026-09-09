import { ForbiddenException } from '@nestjs/common';

export class CannotReviewOwnItineraryException extends ForbiddenException {
  constructor(itineraryId: string) {
    super(`Itinerary ${itineraryId} cannot be reviewed by its own owner`);
    this.name = 'CannotReviewOwnItineraryException';
  }
}
