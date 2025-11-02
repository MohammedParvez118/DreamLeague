import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tournamentAPI } from '../../services/api';
import './TournamentHome.css';

function TournamentHome() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');

  useEffect(() => {
    fetchTournamentData();
  }, [tournamentId]);

  const fetchTournamentData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tournamentAPI.getTournament(tournamentId);
      
      if (response.data.tournaments && response.data.tournaments.length > 0) {
        setTournament(response.data.tournaments[0]);
      } else {
        setError('Tournament not found');
      }
    } catch (err) {
      console.error('Error fetching tournament:', err);
      setError('Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setRefreshMessage('');
      await tournamentAPI.refreshTournament(tournamentId);
      setRefreshMessage('Tournament data refreshed successfully!');
      await fetchTournamentData();
      setTimeout(() => setRefreshMessage(''), 3000);
    } catch (err) {
      console.error('Error refreshing tournament:', err);
      setRefreshMessage('Failed to refresh tournament data');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading tournament data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!tournament) {
    return <div className="error">Tournament not found</div>;
  }

  return (
    <div className="tournament-home-page">
      <div className="tournament-header">
        <h2>{tournament.name}</h2>
        <div className="tournament-meta">
          <span className="badge">{tournament.type}</span>
          <span className="badge">{tournament.year}</span>
        </div>
      </div>

      {refreshMessage && (
        <div className={`message ${refreshMessage.includes('Failed') ? 'error' : 'success'}`}>
          {refreshMessage}
        </div>
      )}

      <div className="tournament-actions">
        <button 
          onClick={handleRefresh} 
          className="btn btn-refresh"
          disabled={refreshing}
        >
          {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Tournament Data'}
        </button>
      </div>

      <div className="tournament-navigation">
        <Link 
          to={`/tournament/tournament-fixtures/${tournamentId}`} 
          className="nav-card"
        >
          <div className="nav-card-icon">📅</div>
          <h3>Fixtures</h3>
          <p>View all matches and results</p>
        </Link>

        <Link 
          to={`/tournament/tournament-squads/${tournamentId}`} 
          className="nav-card"
        >
          <div className="nav-card-icon">👥</div>
          <h3>Squads</h3>
          <p>View team squads and players</p>
        </Link>

        <Link 
          to={`/tournament/tournament-stats/${tournamentId}`} 
          className="nav-card"
        >
          <div className="nav-card-icon">📊</div>
          <h3>Stats</h3>
          <p>Player statistics & fantasy points</p>
        </Link>
      </div>

      <div className="tournament-info">
        <h3>Tournament Details</h3>
        <table>
          <tbody>
            <tr>
              <th>Series ID:</th>
              <td>{tournament.series_id}</td>
            </tr>
            <tr>
              <th>Tournament Name:</th>
              <td>{tournament.name}</td>
            </tr>
            <tr>
              <th>Type:</th>
              <td>{tournament.type}</td>
            </tr>
            <tr>
              <th>Year:</th>
              <td>{tournament.year}</td>
            </tr>
            {tournament.start_date && (
              <tr>
                <th>Start Date:</th>
                <td>
                  {new Date(parseInt(tournament.start_date)).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </td>
              </tr>
            )}
            {tournament.end_date && (
              <tr>
                <th>End Date:</th>
                <td>
                  {new Date(parseInt(tournament.end_date)).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="back-link">
        <Link to="/home" className="btn btn-secondary">← Back to Home</Link>
      </div>
    </div>
  );
}

export default TournamentHome;