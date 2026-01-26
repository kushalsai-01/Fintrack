import { Router, Request, Response } from 'express';
import passport from 'passport';
import config from '../config/index.js';

const router = Router();

const clientUrl = config.frontendUrl;

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${clientUrl}/login?error=google_auth_failed` }),
  (req: Request, res: Response) => {
    const result = req.user as any;
    
    // Redirect to frontend with tokens
    const params = new URLSearchParams({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    });

    res.redirect(`${clientUrl}/auth/callback?${params.toString()}`);
  }
);

// GitHub OAuth
router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email'], session: false })
);

router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${clientUrl}/login?error=github_auth_failed` }),
  (req: Request, res: Response) => {
    const result = req.user as any;
    
    const params = new URLSearchParams({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    });

    res.redirect(`${clientUrl}/auth/callback?${params.toString()}`);
  }
);

export default router;
