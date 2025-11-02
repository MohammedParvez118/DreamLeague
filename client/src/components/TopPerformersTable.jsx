import { useState, useEffect } from 'react';
import { leagueAPI } from '../services/api';
import './TopPerformersTable.css';

function TopPerformersTable({ leagueId }) {
  const [performers, setPerformers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (leagueId) {
      fetchTopPerformers();
    }
  }, [leagueId, roleFilter, limit]);

  const fetchTopPerformers = async () => {
    try {
      setLoading(true);
      const response = await leagueAPI.getTopPerformers(leagueId, roleFilter, limit);
      
      if (response.data.success) {
        setPerformers(response.data.data.players || []);
      }
    } catch (err) {
      console.error('Error fetching top performers:', err);
      setError('Failed to load top performers');
    } finally {
      setLoading(false);
    }
  };

  const getRankMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  const getRoleIcon = (role) => {
    const icons = {
      'WK-Batter': '🧤',
      'Batter': '🏏',
      'Batting Allrounder': '⚡',
      'Bowling Allrounder': '💪',
      'Bowler': '⚾',
      // Legacy support
      'Wicketkeeper': '🧤',
      'Batsman': '🏏',
      'Allrounder': '⚡'
    };
    return icons[role] || '👤';
  };

  if (loading) {
    return (
      <div className="top-performers-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading top performers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="top-performers-container">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchTopPerformers} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="top-performers-container">
      <div className="performers-header">
        <h3>⭐ Top Performers</h3>
      </div>

      <div className="performers-filters">
        <div className="filter-group">
          <label htmlFor="roleFilter">Filter by Role:</label>
          <select
            id="roleFilter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="WK-Batter">🧤 Wicket-Keepers</option>
            <option value="Batter">🏏 Batsmen</option>
            <option value="Batting Allrounder">⚡ Batting Allrounders</option>
            <option value="Bowling Allrounder">💪 Bowling Allrounders</option>
            <option value="Bowler">⚾ Bowlers</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="limitFilter">Show:</label>
          <select
            id="limitFilter"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
          >
            <option value="5">Top 5</option>
            <option value="10">Top 10</option>
            <option value="15">Top 15</option>
            <option value="20">Top 20</option>
          </select>
        </div>
      </div>

      {performers.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">⭐</span>
          <h4>No Data Available</h4>
          <p>Top performers will appear here once matches are completed and points are calculated.</p>
        </div>
      ) : (
        <div className="performers-grid">
          {performers.map((player, index) => (
            <div key={player.player_id} className={`performer-card rank-${index + 1}`}>
              <div className="rank-badge">
                {getRankMedal(index + 1)}
              </div>

              <div className="player-image-container">
                <img 
                  src={player.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzM3NDE0OSIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNDUiIHI9IjIwIiBmaWxsPSIjNjM3MzhCIi8+PHBhdGggZD0iTTMwIDEwMCBRNjAgNzAgOTAgMTAwIiBmaWxsPSIjNjM3MzhCIi8+PC9zdmc+'} 
                  alt={player.player_name}
                  onError={(e) => { e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzM3NDE0OSIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNDUiIHI9IjIwIiBmaWxsPSIjNjM3MzhCIi8+PHBhdGggZD0iTTMwIDEwMCBRNjAgNzAgOTAgMTAwIiBmaWxsPSIjNjM3MzhCIi8+PC9zdmc+'; }}
                />
                <div className="role-overlay">
                  {getRoleIcon(player.role)}
                </div>
              </div>

              <div className="player-details">
                <h4>{player.player_name}</h4>
                <div className="player-meta">
                  <span className="team-name">{player.team_name}</span>
                  <span className="role-badge">{player.role}</span>
                </div>
              </div>

              <div className="stats-container">
                <div className="stat-item primary">
                  <span className="stat-value">{player.total_fantasy_points || 0}</span>
                  <span className="stat-label">Total Points</span>
                </div>

                <div className="stats-row">
                  <div className="stat-item">
                    <span className="stat-value">{player.matches_played || 0}</span>
                    <span className="stat-label">Matches</span>
                  </div>

                  <div className="stat-item">
                    <span className="stat-value">
                      {player.average_points 
                        ? parseFloat(player.average_points).toFixed(1)
                        : '0.0'}
                    </span>
                    <span className="stat-label">Avg/Match</span>
                  </div>

                  <div className="stat-item">
                    <span className="stat-value">{player.ownership_count || 0}</span>
                    <span className="stat-label">Owners</span>
                  </div>
                </div>

                {player.highest_score && (
                  <div className="highest-score">
                    <span className="label">Best:</span>
                    <span className="value">{player.highest_score} pts</span>
                  </div>
                )}
              </div>

              {player.ownership_percentage && (
                <div className="ownership-bar">
                  <div 
                    className="ownership-fill" 
                    style={{ width: `${Math.min(player.ownership_percentage, 100)}%` }}
                  ></div>
                  <span className="ownership-text">
                    {parseFloat(player.ownership_percentage).toFixed(0)}% owned
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="performers-footer">
        <p className="info-text">
          💡 Points are calculated based on batting, bowling, and fielding performance
        </p>
      </div>
    </div>
  );
}

export default TopPerformersTable;
