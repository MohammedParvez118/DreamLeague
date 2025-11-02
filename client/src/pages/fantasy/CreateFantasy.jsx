import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fantasyAPI, tournamentAPI } from '../../services/api';
import './CreateFantasy.css';

function CreateFantasy() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    leagueName: '',
    teamName: '', // User's team name
    teamCount: '',
    squadSize: '15', // Default squad size
    transferLimit: '10', // Default transfer limit
    privacy: 'public',
    description: '',
    tournamentId: ''
  });
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoadingTournaments(true);
      const response = await tournamentAPI.getTournaments();
      setTournaments(response.data);
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      setError('Failed to load tournaments');
    } finally {
      setLoadingTournaments(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Include user information in the request
      const leagueData = {
        ...formData,
        userEmail: user?.email || '',
        userName: user?.name || user?.username || ''
      };
      
      const response = await fantasyAPI.createLeague(leagueData);
      
      if (response.data.success) {
        const leagueId = response.data.leagueId;
        
        // Store league info temporarily
        sessionStorage.setItem('newLeagueId', leagueId);
        sessionStorage.setItem('newLeagueCode', response.data.leagueCode || '');
        
        // Redirect to squad selection
        navigate(`/league/${leagueId}/setup-squad`);
      }
    } catch (err) {
      console.error('Error creating league:', err);
      setError(err.response?.data?.error || 'Failed to create fantasy league. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-fantasy-page">
      <div className="page-header">
        <button 
          type="button"
          className="back-button"
          onClick={() => navigate('/fantasy')}
        >
          ← Back
        </button>
        <div>
          <h2>🏆 Create Fantasy League</h2>
          <p className="page-subtitle">Set up your cricket fantasy league and invite players</p>
        </div>
      </div>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <form onSubmit={handleSubmit} className="fantasy-form">
        <div className="form-group">
          <label htmlFor="leagueName">
            League Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="leagueName"
            name="leagueName"
            value={formData.leagueName}
            onChange={handleChange}
            placeholder="Enter league name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="teamName">
            Your Team Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="teamName"
            name="teamName"
            value={formData.teamName}
            onChange={handleChange}
            placeholder="Enter your team name"
            required
          />
          <small className="form-help">This will be your team's identity in the league</small>
        </div>

        <div className="form-group">
          <label htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter a description for your league"
              rows="4"
            />
            <small className="form-help">Describe the rules, scoring system, or any special notes</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="teamCount">
                Number of Teams <span className="required">*</span>
              </label>
              <input
                type="number"
                id="teamCount"
                name="teamCount"
                value={formData.teamCount}
                onChange={handleChange}
                min="2"
                max="20"
                placeholder="2-20 teams"
                required
              />
              <small className="form-help">How many teams will participate</small>
            </div>

            <div className="form-group">
              <label htmlFor="squadSize">
                Squad Size (Players per Team) <span className="required">*</span>
              </label>
              <input
                type="number"
                id="squadSize"
                name="squadSize"
                value={formData.squadSize}
                onChange={handleChange}
                min="15"
                max="20"
                placeholder="15-20 players"
                required
              />
              <small className="form-help">Each team must select this many players</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="transferLimit">
                Transfer Limit <span className="required">*</span>
              </label>
              <input
                type="number"
                id="transferLimit"
                name="transferLimit"
                value={formData.transferLimit}
                onChange={handleChange}
                min="5"
                max="20"
                placeholder="5-20 transfers"
                required
              />
              <small className="form-help">Maximum transfers allowed per team during tournament</small>
            </div>

            <div className="form-group">
              <label htmlFor="privacy">
                Privacy <span className="required">*</span>
              </label>
              <select
                id="privacy"
                name="privacy"
                value={formData.privacy}
                onChange={handleChange}
                required
              >
                <option value="public">Public - Anyone can join</option>
                <option value="private">Private - Join with code only</option>
              </select>
              <small className="form-help">
                {formData.privacy === 'public' 
                  ? 'Visible to all users' 
                  : 'Only accessible with invite code'}
              </small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="tournamentId">
              Tournament <span className="required">*</span>
            </label>
            {loadingTournaments ? (
              <div className="loading-select">Loading tournaments...</div>
            ) : (
              <select
                id="tournamentId"
                name="tournamentId"
                value={formData.tournamentId}
                onChange={handleChange}
                required
              >
                <option value="">Select a tournament</option>
                {tournaments.map(tournament => (
                  <option key={tournament.series_id} value={tournament.series_id}>
                    {tournament.name} ({tournament.type} • {tournament.year})
                  </option>
                ))}
              </select>
            )}
            <small className="form-help">Choose the tournament for this league</small>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => navigate('/home')} 
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading || loadingTournaments}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span> Creating...
                </>
              ) : (
                <>🚀 Create League</>
              )}
            </button>
          </div>
        </form>
    </div>
  );
}

export default CreateFantasy;