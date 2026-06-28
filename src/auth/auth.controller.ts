import {
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { User } from '@prisma/client';
import { RefreshTokenUser } from './strategies/jwt-refresh.strategy';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Redirect to Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to Google' })
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({
    summary: 'Google OAuth callback - issue tokens and redirects',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with auth cookie set',
  })
  async googleAuthRedirect(
    @Req() req: Request & { user: User },
    @Res() res: Response,
  ) {
    const tokens = await this.authService.issueTokens(req.user.id);

    this.authService.setTokenCookies(res, tokens);

    res.redirect(this.configService.getOrThrow('FRONTEND_URL'));
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens rotated, new cookies set' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshTokens(
    @Req() req: Request & { user: RefreshTokenUser },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const tokens = await this.authService.refreshTokens(
      req.user.userId,
      req.user.jti,
      req.user.rawToken,
    );

    this.authService.setTokenCookies(res, tokens);
  }

  @Post('logout')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Logout - revoke refresh token and clear cookies' })
  @ApiResponse({ status: 204, description: 'Logged out' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async logout(
    @Req() req: Request & { user: RefreshTokenUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.revokeToken(req.user.jti);
    this.authService.clearTokenCookies(res);
  }
}
