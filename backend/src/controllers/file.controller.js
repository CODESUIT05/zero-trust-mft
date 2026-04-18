// backend/src/controllers/file.controller.js
const minio = require('../config/minio');
const cryptoService = require('../services/crypto');
const db = require('../config/db');
const { Readable } = require('stream');
const crypto = require('crypto');

const BUCKET = process.env.MINIO_BUCKET || 'secure-mft';

/**
 * POST /files/upload
 * Upload, encrypt, and store a file
 */
exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'NO_FILE', message: 'No file uploaded' } 
      });
    }

    // Generate unique file ID
    const fileId = crypto.randomUUID();
    
    // Compute SHA-256 checksum of ORIGINAL file
    const checksum = cryptoService.computeSha256(req.file.buffer);
    
    // Encrypt the file buffer using AES-256-GCM
    const { encrypted, meta } = cryptoService.encryptStream(
      Readable.from(req.file.buffer), 
      fileId
    );
    
    // Collect encrypted chunks into buffer
    const chunks = [];
    encrypted.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      encrypted.on('end', resolve);
      encrypted.on('error', reject);
    });
    
    const encryptedBuffer = Buffer.concat(chunks);
    
    // Get authTag AFTER stream completes (AES-GCM requirement)
    const authTag = encrypted.readableEnded 
      ? (encrypted._readableState?.pipes?.getAuthTag?.() || encrypted.getAuthTag?.()) 
      : null;
    
    // Upload encrypted file to MinIO
    await minio.putObject(
      BUCKET, 
      `files/${fileId}.enc`, 
      encryptedBuffer, 
      encryptedBuffer.length,
      { 
        'Content-Type': req.file.mimetype, 
        'X-File-Id': fileId,
        'X-Original-Name': encodeURIComponent(req.file.originalname)
      }
    );
    
    // Store metadata in PostgreSQL
    await db.query(
      `INSERT INTO files (
        id, user_id, original_name, storage_path, checksum_sha256, 
        iv_hex, auth_tag_hex, size_bytes, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '30 days')`,
      [
        fileId,
        req.user.id,
        req.file.originalname,
        `files/${fileId}.enc`,
        checksum,
        meta.iv,
        authTag?.toString('hex'),
        encryptedBuffer.length
      ]
    );
    
    // ✅ FIXED: Added 'data:' key before nested object
    res.status(201).json({ 
      success: true, 
      data: { 
        fileId, 
        checksum, 
        name: req.file.originalname,
        size: req.file.size,
        encrypted: true,
        algorithm: 'aes-256-gcm'
      } 
    });
    
  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'UPLOAD_FAILED', 
        message: process.env.NODE_ENV === 'development' ? err.message : 'File upload failed' 
      } 
    });
  }
};

/**
 * GET /files/:id/download
 * Verify ownership, decrypt, and stream file
 */
exports.download = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify file exists and belongs to authenticated user
    const result = await db.query(
      'SELECT * FROM files WHERE id = $1 AND user_id = $2', 
      [id, req.user.id]
    );
    
    if (!result.rows.length) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'FILE_NOT_FOUND' } 
      });
    }
    
    const file = result.rows[0];
    
    // Check if file has expired
    if (file.expires_at && new Date(file.expires_at) < new Date()) {
      return res.status(410).json({ 
        success: false, 
        error: { code: 'FILE_EXPIRED' } 
      });
    }
    
    // Get encrypted object from MinIO
    const obj = await minio.getObject(BUCKET, file.storage_path);
    
    // Decrypt stream using stored IV and auth tag
    const decrypted = cryptoService.decryptStream(
      obj, 
      file.iv_hex, 
      file.auth_tag_hex, 
      file.id
    );
    
    // Set response headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Content-Length', file.size_bytes);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-File-Checksum', file.checksum_sha256);
    res.setHeader('X-File-Id', file.id);
    
    // Stream decrypted content directly to response
    decrypted.pipe(res);
    
    // Handle stream errors
    decrypted.on('error', (err) => {
      console.error('❌ Decryption stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          error: { code: 'DECRYPTION_FAILED' } 
        });
      }
    });
    
  } catch (err) {
    console.error('❌ Download error:', err);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: { 
          code: 'DOWNLOAD_FAILED', 
          message: process.env.NODE_ENV === 'development' ? err.message : 'Download failed' 
        } 
      });
    }
  }
};

/**
 * POST /files/:id/link
 * Generate expiring presigned download link
 */
exports.createLink = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify file ownership before generating link
    const result = await db.query(
      'SELECT storage_path, original_name, expires_at FROM files WHERE id = $1 AND user_id = $2', 
      [id, req.user.id]
    );
    
    if (!result.rows.length) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'FILE_NOT_FOUND' } 
      });
    }
    
    const file = result.rows[0];
    
    // Check expiry
    if (file.expires_at && new Date(file.expires_at) < new Date()) {
      return res.status(410).json({ 
        success: false, 
        error: { code: 'FILE_EXPIRED' } 
      });
    }
    
    // Generate presigned URL with 1-hour expiry
    const url = await minio.presignedGetObject(
      BUCKET, 
      file.storage_path, 
      60 * 60 // 3600 seconds = 1 hour
    );
    
    // ✅ FIXED: Added 'data:' key before nested object
    res.json({ 
      success: true, 
      data: { 
        url, 
        expires_in: '1 hour',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        filename: file.original_name
      } 
    });
    
  } catch (err) {
    console.error('❌ Link generation error:', err);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'LINK_GENERATION_FAILED', 
        message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to generate link' 
      } 
    });
  }
};