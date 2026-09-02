import { Module } from '@nestjs/common';
import { ItineraryStopController } from './itinerary-stop.controller';
import { ItineraryStopRepository } from './itinerary-stop.repository';
import { ItineraryStopService } from './itinerary-stop.service';
import { ItineraryDayModule } from '../itinerary-day/itinerary-day.module';

@Module({
  imports: [ItineraryDayModule],
  controllers: [ItineraryStopController],
  providers: [ItineraryStopService, ItineraryStopRepository],
  exports: [],
})
export class ItineraryStopModule {}
