import { PartialType } from '@nestjs/swagger';
import { CreateItineraryStopDto } from './create-itinerary-stop.dto';

export class UpdateItineraryStopDto extends PartialType(
  CreateItineraryStopDto,
  { skipNullProperties: false },
) {}
