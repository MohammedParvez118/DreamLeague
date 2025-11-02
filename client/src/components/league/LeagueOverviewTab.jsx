import React from 'react';
import { useNavigate } from 'react-router-dom';
import LeagueInfo from '../LeagueInfo';
import LeaderboardTable from '../LeaderboardTable';
import './LeagueComponents.css';

function LeagueOverviewTab({ 
  leagueId,
  league, 
  teams,
  tournament,
  tournamentLoading,
  formatDate 
}) {
  const navigate = useNavigate();

  return (
    <div className="tab-panel">
      {/* Combined League Information & Details */}
      <section className="overview-section">
        <LeagueInfo leagueId={leagueId} league={league} />
      </section>

      {/* Teams List */}
      {teams && teams.length > 0 && (
        <section className="overview-section">
          <h3 className="section-title">🏆 Participating Teams ({teams.length})</h3>
          <div className="teams-grid">
            {teams.map((team, index) => (
              <div key={index} className="team-card">
                <div className="team-rank">#{index + 1}</div>
                <div className="team-info">
                  <div className="team-name">{team.team_name}</div>
                  <div className="team-owner">{team.team_owner}</div>
                </div>
                <div className="team-points">{team.total_points || 0} pts</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Leaderboard Section */}
      <section className="overview-section">
        <h3 className="section-title">🏆 Leaderboard</h3>
        <LeaderboardTable leagueId={leagueId} />
      </section>

      {/* Tournament Section */}
      <section className="overview-section">
        <h3 className="section-title">🏏 Tournament Information</h3>
        
        {!league.tournament_id ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <p>No tournament associated with this league</p>
          </div>
        ) : tournamentLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading tournament data...</p>
          </div>
        ) : tournament ? (
          <>
            <div className="tournament-info-grid">
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

            {/* Tournament Details Navigation */}
            <div className="tournament-navigation-section" style={{ marginTop: '20px' }}>
              <div className="navigation-card">
                <div className="navigation-icon">🏏</div>
                <h4>View Full Tournament Details</h4>
                <p>Explore complete tournament information including teams, squads, players, matches, and detailed statistics.</p>
                <button 
                  onClick={() => navigate(`/tournament/${league.tournament_id}`)} 
                  className="btn-primary"
                  style={{ marginTop: '15px' }}
                >
                  Go to Tournament Page →
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>Tournament data not available</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default LeagueOverviewTab;
