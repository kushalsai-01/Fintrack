import { Router } from 'express';
import { z } from 'zod';
import { userController } from '../controllers/index.js';
import { authenticate, validate, uploadAvatar } from '../middleware/index.js';

const router = Router();

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatar: z.string().url().optional(),
  currency: z.string().length(3).optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
});

const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  monthlyReport: z.boolean().optional(),
  budgetAlerts: z.boolean().optional(),
  goalAlerts: z.boolean().optional(),
  billReminders: z.boolean().optional(),
  anomalyAlerts: z.boolean().optional(),
  darkMode: z.boolean().optional(),
  compactView: z.boolean().optional(),
  defaultView: z.enum(['dashboard', 'transactions', 'budgets']).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// Apply authentication to all routes
router.use(authenticate);

// Routes
router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);
router.put('/preferences', validate(updatePreferencesSchema), userController.updatePreferences);
router.put('/password', validate(changePasswordSchema), userController.changePassword);
router.put('/avatar', uploadAvatar, userController.updateAvatar);
router.get('/stats', userController.getStats);
router.get('/export', userController.exportData);
router.delete('/account', validate(deleteAccountSchema), userController.deleteAccount);

export default router;
