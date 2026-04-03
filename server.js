// Entry point — loads config, mounts middleware + routes, runs startup sequence.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const log = require('./src/helpers/logger');
const { connectDB } = require('./src/config/db');
const { setupIndexes } = require('./src/helpers/collections');
const { seedAdmin } = require('./src/controllers/adminsController');
const { errorHandler } = require('./src/middleware/errorHandler');
const { runStartupTests } = require('./src/startup/test');

const postsRoutes = require('./src/routes/posts');
const eventsRoutes = require('./src/routes/events');
const adminsRoutes = require('./src/routes/admins');

const app = express();
const PORT = process.env.PORT || 3000;
const TOTAL_STEPS = 5;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('short'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Mevyn backend is running' });
});

app.use('/api/posts', postsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/admins', adminsRoutes);

// Error handler (must be last middleware)
app.use(errorHandler);

// Startup sequence
async function start() {
  log.header('MEVYN BACKEND');

  log.step(1, TOTAL_STEPS, 'Connecting to MongoDB...');
  await connectDB();

  log.step(2, TOTAL_STEPS, 'Setting up indexes...');
  await setupIndexes();

  log.step(3, TOTAL_STEPS, 'Seeding admin account...');
  await seedAdmin();

  log.step(4, TOTAL_STEPS, 'Starting HTTP server...');
  app.listen(PORT, () => {
    log.success(`Server running on port ${PORT}`);

    // Show config summary
    log.divider();
    log.table({
      'Port': PORT.toString(),
      'Database': process.env.DB_NAME,
      'Log Level': (process.env.LOG_LEVEL || 'DEBUG').toUpperCase(),
      'JWT Expiry': process.env.JWT_EXPIRES_IN || '7d',
      'Environment': process.env.NODE_ENV || 'development',
    });
    log.divider();

    // Step 5: run health checks against the live server
    log.step(5, TOTAL_STEPS, 'Running startup tests...');
    runStartupTests(PORT);
  });
}

start().catch((err) => {
  log.error(`Failed to start server: ${err.message}`);
  console.error(err);
  process.exit(1);
});

module.exports = { app };
