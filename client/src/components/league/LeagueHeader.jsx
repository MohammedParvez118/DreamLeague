import React from 'react';
import './LeagueComponents.css';

function LeagueHeader({ league }) {
  return (
    <div className="league-header">
      <div className="header-content">
        <h1 className="league-title">🏆 {league.league_name}</h1>
        <div className="league-badges">
          <span className={`badge badge-${league.privacy}`}>
            {league.privacy === 'private' ? '🔒 Private' : '🌐 Public'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default LeagueHeader;
