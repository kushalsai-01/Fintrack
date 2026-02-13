/**
 * Graceful Shutdown Handler
 * Properly closes all connections before process exit
 */
import { Server } from 'http';
import mongoose from 'mongoose';
import { redis } from '../config/redis.js';
import { logger } from './logger.js';

export function setupGracefulShutdown(server: Server): void {
  let isShuttingDown = false;
  
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn(`Already shutting down, ignoring ${signal}`);
      return;
    }
    
    isShuttingDown = true;
    logger.info(`\n🛑 ${signal} received, starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(async () => {
      logger.info('✅ HTTP server closed');
      
      try {
        // Close database connections
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close();
          logger.info('✅ MongoDB connection closed');
        }
        
        // Close Redis connection
        if (redis) {
          await redis.quit();
          logger.info('✅ Redis connection closed');
        }
        
        logger.info('👋 Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('⚠️  Forced shutdown after 10s timeout');
      process.exit(1);
    }, 10000);
  };
  
  // Listen for termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('❌ Uncaught Exception:', error);
    shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}
