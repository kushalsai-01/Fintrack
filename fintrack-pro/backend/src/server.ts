import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import config from './config/index.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { logger } from './utils/logger.js';
import { verifyAccessToken } from './utils/jwt.js';
import { 
  validateEnvironment, 
  checkMLServiceHealth, 
  logValidationResults, 
  setFeatureFlags 
} from './utils/validateEnv.js';

// Cron jobs
import { scheduleJobs } from './jobs/index.js';

const startServer = async (): Promise<void> => {
  try {
    // ===============================
    // PHASE 1: Validate Environment
    // ===============================
    logger.info('🔍 Validating environment configuration...');
    const { validation, features } = await validateEnvironment();
    
    // Log validation results
    logValidationResults(validation, features);

    // Fail in production if critical errors
    if (!validation.isValid && config.isProduction) {
      logger.error('❌ Server cannot start due to configuration errors.');
      process.exit(1);
    }

    // Store feature flags for runtime access
    setFeatureFlags(features);

    // ===============================
    // PHASE 2: Connect to Databases
    // ===============================
    // Connect to database
    await connectDatabase();

    // Connect to Redis
    await connectRedis();

    // ===============================
    // PHASE 3: Check External Services
    // ===============================
    // Check ML service health (non-blocking)
    const mlHealthy = await checkMLServiceHealth();
    if (!mlHealthy) {
      logger.warn('⚠️  ML Service is not reachable. AI features may be limited.');
      features.mlService = false;
      setFeatureFlags(features);
    } else {
      logger.info('✅ ML Service: Connected');
    }

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const server = http.createServer(app);

    // Setup Socket.IO
    const io = new SocketIOServer(server, {
      cors: {
        origin: config.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // Socket.IO authentication
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const payload = verifyAccessToken(token);
        socket.data.user = payload;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      const userId = socket.data.user.userId;
      logger.info(`User connected: ${userId}`);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`User disconnected: ${userId}`);
      });

      // Handle subscription to specific events
      socket.on('subscribe', (event: string) => {
        socket.join(`${userId}:${event}`);
      });

      socket.on('unsubscribe', (event: string) => {
        socket.leave(`${userId}:${event}`);
      });
    });

    // Make io available to controllers
    app.set('io', io);

    // Schedule cron jobs
    scheduleJobs();

    // Start server
    server.listen(config.port, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 FinTrack Pro Backend Server                             ║
║                                                              ║
║   Environment: ${config.nodeEnv.padEnd(43)}║
║   Port: ${String(config.port).padEnd(50)}║
║   API URL: ${(config.apiUrl || 'http://localhost:' + config.port).padEnd(47)}║
║                                                              ║
║   📚 API Docs: ${(config.apiUrl || 'http://localhost:' + config.port).padEnd(43)}║
║      /api/docs                                               ║
║                                                              ║
║   ✅ Database: Connected                                     ║
║   ✅ Redis: Connected                                        ║
║   ✅ WebSocket: Ready                                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      server.close(() => {
        logger.info('HTTP server closed');
      });

      io.close(() => {
        logger.info('WebSocket server closed');
      });

      // Wait for connections to close
      setTimeout(() => {
        process.exit(0);
      }, 5000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
