import { Request, Response } from 'express';
import { authService } from '../services/index.js';
import { asyncHandler } from '../middleware/index.js';

/**
 * @route POST /api/auth/register
 * @desc Register new user
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  const result = await authService.register({
    email,
    password,
    firstName,
    lastName,
  });

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: result.user._id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      tokens: result.tokens,
    },
    message: 'Registration successful',
  });
});

/**
 * @route POST /api/auth/login
 * @desc Login user
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await authService.login({ email, password });

  res.json({
    success: true,
    data: {
      user: {
        id: result.user._id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        avatar: result.user.avatar,
        role: result.user.role,
        preferences: result.user.preferences,
      },
      tokens: result.tokens,
    },
    message: 'Login successful',
  });
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh tokens
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  const tokens = await authService.refreshTokens(refreshToken);

  res.json({
    success: true,
    data: { tokens },
  });
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.user!._id);

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  await authService.requestPasswordReset(email);

  res.json({
    success: true,
    message: 'If an account exists, a password reset email has been sent',
  });
});

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;

  await authService.resetPassword(token, password);

  res.json({
    success: true,
    message: 'Password reset successful',
  });
});

/**
 * @route GET /api/auth/me
 * @desc Get current user
 */
export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!._id);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        currency: user.currency,
        locale: user.locale,
        timezone: user.timezone,
        preferences: user.preferences,
        createdAt: user.createdAt,
      },
    },
  });
});
