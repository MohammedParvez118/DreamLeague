import { useState, useEffect } from 'react';
import { playingXIAPI, leagueAPI } from '../services/api';
import './PlayingXIForm.css';

function PlayingXIForm({ leagueId, teamId, tournamentId }) {
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [squadPlayers, setSquadPlayers] = useState([]);
  const [playingXI, setPlayingXI] = useState([]);
  const [captain, setCaptain] = useState(null);
  const [viceCaptain, setViceCaptain] = useState(null);
  const [matchLockStatus, setMatchLockStatus] = useState(null);
  const [transferStats, setTransferStats] = useState(null);
  const [canEdit, setCanEdit] = useState(true);
  const [sequentialError, setSequentialError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (leagueId && teamId) {
      fetchMatchesAndSquad();
      fetchTransferStats();
    }
  }, [leagueId, teamId]);

  useEffect(() => {
    if (selectedMatchId) {
      checkMatchLockStatus();
      fetchPlayingXI();
    }
  }, [selectedMatchId]);

  const fetchTransferStats = async () => {
    try {
      const response = await playingXIAPI.getTransferStats(leagueId, teamId);
      if (response.data.success) {
        setTransferStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching transfer stats:', err);
    }
  };

  const fetchMatchesAndSquad = async () => {
    try {
      setLoading(true);
      console.log('🚀 Fetching matches and squad for:', { leagueId, teamId, tournamentId });
      
      const [matchesRes, squadRes] = await Promise.all([
        playingXIAPI.getMatchesWithStatus(leagueId, teamId),
        leagueAPI.getTeamSquad(leagueId, teamId)
      ]);

      console.log('📥 Squad API Response:', squadRes.data);

      if (matchesRes.data.success) {
        setMatches(matchesRes.data.data.matches);
        // Auto-select first upcoming match
        const upcomingMatch = matchesRes.data.data.matches.find(m => !m.is_locked && !m.has_playing_xi);
        if (upcomingMatch) {
          setSelectedMatchId(upcomingMatch.match_id);
        }
      }

      if (squadRes.data.success) {
        const squad = squadRes.data.data?.squad || [];
        console.log('Raw squad data from API:', squad);
        console.log('Squad length:', squad.length);
        
        if (squad.length === 0) {
          console.warn('⚠️  No squad data found. User needs to select their team squad first.');
        }
        
        // Transform squad data to match expected format
        const transformedSquad = squad.map(player => ({
          player_id: parseInt(player.player_id), // Ensure it's a number
          player_name: player.player_name,
          role: player.role,
          squad_name: player.squad_name,
          team_name: player.squad_name,
          image_url: player.image_url
        }));
        
        console.log('Transformed squad data:', transformedSquad);
        console.log('Player IDs:', transformedSquad.map(p => `${p.player_id} (${typeof p.player_id})`));
        
        setSquadPlayers(transformedSquad);
      } else {
        console.error('Squad API call failed:', squadRes.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load match and squad data');
    } finally {
      setLoading(false);
    }
  };

  const checkMatchLockStatus = async () => {
    try {
      const response = await playingXIAPI.checkMatchLock(leagueId, selectedMatchId);
      if (response.data.success) {
        setMatchLockStatus(response.data.data);
      }
    } catch (err) {
      console.error('Error checking match lock:', err);
    }
  };

  const fetchPlayingXI = async () => {
    try {
      const response = await playingXIAPI.getPlayingXI(leagueId, teamId, selectedMatchId);
      if (response.data.success && response.data.data.players.length > 0) {
        const players = response.data.data.players;
        console.log('Fetched playing XI:', players);
        
        // Check if editing is allowed (sequential locking)
        setCanEdit(response.data.data.canEdit !== false);
        setSequentialError(response.data.data.errorMessage || null);
        
        // Ensure player IDs are numbers
        const playerIds = players.map(p => parseInt(p.player_id));
        console.log('Setting playingXI to:', playerIds);
        setPlayingXI(playerIds);
        
        const captainPlayer = players.find(p => p.is_captain);
        const vcPlayer = players.find(p => p.is_vice_captain);
        
        if (captainPlayer) setCaptain(parseInt(captainPlayer.player_id));
        if (vcPlayer) setViceCaptain(parseInt(vcPlayer.player_id));
      } else {
        // No existing lineup - check if we can edit
        setCanEdit(response.data.data?.canEdit !== false);
        setSequentialError(response.data.data?.errorMessage || null);
      }
    } catch (err) {
      console.error('Error fetching playing XI:', err);
    }
  };

  const togglePlayerSelection = (playerId) => {
    // Ensure playerId is a number for consistent comparison
    const id = parseInt(playerId);
    console.log('Toggle player clicked:', id, 'Type:', typeof id);
    console.log('Current playingXI:', playingXI);
    
    // Disable if locked, sequential access blocked, or transfers depleted
    if (matchLockStatus?.isLocked || !canEdit || (transferStats && transferStats.transfersLocked)) return;

    if (playingXI.includes(id)) {
      const newPlayingXI = playingXI.filter(existingId => existingId !== id);
      console.log('Removing player, new array:', newPlayingXI);
      setPlayingXI(newPlayingXI);
      if (captain === id) setCaptain(null);
      if (viceCaptain === id) setViceCaptain(null);
    } else {
      if (playingXI.length < 11) {
        const newPlayingXI = [...playingXI, id];
        console.log('Adding player, new array:', newPlayingXI);
        setPlayingXI(newPlayingXI);
      } else {
        setError('You can only select 11 players');
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  // Smart selection helper - calculates what's needed
  const getSelectionStats = () => {
    const selected = squadPlayers.filter(p => playingXI.includes(p.player_id));
    
    const wk = selected.filter(p => (p.role || '').toLowerCase().includes('wk') || (p.role || '').toLowerCase().includes('wicket')).length;
    const bat = selected.filter(p => {
      const role = (p.role || '').toLowerCase();
      return role.includes('bat') && !role.includes('allrounder') && !role.includes('wk') && !role.includes('wicket');
    }).length;
    const battingAR = selected.filter(p => {
      const role = (p.role || '').toLowerCase();
      return role.includes('allrounder') && role.includes('bat');
    }).length;
    const bowlingAR = selected.filter(p => {
      const role = (p.role || '').toLowerCase();
      return role.includes('allrounder') && role.includes('bowl');
    }).length;
    const bowl = selected.filter(p => {
      const role = (p.role || '').toLowerCase();
      return role.includes('bowl') && !role.includes('allrounder');
    }).length;
    
    let overs = 0;
    selected.forEach(p => {
      const role = (p.role || '').toLowerCase();
      if (role.includes('bowl') && role.includes('allrounder')) overs += 4;
      else if (role.includes('bat') && role.includes('allrounder')) overs += 2;
      else if (role.includes('bowl')) overs += 4;
    });
    
    return { wk, bat, battingAR, bowlingAR, bowl, overs, total: playingXI.length };
  };

  // Check if player can be selected based on smart logic
  const canSelectPlayer = (player) => {
    if (playingXI.includes(player.player_id)) return true; // Already selected, can deselect
    if (playingXI.length >= 11) return false; // Team full
    
    // Smart logic: Check if adding this player would make it impossible to meet requirements
    const stats = getSelectionStats();
    const remainingSlots = 11 - stats.total;
    const role = (player.role || '').toLowerCase();
    
    // Determine player type
    const isWK = role.includes('wk') || role.includes('wicket');
    const isBat = role.includes('bat') && !role.includes('allrounder') && !isWK;
    const isBattingAR = role.includes('allrounder') && role.includes('bat');
    const isBowlingAR = role.includes('allrounder') && role.includes('bowl');
    const isBowler = role.includes('bowl') && !role.includes('allrounder');
    
    // Calculate overs if we add this player
    let potentialOvers = stats.overs;
    if (isBowlingAR) potentialOvers += 4;
    else if (isBattingAR) potentialOvers += 2;
    else if (isBowler) potentialOvers += 4;
    
    // Check if this is a non-bowling player (WK, Batsman, or Batting All-rounder)
    const isLowOversPlayer = isWK || isBat || isBattingAR;
    
    if (isLowOversPlayer) {
      // If we add this low-overs player, can we still reach 20 overs with remaining slots?
      const slotsAfterThisPlayer = remainingSlots - 1;
      const maxPossibleOvers = potentialOvers + (slotsAfterThisPlayer * 4); // Assume best case: all bowlers
      
      if (maxPossibleOvers < 20) {
        return false; // Can't select this player, won't reach 20 overs
      }
    }
    
    // If we need WK and only 1 slot left, must select WK
    if (remainingSlots === 1 && stats.wk === 0 && !isWK) {
      return false;
    }
    
    // If we need Batsman and only 1 slot left, must select Batsman
    if (remainingSlots === 1 && stats.bat === 0 && !isBat) {
      return false;
    }
    
    return true; // Can select this player
  };

  // Get reason why player cannot be selected
  const getDisabledReason = (player) => {
    if (playingXI.includes(player.player_id)) return null;
    if (playingXI.length >= 11) return 'Team is full (11/11)';
    
    const stats = getSelectionStats();
    const remainingSlots = 11 - stats.total;
    const role = (player.role || '').toLowerCase();
    
    // Determine player type
    const isWK = role.includes('wk') || role.includes('wicket');
    const isBat = role.includes('bat') && !role.includes('allrounder') && !isWK;
    const isBattingAR = role.includes('allrounder') && role.includes('bat');
    const isBowlingAR = role.includes('allrounder') && role.includes('bowl');
    const isBowler = role.includes('bowl') && !role.includes('allrounder');
    
    let potentialOvers = stats.overs;
    if (isBowlingAR) potentialOvers += 4;
    else if (isBattingAR) potentialOvers += 2;
    else if (isBowler) potentialOvers += 4;
    
    const isLowOversPlayer = isWK || isBat || isBattingAR;
    
    if (isLowOversPlayer) {
      const slotsAfterThisPlayer = remainingSlots - 1;
      const maxPossibleOvers = potentialOvers + (slotsAfterThisPlayer * 4);
      
      if (maxPossibleOvers < 20) {
        const oversNeeded = 20 - stats.overs;
        const minBowlersNeeded = Math.ceil(oversNeeded / 4);
        return `Need ${oversNeeded} more overs (min ${minBowlersNeeded} Bowler${minBowlersNeeded > 1 ? 's' : ''}/Bowling AR)`;
      }
    }
    
    if (remainingSlots === 1 && stats.wk === 0 && !isWK) {
      return 'Must select a Wicketkeeper';
    }
    
    if (remainingSlots === 1 && stats.bat === 0 && !isBat) {
      return 'Must select a Batsman';
    }
    
    return null;
  };

  // Get suggestion for what to select next
  const getSelectionSuggestion = () => {
    const stats = getSelectionStats();
    
    if (stats.total >= 11) return null;
    if (stats.wk < 1) return 'Select at least 1 Wicketkeeper';
    if (stats.bat < 1) return 'Select at least 1 Batsman';
    if (stats.overs < 20) return `Need ${20 - stats.overs} more overs (select Bowlers/All-rounders)`;
    
    return `Select ${11 - stats.total} more player${11 - stats.total > 1 ? 's' : ''}`;
  };

  const handleCaptainSelection = (playerId) => {
    const id = parseInt(playerId);
    if (!playingXI.includes(id)) return;
    
    if (captain === id) {
      setCaptain(null);
    } else {
      if (viceCaptain === id) {
        setViceCaptain(null);
      }
      setCaptain(id);
    }
  };

  const handleViceCaptainSelection = (playerId) => {
    const id = parseInt(playerId);
    if (!playingXI.includes(id)) return;
    
    if (viceCaptain === id) {
      setViceCaptain(null);
    } else {
      if (captain === id) {
        setCaptain(null);
      }
      setViceCaptain(id);
    }
  };

  const validateSelection = () => {
    const errors = [];
    
    if (playingXI.length !== 11) {
      errors.push('You must select exactly 11 players');
    }
    
    const selectedPlayers = squadPlayers.filter(p => playingXI.includes(p.player_id));
    
    // Count wicketkeepers
    const wicketkeepers = selectedPlayers.filter(p => {
      const role = (p.role || '').toLowerCase();
      return role.includes('wicket') || role.includes('wk');
    }).length;
    
    if (wicketkeepers < 1) {
      errors.push('You must select at least 1 wicketkeeper');
    }
    
    // Count batsmen
    const batsmen = selectedPlayers.filter(p => {
      const role = (p.role || '').toLowerCase();
      return role.includes('bat') && !role.includes('allrounder') && !role.includes('wicket') && !role.includes('wk');
    }).length;
    
    if (batsmen < 1) {
      errors.push('You must select at least 1 batsman');
    }
    
    // Calculate total overs
    let totalOvers = 0;
    selectedPlayers.forEach(player => {
      const role = (player.role || '').toLowerCase();
      
      if (role.includes('bowl') && role.includes('allrounder')) {
        totalOvers += 4; // Bowling all-rounder = 4 overs
      } else if (role.includes('bat') && role.includes('allrounder')) {
        totalOvers += 2; // Batting all-rounder = 2 overs
      } else if (role.includes('bowl')) {
        totalOvers += 4; // Bowler = 4 overs
      }
    });
    
    if (totalOvers < 20) {
      errors.push(`You need at least 20 overs. Currently: ${totalOvers} overs`);
    }
    
    if (!captain) {
      errors.push('You must select a captain');
    }
    
    if (!viceCaptain) {
      errors.push('You must select a vice-captain');
    }
    
    return errors;
  };

  const handleSave = async () => {
    const validationErrors = validateSelection();
    
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      // Transform data to match backend expectations
      const selectedPlayers = squadPlayers.filter(p => playingXI.includes(p.player_id));
      const players = selectedPlayers.map(player => ({
        player_id: player.player_id,
        player_name: player.player_name,
        player_role: player.role,
        squad_name: player.squad_name
      }));
      
      const data = {
        players: players,
        captainId: captain,
        viceCaptainId: viceCaptain
      };
      
      const response = await playingXIAPI.savePlayingXI(leagueId, teamId, selectedMatchId, data);
      
      if (response.data.success) {
        setSuccess(`Playing XI saved successfully! ${response.data.data.transfersUsed > 0 ? `Transfers used: ${response.data.data.transfersUsed}` : ''}`);
        setTimeout(() => setSuccess(null), 5000);
        fetchMatchesAndSquad(); // Refresh to update match status
        
        // Update transfer stats immediately from response data
        if (response.data.data && transferStats) {
          setTransferStats({
            ...transferStats,
            transfersUsed: (transferStats.transfersUsed || 0) + (response.data.data.transfersUsed || 0),
            transfersRemaining: response.data.data.transfersRemaining,
            captainChangesUsed: (transferStats.captainChangesUsed || 0) + (response.data.data.captainChangesUsed || 0),
            captainChangesRemaining: response.data.data.captainChangesRemaining,
            captainChangesLocked: response.data.data.captainChangesRemaining <= 0
          });
        }
        
        // Also fetch fresh stats from server as backup
        setTimeout(() => {
          fetchTransferStats();
        }, 100);
      }
    } catch (err) {
      console.error('Error saving playing XI:', err);
      setError(err.response?.data?.message || 'Failed to save playing XI');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyFromPrevious = async () => {
    const selectedMatch = matches.find(m => m.match_id === selectedMatchId);
    if (!selectedMatch) return;

    const previousMatches = matches.filter(m => m.has_playing_xi && m.match_id < selectedMatchId);
    
    if (previousMatches.length === 0) {
      setError('No previous match with saved Playing XI found');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const lastMatch = previousMatches[previousMatches.length - 1];
    
    try {
      setLoading(true);
      const response = await playingXIAPI.copyPlayingXI(leagueId, teamId, lastMatch.match_id, selectedMatchId);
      
      if (response.data.success) {
        setSuccess(`Playing XI copied from ${lastMatch.match_description}`);
        setTimeout(() => setSuccess(null), 3000);
        fetchPlayingXI();
      }
    } catch (err) {
      console.error('Error copying playing XI:', err);
      setError(err.response?.data?.message || 'Failed to copy playing XI');
    } finally {
      setLoading(false);
    }
  };

  // DELETE functionality removed - incompatible with sequential locking system
  // Previous match lineups are auto-copied and serve as baseline for transfers

  const getPlayersByRole = (roleFilter) => {
    if (!squadPlayers || !Array.isArray(squadPlayers)) {
      return [];
    }
    
    return squadPlayers.filter(p => {
      if (!p || !p.role) return false;
      
      const role = (p.role || '').toLowerCase();
      const filter = roleFilter.toLowerCase();
      
      if (filter === 'wicketkeeper') {
        return role.includes('wicket') || role.includes('wk');
      } else if (filter === 'batsman') {
        return role.includes('bat') && !role.includes('allrounder') && !role.includes('wicket') && !role.includes('wk');
      } else if (filter === 'batting allrounder') {
        return role.includes('allrounder') && role.includes('bat');
      } else if (filter === 'bowling allrounder') {
        return role.includes('allrounder') && role.includes('bowl');
      } else if (filter === 'bowler') {
        return role.includes('bowl') && !role.includes('allrounder');
      }
      return false;
    });
  };

  const formatCountdown = (seconds) => {
    if (seconds <= 0) return 'Match started';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  const renderCricketGround = () => {
    if (!squadPlayers || squadPlayers.length === 0) {
      return <div className="cricket-ground">No players available</div>;
    }
    
    const selectedPlayers = squadPlayers.filter(p => playingXI.includes(p.player_id));
    
    if (selectedPlayers.length === 0) {
      return (
        <div className="cricket-ground">
          <div className="pitch">
            <div className="pitch-line"></div>
          </div>
          <div className="no-players-message">Select 11 players to see formation</div>
        </div>
      );
    }
    
    return (
      <div className="cricket-ground">
        <div className="pitch">
          <div className="pitch-line"></div>
        </div>
        
        <div className="field-positions">
          {selectedPlayers.map((player, index) => {
            if (!player) return null;
            
            return (
            <div 
              key={player.player_id}
              className={`player-position pos-${index + 1} ${captain === player.player_id ? 'is-captain' : ''} ${viceCaptain === player.player_id ? 'is-vice-captain' : ''}`}
              onClick={() => togglePlayerSelection(player.player_id)}
            >
              <div className="player-avatar">
                <img 
                  src={player.image_url || '/default-player.svg'} 
                  alt={player.player_name}
                  onError={(e) => { e.target.src = '/default-player.svg'; }}
                />
                {captain === player.player_id && <span className="badge-c">C</span>}
                {viceCaptain === player.player_id && <span className="badge-vc">VC</span>}
              </div>
              <span className="player-name">{player.player_name}</span>
              <span className="player-role">{player.role}</span>
            </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="playing-xi-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !selectedMatchId) {
    return (
      <div className="playing-xi-container">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!leagueId || !teamId) {
    return (
      <div className="playing-xi-container">
        <div className="alert alert-error">Missing league or team information</div>
      </div>
    );
  }

  if (squadPlayers.length === 0 && !loading) {
    return (
      <div className="playing-xi-container">
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No Squad Selected Yet</h3>
          <p>Before you can select a Playing XI, you need to build your team squad first.</p>
          <div className="help-steps">
            <ol>
              <li>Go to the <strong>"My Team"</strong> tab</li>
              <li>Select <strong>15 players</strong> from the available tournament squads</li>
              <li>Save your squad</li>
              <li>Return here to select your Playing XI of 11 players</li>
            </ol>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-secondary"
            style={{ marginTop: '20px' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="playing-xi-container">
      <div className="xi-header">
        <h3>🏏 Select Playing XI</h3>
        <div className="header-info">
          {matchLockStatus && !matchLockStatus.isLocked && (
            <div className="deadline-timer">
              ⏰ Deadline: {formatCountdown(matchLockStatus.secondsUntilStart)}
            </div>
          )}
          {transferStats && (
            <div className="transfer-stats-header">
              <div className="transfer-item">
                <span className="transfer-label">Transfers Left:</span>
                <span className={`transfer-value ${transferStats.transfersRemaining === 0 ? 'depleted' : ''}`}>
                  {transferStats.transfersRemaining}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {sequentialError && !canEdit && (
        <div className="alert alert-warning">
          🔒 <strong>Sequential Locking:</strong> {sequentialError}
        </div>
      )}

      {transferStats && transferStats.transfersLocked && (
        <div className="alert alert-warning">
          🚫 Transfer limit reached! You cannot make any more player changes. Your latest Playing XI will continue for remaining matches.
        </div>
      )}

      <div className="match-selector">
        <label htmlFor="matchSelect">Select Match:</label>
        <select
          id="matchSelect"
          value={selectedMatchId || ''}
          onChange={(e) => setSelectedMatchId(parseInt(e.target.value))}
          disabled={matchLockStatus?.isLocked}
        >
          <option value="">Choose a match</option>
          {matches.map(match => (
            <option key={match.match_id} value={match.match_id}>
              {match.match_description} - {new Date(match.match_start).toLocaleDateString()}
              {match.is_locked && ' 🔒'}
              {match.has_playing_xi && ' ✅'}
            </option>
          ))}
        </select>
        
        {selectedMatchId && !matchLockStatus?.isLocked && canEdit && (
          <button onClick={handleCopyFromPrevious} className="btn-secondary btn-copy-xi">
            📋 Copy from Previous Match
          </button>
        )}
      </div>

      {matchLockStatus?.isLocked && (
        <div className="alert alert-warning">
          🔒 This match has started. Playing XI is locked and cannot be changed.
        </div>
      )}

      {selectedMatchId && (
        <>
          <div className="selection-summary">
            <div className="summary-item">
              <span className="label">Selected:</span>
              <span className="value">{playingXI.length} / 11</span>
            </div>
            <div className="summary-item">
              <span className="label">Wicketkeepers:</span>
              <span className={`value ${squadPlayers.filter(p => playingXI.includes(p.player_id) && ((p.role || '').toLowerCase().includes('wicket') || (p.role || '').toLowerCase().includes('wk'))).length < 1 ? 'text-error' : ''}`}>
                {squadPlayers.filter(p => playingXI.includes(p.player_id) && ((p.role || '').toLowerCase().includes('wicket') || (p.role || '').toLowerCase().includes('wk'))).length} (min 1)
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Batsmen:</span>
              <span className={`value ${squadPlayers.filter(p => {
                if (!playingXI.includes(p.player_id)) return false;
                const role = (p.role || '').toLowerCase();
                return role.includes('bat') && !role.includes('allrounder') && !role.includes('wicket') && !role.includes('wk');
              }).length < 1 ? 'text-error' : ''}`}>
                {squadPlayers.filter(p => {
                  if (!playingXI.includes(p.player_id)) return false;
                  const role = (p.role || '').toLowerCase();
                  return role.includes('bat') && !role.includes('allrounder') && !role.includes('wicket') && !role.includes('wk');
                }).length} (min 1)
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Overs:</span>
              <span className={`value ${(() => {
                let totalOvers = 0;
                squadPlayers.filter(p => playingXI.includes(p.player_id)).forEach(player => {
                  const role = (player.role || '').toLowerCase();
                  if (role.includes('bowl') && role.includes('allrounder')) totalOvers += 4;
                  else if (role.includes('bat') && role.includes('allrounder')) totalOvers += 2;
                  else if (role.includes('bowl')) totalOvers += 4;
                });
                return totalOvers;
              })() < 20 ? 'text-error' : ''}`}>
                {(() => {
                  let totalOvers = 0;
                  squadPlayers.filter(p => playingXI.includes(p.player_id)).forEach(player => {
                    const role = (player.role || '').toLowerCase();
                    if (role.includes('bowl') && role.includes('allrounder')) totalOvers += 4;
                    else if (role.includes('bat') && role.includes('allrounder')) totalOvers += 2;
                    else if (role.includes('bowl')) totalOvers += 4;
                  });
                  return totalOvers;
                })()} / 20
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Captain:</span>
              <span className="value">
                {captain ? squadPlayers.find(p => p.player_id === captain)?.player_name : 'Not selected'}
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Vice-Captain:</span>
              <span className="value">
                {viceCaptain ? squadPlayers.find(p => p.player_id === viceCaptain)?.player_name : 'Not selected'}
              </span>
            </div>
          </div>

          {playingXI.length === 11 && renderCricketGround()}

          <div className="squad-selection">
            <h4>Your Squad</h4>
            
            {/* Smart Selection Banner */}
            {playingXI.length < 11 && (
              <div className="smart-selection-banner">
                <div className="banner-icon">💡</div>
                <div className="banner-content">
                  <div className="banner-title">Selection Progress: {playingXI.length}/11 players</div>
                  <div className="banner-suggestion">{getSelectionSuggestion()}</div>
                  <div className="banner-stats">
                    {(() => {
                      const stats = getSelectionStats();
                      return (
                        <>
                          <span className={stats.wk >= 1 ? 'stat-ok' : 'stat-error'}>
                            🧤 WK: {stats.wk} {stats.wk < 1 && '(need 1)'}
                          </span>
                          <span className={stats.bat >= 1 ? 'stat-ok' : 'stat-error'}>
                            🏏 BAT: {stats.bat} {stats.bat < 1 && '(need 1)'}
                          </span>
                          <span className="stat-ok">
                            ⚡ Bat-AR: {stats.battingAR}
                          </span>
                          <span className="stat-ok">
                            🎯 Bowl-AR: {stats.bowlingAR}
                          </span>
                          <span className="stat-ok">
                            🎳 BOWL: {stats.bowl}
                          </span>
                          <span className={stats.overs >= 20 ? 'stat-ok' : 'stat-error'}>
                            📊 Overs: {stats.overs}/20
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
            
            <p className="selection-help">
              Click on players to add/remove from Playing XI. 
              {playingXI.length === 11 && ' Then select Captain (C) and Vice-Captain (VC).'}
            </p>

            {['Wicketkeeper', 'Batsman', 'Batting Allrounder', 'Bowling Allrounder', 'Bowler'].map(role => {
              const rolePlayers = getPlayersByRole(role);
              if (rolePlayers.length === 0) return null;

              return (
                <div key={role} className="role-group">
                  <h5>{role}s ({rolePlayers.filter(p => playingXI.includes(p.player_id)).length}/{rolePlayers.length})</h5>
                  <div className="players-grid">
                    {rolePlayers.map((player, index) => {
                      if (!player || !player.player_id) {
                        console.warn('Invalid player data:', player, 'at index', index);
                        return null;
                      }
                      
                      const isSelected = playingXI.includes(player.player_id);
                      const isCaptain = captain === player.player_id;
                      const isVC = viceCaptain === player.player_id;
                      const canSelect = canSelectPlayer(player);
                      const disabledReason = getDisabledReason(player);
                      const isDisabled = matchLockStatus?.isLocked || !canEdit || (transferStats && transferStats.transfersLocked) || (!isSelected && !canSelect);

                      return (
                        <div 
                          key={player.player_id}
                          className={`player-card ${isSelected ? 'selected' : ''} ${isCaptain ? 'captain' : ''} ${isVC ? 'vice-captain' : ''} ${isDisabled ? 'disabled' : ''}`}
                          title={disabledReason || ''}
                        >
                          <div 
                            className="player-select-area"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isDisabled && !isSelected) {
                                setError(disabledReason || 'Cannot select this player');
                                setTimeout(() => setError(null), 3000);
                                return;
                              }
                              console.log('Player card clicked:', player.player_name, player.player_id);
                              togglePlayerSelection(player.player_id);
                            }}
                          >
                            <img 
                              src={player.image_url || '/default-player.svg'} 
                              alt={player.player_name}
                              onError={(e) => { e.target.src = '/default-player.svg'; }}
                            />
                            <div className="player-info">
                              <h6>{player.player_name}</h6>
                              <span className="team-badge">{player.team_name}</span>
                              {disabledReason && !isSelected && (
                                <span className="disabled-reason">{disabledReason}</span>
                              )}
                            </div>
                            {isSelected && (
                              <span className="selected-badge">✓</span>
                            )}
                          </div>

                          {isSelected && !matchLockStatus?.isLocked && canEdit && (
                            <div className="captain-controls">
                              <button
                                className={`btn-captain ${isCaptain ? 'active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCaptainSelection(player.player_id);
                                }}
                              >
                                {isCaptain ? 'C ✓' : 'C'}
                              </button>
                              <button
                                className={`btn-vice-captain ${isVC ? 'active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViceCaptainSelection(player.player_id);
                                }}
                              >
                                {isVC ? 'VC ✓' : 'VC'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {!matchLockStatus?.isLocked && (
            <div className="xi-actions">
              <button 
                onClick={handleSave}
                className="btn-primary btn-save-xi"
                disabled={saving || playingXI.length !== 11 || !canEdit || (transferStats && transferStats.transfersLocked)}
                title={
                  !canEdit ? sequentialError :
                  (transferStats && transferStats.transfersLocked) ? 'Transfer limit reached' :
                  ''
                }
              >
                {saving ? (
                  <>
                    <span className="spinner-small"></span> Saving...
                  </>
                ) : (
                  <>💾 Save Playing XI</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PlayingXIForm;
