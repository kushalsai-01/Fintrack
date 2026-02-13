import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';

const logDir = 'logs';

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (Object.keys(meta).length > 0 && !meta.stack) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// Add file transports (always enabled, not just production)
transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: logFormat,
    maxsize: 5242880,
    maxFiles: 5,
  })
);

export const logger = winston.createLogger({
  level: config.isDevelopment ? 'debug' : 'info',
  format: logFormat,
  transports,
  exitOnError: false,
});

// Stream for Morgan HTTP logging
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
