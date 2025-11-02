import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LeagueComponents.css';

function MyTeamTab({ 
  myTeam, 
  squadSize,
  selectedPlayers,
  captain,
  viceCaptain,
  getRoleStats
}) {
  const navigate = useNavigate();

  // Debug logging
  console.log('MyTeamTab - selectedPlayers:', selectedPlayers);
  console.log('MyTeamTab - First player:', selectedPlayers[0]);

  if (!myTeam) {
    return (
      <div className="tab-panel">
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <p>You are not a member of this league</p>
          <button onClick={() => navigate('/home')} className="btn-primary">
            Join League
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <div className="my-team-header">
        <h3>👤 {myTeam.team_name}</h3>
        <p className="team-owner">Owner: {myTeam.team_owner}</p>
        <p style={{ marginTop: '10px', padding: '10px', background: '#e3f2fd', borderRadius: '6px', fontSize: '0.95rem' }}>
          📋 Squad Size for this league: <strong>{squadSize} players</strong>
        </p>
      </div>

      <div className="team-builder">
        <div className="team-stats">
          <div className="stat-card">
            <div className="stat-value">{selectedPlayers.length}/{squadSize}</div>
            <div className="stat-label">Players Selected</div>
          </div>
        </div>

        {/* Role Statistics */}
        {selectedPlayers.length > 0 && (() => {
          const roleStats = getRoleStats(selectedPlayers);
          const wkValid = roleStats.wicketkeeper >= 1;
          const batsmanValid = roleStats.batsman >= 1;
          const oversValid = roleStats.totalOvers >= 20;
          
          return (
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              background: '#f8f9fa', 
              borderRadius: '8px',
              border: '2px solid #e0e0e0'
            }}>
              <h4 style={{ marginBottom: '12px', fontSize: '1rem', color: '#333' }}>📊 Team Composition</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                <div style={{ 
                  padding: '10px', 
                  background: wkValid ? '#d4edda' : '#f8d7da', 
                  borderRadius: '6px',
                  border: `2px solid ${wkValid ? '#28a745' : '#dc3545'}`
                }}>
                  <div style={{ fontWeight: 'bold', color: '#333' }}>
                    {wkValid ? '✓' : '✗'} Wicketkeepers: {roleStats.wicketkeeper}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                    Required: Minimum 1
                  </div>
                </div>
                
                <div style={{ 
                  padding: '10px', 
                  background: batsmanValid ? '#d4edda' : '#f8d7da', 
                  borderRadius: '6px',
                  border: `2px solid ${batsmanValid ? '#28a745' : '#dc3545'}`
                }}>
                  <div style={{ fontWeight: 'bold', color: '#333' }}>
                    {batsmanValid ? '✓' : '✗'} Batsmen: {roleStats.batsman}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                    Required: Minimum 1
                  </div>
                </div>
                
                <div style={{ 
                  padding: '10px', 
                  background: oversValid ? '#d4edda' : '#f8d7da', 
                  borderRadius: '6px',
                  border: `2px solid ${oversValid ? '#28a745' : '#dc3545'}`
                }}>
                  <div style={{ fontWeight: 'bold', color: '#333' }}>
                    {oversValid ? '✓' : '✗'} Bowling Quota: {roleStats.totalOvers} overs
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                    Required: Minimum 20 overs
                  </div>
                </div>
                
                <div style={{ 
                  padding: '10px', 
                  background: '#fff', 
                  borderRadius: '6px',
                  border: '1px solid #ddd'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#333' }}>
                    <strong>Bowlers:</strong> {roleStats.bowler} × 4 = {roleStats.bowler * 4} overs
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#333', marginTop: '4px' }}>
                    <strong>Bowling AR:</strong> {roleStats.bowlingAllrounder} × 4 = {roleStats.bowlingAllrounder * 4} overs
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#333', marginTop: '4px' }}>
                    <strong>Batting AR:</strong> {roleStats.battingAllrounder} × 2 = {roleStats.battingAllrounder * 2} overs
                  </div>
                </div>
                
                <div style={{ 
                  padding: '10px', 
                  background: '#fff', 
                  borderRadius: '6px',
                  border: '1px solid #ddd'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#333' }}>
                    <strong>Batsmen:</strong> {roleStats.batsman}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '4px' }}>
                    Minimum 1 required
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {selectedPlayers.length > 0 && (
          <div className="selected-players-section">
            <h4>🎯 Your Squad</h4>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
              Squad was locked when you joined/created this league. Use transfers to make changes.
            </p>
            
            {/* Group players by role */}
            {(() => {
              const groupedPlayers = {
                'Wicketkeeper': selectedPlayers.filter(p => {
                  const role = (p.role || '').toLowerCase();
                  return role.includes('wk') || role.includes('wicket');
                }),
                'Batsman': selectedPlayers.filter(p => {
                  const role = (p.role || '').toLowerCase();
                  return role.includes('bat') && !role.includes('allrounder') && !role.includes('wk') && !role.includes('wicket');
                }),
                'Batting All-rounder': selectedPlayers.filter(p => {
                  const role = (p.role || '').toLowerCase();
                  return role.includes('allrounder') && role.includes('bat');
                }),
                'Bowler': selectedPlayers.filter(p => {
                  const role = (p.role || '').toLowerCase();
                  // Include both Bowlers and Bowling All-rounders
                  return (role.includes('bowl') && !role.includes('allrounder')) || 
                         (role.includes('allrounder') && role.includes('bowl'));
                })
              };

              const roleLabels = {
                'Wicketkeeper': 'WIC',
                'Batsman': 'BAT',
                'Batting All-rounder': 'B-AR',
                'Bowler': 'BOW'
              };

              return Object.entries(groupedPlayers).map(([role, players]) => (
                players.length > 0 && (
                  <div key={role} className="role-group">
                    <h5 className="role-heading">
                      {role}s ({players.length})
                      {role === 'Bowler' && ' (includes Bowling All-rounders)'}
                    </h5>
                    <div className="players-list">
                      {players.map((player, index) => {
                        const isAllrounder = (player.role || '').toLowerCase().includes('allrounder');
                        return (
                          <div key={index} className="player-item">
                            <div className="player-number">{roleLabels[role]}{index + 1}</div>
                            <div className="player-details">
                              <div className="player-main-name">
                                {player.name}
                                {isAllrounder && role === 'Bowler' && (
                                  <span style={{ 
                                    marginLeft: '6px', 
                                    fontSize: '0.75rem', 
                                    padding: '2px 6px', 
                                    background: '#9c27b0', 
                                    color: 'white', 
                                    borderRadius: '4px',
                                    fontWeight: 'normal'
                                  }}>
                                    Bowling AR
                                  </span>
                                )}
                              </div>
                              <div className="player-sub-info">{player.team}</div>
                            </div>
                            <div className="player-badges-inline">
                              {captain?.name === player.name && (
                                <span className="badge-captain">C</span>
                              )}
                              {viceCaptain?.name === player.name && (
                                <span className="badge-vice-captain">VC</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ));
            })()}
          </div>
        )}

        {selectedPlayers.length === 0 && (
          <div className="empty-state">
            <p>Your squad is empty. You should have selected players when joining/creating this league.</p>
            <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
              Contact the league administrator if you need to update your squad.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyTeamTab;
