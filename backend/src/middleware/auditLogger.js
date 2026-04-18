const db = require('../config/db');

module.exports = (req, res, next) => {
  const start = Date.now();
  
  // Capture response status after it's sent
  res.on('finish', async () => {
    try {
      await db.query(
        `INSERT INTO audit_logs (
          user_id, action, resource_id, ip, device_fp, 
          status, http_status, duration_ms, details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          req.user?.id || null,
          `${req.method} ${req.path}`,
          req.params?.id || null,
          req.zt?.ip || req.ip || 'unknown',
          req.zt?.deviceFp || 'unknown',
          res.statusCode < 400 ? 'success' : 'error',
          res.statusCode,
          Date.now() - start,
          {
            userAgent: req.get('user-agent'),
            referer: req.get('referer'),
            query: req.query,
            // Don't log sensitive body data
            hasBody: !!req.body && Object.keys(req.body).length > 0
          }
        ]
      );
    } catch (err) {
      // Don't crash the app if audit logging fails
      console.error('⚠️ Audit log write failed:', err.message);
    }
  });
  
  next();
};