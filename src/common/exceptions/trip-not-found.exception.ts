import { NotFoundException } from '@nestjs/common';

export class TripNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Trip ${id} not found`);
    this.name = 'TripNotFoundException';
  }
}
