import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import { forgotPassword, confirmPassword } from '../../utils/cognito-auth';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState(1); // 1: Request Code, 2: Reset Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccessMsg('Verification code sent to your email.');
      setStage(2);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!code || !newPassword || !confirmNewPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await confirmPassword(email, code, newPassword);
      setSuccessMsg('Password successfully reset! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Confirm password error:', err);
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <KeyRound size={40} color="#007bff" />
        </div>
        <h2>Forgot Password</h2>

        {error && <div className="error-message" style={{ color: '#dc3545', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}
        {successMsg && <div className="success-message" style={{ color: '#28a745', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{successMsg}</div>}

        {stage === 1 ? (
          <form onSubmit={handleRequestCode}>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem', textAlign: 'center' }}>
              Enter your email address and we'll send you a verification code to reset your password.
            </p>
            <div className="input-group">
              <label>Email:</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                    if (successMsg) setSuccessMsg('');
                  }}
                  required
                  placeholder="john@example.com"
                  style={{ paddingRight: '40px' }}
                  disabled={loading}
                />
                <Mail size={18} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              </div>
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
            <div style={{ marginTop: '1.5rem', textAlign: 'center', color: '#666' }}>
              Remember your password? <Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>Back to Login</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
             <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem', textAlign: 'center' }}>
              A verification code has been sent to <strong>{email}</strong>. Enter it below along with your new password.
            </p>
            <div className="input-group">
              <label>Verification Code:</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (error) setError('');
                  }}
                  required
                  placeholder="Enter 6-digit code"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="input-group">
              <label>New Password:</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError('');
                  }}
                  required
                  placeholder="Minimum 8 characters"
                  style={{ paddingRight: '65px' }}
                  disabled={loading}
                />
                <div style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Lock size={18} style={{ color: '#666' }} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      color: '#666'
                    }}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="input-group">
              <label>Confirm New Password:</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                    if (error) setError('');
                  }}
                  required
                  placeholder="Re-enter new password"
                  style={{ paddingRight: '40px' }}
                  disabled={loading}
                />
                <Lock size={18} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              </div>
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <div style={{ marginTop: '1.5rem', textAlign: 'center', color: '#666' }}>
              <button 
                type="button" 
                onClick={() => setStage(1)}
                style={{ background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
              >
                Change Email Address
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
