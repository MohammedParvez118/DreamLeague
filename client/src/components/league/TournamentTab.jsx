import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LeagueComponents.css';

function TournamentTab({ 
  league, 
  tournament, 
  tournamentLoading
}) {
  const navigate = useNavigate();

  if (!league.tournament_id) {
    return (
      <div className="tab-panel">
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <p>No tournament associated with this league</p>
        </div>
      </div>
    );
  }

  if (tournamentLoading) {
    return (
      <div className="tab-panel">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading tournament data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      {/* Tournament Info */}
      {tournament && (
        <div className="tournament-info-section">
          <h3>🏏 Tournament Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Name:</span>
              <span className="value">{tournament.name}</span>
            </div>
            <div className="info-item">
              <span className="label">Type:</span>
              <span className="value">{tournament.type}</span>
            </div>
            <div className="info-item">
              <span className="label">Year:</span>
              <span className="value">{tournament.year}</span>
            </div>
            <div className="info-item">
              <span className="label">Series ID:</span>
              <span className="value">{tournament.series_id}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Details Navigation */}
      <div className="tournament-navigation-section">
        <div className="navigation-card">
          <div className="navigation-icon">🏏</div>
          <h3>View Tournament Details</h3>
          <p>View complete tournament information including teams, squads, players, matches, and detailed statistics.</p>
          <button 
            onClick={() => navigate(`/tournament/${league.tournament_id}`)} 
            className="btn-primary"
            style={{ marginTop: '15px' }}
          >
            Go to Tournament Page →
          </button>
        </div>
      </div>
    </div>
  );
}

export default TournamentTab;
