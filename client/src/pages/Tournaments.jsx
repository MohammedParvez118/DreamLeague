import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentAPI } from '../services/api';
import './Tournaments.css';

function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, tournament: null });
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await tournamentAPI.getTournaments();
      setTournaments(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      setError('Failed to load tournaments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (tournament) => {
    setDeleteModal({ show: true, tournament });
  };

  const handleCancelDelete = () => {
    setDeleteModal({ show: false, tournament: null });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.tournament) return;

    setDeleting(true);
    setError(null);
    setSuccessMessage('');

    try {
      await tournamentAPI.deleteTournament(deleteModal.tournament.series_id);
      setSuccessMessage(`Tournament "${deleteModal.tournament.name}" deleted successfully!`);
      setDeleteModal({ show: false, tournament: null });
      
      // Auto-refresh tournaments
      await fetchTournaments();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting tournament:', err);
      const errorMsg = err.response?.data?.error || 'Failed to delete tournament. Please try again.';
      setError(errorMsg);
      setDeleteModal({ show: false, tournament: null });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="tournaments-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading tournaments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tournaments-page">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={fetchTournaments} className="btn-retry">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tournaments-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">🎯 Available Tournaments</h1>
          <p className="page-subtitle">Explore ongoing cricket tournaments and view details</p>
        </div>
        <Link to="/tournament/add" className="btn-add-tournament">
          ➕ Add Tournament
        </Link>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success">
          ✅ {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
          <button onClick={() => setError(null)} className="alert-close">×</button>
        </div>
      )}

      {/* Tournaments Grid */}
      {tournaments.length > 0 ? (
        <div className="tournaments-grid">
          {tournaments.map(tournament => (
            <div key={tournament.series_id} className="tournament-card">
              <div className="tournament-header">
                <h3>{tournament.name}</h3>
                <span className="tournament-series">{tournament.type} • {tournament.year}</span>
              </div>
              <div className="tournament-body">
                <div className="tournament-info">
                  <div className="info-row">
                    <span className="info-label">Series ID:</span>
                    <span className="info-value">{tournament.series_id}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Type:</span>
                    <span className="info-value">{tournament.type}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Year:</span>
                    <span className="info-value">{tournament.year}</span>
                  </div>
                </div>
              </div>
              <div className="tournament-actions">
                <Link 
                  to={`/tournament/tournament-home/${tournament.series_id}`} 
                  className="btn-view-details"
                >
                  View Details
                </Link>
                <button 
                  onClick={() => handleDeleteClick(tournament)}
                  className="btn-delete-tournament"
                  title="Delete tournament"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🏏</div>
          <h3>No Tournaments Available</h3>
          <p>There are no tournaments at the moment. Add a new tournament to get started!</p>
          <Link to="/tournament/add" className="btn-primary">
            Add New Tournament
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Delete Tournament</h2>
              <button className="modal-close" onClick={handleCancelDelete}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p className="warning-text">
                Are you sure you want to delete this tournament?
              </p>
              <div className="tournament-details-box">
                <h3>{deleteModal.tournament?.name}</h3>
                <p>Series ID: {deleteModal.tournament?.series_id}</p>
                <p>Type: {deleteModal.tournament?.type} • Year: {deleteModal.tournament?.year}</p>
              </div>
              <p className="danger-text">
                ⚠️ This action cannot be undone. All related data (matches, squads, players) will be permanently deleted.
              </p>
              <p className="info-text">
                Note: If any leagues are using this tournament, deletion will be prevented.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                className="btn-delete-confirm" 
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Tournament'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tournaments;
