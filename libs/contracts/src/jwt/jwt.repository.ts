import { Injectable } from '@nestjs/common';
import { UserPrismaService } from '@app/prisma';
import * as crypto from 'crypto';

interface RefreshToken {
  id: string;
  token: string;
  userId: number;
  expiresAt: Date;
}

@Injectable()
export class TokenWhitelistRepository {
  constructor(private readonly prisma: UserPrismaService) {}

  async addToWhitelist(
    userId: number,
    tokenId: string,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<void> {
    const hashedToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const prismaService = this.prisma as unknown as {
      refreshToken: {
        create: (params: { data: any }) => Promise<RefreshToken>;
      };
    };

    await prismaService.refreshToken.create({
      data: {
        id: tokenId,
        token: hashedToken,
        userId: userId,
        expiresAt: expiresAt,
      },
    });
  }

  async isWhitelisted(userId: number, tokenId: string): Promise<boolean> {
    const prismaService = this.prisma as unknown as {
      refreshToken: {
        findFirst: (params: {
          where: {
            id: string;
            userId: number;
            expiresAt: { gt: Date };
          };
        }) => Promise<RefreshToken | null>;
      };
    };
    const token = await prismaService.refreshToken.findFirst({
      where: {
        id: tokenId,
        userId: userId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return !!token;
  }

  async removeFromWhitelist(userId: number, tokenId: string): Promise<void> {
    const prismaService = this.prisma as unknown as {
      refreshToken: {
        deleteMany: (params: {
          where: { id: string; userId: number };
        }) => Promise<{ count: number }>;
      };
    };
    await prismaService.refreshToken.deleteMany({
      where: {
        id: tokenId,
        userId: userId,
      },
    });
  }

  async removeAllUserTokens(userId: number): Promise<void> {
    const prismaService = this.prisma as unknown as {
      refreshToken: {
        deleteMany: (params: {
          where: { userId: number };
        }) => Promise<{ count: number }>;
      };
    };
    await prismaService.refreshToken.deleteMany({
      where: {
        userId: userId,
      },
    });
  }
}
