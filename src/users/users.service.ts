import { User } from '@prisma/client';
import { Injectable } from '@nestjs/common';
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
}
