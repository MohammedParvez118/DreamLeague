import { useState, useEffect } from 'react';
import { transferAPI, leagueAPI } from '../services/api';
import './TransferPanel.css';

function TransferPanel({ leagueId, teamId, tournamentId }) {
  const [squadPlayers, setSquadPlayers] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [remainingTransfers, setRemainingTransfers] = useState(null);
  const [selectedPlayerOut, setSelectedPlayerOut] = useState(null);
  const [selectedPlayerIn, setSelectedPlayerIn] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (leagueId && teamId) {
      fetchData();
    }
  }, [leagueId, teamId]);

  useEffect(() => {
    if (roleFilter || searchQuery) {
      fetchAvailablePlayers();
    }
  }, [roleFilter, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [squadRes, remainingRes, historyRes] = await Promise.all([
        leagueAPI.getTeamSquad(leagueId, teamId),
        transferAPI.getRemainingTransfers(leagueId, teamId),
        transferAPI.getTransferHistory(leagueId, teamId, 1, 10)
      ]);

      if (squadRes.data.success) {
        setSquadPlayers(squadRes.data.squad || []);
      }

      if (remainingRes.data.success) {
        setRemainingTransfers(remainingRes.data.data);
      }

      if (historyRes.data.success) {
        setTransferHistory(historyRes.data.data.transfers || []);
      }
    } catch (err) {
      console.error('Error fetching transfer data:', err);
      setError('Failed to load transfer data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePlayers = async () => {
    try {
      const response = await transferAPI.getAvailablePlayers(leagueId, roleFilter, searchQuery);
      if (response.data.success) {
        setAvailablePlayers(response.data.data.players || []);
      }
    } catch (err) {
      console.error('Error fetching available players:', err);
    }
  };

  const handleTransfer = async () => {
    if (!selectedPlayerOut || !selectedPlayerIn) {
      setError('Please select both players to swap');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (remainingTransfers.remaining_transfers <= 0) {
      setError('You have used all your transfers');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setTransferring(true);
      setError(null);

      const data = {
        playerOutId: selectedPlayerOut.player_id,
        playerInId: selectedPlayerIn.player_id
      };

      const response = await transferAPI.transferPlayer(leagueId, teamId, data);

      if (response.data.success) {
        setSuccess(`Transfer successful! ${selectedPlayerOut.player_name} → ${selectedPlayerIn.player_name}`);
        setTimeout(() => setSuccess(null), 5000);
        
        // Reset selections
        setSelectedPlayerOut(null);
        setSelectedPlayerIn(null);
        setRoleFilter('');
        setSearchQuery('');
        
        // Refresh data
        fetchData();
      }
    } catch (err) {
      console.error('Error making transfer:', err);
      setError(err.response?.data?.error || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const handleUndoLastTransfer = async () => {
    if (!window.confirm('Are you sure you want to undo the last transfer?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await transferAPI.undoLastTransfer(leagueId, teamId);

      if (response.data.success) {
        setSuccess('Transfer successfully undone!');
        setTimeout(() => setSuccess(null), 3000);
        fetchData();
      }
    } catch (err) {
      console.error('Error undoing transfer:', err);
      setError(err.response?.data?.error || 'Failed to undo transfer');
    } finally {
      setLoading(false);
    }
  };

  const canUndoLastTransfer = () => {
    if (transferHistory.length === 0) return false;
    
    const lastTransfer = transferHistory[0];
    if (lastTransfer.status !== 'completed') return false;
    
    const transferTime = new Date(lastTransfer.transfer_date);
    const now = new Date();
    const minutesElapsed = (now - transferTime) / 1000 / 60;
    
    return minutesElapsed <= 5;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading && !squadPlayers.length) {
    return (
      <div className="transfer-panel-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading transfer panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transfer-panel-container">
      <div className="transfer-header">
        <h3>🔄 Player Transfers</h3>
        {remainingTransfers && (
          <div className="transfers-remaining">
            <span className="label">Remaining Transfers:</span>
            <span className="value">
              {remainingTransfers.remaining_transfers} / {remainingTransfers.transfer_limit}
            </span>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {remainingTransfers && remainingTransfers.remaining_transfers === 0 && (
        <div className="alert alert-warning">
          ⚠️ You have used all your transfers. No more transfers allowed for this league.
        </div>
      )}

      <div className="transfer-grid">
        {/* Current Squad - Player Out */}
        <div className="transfer-section">
          <h4>📤 Remove from Squad</h4>
          <div className="players-list">
            {squadPlayers.map(player => (
              <div
                key={player.player_id}
                className={`player-card ${selectedPlayerOut?.player_id === player.player_id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedPlayerOut(player);
                  setRoleFilter(player.role);
                }}
              >
                <img 
                  src={player.image_url || '/default-player.png'} 
                  alt={player.player_name}
                  onError={(e) => { e.target.src = '/default-player.png'; }}
                />
                <div className="player-details">
                  <h5>{player.player_name}</h5>
                  <span className="role-badge">{player.role}</span>
                  <span className="team-badge">{player.team_name}</span>
                </div>
                {selectedPlayerOut?.player_id === player.player_id && (
                  <span className="selected-badge">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Transfer Arrow */}
        <div className="transfer-arrow">
          <div className="arrow-container">
            <span className="arrow">→</span>
            <button
              onClick={handleTransfer}
              className="btn-transfer"
              disabled={!selectedPlayerOut || !selectedPlayerIn || transferring || remainingTransfers?.remaining_transfers === 0}
            >
              {transferring ? (
                <>
                  <span className="spinner-small"></span> Transferring...
                </>
              ) : (
                <>🔄 Make Transfer</>
              )}
            </button>
          </div>
        </div>

        {/* Available Players - Player In */}
        <div className="transfer-section">
          <h4>📥 Add to Squad</h4>
          
          {selectedPlayerOut && (
            <>
              <div className="filters">
                <div className="filter-group">
                  <label>Role Filter:</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="">All Roles</option>
                    <option value="Wicketkeeper">Wicketkeeper</option>
                    <option value="Batsman">Batsman</option>
                    <option value="Allrounder">Allrounder</option>
                    <option value="Bowler">Bowler</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Search:</label>
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="players-list">
                {availablePlayers.length === 0 ? (
                  <div className="empty-state">
                    <p>No available players found</p>
                    <button onClick={fetchAvailablePlayers} className="btn-secondary">
                      Refresh
                    </button>
                  </div>
                ) : (
                  availablePlayers.map(player => (
                    <div
                      key={player.player_id}
                      className={`player-card ${selectedPlayerIn?.player_id === player.player_id ? 'selected' : ''}`}
                      onClick={() => setSelectedPlayerIn(player)}
                    >
                      <img 
                        src={player.image_url || '/default-player.png'} 
                        alt={player.player_name}
                        onError={(e) => { e.target.src = '/default-player.png'; }}
                      />
                      <div className="player-details">
                        <h5>{player.player_name}</h5>
                        <span className="role-badge">{player.role}</span>
                        <span className="team-badge">{player.team_name}</span>
                      </div>
                      {selectedPlayerIn?.player_id === player.player_id && (
                        <span className="selected-badge">✓</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {!selectedPlayerOut && (
            <div className="empty-state">
              <p>👈 Select a player from your squad to see available replacements</p>
            </div>
          )}
        </div>
      </div>

      {/* Transfer History */}
      <div className="transfer-history-section">
        <div className="history-header">
          <h4>📜 Transfer History</h4>
          <div className="history-actions">
            {canUndoLastTransfer() && (
              <button onClick={handleUndoLastTransfer} className="btn-undo">
                ↩️ Undo Last Transfer
              </button>
            )}
            <button 
              onClick={() => setShowHistory(!showHistory)} 
              className="btn-toggle-history"
            >
              {showHistory ? 'Hide' : 'Show'} History
            </button>
          </div>
        </div>

        {showHistory && (
          <div className="history-list">
            {transferHistory.length === 0 ? (
              <p className="no-history">No transfers made yet</p>
            ) : (
              <div className="history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Player Out</th>
                      <th></th>
                      <th>Player In</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferHistory.map((transfer, index) => (
                      <tr key={index} className={transfer.status === 'reversed' ? 'reversed' : ''}>
                        <td>{formatDate(transfer.transfer_date)}</td>
                        <td>
                          <div className="history-player">
                            <span className="player-name">{transfer.player_out_name}</span>
                            <span className="role-small">{transfer.player_out_role}</span>
                          </div>
                        </td>
                        <td className="arrow-cell">→</td>
                        <td>
                          <div className="history-player">
                            <span className="player-name">{transfer.player_in_name}</span>
                            <span className="role-small">{transfer.player_in_role}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge status-${transfer.status}`}>
                            {transfer.status === 'completed' ? '✓ Completed' : '↩️ Reversed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TransferPanel;
