import { Module } from '@nestjs/common';
import { SavedItineraryController } from './saved-itinerary.controller';
import { SavedItineraryRepository } from './saved-itinerary.repository';
import { SavedItineraryService } from './saved-itinerary.service';
import { ItineraryModule } from '../itinerary/itinerary.module';

@Module({
  imports: [ItineraryModule],
  controllers: [SavedItineraryController],
  providers: [SavedItineraryService, SavedItineraryRepository],
  exports: [],
})
export class SavedItineraryModule {}
