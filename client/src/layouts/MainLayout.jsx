import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './MainLayout.css';

function MainLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user from localStorage
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  const handleSignOut = () => {
    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to landing page
    navigate('/');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="container">
          <div className="header-content">
            <Link to="/home" className="logo-link">
              <h1>🏏 Dream League</h1>
            </Link>
            <nav className="app-nav">
              {user && (
                <div className="user-menu">
                  <span className="username">👤 {user.username || user.email}</span>
                  <button onClick={handleSignOut} className="sign-out-btn">
                    Sign Out
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="app-main container">
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="container">
          <p>&copy; 2025 Dream League - All Rights Reserved</p>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;