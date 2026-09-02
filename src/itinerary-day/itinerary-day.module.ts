import { Module } from '@nestjs/common';
import { ItineraryDayController } from './itinerary-day.controller';
import { ItineraryDayRepository } from './itinerary-day.repository';
import { ItineraryDayService } from './itinerary-day.service';
import { ItineraryModule } from '../itinerary/itinerary.module';

@Module({
  imports: [ItineraryModule],
  controllers: [ItineraryDayController],
  providers: [ItineraryDayService, ItineraryDayRepository],
  exports: [ItineraryDayService],
})
export class ItineraryDayModule {}
