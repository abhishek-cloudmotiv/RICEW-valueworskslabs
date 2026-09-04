import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, Eye, EyeOff, X } from 'lucide-react';
import { signUp, confirmSignUp, resendConfirmationCode, signIn, loginWithApi } from '../../utils/cognito-auth';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import axios from 'axios';

const SignUp = () => {
    const { login } = useAuth();
    const { setUserId, setProjectId, setOrderId, setProjectName } = useSession();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Verification code state
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationEmail, setVerificationEmail] = useState('');
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [verificationError, setVerificationError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);

        try {
            // Sign up with Cognito
            await signUp(formData.email, formData.password, formData.fullName);

            // Show verification modal
            setVerificationEmail(formData.email);
            setShowVerificationModal(true);
            setError('');
        } catch (err) {
            console.error('Sign up error:', err);

            // Handle specific Cognito errors
            if (err.code === 'UsernameExistsException') {
                setError('An account with this email already exists');
            } else if (err.code === 'InvalidPasswordException') {
                setError('Password does not meet requirements. Must be at least 8 characters with uppercase, lowercase, numbers, and special characters');
            } else if (err.code === 'InvalidParameterException') {
                setError('Invalid email or password format');
            } else {
                setError(err.message || 'Failed to create account. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerificationSubmit = async (e) => {
        e.preventDefault();
        setVerificationError('');

        if (!verificationCode || verificationCode.length !== 6) {
            setVerificationError('Please enter a valid 6-digit code');
            return;
        }

        setVerificationLoading(true);

        try {
            // Step 1: Confirm email with Cognito
            await confirmSignUp(verificationEmail, verificationCode);

            console.log('Email verification successful, creating user details...');

            // Step 2: Create user details in DynamoDB
            try {
                const userDetailsPayload = {
                    user_email: verificationEmail,
                    user_name: formData.fullName
                };

                const response = await fetch('https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/rice/post/user-details', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(userDetailsPayload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Failed to create user details:', errorData);
                    // Don't block the user from logging in if this fails
                    // They're already verified in Cognito
                    throw new Error(errorData.message || 'Failed to create user details');
                }

                const result = await response.json();
                console.log('User details created successfully:', result);

                // Fetch project access details
                try {
                    const accessResponse = await axios.get('https://gl5xaesjob.execute-api.ap-south-1.amazonaws.com/New/api/admin/project-access', {
                        params: { email: verificationEmail }
                    });

                    if (accessResponse.data.success) {
                        const projectData = accessResponse.data.data;
                        
                        if (projectData && projectData.project_id) {
                            localStorage.setItem('project_id', projectData.project_id);
                            if (setProjectId) setProjectId(projectData.project_id);
                        }
                        
                        if (projectData && projectData.order_id) {
                            localStorage.setItem('order_id', projectData.order_id);
                            if (setOrderId) setOrderId(projectData.order_id);
                        }
                        
                        if (projectData && projectData.project_name) {
                            localStorage.setItem('project_name', projectData.project_name);
                            if (setProjectName) setProjectName(projectData.project_name);
                        }
                    }
                } catch (accessErr) {
                    console.error('Project access error during signup verification:', accessErr);
                }

                // Step 3: Automatically sign in the user via the new API
                const loginResult = await loginWithApi(verificationEmail, formData.password);
                const { id_token } = loginResult.data;

                // Step 4: Fetch user details from the API (to get user_id, etc.)
                const userDetailsResponse = await axios.get('https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/rice/get/user-details', {
                    params: {
                        user_email: verificationEmail
                    },
                    headers: {
                        Authorization: `Bearer ${id_token}`
                    }
                });

                if (userDetailsResponse.data.success && userDetailsResponse.data.count > 0) {
                    const user = userDetailsResponse.data.data[0];

                    // Step 5: Save non-sensitive user details in localStorage
                    localStorage.setItem('user_id', user.user_id);
                    localStorage.setItem('user_name', user.user_name);
                    localStorage.setItem('user_email', user.user_email);
                    if (setUserId) setUserId(user.user_id);

                    // Step 6: Store tokens in memory via context
                    login(loginResult.data);
                    setShowVerificationModal(false);
                    navigate('/dashboard');
                } else {
                    // If fetching details fails, still log them in and let them proceed
                    console.warn('Could not fetch user details, but login is successful.');
                    login(loginResult.data);
                    setShowVerificationModal(false);
                    navigate('/dashboard');
                }

            } catch (apiErr) {
                console.error('User details API error:', apiErr);

                // Even if user details creation fails, the Cognito account is verified
                // So we still allow them to proceed to login
                console.warn('User details API failed, but proceeding with login.');
                try {
                    const retryLoginResult = await loginWithApi(verificationEmail, formData.password);
                    login(retryLoginResult.data);
                    setShowVerificationModal(false);
                    navigate('/dashboard');
                } catch (signInErr) {
                    console.error('Auto sign-in after sign-up failed:', signInErr);
                    // If auto sign-in fails, redirect to login page as a fallback
                    setShowVerificationModal(false);
                    alert('Account verified! Please login.');
                    navigate('/login');
                }
            }

        } catch (err) {
            console.error('Verification error:', err);

            if (err.code === 'CodeMismatchException') {
                setVerificationError('Invalid verification code. Please try again.');
            } else if (err.code === 'ExpiredCodeException') {
                setVerificationError('Verification code has expired. Please request a new one.');
            } else {
                setVerificationError(err.message || 'Verification failed. Please try again.');
            }
        } finally {
            setVerificationLoading(false);
        }
    };

    const handleResendCode = async () => {
        setVerificationError('');
        setVerificationLoading(true);

        try {
            await resendConfirmationCode(verificationEmail);
            alert('Verification code has been resent to your email');
        } catch (err) {
            console.error('Resend code error:', err);
            setVerificationError(err.message || 'Failed to resend code. Please try again.');
        } finally {
            setVerificationLoading(false);
        }
    };

    const handleCloseVerificationModal = () => {
        setShowVerificationModal(false);
        setVerificationCode('');
        setVerificationError('');
    };

    return (
        <>
            <div className="login-container">
                <div className="login-box">
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <UserPlus size={40} color="#007bff" />
                    </div>
                    <h2>Sign Up</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label>Full Name:</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                    placeholder="John Doe"
                                    style={{ paddingRight: '40px' }}
                                    disabled={loading}
                                />
                                <User size={18} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Email:</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
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
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
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
                            <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                Must be at least 8 characters
                            </small>
                        </div>
                        <div className="input-group">
                            <label>Confirm Password:</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
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
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                        {error && <div className="error-message">{error}</div>}
                    </form>
                    <div style={{ marginTop: '1.5rem', textAlign: 'center', color: '#666' }}>
                        Already have an account? <Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>Login</Link>
                    </div>
                </div>
            </div>

            {/* Verification Code Modal */}
            {showVerificationModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        width: '90%',
                        maxWidth: '450px',
                        padding: '2rem',
                        position: 'relative'
                    }}>
                        <button
                            onClick={handleCloseVerificationModal}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#666',
                                padding: '4px'
                            }}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <Mail size={40} color="#007bff" />
                        </div>

                        <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Verify Your Email</h2>
                        <p style={{ textAlign: 'center', color: '#666', marginBottom: '1.5rem' }}>
                            We've sent a verification code to<br />
                            <strong>{verificationEmail}</strong>
                        </p>

                        <form onSubmit={handleVerificationSubmit}>
                            <div className="input-group">
                                <label>Verification Code:</label>
                                <input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setVerificationCode(value);
                                        if (verificationError) setVerificationError('');
                                    }}
                                    placeholder="Enter 6-digit code"
                                    maxLength="6"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '1.2rem',
                                        textAlign: 'center',
                                        letterSpacing: '0.5rem'
                                    }}
                                    disabled={verificationLoading}
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '1rem',
                                    cursor: verificationLoading ? 'not-allowed' : 'pointer',
                                    marginTop: '1rem',
                                    opacity: verificationLoading ? 0.6 : 1
                                }}
                                disabled={verificationLoading}
                            >
                                {verificationLoading ? 'Verifying...' : 'Verify Email'}
                            </button>

                            {verificationError && (
                                <div className="error-message" style={{ marginTop: '1rem' }}>
                                    {verificationError}
                                </div>
                            )}

                            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#007bff',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        fontSize: '0.9rem'
                                    }}
                                    disabled={verificationLoading}
                                >
                                    Resend Code
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default SignUp;
