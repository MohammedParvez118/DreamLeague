import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fantasyAPI } from '../../services/api';

function SetupTeams() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const [teamCount, setTeamCount] = useState(0);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeagueData();
  }, [leagueId]);

  const fetchLeagueData = async () => {
    try {
      setLoading(true);
      const response = await fantasyAPI.getLeague(leagueId);
      const count = response.data.team_count;
      setTeamCount(count);
      
      // Initialize empty teams
      setTeams(Array.from({ length: count }, () => ({ teamName: '', teamOwner: '' })));
      setError(null);
    } catch (err) {
      console.error('Error fetching league data:', err);
      setError('Failed to load league data.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamChange = (index, field, value) => {
    const updatedTeams = [...teams];
    updatedTeams[index][field] = value;
    setTeams(updatedTeams);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all teams
    const isValid = teams.every(team => team.teamName && team.teamOwner);
    if (!isValid) {
      setError('Please fill in all team names and owners.');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      await fantasyAPI.setupTeams(leagueId, { teams, teamCount });
      
      // Redirect to setup squads page
      navigate(`/fantasy/setup-teams/setup-squads/${leagueId}`);
    } catch (err) {
      console.error('Error setting up teams:', err);
      setError('Failed to setup teams. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="setup-teams-page">
      <h2>Setup Teams for League</h2>
      <p>Enter the names and owners for {teamCount} teams</p>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        {teams.map((team, index) => (
          <div key={index} className="team-form-group">
            <h3>Team {index + 1}</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`teamName${index}`}>Team Name:</label>
                <input
                  type="text"
                  id={`teamName${index}`}
                  value={team.teamName}
                  onChange={(e) => handleTeamChange(index, 'teamName', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor={`teamOwner${index}`}>Team Owner:</label>
                <input
                  type="text"
                  id={`teamOwner${index}`}
                  value={team.teamOwner}
                  onChange={(e) => handleTeamChange(index, 'teamOwner', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        ))}
        
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Saving...' : 'Continue to Squad Setup'}
        </button>
      </form>
    </div>
  );
}

export default SetupTeams;