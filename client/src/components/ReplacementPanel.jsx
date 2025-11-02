import React, { useState, useEffect } from 'react';
import { replacementAPI } from '../services/api';
import AdminReplacementView from './AdminReplacementView';
import './ReplacementPanel.css';

const ReplacementPanel = ({ leagueId, teamId, userEmail, isAdmin }) => {
  const [squad, setSquad] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [replacements, setReplacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [selectedOutPlayer, setSelectedOutPlayer] = useState('');
  const [selectedInPlayer, setSelectedInPlayer] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Admin view toggle
  const [showAdminView, setShowAdminView] = useState(false);
  
  // Admin notification count
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadData();
    // Load pending count for admins
    if (isAdmin) {
      loadPendingCount();
    }
  }, [leagueId, teamId, isAdmin]);

  const loadPendingCount = async () => {
    try {
      const response = await replacementAPI.getPendingReplacements(leagueId, userEmail);
      const pending = response.data.data?.pendingReplacements || [];
      setPendingCount(pending.length);
    } catch (err) {
      console.error('Error loading pending count:', err);
      // Fail silently for count
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load squad with injury status
      const squadResponse = await replacementAPI.getSquadWithStatus(leagueId, teamId);
      console.log('Squad response:', squadResponse.data);
      setSquad(squadResponse.data.data?.squad || []);
      setAvailablePlayers(squadResponse.data.data?.availablePlayers || []);

      // Load replacement history
      const replacementsResponse = await replacementAPI.getTeamReplacements(leagueId, teamId);
      console.log('Replacements response:', replacementsResponse.data);
      setReplacements(replacementsResponse.data.data?.replacements || []);
      
      // Refresh pending count for admins
      if (isAdmin) {
        await loadPendingCount();
      }
    } catch (err) {
      console.error('Error loading replacement data:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load replacement data');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReplacement = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const data = {
        outPlayerId: parseInt(selectedOutPlayer),
        inPlayerId: parseInt(selectedInPlayer),
        reason,
      };

      await replacementAPI.requestReplacement(leagueId, teamId, data);
      
      setSuccess('Replacement request submitted successfully! Waiting for admin approval.');
      setSelectedOutPlayer('');
      setSelectedInPlayer('');
      setReason('');
      
      // Reload data
      await loadData();
    } catch (err) {
      console.error('Error requesting replacement:', err);
      setError(err.response?.data?.message || 'Failed to submit replacement request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReplacement = async (replacementId) => {
    if (!window.confirm('Are you sure you want to cancel this replacement request?')) {
      return;
    }

    try {
      await replacementAPI.cancelReplacement(leagueId, teamId, replacementId);
      setSuccess('Replacement request cancelled successfully');
      await loadData();
    } catch (err) {
      console.error('Error cancelling replacement:', err);
      setError(err.response?.data?.message || 'Failed to cancel replacement request');
    }
  };

  // Filter out injured players from "Out" selector
  const eligibleOutPlayers = squad.filter(p => !p.isInjured);

  if (loading) {
    return <div className="replacement-panel loading">Loading replacement data...</div>;
  }

  // If admin, show toggle button
  if (isAdmin && showAdminView) {
    return (
      <div className="replacement-panel">
        <div className="panel-header">
          <h2>Admin - Replacement Approvals</h2>
          <button 
            className="btn-toggle-view"
            onClick={() => setShowAdminView(false)}
          >
            Back to My Requests
          </button>
        </div>
        <AdminReplacementView 
          leagueId={leagueId}
          userEmail={userEmail}
          onApprovalComplete={loadData}
        />
      </div>
    );
  }

  return (
    <div className="replacement-panel">
      <div className="panel-header">
        <h2>Squad Replacements</h2>
        <p className="panel-description">
          Replace injured or unavailable players from your squad. Admin approval required.
        </p>
        {isAdmin && (
          <button 
            className="btn-admin-view"
            onClick={() => setShowAdminView(true)}
          >
            View Pending Approvals
            {pendingCount > 0 && (
              <span className="badge-count">{pendingCount}</span>
            )}
          </button>
        )}
      </div>

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

      {/* Request Replacement Form */}
      <div className="request-form-section">
        <h3>Request Replacement</h3>
        <form onSubmit={handleRequestReplacement} className="replacement-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="outPlayer">Player to Replace (Out)</label>
              <select
                id="outPlayer"
                value={selectedOutPlayer}
                onChange={(e) => setSelectedOutPlayer(e.target.value)}
                required
                disabled={submitting}
              >
                <option value="">-- Select Player --</option>
                {eligibleOutPlayers.map(player => (
                  <option key={player.player_id} value={player.player_id}>
                    {player.player_name} ({player.role})
                  </option>
                ))}
              </select>
              <small>Only non-injured players from your squad</small>
            </div>

            <div className="form-group">
              <label htmlFor="inPlayer">Replacement Player (In)</label>
              <select
                id="inPlayer"
                value={selectedInPlayer}
                onChange={(e) => setSelectedInPlayer(e.target.value)}
                required
                disabled={submitting}
              >
                <option value="">-- Select Player --</option>
                {availablePlayers.map(player => (
                  <option key={player.player_id} value={player.player_id}>
                    {player.player_name} ({player.role})
                  </option>
                ))}
              </select>
              <small>Available players not in any squad</small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reason">Reason for Replacement</label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Player injured, out for 2 weeks..."
              required
              disabled={submitting}
              rows={3}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary btn-submit"
            disabled={submitting || !selectedOutPlayer || !selectedInPlayer || !reason.trim()}
          >
            {submitting ? 'Submitting...' : 'Request Replacement'}
          </button>
        </form>
      </div>

      {/* Current Squad with Injury Status */}
      <div className="squad-status-section">
        <h3>Current Squad</h3>
        <div className="squad-grid">
          {squad.map(player => (
            <div 
              key={player.player_id} 
              className={`player-card ${player.isInjured ? 'injured' : ''}`}
            >
              <div className="player-info">
                <span className="player-name">{player.player_name}</span>
                <span className="player-role">{player.role}</span>
              </div>
              {player.isInjured && (
                <div className="injury-badge">
                  <span className="badge-text">INJURED</span>
                  {player.replacementName && (
                    <small>→ {player.replacementName}</small>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Replacement History */}
      <div className="history-section">
        <h3>Replacement History</h3>
        {replacements.length === 0 ? (
          <p className="no-data">No replacement requests yet</p>
        ) : (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Out Player</th>
                  <th>In Player</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Points/Matches</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {replacements.map(replacement => (
                  <tr key={replacement.id}>
                    <td>
                      <div>{replacement.outPlayer?.name || 'N/A'}</div>
                      <div className="player-meta">{replacement.outPlayer?.role} - {replacement.outPlayer?.squad}</div>
                    </td>
                    <td>
                      <div>{replacement.inPlayer?.name || 'N/A'}</div>
                      <div className="player-meta">{replacement.inPlayer?.role} - {replacement.inPlayer?.squad}</div>
                    </td>
                    <td className="reason-cell">{replacement.reason}</td>
                    <td>
                      <span className={`status-badge status-${replacement.status}`}>
                        {replacement.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{new Date(replacement.requestedAt).toLocaleString()}</td>
                    <td>
                      {replacement.status === 'approved' && (
                        <div>
                          <div>{replacement.outPlayer?.pointsEarned || 0} pts</div>
                          <div className="player-meta">{replacement.outPlayer?.matchesPlayed || 0} matches</div>
                        </div>
                      )}
                      {replacement.status !== 'approved' && '-'}
                    </td>
                    <td>
                      {replacement.status === 'pending' && (
                        <button
                          className="btn-cancel"
                          onClick={() => handleCancelReplacement(replacement.id)}
                        >
                          Cancel
                        </button>
                      )}
                      {replacement.status === 'rejected' && replacement.adminNotes && (
                        <button
                          className="btn-view-notes"
                          title={replacement.adminNotes}
                        >
                          View Notes
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReplacementPanel;
