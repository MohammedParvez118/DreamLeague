import React from 'react';
import './LeagueComponents.css';

function MatchesTab({ 
  league, 
  matches, 
  tournamentLoading,
  handleMatchClick,
  selectedMatch,
  matchPlayers,
  loadingMatchPlayers,
  setSelectedMatch
}) {
  if (!league.tournament_id) {
    return (
      <div className="tab-panel">
        <div className="empty-state">
          <div className="empty-icon">⚡</div>
          <p>No tournament associated with this league</p>
        </div>
      </div>
    );
  }

  if (tournamentLoading) {
    return (
      <div className="tab-panel">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <div className="matches-section">
        <h3>⚡ Tournament Matches</h3>
        <p style={{ marginBottom: '20px', color: '#666' }}>
          Click on any match to see fantasy points earned by players selected in this league
        </p>

        {matches.length === 0 ? (
          <div className="empty-state">
            <p>No matches available for this tournament.</p>
          </div>
        ) : (
          <div className="matches-table-container">
            <table className="matches-table">
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Teams</th>
                  <th>Description</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <React.Fragment key={match.match_id}>
                    <tr 
                      className={`match-row ${selectedMatch?.match_id === match.match_id ? 'selected' : ''}`}
                      onClick={() => handleMatchClick(match)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td><strong>#{match.match_id}</strong></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span>{match.team1}</span>
                          <span style={{ color: '#999' }}>vs</span>
                          <span>{match.team2}</span>
                        </div>
                      </td>
                      <td>{match.match_description || 'N/A'}</td>
                      <td className={match.result ? 'has-result' : 'upcoming'}>
                        {match.result || 'Upcoming'}
                      </td>
                    </tr>
                    
                    {/* Match Players Details */}
                    {selectedMatch?.match_id === match.match_id && (
                      <tr className="match-details-row">
                        <td colSpan="4" style={{ padding: 0, border: 'none' }}>
                          <div className="match-details-panel">
                            <div className="match-details-header">
                              <h4>🏆 {selectedMatch.team1} vs {selectedMatch.team2}</h4>
                              <p>{selectedMatch.match_description}</p>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMatch(null);
                                }}
                                className="btn-close"
                                style={{ 
                                  padding: '8px 16px', 
                                  background: '#e0e0e0', 
                                  border: 'none', 
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  marginTop: '10px'
                                }}
                              >
                                ✕ Close
                              </button>
                            </div>

                            {loadingMatchPlayers ? (
                              <div className="loading-container">
                                <div className="spinner"></div>
                                <p>Loading player performance...</p>
                              </div>
                            ) : matchPlayers.length === 0 ? (
                              <div className="empty-state">
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏏</div>
                                <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333', marginBottom: '0.5rem' }}>
                                  None of your players played this match
                                </p>
                                <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                                  The players selected in your league squads did not participate in this particular match.
                                  Try selecting a different match to see fantasy points.
                                </p>
                              </div>
                            ) : (() => {
                              const playersWithPoints = matchPlayers.filter(p => p.fantasy_points > 0);
                              
                              if (playersWithPoints.length === 0) {
                                return (
                                  <div className="empty-state">
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏏</div>
                                    <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333', marginBottom: '0.5rem' }}>
                                      None of your players played this match
                                    </p>
                                    <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                                      While {matchPlayers.length} player(s) from your league were selected, 
                                      none of them participated in this match. Try selecting a different match.
                                    </p>
                                  </div>
                                );
                              }
                              
                              return (
                                <div className="match-players-container">
                                  <table className="match-players-table">
                                    <thead>
                                      <tr>
                                        <th>Player</th>
                                        <th>Team (Cricket)</th>
                                        <th>Fantasy Points</th>
                                        <th>Selected By</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {matchPlayers.map((player, index) => (
                                        <tr key={index}>
                                          <td><strong>{player.player_name}</strong></td>
                                          <td>{player.cricket_team}</td>
                                          <td className="fantasy-points">
                                            <span style={{ 
                                              background: '#4caf50', 
                                              color: 'white', 
                                              padding: '4px 12px', 
                                              borderRadius: '12px',
                                              fontWeight: 'bold'
                                            }}>
                                              {player.fantasy_points || 0} pts
                                            </span>
                                          </td>
                                          <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                              {player.teams && player.teams.length > 0 ? (
                                                player.teams.map((team, idx) => (
                                                  <span key={idx} style={{ 
                                                    padding: '4px 8px', 
                                                    background: '#e3f2fd', 
                                                    borderRadius: '4px',
                                                    fontSize: '0.85rem'
                                                  }}>
                                                    {team.team_name} ({team.team_owner})
                                                  </span>
                                                ))
                                              ) : (
                                                <span style={{ color: '#999' }}>Not selected</span>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MatchesTab;
