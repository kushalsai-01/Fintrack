import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  // Derived API field (not stored). Populated/populates categoryId -> category name.
  category?: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  description: string;
  date: Date;
  deletedAt?: Date | null;
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
  // Transfer-specific fields
  transferId?: string;
  transferDirection?: 'out' | 'in' | null;
  linkedAccountId?: mongoose.Types.ObjectId;
  // ML categorization tracking
  categoryConfirmed: boolean;
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
      enum: ['income', 'expense', 'transfer'],
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
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    // Transfer fields
    transferId: { type: String, default: null, index: true },
    transferDirection: { type: String, enum: ['out', 'in', null], default: null },
    linkedAccountId: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    // ML categorization confidence tracking
    categoryConfirmed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();

        // Frontend expects `category` (string) but the backend stores/populates `categoryId` (object).
        // When populated, `categoryId.name` exists.
        if (ret.categoryId && typeof ret.categoryId === 'object') {
          const name = (ret.categoryId as unknown as { name?: string }).name;
          if (typeof name === 'string' && name.length > 0) {
            ret.category = name;
          }
        }

        delete ret.__v;

        // Avoid leaking internal populated object shape to clients.
        delete ret.categoryId;
        delete ret.deletedAt;

        // Convert linkedAccountId ObjectId to string for clients.
        if (ret.linkedAccountId) {
          (ret as Record<string, unknown>).linkedAccountId = ret.linkedAccountId.toString();
        }

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
