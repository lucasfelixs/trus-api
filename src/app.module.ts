import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { validate } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { TripsModule } from './trips/trips.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    PrismaModule,
    UsersModule,
    AuthModule,
    TripsModule,
  ],
})
export class AppModule {}
