require('dotenv').config();
const app = require('./app');
const net = require('net');
const fs = require('fs');

// Find first free port starting from BASE_PORT
const findFreePort = (startPort) => new Promise((resolve) => {
  const server = net.createServer();
  server.listen(startPort, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
  server.on('error', () => findFreePort(startPort + 1).then(resolve));
});

// Start server on first available port
const BASE_PORT = parseInt(process.env.PORT) || 39999;

findFreePort(BASE_PORT).then(port => {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on http://localhost:${port}`);
    console.log(`🔍 Health: http://localhost:${port}/health`);
    console.log(`💡 Frontend: Set VITE_API_URL=http://localhost:${port}\n`);
    
    // Save port to file for frontend auto-discovery (dev only)
    try {
      fs.writeFileSync('.port', port.toString());
    } catch (e) {
      // Ignore write errors in dev
    }
  });

  // Graceful shutdown handlers
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close(() => process.exit(0));
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Terminated');
    server.close(() => process.exit(0));
  });
});