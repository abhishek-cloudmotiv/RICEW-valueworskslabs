import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { loginWithApi, completeNewPassword, signIn } from '../../utils/cognito-auth';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import axios from 'axios';
import API_CONFIG from '../../config/apiConfig';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const { login } = useAuth();
  const { setUserId, setProjectId, setOrderId, setProjectName } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newPasswordRequired, setNewPasswordRequired] = useState(false);
  const [cognitoUserInstance, setCognitoUserInstance] = useState(null);

  const handleLoginProcess = async (loginEmail, loginPassword) => {
    setError('');
    setLoading(true);

    try {
      try {
        const accessParams = { email: loginEmail };
        if (projectId) {
          accessParams.project_id = projectId;
        }

        const accessResponse = await axios.get('https://gl5xaesjob.execute-api.ap-south-1.amazonaws.com/New/api/admin/project-access', {
          params: accessParams
        });

        if (!accessResponse.data.success) {
          setError(accessResponse.data.message || "No active access record found for this user");
          setLoading(false);
          return;
        }
        
        const projectData = accessResponse.data.data;
        
        if (projectData && projectData.project_id) {
          localStorage.setItem('project_id', projectData.project_id);
          if (setProjectId) setProjectId(projectData.project_id);
        } else if (projectId) {
          localStorage.setItem('project_id', projectId);
          if (setProjectId) setProjectId(projectId);
        }
        
        if (projectData && projectData.order_id) {
          localStorage.setItem('order_id', projectData.order_id);
          if (setOrderId) setOrderId(projectData.order_id);
        }
        
        if (projectData && projectData.project_name) {
          localStorage.setItem('project_name', projectData.project_name);
          if (setProjectName) setProjectName(projectData.project_name);
        }
      } catch (err) {
        console.error('Project access error:', err);
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to verify project access.');
        setLoading(false);
        return;
      }

      // Use the centralized login API utility
      const loginResult = await loginWithApi(loginEmail, loginPassword);

      // Handle NEW_PASSWORD_REQUIRED challenge
      if (loginResult.data.challengeName === 'NEW_PASSWORD_REQUIRED') {
        // Use the legacy SDK to get the cognitoUserInstance needed to complete the password change
        const legacyAuth = await signIn(loginEmail, loginPassword);
        if (legacyAuth.challenge === 'NewPasswordRequired') {
          setCognitoUserInstance(legacyAuth.cognitoUser);
          setNewPasswordRequired(true);
          setLoading(false);
          return;
        }
      }

      const { id_token, access_token, refresh_token, expires_in } = loginResult.data;


      // Fetch user details
      const userDetailsResponse = await axios.get('https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/rice/get/user-details', {
        params: {
          user_email: loginEmail
        },
        headers: {
          Authorization: `Bearer ${id_token}`
        }
      });

      if (userDetailsResponse.data.success && userDetailsResponse.data.count > 0) {
        const user = userDetailsResponse.data.data[0];

        // Save non-sensitive user details in localStorage for UI convenience (not auth-critical)
        localStorage.setItem('user_id', user.user_id);
        localStorage.setItem('user_name', user.user_name);
        localStorage.setItem('user_email', user.user_email);
        setUserId(user.user_id);

        // Store tokens in memory via context (no localStorage for auth tokens)
        login({
          id_token,
          access_token,
          refresh_token,
          expires_in
        });

        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setError('Failed to fetch user details.');
      }
    } catch (err) {
      console.error('Login error:', err);

      // Handle the custom error structure from the new API
      const errorMessage = err.response?.data?.message || err.message || 'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleLoginProcess(email, password);
  };

  const handleNewPasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setError('');
    setLoading(true);

    try {
      await completeNewPassword(cognitoUserInstance, newPassword);
      console.log('Password reset successful, performing fresh login');

      setNewPasswordRequired(false);
      await handleLoginProcess(email, newPassword);
    } catch (err) {
      console.error('New password completion error:', err);
      setError(err.message || 'Failed to set new password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAutoLogin = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      if (token) {
        try {
          setLoading(true);
          const response = await axios.get(`https://d0aynp5ued.execute-api.ap-south-1.amazonaws.com/dev/api/admin/temp-login-new`, {
            params: { token }
          });

          if (response.data.success) {
            const { email: tempEmail, temp_password, project_id } = response.data.data;

            if (project_id) {
              localStorage.setItem('project_id', project_id);
              console.log('Project ID stored from temp login:', project_id);
            }

            if (tempEmail && temp_password) {
              setEmail(tempEmail); // Populate the email state for subsequent calls
              await handleLoginProcess(tempEmail, temp_password);
            }
          }
        } catch (err) {
          console.error("Temporary login failed:", err);
          setError(err.response?.data?.error || "Invalid or expired login link.");
        } finally {
          setLoading(false);
        }
      }
    };

    checkAutoLogin();
  }, [location]);

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <User size={40} color="#007bff" />
        </div>
        <h2>{newPasswordRequired ? 'Set New Password' : 'Login'}</h2>

        {newPasswordRequired ? (
          <form onSubmit={handleNewPasswordSubmit}>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem', textAlign: 'center' }}>
              You are logging in with a temporary password and must set a new one.
            </p>
            <div className="input-group">
              <label>New Password:</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? "text" : "password"}
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
                    onClick={() => setShowNewPassword(!showNewPassword)}
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
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="input-group">
              <label>Confirm New Password:</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? "text" : "password"}
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
              {loading ? 'Setting Password...' : 'Save & Login'}
            </button>
            <button
              type="button"
              onClick={() => setNewPasswordRequired(false)}
              style={{ marginTop: '0.5rem', background: 'none', border: '1px solid #ddd', color: '#666' }}
              disabled={loading}
            >
              Back to Login
            </button>
            {error && <div className="error-message">{error}</div>}
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Email:</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    required
                    placeholder="john@example.com"
                    style={{ paddingRight: '40px' }}
                    disabled={loading}
                  />
                  <Mail size={18} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                </div>
              </div>
              <div className="input-group">
                <label>Password:</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    required
                    placeholder="Enter your password"
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
              <button type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
              {error && <div className="error-message">{error}</div>}
            </form>
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <Link to="/forgot-password" style={{ color: '#007bff', textDecoration: 'none', fontSize: '0.9rem' }}>
                Forgot Password?
              </Link>
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'center', color: '#666' }}>
              Don't have an account? <Link to="/signup" style={{ color: '#007bff', textDecoration: 'none' }}>Sign Up</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;