const redis = require('../config/redis');

// Configurable thresholds for anomaly detection
const THRESHOLDS = {
  failed_logins: 5,      // Alert after 5 failed logins in 5 min
  bulk_downloads: 20,    // Alert after 20 downloads in 1 min
  off_hours_start: 22,   // 10 PM
  off_hours_end: 6,      // 6 AM
  window_seconds: 300    // 5 minute sliding window
};

class AnomalyDetector {
  constructor() {
    this.client = redis.client;
  }

  /**
   * Track an event for anomaly detection
   * @param {string} event - Event type: 'login_fail', 'download', etc.
   * @param {string} userId - User identifier
   * @param {string} ip - Request IP address
   * @returns {Promise<string|null>} Alert message if anomaly detected, else null
   */
  async track(event, userId, ip) {
    const key = `anom:${event}:${userId || 'unknown'}`;
    
    // Increment counter in Redis with TTL
    await this.client.incr(key);
    await this.client.expire(key, THRESHOLDS.window_seconds);
    
    const count = parseInt(await this.client.get(key) || '0');
    
    // Check thresholds and return alert if exceeded
    if (event === 'login_fail' && count >= THRESHOLDS.failed_logins) {
      return `🚨 ALERT: Possible brute force attack - ${count} failed logins for user ${userId} from ${ip}`;
    }
    
    if (event === 'download' && count >= THRESHOLDS.bulk_downloads) {
      return `🚨 ALERT: Bulk download detected - ${count} downloads for user ${userId} in ${THRESHOLDS.window_seconds}s`;
    }
    
    return null;
  }

  /**
   * Check if request is during off-hours (configurable)
   * @param {Date} [timestamp] - Optional timestamp to check
   * @returns {boolean} True if during off-hours
   */
  isOffHours(timestamp = new Date()) {
    const hour = timestamp.getHours();
    return hour >= THRESHOLDS.off_hours_start || hour < THRESHOLDS.off_hours_end;
  }

  /**
   * Get recent events for a user (for audit/review)
   * @param {string} userId 
   * @param {string} event 
   * @returns {Promise<number>} Count of recent events
   */
  async getRecentCount(userId, event) {
    const key = `anom:${event}:${userId}`;
    const count = await this.client.get(key);
    return parseInt(count || '0');
  }
}

module.exports = new AnomalyDetector();