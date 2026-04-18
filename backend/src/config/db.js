const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DB_URL,
  connectionTimeoutMillis: 5000,  // 5 second timeout
  idleTimeoutMillis: 30000,
  max: 10,
  // Retry connection on transient errors
  allowExitOnIdle: false
});

// Test connection on startup (non-blocking)
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL connection error:', err.message);
    console.error('💡 Check: Docker running? DB_URL correct? init.sql executed?');
    // Don't exit - let app start in degraded mode for dev
  } else {
    console.log('✅ Connected to PostgreSQL');
    client.query('SELECT NOW()', (err) => {
      release();
      if (err) console.error('❌ DB query test failed:', err.message);
    });
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  close: () => pool.end()
};