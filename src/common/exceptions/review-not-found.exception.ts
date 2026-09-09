import { NotFoundException } from '@nestjs/common';

export class ReviewNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Review ${id} not found`);
    this.name = 'ReviewNotFoundException';
  }
}
