/**
 * Winston Logger Factory
 *
 * Production-grade structured logging with:
 * - JSON format (Grafana-compatible)
 * - Log levels: error, warn, info, http, debug
 * - Timestamp in ISO 8601
 * - Error stack traces
 * - Silent mode for clean test output
 */

import * as winston from 'winston';

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

const productionFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  json(),
);

const developmentFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'HH:mm:ss' }),
  colorize({ all: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} [${level}] ${message}${metaStr}${stackStr}`;
  }),
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  silent: process.env.NODE_ENV === 'test',
  transports: [new winston.transports.Console()],
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
});

export { logger };
