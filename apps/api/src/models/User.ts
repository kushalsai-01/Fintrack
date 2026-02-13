import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserPreferences {
  email: boolean;
  push: boolean;
  billReminders: boolean;
  goalUpdates: boolean;
  weeklyReport: boolean;
  anomalyAlerts: boolean;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'user' | 'admin';
  currency: string;
  language: string;
  locale: string;
  timezone: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  provider?: 'local' | 'google' | 'github';
  providerId?: string;
  refreshToken?: string;
  notificationPreferences: IUserPreferences;
  preferences: IUserPreferences;
  onboardingCompleted: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
}

interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 8,
      select: false,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    currency: {
      type: String,
      default: 'USD',
      maxlength: 3,
    },
    language: {
      type: String,
      default: 'en',
      maxlength: 5,
    },
    locale: {
      type: String,
      default: 'en-US',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    provider: {
      type: String,
      enum: ['local', 'google', 'github'],
      default: 'local',
    },
    providerId: String,
    refreshToken: {
      type: String,
      select: false,
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      billReminders: { type: Boolean, default: true },
      goalUpdates: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: true },
      anomalyAlerts: { type: Boolean, default: true },
    },
    preferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      billReminders: { type: Boolean, default: true },
      goalUpdates: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: true },
      anomalyAlerts: { type: Boolean, default: true },
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.methods.getFullName = function (): string {
  return `${this.firstName} ${this.lastName}`;
};

// Static method to find by email
userSchema.statics.findByEmail = function (email: string): Promise<IUser | null> {
  return this.findOne({ email: email.toLowerCase() });
};

// Indexes
userSchema.index({ provider: 1, providerId: 1 });
userSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
