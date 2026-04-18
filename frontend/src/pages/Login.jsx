// frontend/src/pages/Login.jsx - Dark mode, ASCII icons
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@ztmft.com');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { 
        email: email.trim(), 
        password 
      });
      
      if (data.success && data.data?.accessToken) {
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('role', data.data.role);
        onLogin?.(data.data.role);
        navigate('/dashboard');
      } else {
        setError(data.error?.message || 'Authentication failed');
      }
    } catch (err) {
      const message = err.response?.data?.error?.message || 
                     err.response?.data?.error?.code ||
                     'Connection failed. Is backend running?';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: 24
    }}>
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            marginBottom: 4,
            fontFamily: 'monospace'
          }}>
            [ZT-MFT]
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
            Zero Trust Secure File Transfer
          </p>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <span className="ascii-icon">[!]</span> {error}
          </div>
        )}
        
        {/* Login form */}
        <form onSubmit={handleSubmit}>
          {/* Email field */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: 6, 
              fontWeight: 500,
              color: 'var(--text-secondary)',
              fontSize: 14
            }}>
              Email Address
            </label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="admin@ztmft.com"
            />
          </div>
          
          {/* Password field */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: 6, 
              fontWeight: 500,
              color: 'var(--text-secondary)',
              fontSize: 14
            }}>
              Password
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••••"
            />
          </div>
          
          {/* Submit button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? (
              <>
                <span className="ascii-icon loading">...</span>
                Authenticating...
              </>
            ) : (
              <>
                <span className="ascii-icon">{'[>]'}</span>
                Sign In
              </>
            )}
          </button>
        </form>
        
        {/* Footer / Security notice */}
        <div style={{ 
          marginTop: 24, 
          paddingTop: 16, 
          borderTop: '1px solid var(--border-color)',
          fontSize: 12, 
          color: 'var(--text-muted)', 
          textAlign: 'center',
          lineHeight: 1.6,
          fontFamily: 'monospace'
        }}>
          <div>[SECURITY] Zero Trust Active</div>
          <div>  + Device fingerprinting</div>
          <div>  + AES-256 encryption</div>
          <div>  + Audit logging enabled</div>
        </div>
      </div>
    </div>
  );
}