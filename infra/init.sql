CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  original_name VARCHAR(255),
  storage_path VARCHAR(255),
  checksum_sha256 VARCHAR(64),
  iv_hex VARCHAR(32),
  auth_tag_hex VARCHAR(32),
  size_bytes BIGINT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(50),
  resource_id UUID,
  ip VARCHAR(45),
  device_fp VARCHAR(64),
  status VARCHAR(20),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (email, password_hash, role) VALUES
('admin@ztmft.com', '$2b$10$X8Y9Z0A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4', 'admin')
ON CONFLICT DO NOTHING;