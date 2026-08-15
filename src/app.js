require('dotenv').config();
require('express-async-errors');

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

/* ============================================================
   PROXY
============================================================ */

// Railway / Docker / reverse proxies sit in front of Express.
// This allows req.ip to correctly use the forwarded client IP.
app.set('trust proxy', 1);

/* ============================================================
   SECURITY HEADERS
============================================================ */

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

/* ============================================================
   CORS
============================================================ */

const frontendUrl = process.env.FRONTEND_URL;

const developmentOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
];

const allowedOrigins = frontendUrl
  ? [
      frontendUrl.replace(/\/+$/, ''),
      ...developmentOrigins,
    ]
  : developmentOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header.
      // Useful for Postman, curl and server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin =
        origin.replace(/\/+$/, '');

      if (
        allowedOrigins.includes(
          normalizedOrigin
        )
      ) {
        return callback(null, true);
      }

      return callback(
        new Error('Not allowed by CORS')
      );
    },

    methods: [
      'GET',
      'POST',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],

    credentials: true,
  })
);

/* ============================================================
   REQUEST BODY
============================================================ */

app.use(
  express.json({
    limit: '100kb',
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: '100kb',
  })
);

/* ============================================================
   HEALTH CHECK
============================================================ */

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
  });
});

/* ============================================================
   API ROUTES
============================================================ */

app.use(
  '/api/auth',
  authRoutes
);

app.use(
  '/api',
  urlRoutes
);

app.use(
  '/api',
  analyticsRoutes
);

/* ============================================================
   REDIRECT ROUTES
============================================================ */

// IMPORTANT:
// This must remain LAST because GET /:shortCode
// is effectively a catch-all route.

app.use(
  '/',
  redirectRoutes
);

/* ============================================================
   404 HANDLER
============================================================ */

app.use((req, res, next) => {
  next(
    new NotFoundError(
      'Route not found'
    )
  );
});

/* ============================================================
   GLOBAL ERROR HANDLER
============================================================ */

app.use(errorHandler);

module.exports = app;