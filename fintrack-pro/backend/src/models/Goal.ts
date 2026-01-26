import mongoose, { Document, Schema } from 'mongoose';

export interface IGoal extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate: Date;
  icon: string;
  color: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  autoContribute: boolean;
  autoContributeAmount?: number;
  autoContributeFrequency?: 'weekly' | 'biweekly' | 'monthly';
  linkedAccountId?: mongoose.Types.ObjectId;
  contributions: {
    amount: number;
    date: Date;
    note?: string;
  }[];
  milestones: {
    percentage: number;
    reachedAt?: Date;
  }[];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  progress: number;
  remaining: number;
  daysRemaining: number;
  isOnTrack: boolean;
}

const goalSchema = new Schema<IGoal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      maxlength: 3,
    },
    targetDate: {
      type: Date,
      required: true,
    },
    icon: {
      type: String,
      default: 'target',
    },
    color: {
      type: String,
      default: '#3b82f6',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'cancelled'],
      default: 'active',
    },
    autoContribute: {
      type: Boolean,
      default: false,
    },
    autoContributeAmount: Number,
    autoContributeFrequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly'],
    },
    linkedAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    contributions: [{
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      note: String,
    }],
    milestones: [{
      percentage: { type: Number, required: true },
      reachedAt: Date,
    }],
    completedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtuals
goalSchema.virtual('progress').get(function () {
  if (this.targetAmount === 0) return 100;
  return Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100));
});

goalSchema.virtual('remaining').get(function () {
  return Math.max(0, this.targetAmount - this.currentAmount);
});

goalSchema.virtual('daysRemaining').get(function () {
  const now = new Date();
  const target = new Date(this.targetDate);
  const diffTime = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

goalSchema.virtual('isOnTrack').get(function () {
  if (this.status !== 'active') return false;
  const progress = this.currentAmount / this.targetAmount;
  const now = new Date();
  const start = new Date(this.createdAt);
  const target = new Date(this.targetDate);
  const totalDays = (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const elapsedDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const expectedProgress = elapsedDays / totalDays;
  return progress >= expectedProgress * 0.9; // 10% tolerance
});

// Indexes
goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, targetDate: 1 });

export const Goal = mongoose.model<IGoal>('Goal', goalSchema);
