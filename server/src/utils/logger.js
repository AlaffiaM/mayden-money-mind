import pino from 'pino';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Optional: redact sensitive fields if we ever accidentally pass them
  redact: {
    paths: ['password', 'passwordHash', 'token', 'resetToken', 'secret', 'key', 'authorization', 'rawBody', 'paystackSecretKey', 'jwtSecret'],
    censor: '[REDACTED]',
  },
  ...(process.env.NODE_ENV !== 'production' ? {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  } : {})
});

export default logger;