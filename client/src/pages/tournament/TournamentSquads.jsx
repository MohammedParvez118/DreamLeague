import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tournamentAPI } from '../../services/api';
import './TournamentSquads.css';

function TournamentSquads() {
  const { tournamentId } = useParams();
  const [squadsData, setSquadsData] = useState([]);
  const [squadNames, setSquadNames] = useState([]);
  const [selectedSquad, setSelectedSquad] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSquads();
  }, [tournamentId]);

  const fetchSquads = async (squad = '') => {
    try {
      setLoading(true);
      setError(null);
      const response = await tournamentAPI.getSquads(tournamentId, squad);
      
      setSquadsData(response.data.squadsWithPlayers || []);
      setSquadNames(response.data.squadNames || []);
      setSelectedSquad(response.data.selectedSquad || '');
    } catch (err) {
      console.error('Error fetching squads:', err);
      setError('Failed to load squads');
    } finally {
      setLoading(false);
    }
  };

  const handleSquadFilter = (e) => {
    const squad = e.target.value;
    setSelectedSquad(squad);
    fetchSquads(squad);
  };

  if (loading) {
    return <div className="loading">Loading squads...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="tournament-squads-page">
      <div className="page-header">
        <h2>Tournament Squads</h2>
        <Link to={`/tournament/tournament-home/${tournamentId}`} className="btn btn-secondary">
          ← Back to Tournament
        </Link>
      </div>

      {squadNames.length > 0 && (
        <div className="filter-section">
          <label htmlFor="squadFilter">Filter by Team:</label>
          <select 
            id="squadFilter" 
            value={selectedSquad} 
            onChange={handleSquadFilter}
            className="squad-filter"
          >
            <option value="">All Teams</option>
            {squadNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {squadsData.length === 0 ? (
        <div className="no-data">
          <p>No squad data available for this tournament.</p>
          <p>Click the refresh button on the tournament home page to fetch squad data.</p>
        </div>
      ) : (
        <div className="squads-container">
          {squadsData.map((squad) => (
            <div key={squad.squadName} className="squad-card">
              <h3 className="squad-title">{squad.squadName}</h3>
              <div className="players-count">
                {squad.players.length} players
              </div>
              
              {squad.players.length > 0 ? (
                <table className="players-table">
                  <thead>
                    <tr>
                      <th>Player Name</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {squad.players.map((player, index) => (
                      <tr key={index}>
                        <td className="player-name">{player.name}</td>
                        <td className="player-role">{player.role || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-players">No players in this squad</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TournamentSquads;