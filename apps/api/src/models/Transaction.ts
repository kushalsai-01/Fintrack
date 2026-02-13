import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  description: string;
  date: Date;
  merchant?: string;
  notes?: string;
  tags: string[];
  isRecurring: boolean;
  recurringId?: mongoose.Types.ObjectId;
  receiptUrl?: string;
  location?: {
    name: string;
    latitude?: number;
    longitude?: number;
  };
  bankAccountId?: mongoose.Types.ObjectId;
  bankTransactionId?: string;
  isAnomaly: boolean;
  anomalyScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
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
      index: true,
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
    date: {
      type: Date,
      required: true,
      index: true,
    },
    merchant: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 30,
    }],
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringId: {
      type: Schema.Types.ObjectId,
      ref: 'RecurringTransaction',
    },
    receiptUrl: String,
    location: {
      name: String,
      latitude: Number,
      longitude: Number,
    },
    bankAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    bankTransactionId: String,
    isAnomaly: {
      type: Boolean,
      default: false,
    },
    anomalyScore: {
      type: Number,
      min: 0,
      max: 1,
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

// Indexes for efficient queries
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, categoryId: 1, date: -1 });
transactionSchema.index({ userId: 1, isRecurring: 1 });
transactionSchema.index({ userId: 1, tags: 1 });
transactionSchema.index({ description: 'text', merchant: 'text', notes: 'text' });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
