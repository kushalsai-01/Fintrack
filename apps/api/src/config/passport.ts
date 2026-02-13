import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import config from './index.js';
import { authService } from '../services/index.js';
import { logger } from '../utils/logger.js';

export const configurePassport = (): void => {
  // Google OAuth Strategy
  if (config.google.clientId && config.google.clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.google.clientId,
          clientSecret: config.google.clientSecret,
          callbackURL: `${config.apiUrl}/api/auth/google/callback`,
          scope: ['profile', 'email'],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email found in Google profile'));
            }

            const result = await authService.oauthLogin('google', {
              id: profile.id,
              email,
              firstName: profile.name?.givenName || '',
              lastName: profile.name?.familyName || '',
              avatar: profile.photos?.[0]?.value,
            });

            done(null, result as any);
          } catch (error) {
            logger.error('Google OAuth error:', error);
            done(error as Error);
          }
        }
      )
    );

    logger.info('Google OAuth strategy configured');
  }

  // GitHub OAuth Strategy
  if (config.github.clientId && config.github.clientSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: config.github.clientId,
          clientSecret: config.github.clientSecret,
          callbackURL: `${config.apiUrl}/api/auth/github/callback`,
          scope: ['user:email'],
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email found in GitHub profile'));
            }

            const nameParts = (profile.displayName || '').split(' ');
            const result = await authService.oauthLogin('github', {
              id: profile.id,
              email,
              firstName: nameParts[0] || profile.username || '',
              lastName: nameParts.slice(1).join(' ') || '',
              avatar: profile.photos?.[0]?.value,
            });

            done(null, result as any);
          } catch (error) {
            logger.error('GitHub OAuth error:', error);
            done(error as Error);
          }
        }
      )
    );

    logger.info('GitHub OAuth strategy configured');
  }

  // Serialize user for session (not using sessions, but required for passport)
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
};
