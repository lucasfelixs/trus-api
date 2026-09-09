import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewRepository } from './review.repository';
import { ReviewService } from './review.service';
import { ItineraryModule } from '../itinerary/itinerary.module';

@Module({
  imports: [ItineraryModule],
  controllers: [ReviewController],
  providers: [ReviewService, ReviewRepository],
  exports: [],
})
export class ReviewModule {}
