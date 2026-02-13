import mongoose, { Document, Schema } from 'mongoose';

export interface IDebt extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  type: 'credit_card' | 'student_loan' | 'mortgage' | 'car_loan' | 'personal_loan' | 'medical' | 'other';
  originalAmount: number;
  originalBalance: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  currency: string;
  dueDate: Date;
  lender?: string;
  accountNumber?: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'paid_off';
  isActive: boolean;
  paidOffDate?: Date;
  payments: {
    amount: number;
    date: Date;
    note?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  amountPaid: number;
  percentPaid: number;
  remaining: number;
}

const debtSchema = new Schema<IDebt>(
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
    type: {
      type: String,
      enum: ['credit_card', 'student_loan', 'mortgage', 'car_loan', 'personal_loan', 'medical', 'other'],
      required: true,
    },
    originalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    originalBalance: {
      type: Number,
      default: 0,
    },
    currentBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    interestRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    minimumPayment: {
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
    },
    lender: {
      type: String,
      maxlength: 100,
    },
    accountNumber: String,
    notes: {
      type: String,
      maxlength: 500,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['active', 'paid_off'],
      default: 'active',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    paidOffDate: Date,
    payments: [{
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      note: String,
    }],
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
debtSchema.virtual('amountPaid').get(function () {
  return this.originalAmount - this.currentBalance;
});

debtSchema.virtual('percentPaid').get(function () {
  if (this.originalAmount === 0) return 100;
  return Math.round(((this.originalAmount - this.currentBalance) / this.originalAmount) * 100);
});

debtSchema.virtual('remaining').get(function () {
  return this.currentBalance;
});

// Pre-save hook to check if paid off
debtSchema.pre('save', function (next) {
  if (this.currentBalance <= 0 && this.status !== 'paid_off') {
    this.status = 'paid_off';
    this.paidOffDate = new Date();
    this.currentBalance = 0;
  }
  next();
});

// Indexes
debtSchema.index({ userId: 1, status: 1 });
debtSchema.index({ userId: 1, type: 1 });
debtSchema.index({ userId: 1, interestRate: -1 });

export const Debt = mongoose.model<IDebt>('Debt', debtSchema);
