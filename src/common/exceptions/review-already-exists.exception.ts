import { ConflictException } from '@nestjs/common';

export class ReviewAlreadyExistsException extends ConflictException {
  constructor(itineraryId: string) {
    super(`Itinerary ${itineraryId} already has a review from this user`);
    this.name = 'ReviewAlreadyExistsException';
  }
}
