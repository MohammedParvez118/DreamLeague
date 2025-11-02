import React, { useState, useEffect } from 'react';
import { playingXIAPI } from '../../services/api';
import './LeagueComponents.css';

function PlayingXITab({ leagueId, myTeam, selectedPlayers }) {
  const [latestPlayingXI, setLatestPlayingXI] = useState([]);
  const [matchInfo, setMatchInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (myTeam && leagueId) {
      fetchLatestPlayingXI();
    }
  }, [myTeam, leagueId]);

  const fetchLatestPlayingXI = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all matches with Playing XI status
      const matchesResponse = await playingXIAPI.getMatchesWithStatus(leagueId, myTeam.id);
      
      if (matchesResponse.data.success) {
        const matches = matchesResponse.data.data.matches;
        
        // Find the most recent match with a saved Playing XI
        const matchesWithXI = matches.filter(m => m.has_playing_xi);
        
        if (matchesWithXI.length > 0) {
          // Sort by match_id descending to get the latest
          const latestMatch = matchesWithXI.sort((a, b) => b.match_id - a.match_id)[0];
          
          // Fetch the Playing XI for this match
          const xiResponse = await playingXIAPI.getPlayingXI(leagueId, myTeam.id, latestMatch.match_id);
          
          if (xiResponse.data.success) {
            setLatestPlayingXI(xiResponse.data.data.players);
            setMatchInfo({
              description: latestMatch.match_description,
              start: latestMatch.match_start,
              isLocked: latestMatch.is_locked,
              isCompleted: latestMatch.is_completed
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching latest Playing XI:', err);
      setError('Failed to load Playing XI');
    } finally {
      setLoading(false);
    }
  };

  const getPlayersByPosition = () => {
    const positions = {
      wicketkeeper: [],
      batsman: [],
      battingAllrounder: [],
      bowlingAllrounder: [],
      bowler: []
    };

    latestPlayingXI.forEach(player => {
      const role = (player.player_role || '').toLowerCase();
      
      if (role.includes('wicket') || role.includes('wk')) {
        positions.wicketkeeper.push(player);
      } else if (role.includes('bowling') && role.includes('allrounder')) {
        positions.bowlingAllrounder.push(player);
      } else if (role.includes('batting') && role.includes('allrounder')) {
        positions.battingAllrounder.push(player);
      } else if (role.includes('bowl')) {
        positions.bowler.push(player);
      } else if (role.includes('bat')) {
        positions.batsman.push(player);
      }
    });

    return positions;
  };

  const getRoleStats = (players) => {
    const stats = {
      wicketkeeper: 0,
      batsman: 0,
      battingAllrounder: 0,
      bowlingAllrounder: 0,
      bowler: 0,
      totalOvers: 0
    };
    
    players.forEach(player => {
      const role = (player.player_role || '').toLowerCase();
      
      if (role.includes('wicket') || role.includes('wk')) {
        stats.wicketkeeper++;
      } else if (role.includes('bowling') && role.includes('allrounder')) {
        stats.bowlingAllrounder++;
        stats.totalOvers += 4;
      } else if (role.includes('batting') && role.includes('allrounder')) {
        stats.battingAllrounder++;
        stats.totalOvers += 2;
      } else if (role.includes('bowl')) {
        stats.bowler++;
        stats.totalOvers += 4;
      } else if (role.includes('bat')) {
        stats.batsman++;
      }
    });
    
    return stats;
  };

  if (!myTeam) {
    return (
      <div className="tab-panel">
        <div className="empty-state">
          <div className="empty-icon">🏏</div>
          <p>You are not a member of this league</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="tab-panel">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading Playing XI...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-panel">
        <div className="error-state">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (latestPlayingXI.length === 0) {
    return (
      <div className="tab-panel">
        <div className="empty-state">
          <div className="empty-icon">🏏</div>
          <h3>No Playing XI Found</h3>
          <p>You haven't selected a Playing XI for any match yet.</p>
          <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
            Go to the "Playing XI" tab to select your team for upcoming matches.
          </p>
        </div>
      </div>
    );
  }

  const positions = getPlayersByPosition();
  const roleStats = getRoleStats(latestPlayingXI);
  const captain = latestPlayingXI.find(p => p.is_captain);
  const viceCaptain = latestPlayingXI.find(p => p.is_vice_captain);

  return (
    <div className="tab-panel">
      {/* Header with Match Info */}
      <div className="playing-xi-header">
        <h3>🏏 Latest Playing XI</h3>
        {matchInfo && (
          <div style={{ 
            padding: '12px', 
            background: '#e3f2fd', 
            borderRadius: '8px', 
            marginTop: '10px',
            marginBottom: '15px'
          }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#1976d2', marginBottom: '4px' }}>
              {matchInfo.description}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>
              {new Date(matchInfo.start).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
              {matchInfo.isCompleted && <span style={{ marginLeft: '10px', color: '#28a745' }}>✓ Completed</span>}
              {matchInfo.isLocked && !matchInfo.isCompleted && <span style={{ marginLeft: '10px', color: '#dc3545' }}>🔒 Locked</span>}
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="playing-xi-stats">
          <div className="xi-stat-card">
            <div className="xi-stat-value">{latestPlayingXI.length}/11</div>
            <div className="xi-stat-label">Players</div>
          </div>
          <div className="xi-stat-card">
            <div className="xi-stat-value">{roleStats.wicketkeeper}</div>
            <div className="xi-stat-label">Wicketkeepers</div>
          </div>
          <div className="xi-stat-card">
            <div className="xi-stat-value">{roleStats.totalOvers}</div>
            <div className="xi-stat-label">Total Overs</div>
          </div>
          <div className="xi-stat-card">
            <div className="xi-stat-value">{captain?.player_name || 'N/A'}</div>
            <div className="xi-stat-label">Captain</div>
          </div>
          <div className="xi-stat-card">
            <div className="xi-stat-value">{viceCaptain?.player_name || 'N/A'}</div>
            <div className="xi-stat-label">Vice Captain</div>
          </div>
        </div>
      </div>

      {/* Cricket Ground Formation */}
      <div className="cricket-ground-container">
        <div className="cricket-ground">
          {/* Pitch circle in center */}
          <div className="pitch-circle"></div>
          
          {/* Wicketkeeper Position */}
          {positions.wicketkeeper.length > 0 && (
            <div className="position-line wk-line">
              <div className="position-label">WICKET-KEEPER</div>
              <div className="players-row">
                {positions.wicketkeeper.map((player, idx) => (
                  <div key={idx} className="player-card-xi view-only">
                    <div className="player-jersey">
                      {player.is_captain && <span className="badge-c">C</span>}
                      {player.is_vice_captain && <span className="badge-vc">VC</span>}
                      <div className="jersey-icon">👕</div>
                      <div className="player-name-xi">{player.player_name}</div>
                      <div className="player-team-xi">{player.squad_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Batsmen Position */}
          {positions.batsman.length > 0 && (
            <div className="position-line bat-line">
              <div className="position-label">BATSMEN</div>
              <div className="players-row">
                {positions.batsman.map((player, idx) => (
                  <div key={idx} className="player-card-xi view-only">
                    <div className="player-jersey">
                      {player.is_captain && <span className="badge-c">C</span>}
                      {player.is_vice_captain && <span className="badge-vc">VC</span>}
                      <div className="jersey-icon">👕</div>
                      <div className="player-name-xi">{player.player_name}</div>
                      <div className="player-team-xi">{player.squad_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Batting Allrounder Position */}
          {positions.battingAllrounder.length > 0 && (
            <div className="position-line bat-ar-line">
              <div className="position-label">BATTING ALL-ROUNDERS</div>
              <div className="players-row">
                {positions.battingAllrounder.map((player, idx) => (
                  <div key={idx} className="player-card-xi view-only">
                    <div className="player-jersey">
                      {player.is_captain && <span className="badge-c">C</span>}
                      {player.is_vice_captain && <span className="badge-vc">VC</span>}
                      <div className="jersey-icon">👕</div>
                      <div className="player-name-xi">{player.player_name}</div>
                      <div className="player-team-xi">{player.squad_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bowling Allrounder & Bowlers Position */}
          {(positions.bowlingAllrounder.length > 0 || positions.bowler.length > 0) && (
            <div className="position-line bowl-line">
              <div className="position-label">BOWLERS & BOWLING ALL-ROUNDERS</div>
              <div className="players-row">
                {[...positions.bowlingAllrounder, ...positions.bowler].map((player, idx) => (
                  <div key={idx} className="player-card-xi view-only">
                    <div className="player-jersey">
                      {player.is_captain && <span className="badge-c">C</span>}
                      {player.is_vice_captain && <span className="badge-vc">VC</span>}
                      <div className="jersey-icon">👕</div>
                      <div className="player-name-xi">{player.player_name}</div>
                      <div className="player-team-xi">{player.squad_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Composition Details */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        border: '2px solid #e0e0e0'
      }}>
        <h4 style={{ marginBottom: '12px', fontSize: '1rem', color: '#333' }}>📊 Team Composition</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div style={{ padding: '10px', background: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
            <div style={{ fontWeight: 'bold', color: '#333' }}>Wicketkeepers: {roleStats.wicketkeeper}</div>
          </div>
          <div style={{ padding: '10px', background: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
            <div style={{ fontWeight: 'bold', color: '#333' }}>Batsmen: {roleStats.batsman}</div>
          </div>
          <div style={{ padding: '10px', background: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
            <div style={{ fontWeight: 'bold', color: '#333' }}>Batting AR: {roleStats.battingAllrounder}</div>
          </div>
          <div style={{ padding: '10px', background: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
            <div style={{ fontWeight: 'bold', color: '#333' }}>Bowling AR: {roleStats.bowlingAllrounder}</div>
          </div>
          <div style={{ padding: '10px', background: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
            <div style={{ fontWeight: 'bold', color: '#333' }}>Bowlers: {roleStats.bowler}</div>
          </div>
        </div>
      </div>

      {/* Info Message */}
      <div style={{
        marginTop: '15px',
        padding: '12px',
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '6px',
        fontSize: '0.9rem',
        color: '#856404'
      }}>
        ℹ️ This shows your most recent Playing XI selection. To update or select for upcoming matches, go to the "Playing XI" tab.
      </div>
    </div>
  );
}

export default PlayingXITab;
