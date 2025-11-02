import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leagueAPI } from '../services/api';
import './JoinLeague.css';

function JoinLeague() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('public');
  const [leagueCode, setLeagueCode] = useState('');
  const [publicLeagues, setPublicLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'public' && user) {
      fetchPublicLeagues();
    }
  }, [activeTab, user]);

  const fetchPublicLeagues = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await leagueAPI.getPublicLeagues(user?.email || '');
      setPublicLeagues(response.data);
    } catch (err) {
      console.error('Error fetching public leagues:', err);
      setError('Failed to load public leagues');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithCode = async (e) => {
    e.preventDefault();
    
    if (!leagueCode.trim()) {
      setError('Please enter a league code');
      return;
    }

    if (!user) {
      setError('Please login to join a league');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await leagueAPI.joinLeagueByCode({
        leagueCode: leagueCode.trim().toUpperCase(),
        userEmail: user.email,
        userName: user.username
      });

      setSuccess(response.data.message);
      setLeagueCode('');
      
      // Redirect to squad selection after joining
      const leagueId = response.data.league.id;
      setTimeout(() => {
        navigate(`/league/${leagueId}/setup-squad`);
      }, 2000);
    } catch (err) {
      console.error('Error joining league:', err);
      setError(err.response?.data?.error || 'Failed to join league');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLeague = (league) => {
    setSelectedLeague(league);
  };

  const handleJoinPublicLeague = async (leagueId) => {
    if (!user) {
      setError('Please login to join a league');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await leagueAPI.joinLeague(leagueId, {
        userEmail: user.email,
        userName: user.username
      });

      setSuccess(response.data.message);
      
      // Refresh leagues list
      await fetchPublicLeagues();
      
      // Close modal
      setSelectedLeague(null);
      
      // Redirect to squad selection after joining
      setTimeout(() => {
        navigate(`/league/${leagueId}/setup-squad`);
      }, 2000);
    } catch (err) {
      console.error('Error joining league:', err);
      setError(err.response?.data?.error || 'Failed to join league');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="join-league-page">
      <div className="page-header">
        <h1>Join a League</h1>
        <p>Join public leagues or use a private code to join exclusive leagues</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="join-tabs">
        <button
          className={`join-tab ${activeTab === 'public' ? 'active' : ''}`}
          onClick={() => setActiveTab('public')}
        >
          Public Leagues
        </button>
        <button
          className={`join-tab ${activeTab === 'private' ? 'active' : ''}`}
          onClick={() => setActiveTab('private')}
        >
          Private Code
        </button>
      </div>

      {activeTab === 'public' ? (
        <div className="public-leagues">
          <h2>Available Public Leagues</h2>
          
          {loading ? (
            <div className="loading">Loading leagues...</div>
          ) : publicLeagues.length === 0 ? (
            <div className="no-leagues">
              <p>No public leagues available at the moment.</p>
              <button onClick={() => navigate('/create-league')} className="btn-primary">
                Create Your Own League
              </button>
            </div>
          ) : (
            <div className="leagues-grid">
              {publicLeagues.map((league) => (
                <div 
                  key={league.id} 
                  className={`league-card ${league.is_member ? 'joined' : ''}`}
                  onClick={() => !league.is_member && handleSelectLeague(league)}
                >
                  <div className="league-header">
                    <h3>{league.league_name}</h3>
                    {league.is_member && (
                      <span className="badge-joined">Joined ✓</span>
                    )}
                  </div>
                  <div className="league-info">
                    <div className="info-row">
                      <span className="label">Tournament:</span>
                      <span className="value">{league.tournament_name || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Created:</span>
                      <span className="value">{formatDate(league.created_at)}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Participants:</span>
                      <span className="value">
                        {league.current_participants || 0} / {league.team_count}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Status:</span>
                      <span className={`status ${league.current_participants >= league.team_count ? 'full' : 'open'}`}>
                        {league.current_participants >= league.team_count ? 'Full' : 'Open'}
                      </span>
                    </div>
                  </div>
                  {!league.is_member && (
                    <button 
                      className="btn-join-league"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectLeague(league);
                      }}
                      disabled={league.current_participants >= league.team_count}
                    >
                      {league.current_participants >= league.team_count ? 'Full' : 'View Details'}
                    </button>
                  )}
                  {league.is_member && (
                    <button 
                      className="btn-view-league"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/league/${league.id}`);
                      }}
                    >
                      View League
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <button onClick={() => navigate('/home')} className="btn-back">
            Back to Home
          </button>
        </div>
      ) : (
        <div className="private-code-section">
          <h2>Join with Private Code</h2>
          <p className="section-description">
            Enter the private code shared by the league creator to join an exclusive league.
          </p>
          <form onSubmit={handleJoinWithCode} className="code-form">
            <div className="form-group">
              <label>League Code</label>
              <input
                type="text"
                value={leagueCode}
                onChange={(e) => setLeagueCode(e.target.value.toUpperCase())}
                placeholder="Enter league code (e.g., ABC12345)"
                className="code-input"
                maxLength="10"
                disabled={loading}
              />
              <small>Enter the complete league code (usually 6-8 characters)</small>
            </div>
            <button type="submit" className="btn-join" disabled={loading || !leagueCode.trim()}>
              {loading ? 'Joining...' : 'Join League'}
            </button>
          </form>
          <button onClick={() => navigate('/home')} className="btn-back">
            Back to Home
          </button>
        </div>
      )}

      {/* League Details Modal */}
      {selectedLeague && (
        <div className="modal-overlay" onClick={() => setSelectedLeague(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedLeague.league_name}</h2>
              <button className="modal-close" onClick={() => setSelectedLeague(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <strong>Tournament:</strong>
                <span>{selectedLeague.tournament_name || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <strong>Type:</strong>
                <span>{selectedLeague.tournament_type || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <strong>Created:</strong>
                <span>{formatDate(selectedLeague.created_at)}</span>
              </div>
              <div className="detail-row">
                <strong>Participants:</strong>
                <span>
                  {selectedLeague.current_participants || 0} / {selectedLeague.team_count}
                  {selectedLeague.current_participants >= selectedLeague.team_count && 
                    <span className="full-badge"> (Full)</span>
                  }
                </span>
              </div>
              <div className="detail-row">
                <strong>Privacy:</strong>
                <span className="privacy-badge">{selectedLeague.privacy}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setSelectedLeague(null)}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm" 
                onClick={() => handleJoinPublicLeague(selectedLeague.id)}
                disabled={loading || selectedLeague.current_participants >= selectedLeague.team_count}
              >
                {loading ? 'Joining...' : 'Join League'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JoinLeague;
