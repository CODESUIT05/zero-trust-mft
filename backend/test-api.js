// backend/test-api.js - Run with: node test-api.js
const http = require('http');

const testData = {
  email: 'admin@ztmft.com',
  password: 'Admin123!'
};

const req = http.request({
  hostname: '127.0.0.1',
  port: 4000,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(testData))
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', data);
    if (res.statusCode === 200) {
      console.log('✅ LOGIN SUCCESS - Backend is working!');
      process.exit(0);
    } else {
      console.log('⚠️ Non-200 response (may be expected for invalid creds)');
      process.exit(0);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
  process.exit(1);
});

req.write(JSON.stringify(testData));
req.end();