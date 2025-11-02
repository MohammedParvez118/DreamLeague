import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fantasyAPI, leagueAPI } from '../services/api';
import './Home.css';

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [myLeagues, setMyLeagues] = useState([]);
  const [allLeagues, setAllLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMyLeagues, setShowMyLeagues] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [leagueCode, setLeagueCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joiningLeague, setJoiningLeague] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      // Get user from localStorage
      const userData = localStorage.getItem('user');
      let currentUser = null;
      if (userData) {
        try {
          currentUser = JSON.parse(userData);
          setUser(currentUser);
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      
      // Now fetch leagues with user context
      await fetchData(currentUser);
    };
    
    loadData();
  }, []);

  const fetchData = async (currentUser = null) => {
    try {
      setLoading(true);
      const leaguesRes = await fantasyAPI.getLeagues();
      
      // Get all leagues with team details
      const leaguesWithTeams = await Promise.all(
        leaguesRes.data.map(async (league) => {
          try {
            const detailsRes = await leagueAPI.getLeagueDetails(league.id);
            return {
              ...league,
              teams: detailsRes.data.teams || []
            };
          } catch (err) {
            console.error(`Error fetching teams for league ${league.id}:`, err);
            return {
              ...league,
              teams: []
            };
          }
        })
      );
      
      setAllLeagues(leaguesWithTeams);
      
      // Filter leagues where user is a member
      // Use currentUser if provided, otherwise use state
      const userEmail = currentUser?.email || user?.email;
      console.log('Filtering leagues for user:', userEmail);
      console.log('Total leagues:', leaguesWithTeams.length);
      
      if (userEmail) {
        const userLeagues = leaguesWithTeams.filter(league => {
          const isMember = league.teams.some(team => team.team_owner === userEmail);
          if (isMember) {
            console.log('User is member of:', league.league_name);
          }
          return isMember;
        });
        console.log('User leagues count:', userLeagues.length);
        setMyLeagues(userLeagues);
      } else {
        console.log('No user email found, setting empty leagues');
        setMyLeagues([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewMyLeagues = () => {
    setShowMyLeagues(true);
  };

  const handleCreateLeague = () => {
    navigate('/fantasy');
  };

  const handleViewTournaments = () => {
    navigate('/tournaments');
  };

  const isUserInLeague = (league) => {
    if (!user?.email) return false;
    return league.teams?.some(team => team.team_owner === user.email);
  };

  const handleJoinLeague = async (league) => {
    if (league.privacy === 'private') {
      setSelectedLeague(league);
      setShowCodeModal(true);
      setLeagueCode('');
      setJoinError('');
    } else {
      // Join public league directly
      await joinPublicLeague(league);
    }
  };

  const joinPublicLeague = async (league) => {
    setJoiningLeague(true);
    setJoinError('');
    
    try {
      await leagueAPI.joinLeague(league.id, {
        userEmail: user?.email,
        userName: user?.name || user?.username
      });
      
      // Refresh data to show updated button
      await fetchData();
      
      alert('Successfully joined the league!');
    } catch (err) {
      console.error('Error joining league:', err);
      const errorMsg = err.response?.data?.error || 'Failed to join league';
      alert(errorMsg);
    } finally {
      setJoiningLeague(false);
    }
  };

  const handleJoinPrivateLeague = async (e) => {
    e.preventDefault();
    
    if (!leagueCode.trim()) {
      setJoinError('Please enter a league code');
      return;
    }

    setJoiningLeague(true);
    setJoinError('');

    try {
      await leagueAPI.joinLeague(selectedLeague.id, {
        userEmail: user?.email,
        userName: user?.name || user?.username,
        leagueCode: leagueCode.trim()
      });

      // Close modal and refresh data
      setShowCodeModal(false);
      setSelectedLeague(null);
      setLeagueCode('');
      await fetchData();
      
      alert('Successfully joined the league!');
    } catch (err) {
      console.error('Error joining private league:', err);
      const errorMsg = err.response?.data?.error || 'Failed to join league';
      setJoinError(errorMsg);
    } finally {
      setJoiningLeague(false);
    }
  };

  const handleCloseModal = () => {
    setShowCodeModal(false);
    setSelectedLeague(null);
    setLeagueCode('');
    setJoinError('');
  };

  const handleDeleteClick = (league) => {
    setDeleteModal(league);
  };

  const handleCancelDelete = () => {
    setDeleteModal(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;

    setDeleting(true);
    setError('');
    setSuccessMessage('');

    try {
      await leagueAPI.deleteLeague(deleteModal.id, {
        userEmail: user?.email
      });

      setSuccessMessage(`League "${deleteModal.league_name}" deleted successfully!`);
      setDeleteModal(null);
      
      // Refresh the leagues list
      await fetchData();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting league:', err);
      const errorMsg = err.response?.data?.error || 'Failed to delete league';
      setError(errorMsg);
      setDeleteModal(null);
    } finally {
      setDeleting(false);
    }
  };

  const getLeagueStatus = (league) => {
    if (!league.tournament_end_date) return 'unknown';
    const currentTime = Date.now();
    const endTime = parseInt(league.tournament_end_date);
    return currentTime < endTime ? 'ongoing' : 'completed';
  };

  const canDeleteLeague = (league) => {
    if (!user?.email) return false;
    if (league.created_by !== user.email) return false;
    const status = getLeagueStatus(league);
    return status === 'completed';
  };

  if (loading) {
    return (
      <div className="home-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-page">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={fetchData} className="btn-retry">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to Dream League</h1>
          <p className="hero-subtitle">Create and manage your fantasy cricket leagues</p>
          
          <button onClick={handleViewMyLeagues} className="btn-primary btn-large">
            📋 View My Leagues
          </button>
        </div>
      </section>

      {/* My Leagues Section - Shows when user clicks "View My Leagues" */}
      {showMyLeagues && (
        <section className="my-leagues-section">
          <div className="section-header">
            <h2>My Leagues</h2>
            <button onClick={() => setShowMyLeagues(false)} className="btn-close">
              ✕ Close
            </button>
          </div>

          {successMessage && (
            <div className="alert alert-success">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}
          
          {myLeagues.length > 0 ? (
            <div className="leagues-table-container">
              <table className="leagues-table">
                <thead>
                  <tr>
                    <th>League Name</th>
                    <th>Team Count</th>
                    <th>Privacy</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myLeagues.map(league => {
                    const status = getLeagueStatus(league);
                    const isCreator = user?.email === league.created_by;
                    return (
                      <tr key={league.id}>
                        <td className="league-name">{league.league_name}</td>
                        <td>{league.team_count}</td>
                        <td>
                          <span className={`privacy-badge privacy-${league.privacy}`}>
                            {league.privacy === 'private' ? '🔒 Private' : '🌐 Public'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge status-${status}`}>
                            {status === 'ongoing' && '🟢 Ongoing'}
                            {status === 'completed' && '✅ Completed'}
                            {status === 'unknown' && '❓ Unknown'}
                          </span>
                        </td>
                        <td>{league.created_at ? new Date(league.created_at).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <div className="action-buttons">
                            <Link to={`/league/${league.id}`} className="btn-action">View</Link>
                            {isCreator && canDeleteLeague(league) && (
                              <button 
                                onClick={() => handleDeleteClick(league)} 
                                className="btn-delete"
                                title="Delete League"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>You haven't joined any leagues yet.</p>
              <button onClick={handleCreateLeague} className="btn-secondary">
                Create Your First League
              </button>
            </div>
          )}
        </section>
      )}

      {/* Quick Actions Section */}
      <section className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        
        <div className="action-cards">
          <div className="action-card" onClick={handleCreateLeague}>
            <div className="card-icon">🏆</div>
            <h3>Create New League</h3>
            <p>Start your own fantasy cricket league</p>
            <button className="card-btn">Create League</button>
          </div>

          <div className="action-card" onClick={() => navigate('/join-league')}>
            <div className="card-icon">🤝</div>
            <h3>Join League</h3>
            <p>Join public leagues or use a private code</p>
            <button className="card-btn">Join Now</button>
          </div>

          <div className="action-card" onClick={handleViewTournaments}>
            <div className="card-icon">🎯</div>
            <h3>View Tournaments</h3>
            <p>Explore ongoing cricket tournaments</p>
            <button className="card-btn">View All</button>
          </div>
        </div>
      </section>

      {/* Private League Code Modal */}
      {showCodeModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔒 Enter Private League Code</h3>
              <button className="modal-close" onClick={handleCloseModal}>✕</button>
            </div>
            
            <form onSubmit={handleJoinPrivateLeague}>
              <div className="modal-body">
                <p className="modal-description">
                  This is a private league. Please enter the league code to join.
                </p>
                
                {selectedLeague && (
                  <div className="league-info">
                    <strong>League:</strong> {selectedLeague.league_name}
                  </div>
                )}
                
                <div className="form-group">
                  <label htmlFor="leagueCode">League Code:</label>
                  <input
                    type="text"
                    id="leagueCode"
                    value={leagueCode}
                    onChange={(e) => setLeagueCode(e.target.value.toUpperCase())}
                    placeholder="Enter 8-character code"
                    maxLength={8}
                    className="code-input"
                    autoFocus
                  />
                </div>
                
                {joinError && (
                  <div className="error-message">{joinError}</div>
                )}
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  className="btn-secondary"
                  disabled={joiningLeague}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={joiningLeague || !leagueCode.trim()}
                >
                  {joiningLeague ? 'Joining...' : 'Join League'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete League Confirmation Modal */}
      {deleteModal && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-content modal-danger" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Delete League</h3>
              <button className="modal-close" onClick={handleCancelDelete}>✕</button>
            </div>
            
            <div className="modal-body">
              <p className="modal-warning">
                Are you sure you want to delete this league?
              </p>
              
              <div className="league-info-box">
                <strong>League:</strong> {deleteModal.league_name}<br/>
                <strong>Participants:</strong> {deleteModal.teams?.length || 0} teams
              </div>
              
              <p className="modal-description">
                This action cannot be undone. All teams and data associated with this league will be permanently deleted.
              </p>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={handleCancelDelete} 
                className="btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete} 
                className="btn-danger"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete League'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
