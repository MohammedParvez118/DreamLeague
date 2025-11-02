import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PlayerMatchStatsModal.css';

const PlayerMatchStatsModal = ({ playerId, playerName, tournamentId, onClose }) => {
  const [matchStats, setMatchStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlayerMatchStats();
  }, [playerId, tournamentId]);

  const fetchPlayerMatchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `http://localhost:3000/api/tournaments/${tournamentId}/player/${playerId}/matches`
      );
      
      if (response.data.success) {
        setMatchStats(response.data.data.matches);
      } else {
        setError('Failed to load match stats');
      }
    } catch (err) {
      console.error('Error fetching player match stats:', err);
      setError('Failed to load match stats');
    } finally {
      setLoading(false);
    }
  };

  const calculateMatchFantasyPoints = (match) => {
    if (!match.played) return 0;
    
    let points = 0;
    const { batting, bowling, fielding } = match;

    // Batting points
    if (batting) {
      points += batting.runs * 1; // +1 per run
      points += batting.fours * 4; // +4 bonus per four
      points += batting.sixes * 6; // +6 bonus per six

      // Milestone bonuses
      if (batting.runs >= 100) points += 16;
      else if (batting.runs >= 75) points += 12;
      else if (batting.runs >= 50) points += 8;
      else if (batting.runs >= 25) points += 4;

      // Strike rate bonus (min 10 balls)
      if (batting.balls_faced >= 10) {
        const sr = batting.strike_rate;
        if (sr > 170) points += 6;
        else if (sr > 150) points += 4;
        else if (sr >= 130) points += 2;
        else if (sr <= 50) points -= 6;
        else if (sr < 60) points -= 4;
        else if (sr <= 70) points -= 2;
      }

      // Duck penalty
      if (batting.is_duck) points -= 2;
    }

    // Bowling points
    if (bowling) {
      points += bowling.wickets * 30; // +30 per wicket
      points += bowling.lbw_bowled_wickets * 8; // +8 bonus for LBW/Bowled

      // Wicket milestones
      if (bowling.wickets >= 5) points += 12;
      else if (bowling.wickets >= 4) points += 8;
      else if (bowling.wickets >= 3) points += 4;

      // Economy rate bonus (min 2 overs)
      if (bowling.overs >= 2) {
        const econ = bowling.economy_rate;
        if (econ < 5) points += 6;
        else if (econ < 6) points += 4;
        else if (econ <= 7) points += 2;
        else if (econ > 12) points -= 6;
        else if (econ > 10.5) points -= 4;
        else if (econ >= 9) points -= 2;
      }

      // Maiden bonus
      points += bowling.maidens * 12;
    }

    // Fielding points
    if (fielding) {
      points += fielding.catches * 8;
      points += fielding.stumpings * 12;
      points += fielding.runouts_direct * 12;
      points += fielding.runouts_indirect * 6;
    }

    return Math.round(points);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(parseInt(timestamp)).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content player-match-stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🏏 {playerName || 'Player'} - Match Stats</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading match statistics...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <i className="fas fa-exclamation-circle"></i>
              <p>{error}</p>
            </div>
          ) : matchStats.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-inbox"></i>
              <p>No match data available</p>
            </div>
          ) : (
            <div className="match-stats-list">
              {matchStats.map((match) => {
                const fantasyPoints = calculateMatchFantasyPoints(match);
                
                return (
                  <div 
                    key={match.match_id} 
                    className={`match-card ${match.played ? 'played' : 'not-played'}`}
                  >
                    <div className="match-header">
                      <div className="match-info">
                        <h3>{match.match_description}</h3>
                        <p className="match-date">{formatDate(match.start_time)}</p>
                        <p className="match-teams">{match.team1} vs {match.team2}</p>
                      </div>
                      <div className="match-points">
                        {match.played ? (
                          <>
                            <span className="points-label">Fantasy Points</span>
                            <span className="points-value">{fantasyPoints}</span>
                          </>
                        ) : (
                          <span className="not-played-badge">Not Played</span>
                        )}
                      </div>
                    </div>

                    {match.played && (
                      <div className="match-stats-details">
                        {/* Batting Stats */}
                        {match.batting && (
                          <div className="stats-section batting-stats">
                            <h4>🏏 Batting</h4>
                            <div className="stats-grid">
                              <div className="stat-item">
                                <span className="stat-label">Runs</span>
                                <span className="stat-value">{match.batting.runs}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">Balls</span>
                                <span className="stat-value">{match.batting.balls_faced}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">4s</span>
                                <span className="stat-value">{match.batting.fours}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">6s</span>
                                <span className="stat-value">{match.batting.sixes}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">SR</span>
                                <span className="stat-value">{match.batting.strike_rate.toFixed(1)}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">Dismissal</span>
                                <span className="stat-value dismissal">{match.batting.dismissal_info || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Bowling Stats */}
                        {match.bowling && (
                          <div className="stats-section bowling-stats">
                            <h4>⚾ Bowling</h4>
                            <div className="stats-grid">
                              <div className="stat-item">
                                <span className="stat-label">Wickets</span>
                                <span className="stat-value highlight">{match.bowling.wickets}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">Overs</span>
                                <span className="stat-value">{match.bowling.overs}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">Runs</span>
                                <span className="stat-value">{match.bowling.runs_conceded}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">Economy</span>
                                <span className="stat-value">{match.bowling.economy_rate.toFixed(2)}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">Maidens</span>
                                <span className="stat-value">{match.bowling.maidens}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">Dots</span>
                                <span className="stat-value">{match.bowling.dots}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Fielding Stats */}
                        {(match.fielding.catches > 0 || 
                          match.fielding.stumpings > 0 || 
                          match.fielding.runouts_direct > 0 || 
                          match.fielding.runouts_indirect > 0) && (
                          <div className="stats-section fielding-stats">
                            <h4>🥎 Fielding</h4>
                            <div className="stats-grid">
                              {match.fielding.catches > 0 && (
                                <div className="stat-item">
                                  <span className="stat-label">Catches</span>
                                  <span className="stat-value">{match.fielding.catches}</span>
                                </div>
                              )}
                              {match.fielding.stumpings > 0 && (
                                <div className="stat-item">
                                  <span className="stat-label">Stumpings</span>
                                  <span className="stat-value">{match.fielding.stumpings}</span>
                                </div>
                              )}
                              {match.fielding.runouts_direct > 0 && (
                                <div className="stat-item">
                                  <span className="stat-label">Run Outs (Direct)</span>
                                  <span className="stat-value">{match.fielding.runouts_direct}</span>
                                </div>
                              )}
                              {match.fielding.runouts_indirect > 0 && (
                                <div className="stat-item">
                                  <span className="stat-label">Run Outs (Indirect)</span>
                                  <span className="stat-value">{match.fielding.runouts_indirect}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Match Result */}
                        <div className="match-result">
                          <i className="fas fa-info-circle"></i>
                          <span>{match.result}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerMatchStatsModal;
