const Minio = require('minio');

// Validate required env vars
const required = ['MINIO_ENDPOINT', 'MINIO_PORT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_BUCKET'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing MinIO env vars:', missing.join(', '));
  console.error('💡 Check: backend/.env exists and has correct values');
}

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.NODE_ENV === 'production',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123'
});

// Test connection and ensure bucket exists (non-blocking)
(async () => {
  try {
    await minioClient.listBuckets();
    console.log('✅ Connected to MinIO');
    
    const bucketName = process.env.MINIO_BUCKET || 'secure-mft';
    const buckets = await minioClient.listBuckets();
    
    if (!buckets.find(b => b.name === bucketName)) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`✅ Created bucket: ${bucketName}`);
    }
  } catch (err) {
    console.warn('⚠️ MinIO connection issue (file operations may fail):', err.message);
    console.warn('💡 Check: Docker MinIO container running? Credentials correct?');
  }
})();

module.exports = minioClient;