import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { Request } from 'express';
import { Strategy as CustomStrategy } from 'passport-custom';

interface GoogleTokenRequestBody {
  idToken?: string;
}

interface GoogleTokenRequest extends Request {
  body: GoogleTokenRequestBody;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'google-client-secret',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    try {
      const user = {
        googleId: profile.id,
        email:
          Array.isArray(profile.emails) && profile.emails.length > 0
            ? profile.emails[0].value
            : '',
        firstName: profile.name?.givenName ?? '',
        lastName: profile.name?.familyName ?? '',
        provider: 'google',
      };
      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}

@Injectable()
export class GoogleTokenStrategy extends PassportStrategy(CustomStrategy, 'google-token') {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor() {
    super();
  }

  async validate(req: GoogleTokenRequest): Promise<any> {
    const idToken = req.body.idToken;

    if (!idToken) {
      throw new UnauthorizedException('Missing Google ID Token.');
    }

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_MOBILE_ID,
      });

      const payload = ticket.getPayload() as TokenPayload;

      if (!payload) {
        throw new UnauthorizedException('Invalid Google ID Token payload.');
      }

      const user = {
        googleId: payload.sub,
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name,
        provider: 'google',
      };

      return user;
    } catch (error) {
      console.error('ID Token verification failed:', error);
      throw new UnauthorizedException('Invalid Google ID Token.');
    }
  }
}
