import { User } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from './dto/user-response.dto';
import { UpsertUserData, UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async upsertByGoogleId(data: UpsertUserData): Promise<User> {
    return this.usersRepository.upsertByGoogleId(data);
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  getCurrentUser(user: User): UserResponseDto {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
