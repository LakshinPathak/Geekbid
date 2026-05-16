const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter } = require('./rateLimiter');
const { sanitizeMiddleware } = require('./validate');
const { errorHandler } = require('./errorHandler');

const createApp = () => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(cors());

  // Body parsing
  app.use(express.json({ limit: '1mb' }));

  // Rate limiting
  app.use(apiLimiter);

  // Input sanitization (NoSQL injection prevention)
  app.use(sanitizeMiddleware);

  // Health check
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Attach error handler after routes are registered
  // Services should call app.use(errorHandler) after defining routes,
  // or use the helper below:
  app.attachErrorHandler = () => app.use(errorHandler);

  return app;
};

module.exports = { createApp };

