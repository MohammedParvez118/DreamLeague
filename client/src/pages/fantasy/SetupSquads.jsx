import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fantasyAPI } from '../../services/api';

function SetupSquads() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [squads, setSquads] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTeams();
  }, [leagueId]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fantasyAPI.getLeague(leagueId);
      const teamsData = response.data.teams || [];
      setTeams(teamsData);
      
      // Initialize squads for each team
      const initialSquads = {};
      teamsData.forEach(team => {
        initialSquads[team.id] = {
          players: Array(11).fill(''),
          captain: 0,
          viceCaptain: 1
        };
      });
      setSquads(initialSquads);
      setError(null);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError('Failed to load teams.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerChange = (teamId, index, value) => {
    setSquads(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        players: prev[teamId].players.map((p, i) => i === index ? value : p)
      }
    }));
  };

  const handleCaptainChange = (teamId, value) => {
    setSquads(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        captain: parseInt(value)
      }
    }));
  };

  const handleViceCaptainChange = (teamId, value) => {
    setSquads(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        viceCaptain: parseInt(value)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      
      await fantasyAPI.submitSquads(leagueId, { squads, teamIds: teams.map(t => t.id) });
      
      // Redirect to league page or home
      alert('Squads submitted successfully!');
      navigate('/');
    } catch (err) {
      console.error('Error submitting squads:', err);
      setError('Failed to submit squads. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="setup-squads-page">
      <h2>Setup Squads</h2>
      <p>Enter 11 players for each team and select captain and vice-captain</p>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        {teams.map(team => (
          <div key={team.id} className="squad-section">
            <h3>{team.team_name} (Owner: {team.team_owner})</h3>
            
            <div className="players-grid">
              {squads[team.id]?.players.map((player, index) => (
                <div key={index} className="form-group">
                  <label>Player {index + 1}:</label>
                  <input
                    type="text"
                    value={player}
                    onChange={(e) => handlePlayerChange(team.id, index, e.target.value)}
                    placeholder={`Player ${index + 1} name`}
                  />
                </div>
              ))}
            </div>
            
            <div className="captain-selection">
              <div className="form-group">
                <label>Captain (Player #):</label>
                <select
                  value={squads[team.id]?.captain}
                  onChange={(e) => handleCaptainChange(team.id, e.target.value)}
                >
                  {[...Array(11)].map((_, i) => (
                    <option key={i} value={i}>Player {i + 1}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Vice Captain (Player #):</label>
                <select
                  value={squads[team.id]?.viceCaptain}
                  onChange={(e) => handleViceCaptainChange(team.id, e.target.value)}
                >
                  {[...Array(11)].map((_, i) => (
                    <option key={i} value={i}>Player {i + 1}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
        
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit All Squads'}
        </button>
      </form>
    </div>
  );
}

export default SetupSquads;