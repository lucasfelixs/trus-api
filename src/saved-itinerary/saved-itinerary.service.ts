import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { SavedItineraryRepository } from './saved-itinerary.repository';
import { SavedItineraryResponseDto } from './dto/saved-itinerary-response.dto';
import { ItineraryService } from '../itinerary/itinerary.service';

@Injectable()
export class SavedItineraryService {
  constructor(
    private readonly savedItineraryRepository: SavedItineraryRepository,
    private readonly itineraryService: ItineraryService,
  ) {}

  async save(
    itineraryId: string,
    userId: string,
  ): Promise<SavedItineraryResponseDto> {
    await this.itineraryService.verifyPublished(itineraryId);

    const saved = await this.savedItineraryRepository.upsert(
      userId,
      itineraryId,
    );

    return plainToInstance(SavedItineraryResponseDto, saved, {
      excludeExtraneousValues: true,
    });
  }

  async unsave(itineraryId: string, userId: string): Promise<void> {
    await this.savedItineraryRepository.deleteIfExists(userId, itineraryId);
  }

  async findAllByUserId(userId: string): Promise<SavedItineraryResponseDto[]> {
    const saved = await this.savedItineraryRepository.findAllByUserId(userId);

    return saved.map((entry) =>
      plainToInstance(SavedItineraryResponseDto, entry, {
        excludeExtraneousValues: true,
      }),
    );
  }
}
