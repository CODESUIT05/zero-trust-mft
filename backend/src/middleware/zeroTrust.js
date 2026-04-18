// backend/src/middleware/zeroTrust.js
const { RateLimiterRedis } = require('rate-limiter-flexible');
const redis = require('../config/redis');

// Dev mode = relaxed limits for testing
const IS_DEV = process.env.NODE_ENV !== 'production';

const limiter = new RateLimiterRedis({
  storeClient: redis.client,
  points: IS_DEV ? 1000 : 60,
  duration: 60,
  keyPrefix: 'zt_limit_'
});

module.exports = async (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const fp = req.headers['x-device-fp'];

  // Skip strict rate limiting in development
  if (!IS_DEV) {
    try {
      await limiter.consume(ip);
    } catch (rateLimiterRes) {
      return res.status(429).json({ 
        success: false, 
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' } 
      });
    }
  }

  // Device fingerprint validation (strict in prod, optional in dev)
  if (fp && !/^[a-f0-9]{64}$/i.test(fp) && !IS_DEV) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_DEVICE_FINGERPRINT' } });
  }

  // Attach Zero Trust context for downstream middleware/audit
  // ✅ FIXED: Removed undefined `isDev` variable
  req.zt = { 
    ip, 
    deviceFp: fp || (IS_DEV ? 'dev_mode_fingerprint' : 'unknown'), 
    timestamp: new Date()
  };
  
  next();
};