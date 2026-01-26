/**
 * Database seed script for development and testing
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
  Investment,
  Debt,
  DEFAULT_CATEGORIES,
} from '../models/index.js';
import { logger } from '../utils/logger.js';

const seedDatabase = async (): Promise<void> => {
  try {
    await connectDatabase();
    logger.info('Seeding database...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Transaction.deleteMany({}),
      Budget.deleteMany({}),
      Goal.deleteMany({}),
      Bill.deleteMany({}),
      Investment.deleteMany({}),
      Debt.deleteMany({}),
    ]);

    logger.info('Cleared existing data');

    // Create demo user
    const hashedPassword = await bcrypt.hash('Demo@123', 12);
    const user = await User.create({
      email: 'demo@fintrack.pro',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      provider: 'local',
      isEmailVerified: true,
      currency: 'USD',
      locale: 'en-US',
      timezone: 'America/New_York',
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        weeklyReport: true,
        monthlyReport: true,
        budgetAlerts: true,
        goalAlerts: true,
        billReminders: true,
        anomalyAlerts: true,
        darkMode: false,
        compactView: false,
        defaultView: 'dashboard',
      },
    });

    logger.info(`Created demo user: ${user.email}`);

    // Create categories for the user
    const categories = await Category.insertMany(
      DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        userId: user._id,
        isDefault: true,
      }))
    );

    logger.info(`Created ${categories.length} categories`);

    // Get category IDs by name for convenience
    const getCategoryId = (name: string) =>
      categories.find((c) => c.name === name)?._id;

    // Generate transactions for the last 6 months
    const transactions: any[] = [];
    const now = new Date();

    for (let month = 5; month >= 0; month--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - month, 1);

      // Income - Salary (1st and 15th)
      transactions.push({
        userId: user._id,
        categoryId: getCategoryId('Salary'),
        type: 'income',
        amount: 5000,
        description: 'Monthly Salary',
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
        merchant: 'Acme Corp',
      });

      // Expenses
      const expenseData = [
        { category: 'Housing', amount: 1500, description: 'Rent Payment', day: 1 },
        { category: 'Utilities', amount: 150, description: 'Electric Bill', day: 5 },
        { category: 'Groceries', amount: 400 + Math.random() * 100, description: 'Weekly Groceries', day: 7 },
        { category: 'Groceries', amount: 300 + Math.random() * 100, description: 'Grocery Shopping', day: 14 },
        { category: 'Transportation', amount: 100, description: 'Gas', day: 10 },
        { category: 'Transportation', amount: 50, description: 'Parking', day: 15 },
        { category: 'Dining Out', amount: 80 + Math.random() * 40, description: 'Restaurant', day: 8 },
        { category: 'Dining Out', amount: 60 + Math.random() * 30, description: 'Lunch out', day: 18 },
        { category: 'Entertainment', amount: 50 + Math.random() * 30, description: 'Movie tickets', day: 12 },
        { category: 'Shopping', amount: 100 + Math.random() * 100, description: 'Online Shopping', day: 20 },
        { category: 'Healthcare', amount: 30, description: 'Pharmacy', day: 22 },
        { category: 'Insurance', amount: 200, description: 'Car Insurance', day: 25 },
        { category: 'Subscriptions', amount: 15, description: 'Streaming Service', day: 3 },
        { category: 'Subscriptions', amount: 10, description: 'Music Subscription', day: 3 },
      ];

      for (const expense of expenseData) {
        transactions.push({
          userId: user._id,
          categoryId: getCategoryId(expense.category),
          type: 'expense',
          amount: Math.round(expense.amount * 100) / 100,
          description: expense.description,
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), expense.day),
          merchant: expense.description.split(' ')[0],
        });
      }
    }

    await Transaction.insertMany(transactions);
    logger.info(`Created ${transactions.length} transactions`);

    // Create budgets
    const budgets = await Budget.insertMany([
      {
        userId: user._id,
        categoryId: getCategoryId('Groceries'),
        name: 'Monthly Groceries',
        amount: 600,
        spent: 450,
        period: 'monthly',
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        alertThreshold: 80,
        alertEnabled: true,
      },
      {
        userId: user._id,
        categoryId: getCategoryId('Dining Out'),
        name: 'Dining Budget',
        amount: 200,
        spent: 140,
        period: 'monthly',
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        alertThreshold: 80,
        alertEnabled: true,
      },
      {
        userId: user._id,
        categoryId: getCategoryId('Entertainment'),
        name: 'Entertainment',
        amount: 150,
        spent: 80,
        period: 'monthly',
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        alertThreshold: 90,
        alertEnabled: true,
      },
      {
        userId: user._id,
        name: 'Overall Monthly Budget',
        amount: 3500,
        spent: 2800,
        period: 'monthly',
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        alertThreshold: 85,
        alertEnabled: true,
      },
    ]);

    logger.info(`Created ${budgets.length} budgets`);

    // Create goals
    const goals = await Goal.insertMany([
      {
        userId: user._id,
        name: 'Emergency Fund',
        description: '6 months of expenses saved',
        targetAmount: 15000,
        currentAmount: 8500,
        targetDate: new Date(now.getFullYear() + 1, 5, 30),
        icon: '🛡️',
        color: '#10B981',
        priority: 'high',
        contributions: [
          { amount: 2000, date: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
          { amount: 1500, date: new Date(now.getFullYear(), now.getMonth() - 4, 1) },
          { amount: 1500, date: new Date(now.getFullYear(), now.getMonth() - 3, 1) },
          { amount: 1500, date: new Date(now.getFullYear(), now.getMonth() - 2, 1) },
          { amount: 1000, date: new Date(now.getFullYear(), now.getMonth() - 1, 1) },
          { amount: 1000, date: new Date(now.getFullYear(), now.getMonth(), 1) },
        ],
        milestones: [
          { percentage: 25, reachedAt: new Date(now.getFullYear(), now.getMonth() - 4, 15) },
          { percentage: 50, reachedAt: new Date(now.getFullYear(), now.getMonth() - 2, 10) },
          { percentage: 75 },
          { percentage: 100 },
        ],
      },
      {
        userId: user._id,
        name: 'Vacation Fund',
        description: 'Summer vacation to Europe',
        targetAmount: 5000,
        currentAmount: 2200,
        targetDate: new Date(now.getFullYear() + 1, 6, 1),
        icon: '✈️',
        color: '#3B82F6',
        priority: 'medium',
        contributions: [
          { amount: 500, date: new Date(now.getFullYear(), now.getMonth() - 3, 15) },
          { amount: 700, date: new Date(now.getFullYear(), now.getMonth() - 2, 15) },
          { amount: 500, date: new Date(now.getFullYear(), now.getMonth() - 1, 15) },
          { amount: 500, date: new Date(now.getFullYear(), now.getMonth(), 15) },
        ],
        milestones: [
          { percentage: 25, reachedAt: new Date(now.getFullYear(), now.getMonth() - 2, 20) },
          { percentage: 50 },
          { percentage: 75 },
          { percentage: 100 },
        ],
      },
      {
        userId: user._id,
        name: 'New Laptop',
        description: 'MacBook Pro for work',
        targetAmount: 2500,
        currentAmount: 1800,
        targetDate: new Date(now.getFullYear(), now.getMonth() + 3, 1),
        icon: '💻',
        color: '#8B5CF6',
        priority: 'low',
        contributions: [
          { amount: 600, date: new Date(now.getFullYear(), now.getMonth() - 2, 1) },
          { amount: 600, date: new Date(now.getFullYear(), now.getMonth() - 1, 1) },
          { amount: 600, date: new Date(now.getFullYear(), now.getMonth(), 1) },
        ],
        milestones: [
          { percentage: 25, reachedAt: new Date(now.getFullYear(), now.getMonth() - 2, 5) },
          { percentage: 50, reachedAt: new Date(now.getFullYear(), now.getMonth() - 1, 5) },
          { percentage: 75 },
          { percentage: 100 },
        ],
      },
    ]);

    logger.info(`Created ${goals.length} goals`);

    // Create bills
    const bills = await Bill.insertMany([
      {
        userId: user._id,
        name: 'Rent',
        amount: 1500,
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        frequency: 'monthly',
        categoryId: getCategoryId('Housing'),
        autopay: true,
        reminderDays: 3,
        status: 'upcoming',
      },
      {
        userId: user._id,
        name: 'Electric Bill',
        amount: 150,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 25),
        frequency: 'monthly',
        categoryId: getCategoryId('Utilities'),
        autopay: false,
        reminderDays: 5,
        status: 'upcoming',
      },
      {
        userId: user._id,
        name: 'Internet',
        amount: 80,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
        frequency: 'monthly',
        categoryId: getCategoryId('Utilities'),
        autopay: true,
        reminderDays: 2,
        status: 'paid',
        lastPaidDate: new Date(now.getFullYear(), now.getMonth(), 14),
      },
      {
        userId: user._id,
        name: 'Car Insurance',
        amount: 200,
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 10),
        frequency: 'monthly',
        categoryId: getCategoryId('Insurance'),
        autopay: true,
        reminderDays: 5,
        status: 'upcoming',
      },
      {
        userId: user._id,
        name: 'Netflix',
        amount: 15.99,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 20),
        frequency: 'monthly',
        categoryId: getCategoryId('Subscriptions'),
        autopay: true,
        reminderDays: 0,
        status: 'upcoming',
      },
    ]);

    logger.info(`Created ${bills.length} bills`);

    // Create investments
    const investments = await Investment.insertMany([
      {
        userId: user._id,
        name: 'Apple Inc.',
        type: 'stock',
        symbol: 'AAPL',
        shares: 10,
        purchasePrice: 150,
        currentPrice: 185,
        purchaseDate: new Date(now.getFullYear() - 1, 5, 15),
        priceHistory: [
          { date: new Date(now.getFullYear() - 1, 5, 15), price: 150 },
          { date: new Date(now.getFullYear() - 1, 8, 1), price: 160 },
          { date: new Date(now.getFullYear(), 0, 1), price: 170 },
          { date: new Date(now.getFullYear(), now.getMonth(), 1), price: 185 },
        ],
      },
      {
        userId: user._id,
        name: 'Vanguard S&P 500 ETF',
        type: 'etf',
        symbol: 'VOO',
        shares: 5,
        purchasePrice: 400,
        currentPrice: 450,
        purchaseDate: new Date(now.getFullYear() - 1, 2, 1),
        priceHistory: [
          { date: new Date(now.getFullYear() - 1, 2, 1), price: 400 },
          { date: new Date(now.getFullYear() - 1, 6, 1), price: 420 },
          { date: new Date(now.getFullYear(), 0, 1), price: 435 },
          { date: new Date(now.getFullYear(), now.getMonth(), 1), price: 450 },
        ],
      },
      {
        userId: user._id,
        name: 'Bitcoin',
        type: 'crypto',
        symbol: 'BTC',
        shares: 0.1,
        purchasePrice: 35000,
        currentPrice: 45000,
        purchaseDate: new Date(now.getFullYear() - 1, 10, 1),
        priceHistory: [
          { date: new Date(now.getFullYear() - 1, 10, 1), price: 35000 },
          { date: new Date(now.getFullYear(), 0, 1), price: 42000 },
          { date: new Date(now.getFullYear(), now.getMonth(), 1), price: 45000 },
        ],
      },
    ]);

    logger.info(`Created ${investments.length} investments`);

    // Create debts
    const debts = await Debt.insertMany([
      {
        userId: user._id,
        name: 'Credit Card',
        type: 'credit_card',
        originalBalance: 5000,
        currentBalance: 2500,
        interestRate: 19.99,
        minimumPayment: 75,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 20),
        lender: 'Chase Bank',
        priority: 'high',
        payments: [
          { amount: 500, date: new Date(now.getFullYear(), now.getMonth() - 4, 20) },
          { amount: 500, date: new Date(now.getFullYear(), now.getMonth() - 3, 20) },
          { amount: 500, date: new Date(now.getFullYear(), now.getMonth() - 2, 20) },
          { amount: 500, date: new Date(now.getFullYear(), now.getMonth() - 1, 20) },
          { amount: 500, date: new Date(now.getFullYear(), now.getMonth(), 20) },
        ],
      },
      {
        userId: user._id,
        name: 'Student Loan',
        type: 'student_loan',
        originalBalance: 25000,
        currentBalance: 18000,
        interestRate: 5.5,
        minimumPayment: 250,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
        lender: 'Federal Student Aid',
        priority: 'medium',
        payments: [
          { amount: 350, date: new Date(now.getFullYear(), now.getMonth() - 2, 15) },
          { amount: 350, date: new Date(now.getFullYear(), now.getMonth() - 1, 15) },
        ],
      },
    ]);

    logger.info(`Created ${debts.length} debts`);

    logger.info('✅ Database seeded successfully!');
    logger.info(`
═══════════════════════════════════════════════════
  Demo Account Created:
  
  Email: demo@fintrack.pro
  Password: Demo@123
═══════════════════════════════════════════════════
    `);

    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
};

seedDatabase();
