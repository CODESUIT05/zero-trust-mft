const crypto = require('crypto');
const { Readable, PassThrough } = require('stream');

// Master key for deriving per-file encryption keys (32 bytes = 64 hex chars)
const MASTER_KEY = Buffer.from(process.env.MASTER_ENCRYPTION_KEY, 'hex');

/**
 * Encrypt a readable stream using AES-256-GCM with per-file derived key
 * @param {Readable} readableStream - Input file stream
 * @param {string} fileId - Unique file identifier (UUID)
 * @returns {Object} { encrypted: ReadableStream, meta: { iv, algorithm } }
 */
exports.encryptStream = (readableStream, fileId) => {
  // Derive unique 256-bit key per file using HMAC-SHA256
  const fileKey = crypto.createHmac('sha256', MASTER_KEY).update(fileId).digest();
  
  // Generate random 128-bit IV for this encryption
  const iv = crypto.randomBytes(16);
  
  // Create AES-256-GCM cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', fileKey, iv);
  
  // Pipe input through cipher to get encrypted output stream
  const encryptedStream = readableStream.pipe(cipher);
  
  return {
    encrypted: encryptedStream,
    meta: { 
      iv: iv.toString('hex'),
      fileId,
      algorithm: 'aes-256-gcm'
      // Note: authTag must be retrieved AFTER stream ends via cipher.getAuthTag()
    }
  };
};

/**
 * Decrypt an encrypted stream using AES-256-GCM
 * @param {Readable} encryptedStream - Encrypted input stream
 * @param {string} ivHex - IV in hex format (from encryption meta)
 * @param {string} authTagHex - Authentication tag in hex format
 * @param {string} fileId - Same file ID used during encryption
 * @returns {Readable} Decrypted output stream
 */
exports.decryptStream = (encryptedStream, ivHex, authTagHex, fileId) => {
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const fileKey = crypto.createHmac('sha256', MASTER_KEY).update(fileId).digest();
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', fileKey, iv);
  decipher.setAuthTag(authTag);
  
  return encryptedStream.pipe(decipher);
};

/**
 * Compute SHA-256 hash of a buffer (for integrity verification)
 * @param {Buffer} buffer - File content
 * @returns {string} Hex-encoded SHA-256 hash
 */
exports.computeSha256 = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Compute SHA-256 hash of a stream (for integrity verification during upload)
 * @param {Readable} stream 
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
exports.computeSha256Stream = async (stream) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};