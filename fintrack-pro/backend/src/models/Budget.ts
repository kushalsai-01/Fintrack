import mongoose, { Document, Schema } from 'mongoose';

// Shared budget member interface
export interface ISharedBudgetMember {
  userId: mongoose.Types.ObjectId;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
  contributionPercent?: number;
}

export interface IBudget extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  categoryId?: mongoose.Types.ObjectId;
  name: string;
  amount: number;
  spent: number;
  currency: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  alertThreshold: number;
  alertEnabled: boolean;
  isActive: boolean;
  rollover: boolean;
  rolloverAmount: number;
  notes?: string;
  
  // Shared budget fields
  isShared: boolean;
  sharedWith: ISharedBudgetMember[];
  
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
}

// Shared member schema
const sharedMemberSchema = new Schema<ISharedBudgetMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    contributionPercent: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const budgetSchema = new Schema<IBudget>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    spent: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      maxlength: 3,
    },
    period: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    alertThreshold: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
    alertEnabled: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    rollover: {
      type: Boolean,
      default: false,
    },
    rolloverAmount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    // Shared budget fields
    isShared: {
      type: Boolean,
      default: false,
    },
    sharedWith: {
      type: [sharedMemberSchema],
      default: [],
    },
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
budgetSchema.virtual('remaining').get(function () {
  return Math.max(0, this.amount + this.rolloverAmount - this.spent);
});

budgetSchema.virtual('percentUsed').get(function () {
  const total = this.amount + this.rolloverAmount;
  if (total === 0) return 0;
  return Math.round((this.spent / total) * 100);
});

budgetSchema.virtual('isOverBudget').get(function () {
  return this.spent > this.amount + this.rolloverAmount;
});

// Indexes
budgetSchema.index({ userId: 1, isActive: 1 });
budgetSchema.index({ userId: 1, categoryId: 1 });
budgetSchema.index({ userId: 1, startDate: 1, endDate: 1 });
budgetSchema.index({ 'sharedWith.userId': 1 }); // Index for shared budget lookups
budgetSchema.index({ isShared: 1, 'sharedWith.userId': 1 });

export const Budget = mongoose.model<IBudget>('Budget', budgetSchema);
