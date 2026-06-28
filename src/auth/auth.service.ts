import { Response } from 'express';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly accessExpiresIn: number;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: number;
  private readonly isProduction: boolean;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.accessSecret = this.configService.getOrThrow('JWT_ACCESS_SECRET');
    this.accessExpiresIn = this.configService.getOrThrow(
      'JWT_ACCESS_EXPIRES_IN_SECONDS',
    );
    this.refreshSecret = this.configService.getOrThrow('JWT_REFRESH_SECRET');
    this.refreshExpiresIn = this.configService.getOrThrow(
      'JWT_REFRESH_EXPIRES_IN_SECONDS',
    );
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
  }

  async issueTokens(userId: string): Promise<TokenPair> {
    const refreshJti = crypto.randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, jti: refreshJti },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn,
      },
    );

    const [accessToken, tokenHash] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, jti: crypto.randomUUID() },
        {
          secret: this.accessSecret,
          expiresIn: this.accessExpiresIn,
        },
      ),
      bcrypt.hash(refreshToken, 10),
    ]);

    const expiresAt = new Date(Date.now() + this.refreshExpiresIn * 1000);

    await this.prisma.refreshToken.create({
      data: {
        jti: refreshJti,
        tokenHash,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  async refreshTokens(
    userId: string,
    jti: string,
    rawToken: string,
  ): Promise<TokenPair> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { jti },
    });

    if (!stored || stored.userId !== userId || stored.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }

    const isValid = await bcrypt.compare(rawToken, stored.tokenHash);

    if (!isValid) {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });

      throw new UnauthorizedException();
    }

    await this.prisma.refreshToken.delete({ where: { jti } });

    return this.issueTokens(userId);
  }

  async revokeToken(jti: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { jti } });
  }

  setTokenCookies(res: Response, tokens: TokenPair): void {
    const base = {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax' as const,
    };

    res.cookie('access_token', tokens.accessToken, {
      ...base,
      maxAge: this.accessExpiresIn * 1000,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      ...base,
      maxAge: this.refreshExpiresIn * 1000,
      path: '/auth',
    });
  }

  clearTokenCookies(res: Response): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/auth' });
  }
}
