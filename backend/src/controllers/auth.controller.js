// backend/src/controllers/auth.controller.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const anomaly = require('../services/anomaly');

/**
 * POST /auth/login
 * Authenticate user and return JWT tokens
 */
exports.login = async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { 
      email: req.body?.email, 
      ip: req.zt?.ip,
      deviceFp: req.zt?.deviceFp?.substring(0, 16) + '...'
    });
    
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'MISSING_CREDENTIALS', message: 'Email and password required' } 
      });
    }

    // Query user from database
    const result = await db.query(
      'SELECT id, email, password_hash, role, token_version FROM users WHERE email = $1', 
      [email.toLowerCase().trim()]
    );
    
    // User not found
    if (!result.rows.length) {
      console.warn('⚠️ Login failed: user not found', email);
      await anomaly.track('login_fail', 'unknown', req.zt?.ip);
      return res.status(401).json({ 
        success: false, 
        error: { code: 'AUTH_INVALID', message: 'Invalid credentials' } 
      });
    }

    const user = result.rows[0];
    
    // Verify password with bcrypt
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      console.warn('⚠️ Login failed: invalid password for', email);
      await anomaly.track('login_fail', user.id, req.zt?.ip);
      return res.status(401).json({ 
        success: false, 
        error: { code: 'AUTH_INVALID', message: 'Invalid credentials' } 
      });
    }

    // Generate short-lived access token (15 minutes)
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '15m', issuer: 'zero-trust-mft' }
    );
    
    // Generate long-lived refresh token (7 days)
    const refreshToken = jwt.sign(
      { id: user.id, tokenVersion: user.token_version || 0 }, 
      process.env.JWT_REFRESH_SECRET, 
      { expiresIn: '7d', issuer: 'zero-trust-mft' }
    );

    console.log('✅ Login successful:', user.email, 'role:', user.role);
    
    // ✅ FIXED: Added 'data:' key before nested object
    res.json({ 
      success: true, 
      data: { 
        accessToken, 
        refreshToken, 
        role: user.role,
        expiresIn: 900 // 15 minutes in seconds
      } 
    });
    
  } catch (err) {
    console.error('❌ Login handler error:', err);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'SERVER_ERROR', 
        message: process.env.NODE_ENV === 'development' ? err.message : 'Authentication failed' 
      } 
    });
  }
};

/**
 * POST /auth/refresh
 * Refresh expired access token using refresh token
 */
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'MISSING_REFRESH_TOKEN' } 
      });
    }

    // Verify refresh token signature and expiration
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Fetch user to check if still active and token version matches
    const result = await db.query(
      'SELECT id, email, role, token_version FROM users WHERE id = $1', 
      [decoded.id]
    );
    
    if (!result.rows.length) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'USER_NOT_FOUND' } 
      });
    }

    const user = result.rows[0];
    
    // Check if token was rotated (e.g., password change, logout all devices)
    if (decoded.tokenVersion !== (user.token_version || 0)) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'TOKEN_REVOKED' } 
      });
    }

    // Issue new access token (refresh token rotation can be added here)
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '15m', issuer: 'zero-trust-mft' }
    );

    // ✅ FIXED: Added 'data:' key before nested object
    res.json({ 
      success: true, 
      data: { 
        accessToken,
        expiresIn: 900
      } 
    });
    
  } catch (err) {
    // Token expired or invalid
    console.error('❌ Refresh error:', err.message);
    res.status(401).json({ 
      success: false, 
      error: { code: 'AUTH_EXPIRED', message: 'Session expired. Please login again.' } 
    });
  }
};