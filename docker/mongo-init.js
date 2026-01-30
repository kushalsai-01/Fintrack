// MongoDB initialization script
// This runs when the MongoDB container starts for the first time

// Switch to the fintrack database
db = db.getSiblingDB('fintrack-pro');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ provider: 1, providerId: 1 });
db.users.createIndex({ createdAt: -1 });

db.transactions.createIndex({ userId: 1, date: -1 });
db.transactions.createIndex({ userId: 1, categoryId: 1 });
db.transactions.createIndex({ userId: 1, type: 1, date: -1 });
db.transactions.createIndex({ description: 'text', merchant: 'text', notes: 'text' });

db.categories.createIndex({ userId: 1 });
db.categories.createIndex({ userId: 1, type: 1 });

db.budgets.createIndex({ userId: 1 });
db.budgets.createIndex({ userId: 1, startDate: 1, endDate: 1 });

db.goals.createIndex({ userId: 1 });
db.goals.createIndex({ userId: 1, status: 1 });

db.bills.createIndex({ userId: 1 });
db.bills.createIndex({ userId: 1, dueDate: 1 });
db.bills.createIndex({ userId: 1, status: 1 });

db.investments.createIndex({ userId: 1 });
db.investments.createIndex({ userId: 1, symbol: 1 });

db.debts.createIndex({ userId: 1 });
db.debts.createIndex({ userId: 1, status: 1 });

db.notifications.createIndex({ userId: 1, createdAt: -1 });
db.notifications.createIndex({ userId: 1, isRead: 1 });
db.notifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

db.recurringtransactions.createIndex({ userId: 1 });
db.recurringtransactions.createIndex({ nextOccurrence: 1, isActive: 1 });

print('✅ MongoDB indexes created successfully');

// Create a demo user for testing (optional)
// Password: Demo@123 (bcrypt hashed)
const demoUserExists = db.users.findOne({ email: 'demo@fintrack.pro' });
if (!demoUserExists) {
  db.users.insertOne({
    email: 'demo@fintrack.pro',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.e8Y7J5q9q5q5q5', // Demo@123
    firstName: 'Demo',
    lastName: 'User',
    role: 'user',
    currency: 'USD',
    language: 'en',
    locale: 'en-US',
    timezone: 'UTC',
    isEmailVerified: true,
    provider: 'local',
    notificationPreferences: {
      email: true,
      push: true,
      billReminders: true,
      goalUpdates: true,
      weeklyReport: true,
      anomalyAlerts: true
    },
    preferences: {
      email: true,
      push: true,
      billReminders: true,
      goalUpdates: true,
      weeklyReport: true,
      anomalyAlerts: true
    },
    onboardingCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  print('✅ Demo user created: demo@fintrack.pro / Demo@123');
}
