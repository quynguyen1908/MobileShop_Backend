import { Injectable } from '@nestjs/common';
import { UserPrismaService } from '../prisma';
import * as crypto from 'crypto';

@Injectable()
export class TokenWhitelistRepository {
  constructor(private readonly prisma: UserPrismaService) {}

  async addToWhitelist(userId: number, tokenId: string, refreshToken: string, expiresAt: Date): Promise<void> {
    const hashedToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        token: hashedToken,
        userId: userId,
        expiresAt: expiresAt,
      },
    });
  }

  async isWhitelisted(userId: number, tokenId: string): Promise<boolean> {
    const token = await this.prisma.refreshToken.findFirst({
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
    await this.prisma.refreshToken.deleteMany({
      where: {
        id: tokenId,
        userId: userId,
      },
    });
  }

  async removeAllUserTokens(userId: number): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId: userId,
      },
    });
  }
}