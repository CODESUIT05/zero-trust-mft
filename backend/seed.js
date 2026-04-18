require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./src/config/db');

const run = async () => {
  console.log('🔍 Checking database connection...');
  try {
    await db.query('SELECT 1');
    console.log('✅ Database reachable.');
  } catch (e) {
    console.error('❌ Cannot reach database. Ensure Docker is running.');
    process.exit(1);
  }

  // 1. Ensure Users table exists (Safety fallback)
  console.log('📦 Ensuring tables exist...');
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 2. Create/Update Admin User
  const email = 'admin@ztmft.com';
  const password = 'Admin123!'; // Your login password
  const hash = await bcrypt.hash(password, 10);

  await db.query(
    `INSERT INTO users (email, password_hash, role) 
     VALUES ($1, $2, 'admin') 
     ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
    [email, hash]
  );

  console.log(`✅ Admin user ready: ${email} / ${password}`);
  console.log('/// Seed complete! Run `npx nodemon src/server.js` now.');
  process.exit(0);
};

run();