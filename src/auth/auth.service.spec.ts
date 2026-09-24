import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt');

const CONFIG: Record<string, string | number> = {
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_ACCESS_EXPIRES_IN_SECONDS: 900,
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_REFRESH_EXPIRES_IN_SECONDS: 604800,
};

const futureDate = new Date(Date.now() + 60_000);
const pastDate = new Date(Date.now() - 60_000);

function buildRes(): jest.Mocked<Response> {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as jest.Mocked<Response>;
}

interface MockPrisma {
  refreshToken: {
    create: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let prisma: MockPrisma;

  const buildModule = async (nodeEnv?: string): Promise<void> => {
    prisma = {
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => CONFIG[key]),
            get: jest.fn((key: string) =>
              key === 'NODE_ENV' ? nodeEnv : undefined,
            ),
          },
        },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AuthService);
    jwtService = module.get(JwtService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await buildModule();
  });

  describe('issueTokens', () => {
    it('signs access and refresh tokens with their own secret/expiration and persists the refresh token hash', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('refresh-token')
        .mockResolvedValueOnce('access-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');

      const result = await service.issueTokens('user-1');

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      /* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ sub: 'user-1', jti: expect.any(String) }),
        { secret: 'refresh-secret', expiresIn: 604800 },
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ sub: 'user-1', jti: expect.any(String) }),
        { secret: 'access-secret', expiresIn: 900 },
      );
      /* eslint-enable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */

      expect(bcrypt.hash).toHaveBeenCalledWith('refresh-token', 10);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const createArgs = prisma.refreshToken.create.mock.calls[0][0] as {
        data: { userId: string; tokenHash: string; expiresAt: Date };
      };
      expect(createArgs.data.userId).toBe('user-1');
      expect(createArgs.data.tokenHash).toBe('hashed-refresh-token');
      expect(createArgs.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('uses different jti values for the access and refresh tokens', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('refresh-token')
        .mockResolvedValueOnce('access-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');

      await service.issueTokens('user-1');

      const refreshPayload = jwtService.signAsync.mock.calls[0]![0] as {
        jti: string;
      };
      const accessPayload = jwtService.signAsync.mock.calls[1]![0] as {
        jti: string;
      };
      expect(refreshPayload.jti).not.toBe(accessPayload.jti);
    });
  });

  describe('refreshTokens', () => {
    it('throws when no stored token matches the jti', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshTokens('user-1', 'jti-1', 'raw-token'),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });

    it('throws when the stored token belongs to a different user', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        jti: 'jti-1',
        userId: 'someone-else',
        tokenHash: 'hash',
        expiresAt: futureDate,
      });

      await expect(
        service.refreshTokens('user-1', 'jti-1', 'raw-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the stored token is expired', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        jti: 'jti-1',
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: pastDate,
      });

      await expect(
        service.refreshTokens('user-1', 'jti-1', 'raw-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('revokes every refresh token for the user and throws when the raw token does not match the stored hash (reuse/theft detection)', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        jti: 'jti-1',
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: futureDate,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refreshTokens('user-1', 'jti-1', 'stolen-token'),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prisma.refreshToken.delete).not.toHaveBeenCalled();
    });

    it('rotates the token: deletes the old one and issues a new pair when the raw token matches', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        jti: 'jti-1',
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: futureDate,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const issueSpy = jest.spyOn(service, 'issueTokens').mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const result = await service.refreshTokens(
        'user-1',
        'jti-1',
        'valid-token',
      );

      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { jti: 'jti-1' },
      });
      expect(issueSpy).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
    });
  });

  describe('revokeToken', () => {
    it('deletes every stored refresh token matching the jti', async () => {
      await service.revokeToken('jti-1');

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { jti: 'jti-1' },
      });
    });
  });

  describe('setTokenCookies', () => {
    const tokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    };

    it('sets both cookies as httpOnly, sameSite lax, and not secure outside production', async () => {
      await buildModule(undefined);
      const res = buildRes();

      service.setTokenCookies(res, tokens);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.cookie).toHaveBeenCalledWith('access_token', 'access-token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 900 * 1000,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 604800 * 1000,
          path: '/auth',
        },
      );
    });

    it('marks both cookies as secure in production', async () => {
      await buildModule('production');
      const res = buildRes();

      service.setTokenCookies(res, tokens);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-token',
        expect.objectContaining({ secure: true }),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.objectContaining({ secure: true }),
      );
    });
  });

  describe('clearTokenCookies', () => {
    it('clears both cookies, scoping the refresh cookie to /auth', () => {
      const res = buildRes();

      service.clearTokenCookies(res);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.clearCookie).toHaveBeenCalledWith('access_token');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', {
        path: '/auth',
      });
    });
  });
});
