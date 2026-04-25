import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  // Disabled pino-pretty to avoid worker thread issues during testing
  transport: undefined,
  base: {
    service: 'velvet-backend',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;