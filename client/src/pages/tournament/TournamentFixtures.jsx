import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tournamentAPI } from '../../services/api';
import './TournamentFixtures.css';

function TournamentFixtures() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');

  useEffect(() => {
    fetchFixtures();
  }, [tournamentId]);

  const sortMatchesByDescription = (matches) => {
    // Define playoff stage priority order
    const getPlayoffPriority = (desc) => {
      const lowerDesc = desc.toLowerCase();
      if (lowerDesc.includes('quarter') || lowerDesc.includes('qualifier')) return 1;
      if (lowerDesc.includes('semi') || lowerDesc.includes('eliminator')) return 2;
      if (lowerDesc.includes('final') && !lowerDesc.includes('semi') && !lowerDesc.includes('quarter')) return 3;
      return 0; // Not a playoff match
    };

    return matches.sort((a, b) => {
      const descA = a.match_description || '';
      const descB = b.match_description || '';
      
      // Extract match number from description (e.g., "1st Match", "2nd Match")
      const matchA = descA.match(/(\d+)(st|nd|rd|th)\s+Match/i);
      const matchB = descB.match(/(\d+)(st|nd|rd|th)\s+Match/i);
      
      // Get playoff priorities
      const playoffA = getPlayoffPriority(descA);
      const playoffB = getPlayoffPriority(descB);
      
      // If both have match numbers (league stage), sort numerically
      if (matchA && matchB) {
        return parseInt(matchA[1]) - parseInt(matchB[1]);
      }
      
      // If one has match number and other doesn't, numbered match comes first
      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;
      
      // Both are non-numbered matches (playoffs, etc.)
      // If both are playoff matches, sort by playoff priority
      if (playoffA > 0 && playoffB > 0) {
        if (playoffA !== playoffB) {
          return playoffA - playoffB; // Quarter Finals < Semi Finals < Finals
        }
        // Same playoff stage, sort alphabetically (e.g., "1st Semi-Final" before "2nd Semi-Final")
        return descA.localeCompare(descB);
      }
      
      // If only one is a playoff match, playoff comes after numbered matches
      if (playoffA > 0 && playoffB === 0) return 1;
      if (playoffA === 0 && playoffB > 0) return -1;
      
      // Neither is numbered nor playoff, sort alphabetically
      return descA.localeCompare(descB);
    });
  };

  const fetchFixtures = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tournamentAPI.getFixtures(tournamentId);
      const sortedMatches = sortMatchesByDescription(response.data.matches || []);
      setMatches(sortedMatches);
    } catch (err) {
      console.error('Error fetching fixtures:', err);
      setError('Failed to load fixtures');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshFixtures = async () => {
    try {
      setRefreshing(true);
      setRefreshMessage('');
      
      // Call the tournament refresh API to get latest fixtures
      await tournamentAPI.refreshTournament(tournamentId);
      
      setRefreshMessage('✅ Fixtures refreshed successfully!');
      
      // Reload the fixtures
      await fetchFixtures();
      
      // Clear message after 3 seconds
      setTimeout(() => setRefreshMessage(''), 3000);
    } catch (err) {
      console.error('Error refreshing fixtures:', err);
      setRefreshMessage('❌ Failed to refresh fixtures');
      setTimeout(() => setRefreshMessage(''), 5000);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMatchClick = (match) => {
    // Navigate to scorecard page with rapidApiMatchId as query parameter
    navigate(`/tournament/tournament-fixtures/${tournamentId}/${match.match_id}?rapidApiMatchId=${match.match_id}`);
  };

  if (loading) {
    return <div className="loading">Loading fixtures...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="tournament-fixtures-page">
      <div className="page-header">
        <h2>Tournament Fixtures</h2>
        <div className="header-actions">
          <button 
            onClick={handleRefreshFixtures} 
            className="btn btn-refresh"
            disabled={refreshing || loading}
            title="Refresh fixtures to get latest matches from API"
          >
            {refreshing ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Refreshing...
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt"></i> Refresh Fixtures
              </>
            )}
          </button>
          <Link to={`/tournament/tournament-home/${tournamentId}`} className="btn btn-secondary">
            <i className="fas fa-arrow-left"></i> Back to Tournament
          </Link>
        </div>
      </div>

      {refreshMessage && (
        <div className={`refresh-message ${refreshMessage.includes('Failed') ? 'error' : 'success'}`}>
          {refreshMessage}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="no-data">
          <p>No fixtures available for this tournament.</p>
          <p>Click the refresh button on the tournament home page to fetch match data.</p>
        </div>
      ) : (
        <div className="fixtures-container">
          <table className="fixtures-table">
            <thead>
              <tr>
                <th>Match ID</th>
                <th>Team 1</th>
                <th>Team 2</th>
                <th>Match Description</th>
                <th>Start Time</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr 
                  key={match.match_id} 
                  className="match-row clickable"
                  onClick={() => handleMatchClick(match)}
                  title="Click to view scorecard"
                >
                  <td>{match.match_id}</td>
                  <td className="team-name">{match.team1}</td>
                  <td className="team-name">{match.team2}</td>
                  <td>{match.match_description || 'N/A'}</td>
                  <td>
                    {match.start_time_formatted || 
                     (match.start_time ? new Date(parseInt(match.start_time)).toLocaleDateString() : 'N/A')}
                  </td>
                  <td className="result-cell">
                    {match.result || 'Upcoming'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="fixtures-summary">
            <p>Total Matches: <strong>{matches.length}</strong></p>
          </div>
        </div>
      )}
    </div>
  );
}

export default TournamentFixtures;