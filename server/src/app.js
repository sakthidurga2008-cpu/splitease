import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import groupsRoutes from './routes/groups.routes.js';
import expensesRoutes from './routes/expenses.routes.js';
import settlementsRoutes from './routes/settlements.routes.js';
import recurringRoutes from './routes/recurring.routes.js';
import overviewRoutes from './routes/overview.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // Open to everyone: register, log in, log out.
  app.use('/api/auth', authRoutes);

  // Everything below needs a logged-in user.
  app.use(
    '/uploads',
    requireAuth,
    express.static(env.uploadsDir, {
      index: false,
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );
  app.use('/api/users', requireAuth, usersRoutes);
  app.use('/api', requireAuth, groupsRoutes, expensesRoutes, settlementsRoutes, recurringRoutes, overviewRoutes);
  app.use('/api', notFoundHandler);

  // After "npm run build", the API server also serves the website itself.
  if (fs.existsSync(path.join(env.clientDist, 'index.html'))) {
    app.use(express.static(env.clientDist));
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(path.join(env.clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
