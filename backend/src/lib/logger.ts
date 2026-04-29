import pino from 'pino';
import { getRequestId } from './context';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  transport: undefined,
  base: {
    service: 'velvet-backend',
  },
  mixin() {
    const requestId = getRequestId();
    return requestId ? { requestId } : {};
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;