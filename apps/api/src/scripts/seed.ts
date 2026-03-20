/**
 * FinTrack Demo Seed Script
 * Generates 12 months of realistic INR transaction data for demo@fintrack.pro
 * Run: npm run seed
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/database.js';
import {
  User,
  Category,
  Transaction,
  Budget,
  Goal,
  Bill,
  DEFAULT_CATEGORIES,
} from '../models/index.js';
import { logger } from '../utils/logger.js';

const DEMO_USER = {
  email: 'demo@fintrack.pro',
  password: 'Demo@123',
  firstName: 'Alex',
  lastName: 'Kumar',
};

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function seedDatabase(): Promise<void> {
  try {
    await connectDatabase();
    logger.info('🌱 Starting FinTrack demo seed...');

    // ── Clear existing demo user data ─────────────────────────────────────
    const existing = await User.findOne({ email: DEMO_USER.email });
    if (existing) {
      logger.info('Clearing existing demo data...');
      await Transaction.deleteMany({ userId: existing._id });
      await Budget.deleteMany({ userId: existing._id });
      await Goal.deleteMany({ userId: existing._id });
      await Bill.deleteMany({ userId: existing._id });
      await Category.deleteMany({ userId: existing._id });
      await User.deleteOne({ _id: existing._id });
    }

    // ── Create demo user ──────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(DEMO_USER.password, 12);
    const user = await User.create({
      email: DEMO_USER.email,
      password: passwordHash,
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
      isEmailVerified: true,
      provider: 'local',
      preferences: {
        currency: 'INR',
        language: 'en',
        notifications: { email: true, push: true, budgetAlerts: true, goalMilestones: true },
      },
    });
    logger.info(`✅ Created user: ${user.email}`);

    // ── Create categories ─────────────────────────────────────────────────
    const catDocs = await Category.insertMany(
      DEFAULT_CATEGORIES.map((c) => ({
        ...c,
        userId: user._id,
        isDefault: true,
        isActive: true,
      }))
    );

    const catMap: Record<string, mongoose.Types.ObjectId> = {};
    for (const c of catDocs) {
      catMap[c.name] = c._id as mongoose.Types.ObjectId;
    }

    const getCat = (name: string): mongoose.Types.ObjectId =>
      catMap[name] ?? catMap['Other'] ?? Object.values(catMap)[0];

    logger.info(`✅ Created ${catDocs.length} categories`);

    // ── Generate 12 months of transactions ───────────────────────────────
    const now = new Date();
    const transactions: object[] = [];

    for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
      const baseDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Salary (slight variation month to month)
      transactions.push({
        userId: user._id,
        type: 'income',
        amount: Math.round(rand(72000, 78000)),
        description: 'Salary — TechCorp India Pvt Ltd',
        categoryId: getCat('Salary'),
        date: new Date(year, month, 1),
        categoryConfirmed: true,
        currency: 'INR',
      });

      // Occasional freelance income (70% chance)
      if (Math.random() > 0.3) {
        transactions.push({
          userId: user._id,
          type: 'income',
          amount: Math.round(rand(5000, 20000)),
          description: pick(['Freelance Project — UI Design', 'Consulting Fee', 'Side Project Payment', 'Upwork Earnings']),
          categoryId: getCat('Freelance'),
          date: new Date(year, month, randInt(10, 20)),
          categoryConfirmed: true,
          currency: 'INR',
        });
      }

      // ── Fixed monthly expenses ──────────────────────────────────────────

      // Rent (5th)
      transactions.push({
        userId: user._id,
        type: 'expense',
        amount: 18000,
        description: 'Monthly Rent — Koramangala Apartment',
        categoryId: getCat('Housing'),
        date: new Date(year, month, 5),
        categoryConfirmed: true,
        currency: 'INR',
      });

      // Electricity (10th)
      transactions.push({
        userId: user._id,
        type: 'expense',
        amount: Math.round(rand(700, 1100)),
        description: 'BESCOM Electricity Bill',
        categoryId: getCat('Utilities'),
        date: new Date(year, month, 10),
        categoryConfirmed: true,
        currency: 'INR',
      });

      // Internet (12th)
      transactions.push({
        userId: user._id,
        type: 'expense',
        amount: 1099,
        description: 'ACT Fibernet — 300 Mbps',
        categoryId: getCat('Utilities'),
        date: new Date(year, month, 12),
        categoryConfirmed: true,
        currency: 'INR',
      });

      // Mobile recharge (15th)
      transactions.push({
        userId: user._id,
        type: 'expense',
        amount: 599,
        description: 'Jio Postpaid Bill',
        categoryId: getCat('Utilities'),
        date: new Date(year, month, 15),
        categoryConfirmed: true,
        currency: 'INR',
      });

      // Subscriptions (15th)
      const subs = [
        { name: 'Netflix Premium', amount: 649 },
        { name: 'Spotify Premium', amount: 119 },
        { name: 'Amazon Prime', amount: 179 },
        { name: 'YouTube Premium', amount: 129 },
      ];
      for (const sub of subs) {
        transactions.push({
          userId: user._id,
          type: 'expense',
          amount: sub.amount,
          description: sub.name,
          categoryId: getCat('Subscriptions'),
          date: new Date(year, month, 15),
          categoryConfirmed: true,
          currency: 'INR',
        });
      }

      // ── Groceries (weekly) ───────────────────────────────────────────────
      for (let week = 0; week < 4; week++) {
        const day = Math.min(week * 7 + randInt(1, 3), daysInMonth);
        transactions.push({
          userId: user._id,
          type: 'expense',
          amount: Math.round(rand(1400, 2400)),
          description: pick(['BigBasket Order', 'DMart Groceries', 'Reliance Fresh', 'Local Vegetable Market', 'Swiggy Instamart']),
          categoryId: getCat('Food & Dining'),
          date: new Date(year, month, day),
          categoryConfirmed: true,
          currency: 'INR',
          merchant: pick(['BigBasket', 'DMart', 'Reliance Fresh', 'Swiggy']),
        });
      }

      // ── Dining out (3-6 times per month) ────────────────────────────────
      const diningCount = randInt(3, 6);
      for (let d = 0; d < diningCount; d++) {
        transactions.push({
          userId: user._id,
          type: 'expense',
          amount: Math.round(rand(250, 1200)),
          description: pick(['Zomato Order', 'Swiggy Delivery', "McDonald's", 'Dominos Pizza', 'Cafe Coffee Day', 'Truffles', 'Social Restaurant', 'Biryani Blues']),
          categoryId: getCat('Food & Dining'),
          date: new Date(year, month, randInt(1, daysInMonth)),
          categoryConfirmed: true,
          currency: 'INR',
        });
      }

      // ── Transport (10-18 per month) ──────────────────────────────────────
      const transportCount = randInt(10, 18);
      for (let t = 0; t < transportCount; t++) {
        transactions.push({
          userId: user._id,
          type: 'expense',
          amount: Math.round(rand(60, 400)),
          description: pick(['Uber Ride', 'Ola Cab', 'Namma Metro Card Recharge', 'Rapido Bike', 'BMTC Bus Pass', 'Petrol — BPCL']),
          categoryId: getCat('Transport'),
          date: new Date(year, month, randInt(1, daysInMonth)),
          categoryConfirmed: true,
          currency: 'INR',
        });
      }

      // ── Entertainment (1-3 per month) ───────────────────────────────────
      const entCount = randInt(1, 3);
      for (let e = 0; e < entCount; e++) {
        transactions.push({
          userId: user._id,
          type: 'expense',
          amount: Math.round(rand(300, 2000)),
          description: pick(['Movie Tickets — PVR', 'BookMyShow — Concert', 'Steam Game Purchase', 'Bowling — Smaaash', 'Weekend Trip Activity']),
          categoryId: getCat('Entertainment'),
          date: new Date(year, month, randInt(1, daysInMonth)),
          categoryConfirmed: true,
          currency: 'INR',
        });
      }

      // ── Shopping (1-2 per month) ─────────────────────────────────────────
      if (Math.random() > 0.4) {
        transactions.push({
          userId: user._id,
          type: 'expense',
          amount: Math.round(rand(500, 4000)),
          description: pick(['Amazon Order', 'Myntra Shopping', 'Flipkart Purchase', 'Decathlon Sports Gear', 'Ikea Home Decor', 'Ajio Clothing']),
          categoryId: getCat('Shopping'),
          date: new Date(year, month, randInt(1, daysInMonth)),
          categoryConfirmed: true,
          currency: 'INR',
        });
      }

      // ── Quarterly large expenses ─────────────────────────────────────────
      if (monthOffset % 3 === 0) {
        const largeExpenses = [
          { desc: 'Flight Tickets — BLR to Delhi', cat: 'Transport', amount: randInt(5000, 12000) },
          { desc: 'Annual Health Checkup — Apollo Hospitals', cat: 'Healthcare', amount: randInt(3000, 6000) },
          { desc: 'Laptop Accessories & Peripherals', cat: 'Shopping', amount: randInt(2000, 5000) },
          { desc: 'Goa Trip — Hotels & Activities', cat: 'Travel', amount: randInt(8000, 20000) },
        ];
        const exp = largeExpenses[Math.floor(monthOffset / 3) % largeExpenses.length];
        transactions.push({
          userId: user._id,
          type: 'expense',
          amount: exp.amount,
          description: exp.desc,
          categoryId: getCat(exp.cat),
          date: new Date(year, month, 20),
          categoryConfirmed: true,
          currency: 'INR',
        });
      }

      // ── Savings transfer (every month) ──────────────────────────────────
      transactions.push({
        userId: user._id,
        type: 'transfer',
        amount: 10000,
        description: 'SIP — Axis Nifty 50 Mutual Fund',
        categoryId: getCat('Transfer'),
        date: new Date(year, month, 5),
        transferDirection: 'out',
        categoryConfirmed: true,
        currency: 'INR',
      });
    }

    await Transaction.insertMany(transactions);
    logger.info(`✅ Created ${transactions.length} transactions across 12 months`);

    // ── Budgets ───────────────────────────────────────────────────────────
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    await Budget.insertMany([
      { userId: user._id, name: 'Food & Dining Budget', categoryId: getCat('Food & Dining'), amount: 15000, spent: 0, period: 'monthly', startDate: currentMonthStart, endDate: currentMonthEnd, alertThreshold: 80, isActive: true },
      { userId: user._id, name: 'Transport Budget', categoryId: getCat('Transport'), amount: 5000, spent: 0, period: 'monthly', startDate: currentMonthStart, endDate: currentMonthEnd, alertThreshold: 80, isActive: true },
      { userId: user._id, name: 'Entertainment Budget', categoryId: getCat('Entertainment'), amount: 3000, spent: 0, period: 'monthly', startDate: currentMonthStart, endDate: currentMonthEnd, alertThreshold: 75, isActive: true },
      { userId: user._id, name: 'Shopping Budget', categoryId: getCat('Shopping'), amount: 8000, spent: 0, period: 'monthly', startDate: currentMonthStart, endDate: currentMonthEnd, alertThreshold: 80, isActive: true },
      { userId: user._id, name: 'Utilities Budget', categoryId: getCat('Utilities'), amount: 3000, spent: 0, period: 'monthly', startDate: currentMonthStart, endDate: currentMonthEnd, alertThreshold: 90, isActive: true },
    ]);
    logger.info('✅ Created 5 budgets');

    // ── Goals ─────────────────────────────────────────────────────────────
    await Goal.insertMany([
      {
        userId: user._id,
        name: 'Emergency Fund',
        description: '6 months of expenses as safety net',
        targetAmount: 200000,
        currentAmount: 85000,
        targetDate: new Date(now.getFullYear() + 1, 5, 1),
        status: 'active',
        priority: 'high',
        color: '#10b981',
        icon: 'shield',
      },
      {
        userId: user._id,
        name: 'Goa Vacation',
        description: 'Family trip to Goa for 5 days',
        targetAmount: 45000,
        currentAmount: 18000,
        targetDate: new Date(now.getFullYear(), now.getMonth() + 4, 1),
        status: 'active',
        priority: 'medium',
        color: '#3b82f6',
        icon: 'plane',
      },
      {
        userId: user._id,
        name: 'MacBook Pro M4',
        description: 'New laptop for work and personal projects',
        targetAmount: 175000,
        currentAmount: 52000,
        targetDate: new Date(now.getFullYear() + 1, 0, 1),
        status: 'active',
        priority: 'medium',
        color: '#8b5cf6',
        icon: 'laptop',
      },
      {
        userId: user._id,
        name: 'Home Down Payment',
        description: '20% down payment for 2BHK in Bangalore',
        targetAmount: 1200000,
        currentAmount: 180000,
        targetDate: new Date(now.getFullYear() + 3, 0, 1),
        status: 'active',
        priority: 'high',
        color: '#f59e0b',
        icon: 'home',
      },
    ]);
    logger.info('✅ Created 4 goals');

    // ── Bills ─────────────────────────────────────────────────────────────
    const nextDue = (day: number) => {
      const d = new Date(now.getFullYear(), now.getMonth(), day);
      if (d < now) d.setMonth(d.getMonth() + 1);
      return d;
    };

    await Bill.insertMany([
      { userId: user._id, name: 'Monthly Rent', amount: 18000, dueDate: nextDue(5), frequency: 'monthly', categoryId: getCat('Housing'), autopay: false, status: 'upcoming', isActive: true },
      { userId: user._id, name: 'BESCOM Electricity', amount: 900, dueDate: nextDue(10), frequency: 'monthly', categoryId: getCat('Utilities'), autopay: true, status: 'upcoming', isActive: true },
      { userId: user._id, name: 'ACT Fibernet', amount: 1099, dueDate: nextDue(12), frequency: 'monthly', categoryId: getCat('Utilities'), autopay: true, status: 'upcoming', isActive: true },
      { userId: user._id, name: 'Jio Postpaid', amount: 599, dueDate: nextDue(15), frequency: 'monthly', categoryId: getCat('Utilities'), autopay: true, status: 'upcoming', isActive: true },
      { userId: user._id, name: 'Netflix Premium', amount: 649, dueDate: nextDue(15), frequency: 'monthly', categoryId: getCat('Subscriptions'), autopay: true, status: 'upcoming', isActive: true },
      { userId: user._id, name: 'Spotify Premium', amount: 119, dueDate: nextDue(15), frequency: 'monthly', categoryId: getCat('Subscriptions'), autopay: true, status: 'upcoming', isActive: true },
    ]);
    logger.info('✅ Created 6 bills');

    logger.info(`
╔══════════════════════════════════════════════════════════╗
║                   ✅  SEED COMPLETE                     ║
║                                                          ║
║   Demo Credentials:                                      ║
║   Email:    demo@fintrack.pro                            ║
║   Password: Demo@123                                     ║
║                                                          ║
║   Seeded:                                                ║
║   • ${transactions.length} transactions (12 months INR data)        ║
║   • 5 budget rules                                       ║
║   • 4 savings goals                                      ║
║   • 6 recurring bills                                    ║
║   • ${catDocs.length} expense/income categories                 ║
╚══════════════════════════════════════════════════════════╝
    `);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
}

seedDatabase();
