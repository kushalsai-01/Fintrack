import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  budgetLimit?: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
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
      maxlength: 50,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    icon: {
      type: String,
      required: true,
      default: 'folder',
    },
    color: {
      type: String,
      required: true,
      default: '#3b82f6',
    },
    budgetLimit: {
      type: Number,
      min: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
categorySchema.index({ userId: 1, type: 1 });
categorySchema.index({ userId: 1, name: 1 }, { unique: true });

export const Category = mongoose.model<ICategory>('Category', categorySchema);

// Default categories to create for new users
export const DEFAULT_CATEGORIES = [
  // Income
  { name: 'Salary', type: 'income', icon: 'briefcase', color: '#10b981' },
  { name: 'Freelance', type: 'income', icon: 'laptop', color: '#3b82f6' },
  { name: 'Investments', type: 'income', icon: 'trending-up', color: '#8b5cf6' },
  { name: 'Other Income', type: 'income', icon: 'plus-circle', color: '#6366f1' },
  
  // Expenses
  { name: 'Housing', type: 'expense', icon: 'home', color: '#f59e0b' },
  { name: 'Transportation', type: 'expense', icon: 'car', color: '#ef4444' },
  { name: 'Food & Dining', type: 'expense', icon: 'utensils', color: '#ec4899' },
  { name: 'Shopping', type: 'expense', icon: 'shopping-cart', color: '#06b6d4' },
  { name: 'Entertainment', type: 'expense', icon: 'film', color: '#f97316' },
  { name: 'Healthcare', type: 'expense', icon: 'heart', color: '#14b8a6' },
  { name: 'Education', type: 'expense', icon: 'graduation-cap', color: '#8b5cf6' },
  { name: 'Utilities', type: 'expense', icon: 'zap', color: '#eab308' },
  { name: 'Insurance', type: 'expense', icon: 'shield', color: '#64748b' },
  { name: 'Personal Care', type: 'expense', icon: 'user', color: '#a855f7' },
  { name: 'Travel', type: 'expense', icon: 'plane', color: '#0ea5e9' },
  { name: 'Other Expenses', type: 'expense', icon: 'more-horizontal', color: '#78716c' },
] as const;
