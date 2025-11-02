import React, { useState } from 'react';
import './LeagueComponents.css';

function LeagueDetailsTab({ league, teams, formatDate }) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyCode = () => {
    if (league?.league_code) {
      navigator.clipboard.writeText(league.league_code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="tab-panel">
      {/* League Information Cards */}
      <div className="info-cards">
        <div className="info-card">
          <div className="card-icon">👥</div>
          <div className="card-content">
            <div className="card-label">League Size</div>
            <div className="card-value">{league.team_count} Teams</div>
          </div>
        </div>

        <div className="info-card">
          <div className="card-icon">📋</div>
          <div className="card-content">
            <div className="card-label">Squad Size</div>
            <div className="card-value">{league.squad_size || 15} Players</div>
            <div className="card-subtext">Per team</div>
          </div>
        </div>

        <div className="info-card">
          <div className="card-icon">🎯</div>
          <div className="card-content">
            <div className="card-label">Tournament</div>
            <div className="card-value">
              {league.tournament_name || 'No tournament'}
            </div>
            {league.tournament_type && league.tournament_year && (
              <div className="card-subtext">
                {league.tournament_type} • {league.tournament_year}
              </div>
            )}
          </div>
        </div>

        <div className="info-card">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <div className="card-label">Created</div>
            <div className="card-value">{formatDate(league.created_at)}</div>
          </div>
        </div>

        <div className="info-card">
          <div className="card-icon">🔑</div>
          <div className="card-content">
            <div className="card-label">Privacy</div>
            <div className="card-value">
              {league.privacy === 'private' ? 'Private League' : 'Public League'}
            </div>
          </div>
        </div>
      </div>

      {/* Private League Code Section */}
      {league.privacy === 'private' && league.league_code && (
        <div className="league-code-section">
          <h3>🔐 Private League Code</h3>
          <p>Share this code with others to join this league:</p>
          <div className="code-display">
            <div className="code-text">{league.league_code}</div>
            <button 
              onClick={handleCopyCode} 
              className="btn-copy"
              title="Copy to clipboard"
            >
              {copySuccess ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Description Section */}
      {league.description && (
        <div className="description-section">
          <h3>📝 League Description</h3>
          <p className="description-text">{league.description}</p>
        </div>
      )}

      {/* Teams Section */}
      <div className="teams-section">
        <div className="section-header">
          <h3>🏏 Teams ({teams.length}/{league.team_count})</h3>
        </div>
        
        {teams.length > 0 ? (
          <div className="teams-grid">
            {teams.map((team, index) => (
              <div key={team.id} className="team-card">
                <div className="team-number">#{index + 1}</div>
                <div className="team-info">
                  <div className="team-name">{team.team_name}</div>
                  <div className="team-owner">Owner: {team.team_owner}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>No teams have joined this league yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeagueDetailsTab;
