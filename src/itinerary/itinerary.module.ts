import { Module } from '@nestjs/common';
import { ItineraryService } from './itinerary.service';
import { ItineraryRepository } from './itinerary.repository';
import { ItineraryController } from './itinerary.controller';
import { TripsModule } from '../trips/trips.module';

@Module({
  imports: [TripsModule],
  controllers: [ItineraryController],
  providers: [ItineraryService, ItineraryRepository],
  exports: [],
})
export class ItineraryModule {}
