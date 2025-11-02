import React, { useState, useEffect } from 'react';
import { replacementAPI } from '../services/api';
import './AdminReplacementView.css';

const AdminReplacementView = ({ leagueId, userEmail, onApprovalComplete }) => {
  const [pendingReplacements, setPendingReplacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [reviewAction, setReviewAction] = useState(''); // 'approve' or 'reject'

  useEffect(() => {
    loadPendingReplacements();
  }, [leagueId, userEmail]);

  const loadPendingReplacements = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await replacementAPI.getPendingReplacements(leagueId, userEmail);
      console.log('Admin pending replacements response:', response.data);
      setPendingReplacements(response.data.data?.pendingReplacements || []);
    } catch (err) {
      console.error('Error loading pending replacements:', err);
      setError(err.response?.data?.message || 'Failed to load pending replacements');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (replacementId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this replacement request?`)) {
      return;
    }

    setError('');
    setSuccess('');
    setReviewingId(replacementId);

    try {
      // Convert 'approve'/'reject' to 'approved'/'rejected' for backend
      const backendAction = action === 'approve' ? 'approved' : 'rejected';
      
      const data = {
        action: backendAction,
        userEmail: userEmail, // Backend expects 'userEmail', not 'adminEmail'
        adminNotes: adminNotes || undefined,
      };

      const response = await replacementAPI.reviewReplacement(leagueId, replacementId, data);
      
      if (action === 'approve') {
        const affectedMatches = response.data.affectedMatches || 0;
        setSuccess(
          `Replacement approved successfully! Updated ${affectedMatches} future Playing XI(s).`
        );
      } else {
        setSuccess('Replacement request rejected successfully.');
      }

      setAdminNotes('');
      setReviewingId(null);
      setReviewAction('');
      
      // Reload pending list
      await loadPendingReplacements();
      
      // Notify parent to refresh
      if (onApprovalComplete) {
        onApprovalComplete();
      }
    } catch (err) {
      console.error('Error reviewing replacement:', err);
      setError(err.response?.data?.message || `Failed to ${action} replacement request`);
    } finally {
      setReviewingId(null);
    }
  };

  const openReviewModal = (replacementId, action) => {
    setReviewingId(replacementId);
    setReviewAction(action);
    setAdminNotes('');
  };

  const closeReviewModal = () => {
    setReviewingId(null);
    setReviewAction('');
    setAdminNotes('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="admin-replacement-view loading">Loading pending replacements...</div>;
  }

  return (
    <div className="admin-replacement-view">
      {error && (
        <div className="alert alert-error">
          {error}
          <button className="btn-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
          <button className="btn-close" onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      <div className="pending-summary">
        <h3>Pending Approval Requests</h3>
        <p className="summary-count">
          {pendingReplacements.length} request{pendingReplacements.length !== 1 ? 's' : ''} waiting for your review
        </p>
      </div>

      {pendingReplacements.length === 0 ? (
        <div className="no-pending">
          <p>✅ No pending replacement requests</p>
          <small>All requests have been reviewed</small>
        </div>
      ) : (
        <div className="pending-list">
          {pendingReplacements.map(replacement => (
            <div key={replacement.id} className="replacement-card">
              <div className="card-header">
                <div className="team-info">
                  <h4>{replacement.team?.name || 'Unknown Team'}</h4>
                  <span className="team-owner">{replacement.team?.owner || 'Unknown'}</span>
                </div>
                <div className="request-date">
                  Requested: {formatDate(replacement.requestedAt)}
                </div>
              </div>

              <div className="card-body">
                <div className="player-swap">
                  <div className="player-out">
                    <span className="label">OUT</span>
                    <div className="player-details">
                      <span className="player-name">{replacement.outPlayer?.name}</span>
                      <span className="player-role">{replacement.outPlayer?.role}</span>
                      <span className="player-squad">{replacement.outPlayer?.squad}</span>
                    </div>
                    <div className="player-stats">
                      <small>{replacement.outPlayer?.pointsEarned || 0} points</small>
                      <small>{replacement.outPlayer?.matchesPlayed || 0} matches</small>
                    </div>
                  </div>

                  <div className="swap-arrow">→</div>

                  <div className="player-in">
                    <span className="label">IN</span>
                    <div className="player-details">
                      <span className="player-name">{replacement.inPlayer?.name}</span>
                      <span className="player-role">{replacement.inPlayer?.role}</span>
                      <span className="player-squad">{replacement.inPlayer?.squad}</span>
                    </div>
                  </div>
                </div>

                <div className="reason-section">
                  <strong>Reason:</strong>
                  <p>{replacement.reason}</p>
                </div>

                <div className="match-info">
                  <strong>Replacement starts from:</strong>
                  <p>{replacement.nextMatch?.description || 'Next match'}</p>
                </div>
              </div>

              <div className="card-actions">
                <button
                  className="btn-approve"
                  onClick={() => openReviewModal(replacement.id, 'approve')}
                  disabled={reviewingId === replacement.id}
                >
                  ✓ Approve
                </button>
                <button
                  className="btn-reject"
                  onClick={() => openReviewModal(replacement.id, 'reject')}
                  disabled={reviewingId === replacement.id}
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewingId && (
        <div className="modal-overlay" onClick={closeReviewModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {reviewAction === 'approve' ? 'Approve' : 'Reject'} Replacement Request
              </h3>
              <button className="btn-close-modal" onClick={closeReviewModal}>×</button>
            </div>

            <div className="modal-body">
              {reviewAction === 'approve' && (
                <div className="approval-info">
                  <p>✓ This will:</p>
                  <ul>
                    <li>Mark the outgoing player as injured</li>
                    <li>Add the replacement player to the squad</li>
                    <li>Automatically replace in all future Playing XIs</li>
                    <li>Preserve all points earned by the injured player</li>
                  </ul>
                </div>
              )}

              {reviewAction === 'reject' && (
                <div className="rejection-info">
                  <p>✗ This will reject the replacement request.</p>
                  <p>Please provide a reason for the team owner:</p>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="adminNotes">
                  Admin Notes {reviewAction === 'reject' ? '(Required)' : '(Optional)'}
                </label>
                <textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes for the team owner..."
                  rows={4}
                  required={reviewAction === 'reject'}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={closeReviewModal}
              >
                Cancel
              </button>
              <button
                className={reviewAction === 'approve' ? 'btn-approve' : 'btn-reject'}
                onClick={() => handleReview(reviewingId, reviewAction)}
                disabled={reviewAction === 'reject' && !adminNotes.trim()}
              >
                Confirm {reviewAction === 'approve' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReplacementView;
