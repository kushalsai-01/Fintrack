import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config/index.js';
import { configurePassport } from './config/passport.js';
import routes from './routes/index.js';
import oauthRoutes from './routes/oauth.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS
  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  if (config.nodeEnv !== 'test') {
    app.use(morgan('combined', {
      stream: {
        write: (message: string) => logger.http(message.trim()),
      },
    }));
  }

  // Static files for uploads
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Passport
  app.use(passport.initialize());
  configurePassport();

  // API routes
  app.use('/api', routes);
  app.use('/api/auth', oauthRoutes);

  // API documentation
  app.get('/api/docs', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'FinTrack API Documentation',
      version: '1.0.0',
      endpoints: {
        auth: {
          'POST /api/auth/register': 'Register new user',
          'POST /api/auth/login': 'Login user',
          'POST /api/auth/logout': 'Logout user',
          'POST /api/auth/refresh': 'Refresh tokens',
          'POST /api/auth/forgot-password': 'Request password reset',
          'POST /api/auth/reset-password': 'Reset password',
          'GET /api/auth/me': 'Get current user',
          'GET /api/auth/google': 'Google OAuth login',
          'GET /api/auth/github': 'GitHub OAuth login',
        },
        users: {
          'GET /api/users/profile': 'Get user profile',
          'PUT /api/users/profile': 'Update profile',
          'PUT /api/users/preferences': 'Update preferences',
          'PUT /api/users/password': 'Change password',
          'PUT /api/users/avatar': 'Update avatar',
          'GET /api/users/stats': 'Get user stats',
          'GET /api/users/export': 'Export user data',
          'DELETE /api/users/account': 'Delete account',
        },
        transactions: {
          'POST /api/transactions': 'Create transaction',
          'GET /api/transactions': 'Get all transactions',
          'GET /api/transactions/:id': 'Get transaction by ID',
          'PUT /api/transactions/:id': 'Update transaction',
          'DELETE /api/transactions/:id': 'Delete transaction',
          'GET /api/transactions/summary': 'Get transaction summary',
        },
        categories: {
          'POST /api/categories': 'Create category',
          'GET /api/categories': 'Get all categories',
          'GET /api/categories/:id': 'Get category by ID',
          'PUT /api/categories/:id': 'Update category',
          'DELETE /api/categories/:id': 'Delete category',
          'GET /api/categories/breakdown': 'Get category breakdown',
        },
        budgets: {
          'POST /api/budgets': 'Create budget',
          'GET /api/budgets': 'Get all budgets',
          'GET /api/budgets/active': 'Get active budgets',
          'GET /api/budgets/summary': 'Get budget summary',
          'GET /api/budgets/:id': 'Get budget by ID',
          'PUT /api/budgets/:id': 'Update budget',
          'DELETE /api/budgets/:id': 'Delete budget',
        },
        goals: {
          'POST /api/goals': 'Create goal',
          'GET /api/goals': 'Get all goals',
          'GET /api/goals/summary': 'Get goals summary',
          'GET /api/goals/:id': 'Get goal by ID',
          'PUT /api/goals/:id': 'Update goal',
          'POST /api/goals/:id/contribute': 'Add contribution',
          'POST /api/goals/:id/withdraw': 'Withdraw from goal',
          'DELETE /api/goals/:id': 'Delete goal',
        },
        bills: {
          'POST /api/bills': 'Create bill',
          'GET /api/bills': 'Get all bills',
          'GET /api/bills/upcoming': 'Get upcoming bills',
          'GET /api/bills/summary': 'Get bills summary',
          'GET /api/bills/:id': 'Get bill by ID',
          'PUT /api/bills/:id': 'Update bill',
          'POST /api/bills/:id/pay': 'Pay bill',
          'DELETE /api/bills/:id': 'Delete bill',
        },
        investments: {
          'POST /api/investments': 'Create investment',
          'GET /api/investments': 'Get all investments',
          'GET /api/investments/portfolio': 'Get portfolio summary',
          'GET /api/investments/:id': 'Get investment by ID',
          'GET /api/investments/:id/history': 'Get price history',
          'PUT /api/investments/:id': 'Update investment',
          'POST /api/investments/:id/buy': 'Buy shares',
          'POST /api/investments/:id/sell': 'Sell shares',
          'DELETE /api/investments/:id': 'Delete investment',
        },
        debts: {
          'POST /api/debts': 'Create debt',
          'GET /api/debts': 'Get all debts',
          'GET /api/debts/summary': 'Get debt summary',
          'GET /api/debts/payoff-plan': 'Get payoff plan',
          'GET /api/debts/:id': 'Get debt by ID',
          'PUT /api/debts/:id': 'Update debt',
          'POST /api/debts/:id/payment': 'Make payment',
          'DELETE /api/debts/:id': 'Delete debt',
        },
        notifications: {
          'GET /api/notifications': 'Get all notifications',
          'GET /api/notifications/unread-count': 'Get unread count',
          'GET /api/notifications/:id': 'Get notification by ID',
          'PUT /api/notifications/:id/read': 'Mark as read',
          'PUT /api/notifications/read-all': 'Mark all as read',
          'PUT /api/notifications/:id/archive': 'Archive notification',
          'PUT /api/notifications/archive-all': 'Archive all',
          'DELETE /api/notifications/:id': 'Delete notification',
        },
        analytics: {
          'GET /api/analytics/dashboard': 'Get dashboard data',
          'GET /api/analytics/monthly': 'Get monthly summary',
          'GET /api/analytics/trends': 'Get spending trends',
          'GET /api/analytics/health': 'Get financial health score',
        },
      },
    });
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
};
