import mongoose, { Document, Schema } from 'mongoose';

export interface IInvestment extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  symbol?: string;
  type: 'stock' | 'etf' | 'mutual_fund' | 'bond' | 'crypto' | 'real_estate' | 'other';
  quantity: number;
  shares: number;
  purchasePrice: number;
  currentPrice: number;
  currency: string;
  purchaseDate: Date;
  platform?: string;
  notes?: string;
  isActive: boolean;
  priceHistory: {
    price: number;
    date: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
}

const investmentSchema = new Schema<IInvestment>(
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
    symbol: {
      type: String,
      uppercase: true,
      maxlength: 10,
    },
    type: {
      type: String,
      enum: ['stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'real_estate', 'other'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    shares: {
      type: Number,
      default: 0,
      min: 0,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currentPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      maxlength: 3,
    },
    purchaseDate: {
      type: Date,
      required: true,
    },
    platform: {
      type: String,
      maxlength: 50,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priceHistory: [{
      price: { type: Number, required: true },
      date: { type: Date, default: Date.now },
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
investmentSchema.virtual('totalValue').get(function () {
  return this.quantity * this.currentPrice;
});

investmentSchema.virtual('totalCost').get(function () {
  return this.quantity * this.purchasePrice;
});

investmentSchema.virtual('gainLoss').get(function () {
  return this.totalValue - this.totalCost;
});

investmentSchema.virtual('gainLossPercent').get(function () {
  if (this.totalCost === 0) return 0;
  return ((this.totalValue - this.totalCost) / this.totalCost) * 100;
});

// Indexes
investmentSchema.index({ userId: 1, type: 1 });
investmentSchema.index({ userId: 1, isActive: 1 });

export const Investment = mongoose.model<IInvestment>('Investment', investmentSchema);
