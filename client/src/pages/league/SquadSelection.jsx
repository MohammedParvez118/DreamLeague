import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leagueAPI, tournamentAPI } from '../../services/api';
import './SquadSelection.css';

function SquadSelection() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  
  const [leagueInfo, setLeagueInfo] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [activeRole, setActiveRole] = useState('WK'); // Active tab
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [isNewLeague, setIsNewLeague] = useState(false);
  const [leagueCode, setLeagueCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const roles = [
    { key: 'WK', label: 'WK', fullName: 'Wicket-keeper', icon: '🧤' },
    { key: 'BAT', label: 'BAT', fullName: 'Batter', icon: '🏏' },
    { key: 'AR', label: 'ALL', fullName: 'All-rounder', icon: '⚡' },
    { key: 'BOWL', label: 'BOWL', fullName: 'Bowler', icon: '🎯' }
  ];

  useEffect(() => {
    // Check if this is a new league creation
    const newLeagueId = sessionStorage.getItem('newLeagueId');
    const storedLeagueCode = sessionStorage.getItem('newLeagueCode');
    
    if (newLeagueId === leagueId) {
      setIsNewLeague(true);
      setLeagueCode(storedLeagueCode || '');
    }

    fetchLeagueData();
  }, [leagueId]);

  const fetchLeagueData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching league details for league ID:', leagueId);
      
      // Get league details
      const leagueRes = await leagueAPI.getLeagueDetails(leagueId);
      console.log('📊 League response:', leagueRes.data);
      
      // Check if we have league data (API might return {league: {...}, teams: [...]} without success field)
      if (leagueRes.data && (leagueRes.data.success || leagueRes.data.league)) {
        const league = leagueRes.data.league;
        setLeagueInfo(league);
        console.log('✅ League info set:', league);

        // Find current user's team
        const userEmail = JSON.parse(localStorage.getItem('user'))?.email;
        const userId = JSON.parse(localStorage.getItem('user'))?.id;
        console.log('👤 Current user email:', userEmail, 'ID:', userId);
        
        // Team field might be 'owner_email' or 'team_owner' depending on API
        const userTeam = leagueRes.data.teams?.find(t => 
          t.owner_email === userEmail || t.team_owner === userEmail
        );
        console.log('🏆 User team found:', userTeam);
        
        if (userTeam) {
          setTeamId(userTeam.id);
          console.log('✅ Team ID set:', userTeam.id);
        } else {
          // For new leagues, team might not exist yet - will be created on squad save
          console.warn('⚠️ User team not found in league - will be created on squad save');
          // Use user ID as temporary identifier
          setTeamId(userId);
        }

        // Get available players from tournament
        const tournamentId = league.tournament_id || league.series_id;
        console.log('🏏 Fetching players for tournament ID:', tournamentId);
        
        if (!tournamentId) {
          console.error('❌ No tournament ID found in league');
          setError('Tournament information missing');
          return;
        }
        
        const playersRes = await tournamentAPI.getSquadPlayers(tournamentId);
        console.log('📋 Players API response:', playersRes.data);
        console.log('📋 Total players received:', playersRes.data?.players?.length || 0);
        
        if (playersRes.data && playersRes.data.players) {
          let players = playersRes.data.players || [];
          console.log('✅ Players loaded, count:', players.length);
          
          // Log unique roles to debug
          const uniqueRoles = [...new Set(players.map(p => p.role))];
          console.log('🎭 Unique roles in data:', uniqueRoles);
          
          if (players.length === 0) {
            console.warn('⚠️ No players returned from API');
            setError('No players available for this tournament');
            return;
          }
          
          // Get unavailable (already picked) players
          console.log('🔒 Fetching unavailable players for league:', leagueId);
          try {
            const unavailableRes = await leagueAPI.getUnavailablePlayers(leagueId);
            console.log('🔒 Unavailable players response:', unavailableRes.data);
            
            // Backend returns: { success: true, data: { unavailablePlayers: [...] } }
            if (unavailableRes.data.success && unavailableRes.data.data?.unavailablePlayers) {
              const unavailablePlayers = unavailableRes.data.data.unavailablePlayers;
              // Backend returns player_name field
              const unavailableNames = unavailablePlayers.map(p => p.player_name);
              console.log('🔒 Unavailable player count:', unavailablePlayers.length);
              console.log('🔒 Unavailable player names (first 5):', unavailableNames.slice(0, 5));
              
              // Filter out unavailable players by matching name
              const initialCount = players.length;
              players = players.filter(p => !unavailableNames.includes(p.name));
              const filteredCount = initialCount - players.length;
              console.log(`✅ Filtered out ${filteredCount} unavailable players. Remaining: ${players.length}`);
            } else {
              console.log('ℹ️ No unavailable players found (might be first user to select squad)');
            }
          } catch (err) {
            console.log('⚠️ Error fetching unavailable players, continuing with all players:', err.message);
          }
          
          setAllPlayers(players);
          console.log('✅ Final players set in state:', players.length);
        } else {
          console.error('❌ No players in API response');
          setError('No players found for this tournament');
        }
      } else {
        console.error('❌ League fetch unsuccessful - no league data in response');
        setError('Failed to load league details');
      }
    } catch (err) {
      console.error('❌ Error fetching league data:', err);
      setError('Failed to load league information: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayerSelection = (player) => {
    const isSelected = selectedPlayers.some(p => p.name === player.name);
    
    if (isSelected) {
      // Allow deselection
      setSelectedPlayers(selectedPlayers.filter(p => p.name !== player.name));
    } else {
      const squadSize = parseInt(leagueInfo?.squad_size || 15);
      
      // Check if squad is full
      if (selectedPlayers.length >= squadSize) {
        setError(`You can only select ${squadSize} players`);
        setTimeout(() => setError(null), 3000);
        return;
      }
      
      // Get current counts by role
      const wkCount = getSelectedCountByRole('WK');
      const batCount = getSelectedCountByRole('BAT');
      const arCount = getSelectedCountByRole('AR');
      const bowlCount = getSelectedCountByRole('BOWL');
      
      // Calculate remaining slots
      const remainingSlots = squadSize - selectedPlayers.length;
      
      // Calculate minimum slots needed for unfulfilled requirements
      const playerRole = normalizeRole(player.role);
      let minSlotsNeeded = 0;
      
      // Count how many categories still need minimum players (excluding current selection)
      if (wkCount === 0 && playerRole !== 'WK') minSlotsNeeded++;
      if (batCount === 0 && playerRole !== 'BAT') minSlotsNeeded++;
      if (arCount === 0 && playerRole !== 'AR') minSlotsNeeded++;
      
      // Check bowling overs requirement
      const currentOvers = calculateBowlingOvers();
      const neededOvers = 20 - currentOvers;
      let minBowlersNeeded = 0;
      
      if (neededOvers > 0) {
        // Calculate minimum bowlers/all-rounders needed to reach 20 overs
        // If selecting AR, it adds 2 overs; if BOWL, it adds 4 overs
        const oversAfterThisSelection = playerRole === 'BOWL' ? currentOvers + 4 : 
                                        playerRole === 'AR' ? currentOvers + 2 : currentOvers;
        const remainingOvers = 20 - oversAfterThisSelection;
        
        if (remainingOvers > 0) {
          // Worst case: need all bowlers (4 overs each)
          minBowlersNeeded = Math.ceil(remainingOvers / 4);
        }
      }
      
      // Total minimum slots needed
      const totalMinSlotsNeeded = minSlotsNeeded + minBowlersNeeded;
      
      // Check if selecting this player leaves enough room for requirements
      if (remainingSlots - 1 < totalMinSlotsNeeded) {
        let errorMsg = 'Cannot select this player. Must leave room for:\n';
        const missing = [];
        
        if (wkCount === 0 && playerRole !== 'WK') missing.push('1 WK');
        if (batCount === 0 && playerRole !== 'BAT') missing.push('1 BAT');
        if (arCount === 0 && playerRole !== 'AR') missing.push('1 AR');
        if (minBowlersNeeded > 0) missing.push(`${minBowlersNeeded} more bowler(s) for overs`);
        
        errorMsg += missing.join(', ');
        setError(errorMsg);
        setTimeout(() => setError(null), 5000);
        return;
      }
      
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  // Normalize role names for consistency
  const normalizeRole = (role) => {
    if (!role) {
      console.warn('⚠️ Null/undefined role');
      return 'Unknown';
    }
    
    const lowerRole = role.toLowerCase().trim();
    
    // DEBUG: Log all role normalizations
    console.log('🔄 Normalizing role:', role, '→ lowercase:', lowerRole);
    
    // Wicket-keeper variations (must check first before batter!)
    // Handles: "WK-Batter", "Wicket-keeper", "WK", "Keeper", etc.
    if (lowerRole.includes('wk') || lowerRole.includes('wicket') || lowerRole.includes('keeper')) {
      console.log('✅ Matched as WK');
      return 'WK';
    }
    
    // All-rounder variations (check before batsman to catch "Batting All-rounder")
    if (lowerRole.includes('all') || lowerRole.includes('rounder') || lowerRole === 'ar') {
      console.log('✅ Matched as AR');
      return 'AR';
    }
    
    // Batsman/Batter (check after WK and AR)
    if (lowerRole.includes('bat') || lowerRole.includes('bats')) {
      console.log('✅ Matched as BAT');
      return 'BAT';
    }
    
    // Bowler
    if (lowerRole.includes('bowl')) {
      console.log('✅ Matched as BOWL');
      return 'BOWL';
    }
    
    console.warn('⚠️ Unknown role, no match found:', role, '(lowercase:', lowerRole + ')');
    return role; // Return original if no match
  };

  // Get players by active role
  const getFilteredPlayers = () => {
    console.log('🔍 Filtering players for activeRole:', activeRole);
    console.log('📊 Total players available:', allPlayers.length);
    
    // Log first 5 players to see their roles
    if (allPlayers.length > 0) {
      console.log('👀 Sample player roles:');
      allPlayers.slice(0, 5).forEach(p => {
        console.log('  - Player:', p.name, '| Role:', p.role, '| Normalized:', normalizeRole(p.role));
      });
    }
    
    const filtered = allPlayers
      .filter(p => {
        const normalized = normalizeRole(p.role);
        const matches = normalized === activeRole;
        if (!matches && activeRole === 'WK') {
          console.log('❌ WK filter rejected:', p.name, '| Original role:', p.role, '| Normalized:', normalized);
        }
        return matches;
      })
      .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`🔍 Filtered players for ${activeRole}:`, filtered.length);
    if (filtered.length > 0) {
      console.log('✅ Sample filtered players:', filtered.slice(0, 3).map(p => p.name));
    }
    
    return filtered;
  };

  // Check if player is selected
  const isPlayerSelected = (player) => {
    return selectedPlayers.some(p => p.name === player.name);
  };

  // Check if player should be disabled from selection
  const isPlayerDisabled = (player) => {
    // Already selected players are not disabled (can be deselected)
    if (isPlayerSelected(player)) return false;
    
    const squadSize = parseInt(leagueInfo?.squad_size || 15);
    
    // If squad is full, disable all unselected players
    if (selectedPlayers.length >= squadSize) return true;
    
    // Get current counts
    const wkCount = getSelectedCountByRole('WK');
    const batCount = getSelectedCountByRole('BAT');
    const arCount = getSelectedCountByRole('AR');
    const bowlCount = getSelectedCountByRole('BOWL');
    const remainingSlots = squadSize - selectedPlayers.length;
    
    // Calculate minimum slots needed for unfulfilled requirements
    const playerRole = normalizeRole(player.role);
    let minSlotsNeeded = 0;
    
    if (wkCount === 0 && playerRole !== 'WK') minSlotsNeeded++;
    if (batCount === 0 && playerRole !== 'BAT') minSlotsNeeded++;
    if (arCount === 0 && playerRole !== 'AR') minSlotsNeeded++;
    
    // Calculate bowling requirement
    const currentOvers = calculateBowlingOvers();
    const oversAfterThisSelection = playerRole === 'BOWL' ? currentOvers + 4 : 
                                    playerRole === 'AR' ? currentOvers + 2 : currentOvers;
    const remainingOvers = 20 - oversAfterThisSelection;
    
    let minBowlersNeeded = 0;
    if (remainingOvers > 0) {
      minBowlersNeeded = Math.ceil(remainingOvers / 4);
    }
    
    const totalMinSlotsNeeded = minSlotsNeeded + minBowlersNeeded;
    
    // Disable if selecting this player doesn't leave enough room
    return (remainingSlots - 1 < totalMinSlotsNeeded);
  };

  // Get count of selected players by role
  const getSelectedCountByRole = (roleKey) => {
    return selectedPlayers.filter(p => normalizeRole(p.role) === roleKey).length;
  };

  // Calculate bowling overs
  const calculateBowlingOvers = () => {
    let totalOvers = 0;
    selectedPlayers.forEach(p => {
      const role = normalizeRole(p.role);
      if (role === 'BOWL') {
        totalOvers += 4; // Each bowler = 4 overs
      } else if (role === 'AR') {
        totalOvers += 2; // Each all-rounder = 2 overs
      }
    });
    return totalOvers;
  };

  // Validate selection
  const validateSelection = () => {
    const errors = [];
    const squadSize = parseInt(leagueInfo?.squad_size || 15);
    
    const wkCount = getSelectedCountByRole('WK');
    const batCount = getSelectedCountByRole('BAT');
    const arCount = getSelectedCountByRole('AR');
    const totalOvers = calculateBowlingOvers();

    if (selectedPlayers.length !== squadSize) {
      errors.push(`Select exactly ${squadSize} players`);
    }
    if (wkCount < 1) {
      errors.push('Min 1 WK required');
    }
    if (batCount < 1) {
      errors.push('Min 1 Batter required');
    }
    if (arCount < 1) {
      errors.push('Min 1 All-rounder required');
    }
    if (totalOvers < 20) {
      errors.push(`Min 20 overs required (currently ${totalOvers})`);
    }

    return errors;
  };

  const isValid = validateSelection().length === 0;

  const handlePreview = () => {
    const errors = validateSelection();
    if (errors.length > 0) {
      setError(errors.join(', '));
      setTimeout(() => setError(null), 5000);
      return;
    }
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    if (!teamId) {
      setError('Team information not found');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const squadData = {
        players: selectedPlayers.map(p => ({
          player_id: p.player_id,
          name: p.name,
          role: p.role,
          squad_type: p.squad_type
        }))
      };

      const response = await leagueAPI.saveTeamSquad(leagueId, teamId, squadData);

      if (response.data.success) {
        setSuccess('Squad saved successfully!');
        
        // Clear session storage
        sessionStorage.removeItem('newLeagueId');
        sessionStorage.removeItem('newLeagueCode');
        
        // Redirect to league page
        setTimeout(() => {
          navigate(`/league/${leagueId}`);
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving squad:', err);
      setError(err.response?.data?.message || 'Failed to save squad');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-main-container">
        <div className="squad-selection-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading players...</p>
          </div>
        </div>
      </div>
    );
  }

  const squadSize = parseInt(leagueInfo?.squad_size || 15);
  const totalOvers = calculateBowlingOvers();
  const filteredPlayers = getFilteredPlayers();

  // Preview mode
  if (showPreview) {
    return (
      <div className="app-main-container">
        <div className="squad-selection-container">
          {isNewLeague && leagueCode && (
            <div className="league-code-banner">
              <h3>🎉 League Created!</h3>
              <p>Share code: <strong>{leagueCode}</strong></p>
            </div>
          )}

          <div className="preview-header">
            <button 
              className="back-button"
              onClick={() => setShowPreview(false)}
            >
              ← Back
            </button>
            <h2>Preview Squad</h2>
          </div>

          <div className="preview-summary">
            <div className="summary-card">
              <div className="summary-label">Squad Size</div>
              <div className="summary-value">{selectedPlayers.length}/{squadSize}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Bowling Overs</div>
              <div className="summary-value">{totalOvers}/20</div>
            </div>
          </div>

          <div className="preview-breakdown">
            {roles.map(role => {
              const players = selectedPlayers.filter(p => normalizeRole(p.role) === role.key);
              if (players.length === 0) return null;
              
              return (
                <div key={role.key} className="preview-role-section">
                  <h3>{role.icon} {role.fullName} ({players.length})</h3>
                  <div className="preview-players-grid">
                    {players.map((player, idx) => (
                      <div key={idx} className="preview-player-card">
                        <div className="preview-player-name">{player.name}</div>
                        <div className="preview-player-team">{player.squad_type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="preview-actions">
            <button 
              className="btn-secondary"
              onClick={() => setShowPreview(false)}
              disabled={saving}
            >
              Back to Edit
            </button>
            <button 
              className="btn-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Submit Squad'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Selection mode - Dream XI style
  return (
    <div className="app-main-container">
      <div className="squad-selection-container">
        {isNewLeague && leagueCode && (
          <div className="league-code-banner">
            <h3>🎉 League Created!</h3>
            <p>Share this code: <strong>{leagueCode}</strong></p>
          </div>
        )}

        <div className="selection-header">
          <button 
            className="back-button"
            onClick={() => navigate('/fantasy')}
          >
            ← Back
          </button>
          <div className="header-info">
            <h2>Select Your Squad</h2>
            <p className="league-name">{leagueInfo?.league_name}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="selection-progress">
          <div className="progress-header">
            <span className="progress-text">
              {selectedPlayers.length}/{squadSize} Players • {totalOvers}/20 Overs
            </span>
            <span className={`validation-status ${isValid ? 'valid' : 'invalid'}`}>
              {isValid ? '✓ Ready' : '✗ Incomplete'}
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(selectedPlayers.length / squadSize) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Role Tabs - Dream XI Style */}
        <div className="role-tabs">
          {roles.map(role => (
            <button
              key={role.key}
              className={`role-tab ${activeRole === role.key ? 'active' : ''}`}
              onClick={() => setActiveRole(role.key)}
            >
              <span className="role-icon">{role.icon}</span>
              <span className="role-label">{role.label}</span>
              <span className="role-count">{getSelectedCountByRole(role.key)}</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <input
            type="text"
            placeholder={`Search ${roles.find(r => r.key === activeRole)?.fullName || 'players'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Selection Constraints Info */}
        {selectedPlayers.length > 0 && (
          <div className="constraints-info">
            <small>
              {(() => {
                const squadSize = parseInt(leagueInfo?.squad_size || 15);
                const remaining = squadSize - selectedPlayers.length;
                const wkCount = getSelectedCountByRole('WK');
                const batCount = getSelectedCountByRole('BAT');
                const arCount = getSelectedCountByRole('AR');
                const overs = calculateBowlingOvers();
                
                const needs = [];
                if (wkCount === 0) needs.push('1 WK');
                if (batCount === 0) needs.push('1 BAT');
                if (arCount === 0) needs.push('1 AR');
                if (overs < 20) needs.push(`${20 - overs} overs`);
                
                if (needs.length === 0) {
                  return `✅ All requirements met! ${remaining} slot${remaining !== 1 ? 's' : ''} remaining.`;
                } else {
                  return `⚠️ ${remaining} slot${remaining !== 1 ? 's' : ''} left. Still need: ${needs.join(', ')}`;
                }
              })()}
            </small>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {/* Players Grid */}
        <div className="players-container">
          {filteredPlayers.length === 0 ? (
            <div className="no-players">
              <p>No {roles.find(r => r.key === activeRole)?.fullName || 'players'} available</p>
            </div>
          ) : (
            <div className="players">
              {filteredPlayers.map((player, idx) => {
                const selected = isPlayerSelected(player);
                const disabled = isPlayerDisabled(player);
                
                return (
                  <div
                    key={idx}
                    className={`player ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && togglePlayerSelection(player)}
                    style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                  >
                    <div className="player-info">
                      <div className="player-name">{player.name}</div>
                      <div className="player-team">{player.squad_type}</div>
                    </div>
                    {selected && (
                      <div className="selected-badge">
                        <span className="checkmark">✓</span>
                      </div>
                    )}
                    {disabled && !selected && (
                      <div className="disabled-overlay">🔒</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="action-footer">
          <div className="footer-stats">
            <div className="stat-item">
              <span className="stat-icon">🧤</span>
              <span className={getSelectedCountByRole('WK') >= 1 ? 'valid' : 'invalid'}>
                WK: {getSelectedCountByRole('WK')}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🏏</span>
              <span className={getSelectedCountByRole('BAT') >= 1 ? 'valid' : 'invalid'}>
                BAT: {getSelectedCountByRole('BAT')}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">⚡</span>
              <span className={getSelectedCountByRole('AR') >= 1 ? 'valid' : 'invalid'}>
                AR: {getSelectedCountByRole('AR')}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🎯</span>
              <span>BOWL: {getSelectedCountByRole('BOWL')}</span>
            </div>
          </div>
          <button 
            className="btn-preview"
            onClick={handlePreview}
            disabled={!isValid}
          >
            Preview Squad {isValid && '✓'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SquadSelection;
