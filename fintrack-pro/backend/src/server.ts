import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import config from './config/index.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { logger } from './utils/logger.js';
import { verifyAccessToken } from './utils/jwt.js';

// Cron jobs
import { scheduleJobs } from './jobs/index.js';

const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Connect to Redis
    await connectRedis();

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
