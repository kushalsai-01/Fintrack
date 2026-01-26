import mongoose, { Document, Schema } from 'mongoose';

export interface IRecurringTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  nextOccurrence: Date;
  lastProcessed?: Date;
  lastCreated?: Date;
  isActive: boolean;
  autoCreate: boolean;
  merchant?: string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const recurringTransactionSchema = new Schema<IRecurringTransaction>(
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
      required: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      maxlength: 3,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: Date,
    nextOccurrence: {
      type: Date,
      required: true,
      index: true,
    },
    lastProcessed: Date,
    lastCreated: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    autoCreate: {
      type: Boolean,
      default: true,
    },
    merchant: {
      type: String,
      maxlength: 100,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    tags: [{
      type: String,
      maxlength: 30,
    }],
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
recurringTransactionSchema.index({ userId: 1, isActive: 1 });
recurringTransactionSchema.index({ nextOccurrence: 1, isActive: 1 });

export const RecurringTransaction = mongoose.model<IRecurringTransaction>(
  'RecurringTransaction',
  recurringTransactionSchema
);
