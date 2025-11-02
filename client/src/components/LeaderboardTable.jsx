import { useState, useEffect } from 'react';
import { leagueAPI, matchStatsAPI } from '../services/api';
import './LeaderboardTable.css';

function LeaderboardTable({ leagueId }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    if (leagueId) {
      fetchLeaderboard();
    }
  }, [leagueId]);

  const fetchLeaderboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('Fetching leaderboard for league:', leagueId);
      const response = await leagueAPI.getLeaderboard(leagueId);
      console.log('Leaderboard response:', response.data);
      
      if (response.data.success) {
        setLeaderboard(response.data.data.leaderboard || []);
        console.log('Leaderboard set:', response.data.data.leaderboard?.length || 0, 'teams');
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefreshWithRecalculation = async () => {
    try {
      setRecalculating(true);
      setError(null);
      
      console.log('Recalculating points for league:', leagueId);
      
      // First, trigger points recalculation on the backend
      const recalcResponse = await matchStatsAPI.recalculateLeaguePoints(leagueId);
      console.log('Recalculation response:', recalcResponse.data);
      
      if (recalcResponse.data.success) {
        // Then fetch the updated leaderboard
        await fetchLeaderboard(true);
        
        // Show success message briefly
        const successMsg = recalcResponse.data.message || 'Points updated successfully!';
        console.log('✅', successMsg);
      } else {
        throw new Error(recalcResponse.data.message || 'Failed to recalculate points');
      }
    } catch (err) {
      console.error('Error recalculating points:', err);
      setError(err.response?.data?.message || err.message || 'Failed to recalculate points. Please try again.');
    } finally {
      setRecalculating(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankClass = (rank) => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-container">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={() => fetchLeaderboard()} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="leaderboard-container">
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <h4>No Points Yet</h4>
          <p>Points will appear here once matches are completed and scores are calculated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h3>🏆 Leaderboard</h3>
        <button 
          onClick={handleRefreshWithRecalculation}
          className="btn-refresh"
          disabled={recalculating || refreshing}
          title="Recalculate points from all matches and refresh leaderboard"
        >
          {recalculating ? (
            <>
              <span className="spinner-small"></span> Updating Points...
            </>
          ) : refreshing ? (
            <>
              <span className="spinner-small"></span> Refreshing...
            </>
          ) : (
            <>🔄 Refresh & Update</>
          )}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={() => setError(null)} className="btn-dismiss">×</button>
        </div>
      )}

      <div className="leaderboard-stats">
        <div className="stat-card">
          <span className="stat-label">Total Teams</span>
          <span className="stat-value">{leaderboard.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Leader</span>
          <span className="stat-value">{leaderboard[0]?.team_name || '-'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Top Score</span>
          <span className="stat-value">{leaderboard[0]?.total_points || 0} pts</span>
        </div>
      </div>

      <div className="leaderboard-table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="rank-col">Rank</th>
              <th className="team-col">Team</th>
              <th className="matches-col">Matches</th>
              <th className="points-col">Total Points</th>
              <th className="avg-col">Avg Points</th>
              <th className="trend-col">Trend</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((team, index) => {
              const prevRank = team.previous_rank || team.rank;
              const rankChange = prevRank - team.rank;
              
              return (
                <tr key={team.team_id} className={getRankClass(team.rank)}>
                  <td className="rank-col">
                    <div className="rank-badge">
                      {getRankBadge(team.rank)}
                    </div>
                  </td>
                  <td className="team-col">
                    <div className="team-info">
                      <h5>{team.team_name}</h5>
                      <span className="owner-name">{team.owner_name}</span>
                    </div>
                  </td>
                  <td className="matches-col">
                    <div className="matches-info">
                      <span className="matches-played">{team.matches_played || 0}</span>
                      <span className="matches-label">played</span>
                    </div>
                  </td>
                  <td className="points-col">
                    <div className="points-value">
                      {team.total_points || 0}
                    </div>
                  </td>
                  <td className="avg-col">
                    <div className="avg-value">
                      {team.average_points 
                        ? parseFloat(team.average_points).toFixed(1)
                        : '0.0'}
                    </div>
                  </td>
                  <td className="trend-col">
                    {rankChange > 0 && (
                      <span className="trend-up">
                        ↑ {rankChange}
                      </span>
                    )}
                    {rankChange < 0 && (
                      <span className="trend-down">
                        ↓ {Math.abs(rankChange)}
                      </span>
                    )}
                    {rankChange === 0 && team.matches_played > 0 && (
                      <span className="trend-same">
                        −
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="leaderboard-footer">
        <p className="update-info">
          📊 Last updated: {new Date().toLocaleString()}
        </p>
        <p className="help-text">
          Points are calculated after each match based on player performance
        </p>
      </div>
    </div>
  );
}

export default LeaderboardTable;
