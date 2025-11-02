import React from 'react';
import './LeagueComponents.css';

function AvailablePlayersTab({ 
  squadSize,
  availablePlayers,
  squadNames,
  selectedPlayers,
  usedPlayers,
  handlePlayerSelect,
  setActiveTab
}) {
  return (
    <div className="tab-panel">
      <div className="available-players-header">
        <h3>🎯 Available Players</h3>
        <p>Select exactly {squadSize} players for your team. Players already selected by other teams are marked unavailable.</p>
        
        {/* Team Requirements Info Box */}
        <div style={{ 
          marginTop: '15px', 
          padding: '15px', 
          background: '#fff3cd', 
          borderRadius: '8px', 
          border: '2px solid #ffc107',
          fontSize: '0.9rem'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#856404', fontSize: '1rem' }}>
            ⚠️ Team Selection Requirements:
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404', lineHeight: '1.8' }}>
            <li><strong>Total Players:</strong> Exactly {squadSize} players</li>
            <li><strong>Wicketkeepers (WK):</strong> Minimum 1 required</li>
            <li><strong>Bowling Quota:</strong> Minimum 20 overs required
              <ul style={{ marginTop: '5px', fontSize: '0.85rem' }}>
                <li>Each Bowler contributes 4 overs</li>
                <li>Each Bowling Allrounder contributes 4 overs</li>
                <li>Each Batting Allrounder contributes 2 overs</li>
                <li>Example: 4 Bowlers + 1 Bowling AR = (4×4) + (1×4) = 20 overs ✓</li>
              </ul>
            </li>
            <li><strong>Captain & Vice-Captain:</strong> Must be selected from your squad</li>
          </ul>
        </div>
        
        <div style={{ marginTop: '10px', padding: '10px', background: '#e3f2fd', borderRadius: '6px', fontSize: '0.9rem' }}>
          ℹ️ <strong>Note:</strong> Selected players (marked with ✓) are only temporarily selected. They will appear in your "My Team" tab. 
          To make them officially yours and unavailable to others, click <strong>"Save Team"</strong> in the My Team tab.
        </div>
      </div>

      {availablePlayers.length === 0 ? (
        <div className="empty-state">
          <p>No players available. Please ensure the tournament has squad data.</p>
          <button onClick={() => setActiveTab('tournament')} className="btn-primary">
            View Tournament
          </button>
        </div>
      ) : (
        <div className="players-by-team">
          {squadNames.map(teamName => {
            const teamPlayers = availablePlayers.filter(p => p.team === teamName);
            if (teamPlayers.length === 0) return null;

            return (
              <div key={teamName} className="team-players-section">
                <h4 className="team-name-header">🏏 {teamName}</h4>
                <div className="players-grid">
                  {teamPlayers.map((player, index) => {
                    const playerId = player.player_id || `${player.name}-${player.team}`;
                    const isSelected = selectedPlayers.some(p => (p.player_id || `${p.name}-${p.team}`) === playerId);
                    const isUsed = usedPlayers.has(player.player_id) && !isSelected;

                    return (
                      <div 
                        key={index} 
                        className={`player-card ${isSelected ? 'selected' : ''} ${isUsed ? 'used' : ''}`}
                        onClick={() => !isUsed && handlePlayerSelect(player)}
                        style={{ cursor: isUsed ? 'not-allowed' : 'pointer' }}
                      >
                        <div className="player-card-header">
                          <span className="player-card-name">{player.name}</span>
                          {isSelected && <span className="check-icon">✓</span>}
                          {isUsed && <span className="used-badge">Unavailable</span>}
                        </div>
                        <div className="player-card-role">{player.role || 'N/A'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AvailablePlayersTab;
