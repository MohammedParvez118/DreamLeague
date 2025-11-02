import { Link } from 'react-router-dom';
import './Landing.css';

function Landing() {
  return (
    <div className="landing-page">
      <div className="landing-overlay">
        <div className="landing-content">
          <div className="logo-container">
            <div className="cricket-ball">🏏</div>
          </div>
          
          <h1 className="landing-title">Dream League</h1>
          
          <p className="landing-description">
            Create your own fantasy cricket leagues with custom players, teams, and tournaments
          </p>
          
          <div className="landing-buttons">
            <Link to="/auth" className="get-started-btn">
              Get Started
            </Link>
          </div>
          
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-icon">🏆</span>
              <span className="feature-text">Create Leagues</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">👥</span>
              <span className="feature-text">Build Teams</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span className="feature-text">Track Stats</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <span className="feature-text">Live Tournaments</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Landing;
