import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

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
