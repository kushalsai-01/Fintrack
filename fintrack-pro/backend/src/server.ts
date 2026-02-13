import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import config from './config/index.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { logger } from './utils/logger.js';
import { verifyAccessToken } from './utils/jwt.js';
import { validateEnv, checkOptionalIntegrations } from './utils/envValidation.js';
import { setupGracefulShutdown } from './utils/gracefulShutdown.js';
import { 
  checkMLServiceHealth, 
} from './utils/validateEnv.js';

// Cron jobs
import { scheduleJobs } from './jobs/index.js';

const startServer = async (): Promise<void> => {
  try {
    // ===============================
    // PHASE 1: Validate Environment
    // ===============================
    logger.info('🔍 Validating environment configuration...');
    const env = validateEnv();
    checkOptionalIntegrations(env);

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

    // Start server with timeouts
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

    // Set server timeouts (prevent hanging requests)
    server.setTimeout(120000); // 2 minutes
    server.keepAliveTimeout = 65000; // 65 seconds (should be > load balancer timeout)
    server.headersTimeout = 66000; // Slightly more than keepAliveTimeout

    // Setup graceful shutdown handlers
    setupGracefulShutdown(server);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
