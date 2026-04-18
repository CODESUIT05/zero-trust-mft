// backend/src/app.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// ✅ CORS - MUST be one of the first middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    '*'  // Allow all origins in dev (restrict in prod)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-device-fp',
    'X-Requested-With',
    'Accept'
  ],
  exposedHeaders: ['X-File-Checksum', 'X-File-Id']
}));

// ✅ Handle preflight OPTIONS requests explicitly
app.options('*', cors());

// ✅ Security headers (after CORS)
app.use(helmet());

// ✅ Body parsers - MUST come before routes
app.use(express.json({ 
  limit: '50mb',
  strict: true,
  type: ['application/json', 'application/vnd.api+json']
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  parameterLimit: 50000
}));

// ✅ Logging
app.use(morgan('dev'));

// ✅ Zero Trust middleware
app.use(require('./middleware/zeroTrust'));

// ✅ Audit logging middleware
app.use(require('./middleware/auditLogger'));

// ✅ Routes - AFTER all middleware
app.use('/auth', require('./routes/auth'));
app.use('/files', require('./routes/files'));

// ✅ Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    zeroTrust: 'active'
  });
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } 
  });
});

// ✅ Global error handler (must be last)
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err);
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: isDev ? err.message : 'Server error'
    }
  });
});

module.exports = app;