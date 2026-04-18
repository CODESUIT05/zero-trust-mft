const jwt = require('jsonwebtoken');

/**
 * Verify JWT access token middleware
 * Attaches decoded user to req.user if valid
 */
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Check for Bearer token format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: { code: 'AUTH_MISSING', message: 'No access token provided' } 
    });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'zero-trust-mft',
      algorithms: ['HS256']
    });
    
    // Attach user info to request for downstream use
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (err) {
    // Handle specific JWT errors
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'AUTH_EXPIRED', message: 'Access token expired' } 
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'AUTH_INVALID', message: 'Invalid access token' } 
      });
    }
    
    // Generic error
    return res.status(401).json({ 
      success: false, 
      error: { code: 'AUTH_ERROR', message: 'Authentication failed' } 
    });
  }
};

/**
 * Role-based access control middleware
 * Usage: router.get('/admin', checkRole('admin'), handler)
 */
exports.checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'AUTH_REQUIRED' } 
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } 
      });
    }
    
    next();
  };
};