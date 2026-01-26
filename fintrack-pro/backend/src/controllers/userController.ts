import { Request, Response } from 'express';
import { userService } from '../services/index.js';
import { asyncHandler } from '../middleware/index.js';

/**
 * @route GET /api/users/profile
 * @desc Get user profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getById(req.user!._id);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        currency: user.currency,
        locale: user.locale,
        timezone: user.timezone,
        preferences: user.preferences,
        provider: user.provider,
        createdAt: user.createdAt,
      },
    },
  });
});

/**
 * @route PUT /api/users/profile
 * @desc Update user profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateProfile({
    userId: req.user!._id,
    ...req.body,
  });

  res.json({
    success: true,
    data: { user },
    message: 'Profile updated successfully',
  });
});

/**
 * @route PUT /api/users/preferences
 * @desc Update user preferences
 */
export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updatePreferences({
    userId: req.user!._id,
    preferences: req.body,
  });

  res.json({
    success: true,
    data: { preferences: user.preferences },
    message: 'Preferences updated successfully',
  });
});

/**
 * @route PUT /api/users/password
 * @desc Change password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  await userService.changePassword({
    userId: req.user!._id,
    currentPassword,
    newPassword,
  });

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * @route PUT /api/users/avatar
 * @desc Update avatar
 */
export const updateAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: { message: 'No file uploaded' },
    });
    return;
  }

  // In production, you would upload to cloud storage (S3, Cloudinary, etc.)
  const avatarUrl = `/uploads/${req.file.filename}`;

  const user = await userService.updateAvatar(req.user!._id, avatarUrl);

  res.json({
    success: true,
    data: { avatar: user.avatar },
    message: 'Avatar updated successfully',
  });
});

/**
 * @route GET /api/users/stats
 * @desc Get user stats
 */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await userService.getStats(req.user!._id);

  res.json({
    success: true,
    data: { stats },
  });
});

/**
 * @route GET /api/users/export
 * @desc Export user data
 */
export const exportData = asyncHandler(async (req: Request, res: Response) => {
  const data = await userService.exportData(req.user!._id);

  res.json({
    success: true,
    data,
  });
});

/**
 * @route DELETE /api/users/account
 * @desc Delete user account
 */
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body;

  await userService.deleteAccount(req.user!._id, password);

  res.json({
    success: true,
    message: 'Account deleted successfully',
  });
});
