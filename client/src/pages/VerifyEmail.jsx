import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './VerifyEmail.css';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verifying your email...');
  
  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }
    
    verifyEmail(token);
  }, [searchParams]);
  
  const verifyEmail = async (token) => {
    try {
      const response = await authAPI.verifyEmail(token);
      setStatus('success');
      setMessage(response.data.message || 'Email verified successfully!');
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (err) {
      console.error('Verification error:', err);
      setStatus('error');
      setMessage(err.response?.data?.error || 'Verification failed. Link may be expired.');
    }
  };
  
  return (
    <div className="verify-page">
      <div className="verify-container">
        <div className="verify-content">
          {status === 'verifying' && (
            <>
              <div className="verify-icon spinning">⏳</div>
              <h2>Verifying Your Email...</h2>
              <p>{message}</p>
              <p className="subtext">Please wait while we verify your account...</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="verify-icon success">✅</div>
              <h2>Welcome to CricFantasy!</h2>
              <p className="success-message">{message}</p>
              <p className="subtext">Your account has been successfully verified.</p>
              <p className="redirect-text">Redirecting to login page...</p>
              <div className="loading-bar">
                <div className="loading-progress"></div>
              </div>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="verify-icon error">❌</div>
              <h2>Verification Failed</h2>
              <p className="error-message">{message}</p>
              <p className="subtext">Please try registering again or contact support.</p>
              <button onClick={() => navigate('/auth')} className="verify-btn">
                Go to Registration
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
