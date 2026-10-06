import { Controller, Get, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get the current authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current authenticated user',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('me')
  getCurrentUser(@CurrentUser() user: User): UserResponseDto {
    return this.usersService.getCurrentUser(user);
  }
}
