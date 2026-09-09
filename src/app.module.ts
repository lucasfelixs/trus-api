import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { validate } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { TripsModule } from './trips/trips.module';
import { ItineraryModule } from './itinerary/itinerary.module';
import { ItineraryDayModule } from './itinerary-day/itinerary-day.module';
import { ItineraryStopModule } from './itinerary-stop/itinerary-stop.module';
import { SavedItineraryModule } from './saved-itinerary/saved-itinerary.module';
import { ReviewModule } from './review/review.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    PrismaModule,
    UsersModule,
    AuthModule,
    TripsModule,
    ItineraryModule,
    ItineraryDayModule,
    ItineraryStopModule,
    SavedItineraryModule,
    ReviewModule,
  ],
})
export class AppModule {}
