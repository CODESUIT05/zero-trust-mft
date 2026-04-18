// frontend/src/pages/Dashboard.jsx - Dark mode, ASCII icons
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Dashboard({ onLogout }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [userRole, setUserRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('role');
    setUserRole(role || 'user');
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    onLogout?.();
    navigate('/login');
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setStatus('File too large. Max 50MB allowed.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setStatus('Encrypting and uploading...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (data.success) {
        setStatus(`Uploaded: ${data.data.name}`);
        setFiles(prev => [{
          fileId: data.data.fileId,
          name: data.data.name,
          checksum: data.data.checksum,
          size: data.data.size,
          uploadedAt: new Date().toISOString()
        }, ...prev]);
      } else {
        setStatus(`Error: ${data.error?.message || 'Upload failed'}`);
      }
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Upload failed';
      setStatus(`Error: ${message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (fileId, filename) => {
    setStatus('Generating secure link...');
    
    try {
      const { data } = await api.post(`/files/${fileId}/link`);
      
      if (data.success && data.data.url) {
        window.open(data.data.url, '_blank');
        setStatus(`Download started: ${filename}`);
      } else {
        setStatus(`Error: ${data.error?.message || 'Failed to generate link'}`);
      }
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Download failed';
      setStatus(`Error: ${message}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const truncateChecksum = (checksum) => {
    if (!checksum) return 'N/A';
    return `${checksum.substring(0, 12)}...${checksum.substring(checksum.length - 8)}`;
  };

  return (
    <div style={{ 
      padding: 24, 
      maxWidth: 1200, 
      margin: '0 auto',
      background: 'var(--bg-primary)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 28,
        paddingBottom: 16,
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <div style={{ 
            fontSize: 20, 
            fontWeight: 700, 
            marginBottom: 4,
            fontFamily: 'monospace'
          }}>
            [DASHBOARD]
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
            Role: <strong style={{ color: 'var(--accent-blue)' }}>{userRole}</strong> | Zero Trust: Active
          </p>
        </div>
        <button 
          onClick={handleLogout} 
          className="btn btn-danger btn-sm"
        >
          <span className="ascii-icon">[X]</span> Logout
        </button>
      </div>

      {/* Upload Section */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ marginTop: 0, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
          <span className="ascii-icon">[^]</span> Upload Encrypted File
        </h3>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="file" 
            onChange={handleUpload} 
            disabled={uploading}
            className="input"
            style={{ flex: 1, minWidth: 200, background: 'var(--bg-primary)' }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'monospace' }}>
            Max: 50MB | AES-256
          </span>
        </div>
        
        {status && (
          <div className={`alert ${status.includes('Error') ? 'alert-error' : 'alert-success'}`} style={{ marginTop: 12 }}>
            <span className="ascii-icon">{status.includes('Error') ? '[!]' : '[*]'}</span> {status}
          </div>
        )}
      </div>

      {/* Files List */}
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 16 
        }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            <span className="ascii-icon">[#]</span> Your Files
          </h3>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {files.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ margin: '0 0 8px 0', fontSize: 16, fontFamily: 'monospace' }}>
              [EMPTY] No files uploaded yet
            </p>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
              Upload a file above to get started
            </p>
          </div>
        ) : (
          <div style={{ overflow: 'hidden', borderRadius: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Checksum (SHA-256)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, index) => (
                  <tr key={file.fileId || index}>
                    <td style={{ fontFamily: 'monospace' }}>{file.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {formatFileSize(file.size)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                      {truncateChecksum(file.checksum)}
                    </td>
                    <td>
                      <button 
                        onClick={() => handleDownload(file.fileId, file.name)}
                        className="btn btn-primary btn-sm"
                        disabled={uploading}
                      >
                        <span className="ascii-icon">[v]</span> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Zero Trust Status */}
      <div style={{ 
        marginTop: 32, 
        padding: '12px 16px', 
        background: 'var(--info-bg)', 
        borderRadius: 8, 
        fontSize: 13, 
        color: 'var(--accent-blue)',
        borderLeft: '4px solid var(--accent-blue)',
        fontFamily: 'monospace'
      }}>
        <div>[Zero Trust]</div>
        <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
          + Device fingerprinted | Request authorized | Transfer encrypted | Action audited
        </div>
      </div>
    </div>
  );
}