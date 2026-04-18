const { createClient } = require('redis');

const redis = createClient({ 
  url: process.env.REDIS_URL,
  socket: { 
    reconnectStrategy: (retries) => {
      // Reconnect with exponential backoff, max 10 attempts
      if (retries > 10) return new Error('Max Redis reconnect attempts');
      return Math.min(retries * 100, 3000);
    }
  }
});

redis.on('error', (err) => {
  console.warn('⚠️ Redis connection error (optional for dev):', err.message);
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

// Connect with timeout
const connectWithTimeout = () => {
  return Promise.race([
    redis.connect(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
    )
  ]);
};

connectWithTimeout()
  .catch(err => console.warn('⚠️ Redis not available (anomaly detection disabled):', err.message));

module.exports = { client: redis };