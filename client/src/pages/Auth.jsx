import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Auth.css';

function Auth() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login'); // login, register, forgot
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [forgotData, setForgotData] = useState({ email: '' });

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!loginData.email || !loginData.password) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.login(loginData);
      
      // Store token and user data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      setMessage({ type: 'success', text: 'Login successful!' });
      setTimeout(() => navigate('/home'), 1500);
    } catch (err) {
      console.error('Login error:', err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Invalid credentials' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!registerData.username || !registerData.email || 
        !registerData.password || !registerData.confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (registerData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.register({
        username: registerData.username,
        email: registerData.email,
        password: registerData.password
      });
      
      // Use the message from the server
      const successMessage = response.data.message || 'Registration successful!';
      const isAutoVerified = response.data.user?.isVerified;
      
      setMessage({ 
        type: 'success', 
        text: successMessage
      });
      
      // Reset form
      setRegisterData({ username: '', email: '', password: '', confirmPassword: '' });
      
      // If auto-verified, redirect to login after 2 seconds
      // If email verification needed, redirect after 4 seconds for user to read message
      setTimeout(() => setActiveTab('login'), isAutoVerified ? 2000 : 4000);
    } catch (err) {
      console.error('Registration error:', err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Registration failed' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!forgotData.email) {
      setMessage({ type: 'error', text: 'Please enter your email' });
      return;
    }

    try {
      setLoading(true);
      await authAPI.forgotPassword(forgotData);
      
      setMessage({ 
        type: 'success', 
        text: 'Password reset link sent to your email!' 
      });
      
      setForgotData({ email: '' });
    } catch (err) {
      console.error('Forgot password error:', err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Failed to send reset link' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-logo">🏏 CricFantasy</h1>
          <p className="auth-tagline">Your Fantasy Cricket Universe</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('login');
              setMessage({ type: '', text: '' });
            }}
          >
            Login
          </button>
          <button
            className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('register');
              setMessage({ type: '', text: '' });
            }}
          >
            Register
          </button>
          <button
            className={`tab-btn ${activeTab === 'forgot' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('forgot');
              setMessage({ type: '', text: '' });
            }}
          >
            Forgot Password
          </button>
        </div>

        {message.text && (
          <div className={`auth-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                type="email"
                id="login-email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <div className="auth-links">
              <button
                type="button"
                className="link-btn"
                onClick={() => setActiveTab('forgot')}
              >
                Forgot Password?
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() => setActiveTab('register')}
              >
                Don't have an account? Register
              </button>
            </div>
          </form>
        )}

        {/* Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="register-username">Username</label>
              <input
                type="text"
                id="register-username"
                value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                placeholder="Choose a username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-email">Email</label>
              <input
                type="email"
                id="register-email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-password">Password</label>
              <input
                type="password"
                id="register-password"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                placeholder="Create a password (min 6 characters)"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-confirm-password">Confirm Password</label>
              <input
                type="password"
                id="register-confirm-password"
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                required
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>

            <div className="auth-links">
              <button
                type="button"
                className="link-btn"
                onClick={() => setActiveTab('login')}
              >
                Already have an account? Login
              </button>
            </div>
          </form>
        )}

        {/* Forgot Password Form */}
        {activeTab === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <p className="forgot-text">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <div className="form-group">
              <label htmlFor="forgot-email">Email</label>
              <input
                type="email"
                id="forgot-email"
                value={forgotData.email}
                onChange={(e) => setForgotData({ email: e.target.value })}
                placeholder="Enter your email"
                required
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="auth-links">
              <button
                type="button"
                className="link-btn"
                onClick={() => setActiveTab('login')}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          <a href="/" className="back-home-link">← Back to Home</a>
        </div>
      </div>
    </div>
  );
}

export default Auth;
