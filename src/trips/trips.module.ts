import { Module } from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripsRepository } from './trips.repository';
import { TripsController } from './trips.controller';

@Module({
  imports: [],
  controllers: [TripsController],
  providers: [TripsService, TripsRepository],
  exports: [TripsService],
})
export class TripsModule {}
