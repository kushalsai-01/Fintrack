import crypto from 'crypto';
import { User, IUser, Category, DEFAULT_CATEGORIES } from '../models/index.js';
import {
  generateTokenPair,
  verifyRefreshToken,
  TokenPayload,
  TokenPair,
} from '../utils/jwt.js';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../utils/errors.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../utils/email.js';
import { logger } from '../utils/logger.js';
import { cacheSet, cacheDel } from '../config/redis.js';

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  user: IUser;
  tokens: TokenPair;
}

export class AuthService {
  // Register new user
  async register(input: RegisterInput): Promise<AuthResponse> {
    const { email, password, firstName, lastName } = input;

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Create user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      provider: 'local',
    });

    await user.save();

    // Create default categories for the user
    await this.createDefaultCategories(user._id.toString());

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, firstName).catch((err) =>
      logger.error('Failed to send welcome email:', err)
    );

    logger.info(`User registered: ${email}`);

    return { user, tokens };
  }

  // Login user
  async login(input: LoginInput): Promise<AuthResponse> {
    const { email, password } = input;

    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user has password (not OAuth user)
    if (!user.password) {
      throw new BadRequestError(
        'This account uses social login. Please sign in with Google or GitHub.'
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Update user
    user.refreshToken = tokens.refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    logger.info(`User logged in: ${email}`);

    return { user, tokens };
  }

  // OAuth login/register
  async oauthLogin(
    provider: 'google' | 'github',
    profile: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    }
  ): Promise<AuthResponse> {
    let user = await User.findOne({
      provider,
      providerId: profile.id,
    });

    if (!user) {
      // Check if email exists with different provider
      const existingUser = await User.findByEmail(profile.email);
      if (existingUser) {
        throw new ConflictError(
          `Email already registered with ${existingUser.provider}. Please use that method to sign in.`
        );
      }

      // Create new user
      user = new User({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatar: profile.avatar,
        provider,
        providerId: profile.id,
        isEmailVerified: true,
      });

      await user.save();
      await this.createDefaultCategories(user._id.toString());

      sendWelcomeEmail(profile.email, profile.firstName).catch((err) =>
        logger.error('Failed to send welcome email:', err)
      );
    }

    const tokens = this.generateTokens(user);

    user.refreshToken = tokens.refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    logger.info(`OAuth login: ${profile.email} via ${provider}`);

    return { user, tokens };
  }

  // Refresh tokens
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = verifyRefreshToken(refreshToken);

      const user = await User.findById(payload.userId).select('+refreshToken');
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      const tokens = this.generateTokens(user);

      user.refreshToken = tokens.refreshToken;
      await user.save();

      return tokens;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  // Logout
  async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    await cacheDel(`user:${userId}`);
    logger.info(`User logged out: ${userId}`);
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    if (user.provider !== 'local') {
      throw new BadRequestError(
        `This account uses ${user.provider} login. Password reset is not available.`
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await sendPasswordResetEmail(email, resetToken);
    logger.info(`Password reset requested: ${email}`);
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined;
    await user.save();

    logger.info(`Password reset completed: ${user.email}`);
  }

  // Get current user
  async getCurrentUser(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  // Helper methods
  private generateTokens(user: IUser): TokenPair {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    return generateTokenPair(payload);
  }

  private async createDefaultCategories(userId: string): Promise<void> {
    const categories = DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      userId,
      isDefault: true,
    }));

    await Category.insertMany(categories);
  }
}

export const authService = new AuthService();
