import mongoose, { Document, Schema } from 'mongoose';

export interface IBill extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  categoryId?: mongoose.Types.ObjectId;
  name: string;
  amount: number;
  currency: string;
  dueDate: Date;
  frequency: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  autoPay: boolean;
  paymentMethod?: string;
  reminder: boolean;
  reminderDays: number;
  status: 'upcoming' | 'overdue' | 'paid';
  lastPaidDate?: Date;
  lastPaidAmount?: number;
  notes?: string;
  website?: string;
  accountNumber?: string;
  isActive: boolean;
  paymentHistory: {
    amount: number;
    date: Date;
    paidDate?: Date;
    note?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const billSchema = new Schema<IBill>(
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
    currency: {
      type: String,
      default: 'USD',
      maxlength: 3,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    frequency: {
      type: String,
      enum: ['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
    autoPay: {
      type: Boolean,
      default: false,
    },
    paymentMethod: String,
    reminder: {
      type: Boolean,
      default: true,
    },
    reminderDays: {
      type: Number,
      default: 3,
      min: 1,
      max: 30,
    },
    status: {
      type: String,
      enum: ['upcoming', 'overdue', 'paid'],
      default: 'upcoming',
    },
    lastPaidDate: Date,
    lastPaidAmount: Number,
    notes: {
      type: String,
      maxlength: 500,
    },
    website: String,
    accountNumber: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    paymentHistory: [{
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      paidDate: Date,
      note: String,
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

// Update status based on due date
billSchema.pre('save', function (next) {
  const now = new Date();
  if (this.status !== 'paid') {
    if (this.dueDate < now) {
      this.status = 'overdue';
    } else {
      this.status = 'upcoming';
    }
  }
  next();
});

// Indexes
billSchema.index({ userId: 1, status: 1 });
billSchema.index({ userId: 1, dueDate: 1 });
billSchema.index({ userId: 1, isActive: 1 });

export const Bill = mongoose.model<IBill>('Bill', billSchema);
