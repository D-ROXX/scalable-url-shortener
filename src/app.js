require('dotenv').config();
require('express-async-errors'); // lets async route handlers throw and hit errorHandler

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const urlRoutes = require('./routes/urlRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const redirectRoutes = require('./routes/redirectRoutes');
const errorHandler = require('./middlewares/errorHandler');
const { NotFoundError } = require('./utils/errors');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// API routes under /api, namespaced and versioned in spirit (v1 implicit).
app.use('/api/auth', authRoutes);
app.use('/api', urlRoutes);
app.use('/api', analyticsRoutes);

// Redirect routes mounted at root LAST — GET /:shortCode is a catch-all
// pattern and must not shadow the /api/* routes above it.
app.use('/', redirectRoutes);

app.use((req, res, next) => {
  next(new NotFoundError('Route not found'));
});

app.use(errorHandler);

module.exports = app;
