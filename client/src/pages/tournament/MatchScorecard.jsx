import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './MatchScorecard.css';

const MatchScorecard = () => {
    const { tournamentId, matchId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [scorecard, setScorecard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedInnings, setSelectedInnings] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [dataSource, setDataSource] = useState(null);

    const rapidApiMatchId = searchParams.get('rapidApiMatchId');

    useEffect(() => {
        // On initial load, only fetch from database
        fetchScorecardFromDatabase();
    }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchScorecardFromDatabase = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch from database only (no RapidAPI call)
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const url = `${API_BASE}/api/matches/${matchId}/scorecard`;
            const response = await axios.get(url);
            
            if (response.data.success && response.data.data.scorecards && response.data.data.scorecards.length > 0) {
                setScorecard(response.data.data);
                setDataSource(response.data.source || 'database');
            } else {
                // No data in database
                setScorecard(null);
                setDataSource(null);
                setError('No scorecard data available. Click "Fetch Scorecard" to load from API.');
            }
        } catch (err) {
            console.error('Error fetching scorecard:', err);
            if (err.response?.status === 400) {
                setError('No scorecard data available. Click "Fetch Scorecard" to load from API.');
            } else {
                setError(err.response?.data?.message || 'Failed to load scorecard');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchScorecardFromAPI = async () => {
        if (!rapidApiMatchId) {
            setError('RapidAPI Match ID not available');
            return;
        }

        try {
            setIsRefreshing(true);
            setError(null);

            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const url = `${API_BASE}/api/matches/${matchId}/scorecard?rapidApiMatchId=${rapidApiMatchId}`;
            const response = await axios.get(url);
            
            if (response.data.success) {
                setScorecard(response.data.data);
                setDataSource('rapidapi');
                setError(null);
            } else {
                setError('Failed to fetch scorecard data');
            }
        } catch (err) {
            console.error('Error fetching scorecard from API:', err);
            setError(err.response?.data?.message || 'Failed to fetch scorecard from API');
        } finally {
            setIsRefreshing(false);
        }
    };

    const formatDismissal = (dismissalInfo) => {
        if (!dismissalInfo || dismissalInfo === 'not out') {
            return <span className="not-out">not out</span>;
        }
        return <span className="dismissal">{dismissalInfo}</span>;
    };

    const formatOvers = (overs) => {
        return parseFloat(overs).toFixed(1);
    };

    if (loading) {
        return (
            <div className="scorecard-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading scorecard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="scorecard-container">
                <div className="error-message">
                    <i className="fas fa-exclamation-triangle"></i>
                    <h3>Scorecard Not Available</h3>
                    <p>{error}</p>
                    <div className="error-actions">
                        {rapidApiMatchId && (
                            <button 
                                onClick={fetchScorecardFromAPI} 
                                className="btn-fetch"
                                disabled={isRefreshing}
                            >
                                {isRefreshing ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i> Fetching...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-sync-alt"></i> Fetch Scorecard
                                    </>
                                )}
                            </button>
                        )}
                        <button onClick={() => navigate(-1)} className="btn-back">
                            <i className="fas fa-arrow-left"></i> Go Back
                        </button>
                    </div>
                    <div className="api-limit-notice">
                        <i className="fas fa-info-circle"></i>
                        <small>Note: API limited to 100 requests/day and 6 requests/minute</small>
                    </div>
                </div>
            </div>
        );
    }

    if (!scorecard || !scorecard.scorecards || scorecard.scorecards.length === 0) {
        return (
            <div className="scorecard-container">
                <div className="error-message">
                    <p>No scorecard data available</p>
                    <button onClick={() => navigate(-1)} className="btn-back">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const currentInnings = scorecard.scorecards[selectedInnings];

    return (
        <div className="scorecard-container">
            {/* Header */}
            <div className="scorecard-header">
                <button onClick={() => navigate(`/tournament/tournament-fixtures/${tournamentId}`)} className="btn-back">
                    <i className="fas fa-arrow-left"></i> Back to Fixtures
                </button>
                <h1>Match Scorecard</h1>
                <div className="header-actions">
                    {rapidApiMatchId && (
                        <button 
                            onClick={fetchScorecardFromAPI} 
                            className="btn-refresh"
                            disabled={isRefreshing}
                            title="Refresh scorecard from API (Rate Limited: 100/day, 6/min)"
                        >
                            {isRefreshing ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i> Refreshing...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-sync-alt"></i> Refresh
                                </>
                            )}
                        </button>
                    )}
                    {scorecard.summary && (
                        <div className="match-status">
                            <span className={scorecard.summary.is_match_complete ? 'status-complete' : 'status-in-progress'}>
                                {scorecard.summary.match_status}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Data Source Badge */}
            {dataSource && (
                <div className="data-source-badge">
                    <i className={dataSource === 'rapidapi' ? 'fas fa-cloud-download-alt' : 'fas fa-database'}></i>
                    <span>Data source: {dataSource === 'rapidapi' ? 'RapidAPI (Live)' : 'Database (Cached)'}</span>
                    {dataSource === 'database' && (
                        <small> - Click refresh to update from API</small>
                    )}
                </div>
            )}

            {/* Innings Tabs */}
            {scorecard.scorecards.length > 1 && (
                <div className="innings-tabs">
                    {scorecard.scorecards.map((innings, index) => (
                        <button
                            key={index}
                            className={`innings-tab ${selectedInnings === index ? 'active' : ''}`}
                            onClick={() => setSelectedInnings(index)}
                        >
                            <div className="tab-team">{innings.innings.batting_team_short_name}</div>
                            <div className="tab-score">
                                {innings.innings.total_score}/{innings.innings.total_wickets}
                                <span className="tab-overs">({innings.innings.total_overs} ov)</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Innings Summary */}
            <div className="innings-summary">
                <h2>
                    {currentInnings.innings.batting_team_name} Innings
                    <span className="score-badge">
                        {currentInnings.innings.total_score}/{currentInnings.innings.total_wickets}
                    </span>
                </h2>
                <div className="innings-stats">
                    <div className="stat-item">
                        <span className="stat-label">Overs:</span>
                        <span className="stat-value">{currentInnings.innings.total_overs}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Run Rate:</span>
                        <span className="stat-value">{parseFloat(currentInnings.innings.run_rate || 0).toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Extras:</span>
                        <span className="stat-value">{currentInnings.innings.extras_total}</span>
                    </div>
                </div>
            </div>

            {/* Batting Table */}
            <div className="scorecard-section">
                <h3><i className="fas fa-cricket-bat-ball"></i> Batting</h3>
                <div className="table-responsive">
                    <table className="scorecard-table batting-table">
                        <thead>
                            <tr>
                                <th className="player-column">Batsman</th>
                                <th>Dismissal</th>
                                <th>R</th>
                                <th>B</th>
                                <th>4s</th>
                                <th>6s</th>
                                <th>SR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentInnings.batting.map((batsman, index) => (
                                <tr key={index} className={batsman.dismissal_info && batsman.dismissal_info !== 'not out' ? '' : 'not-out-row'}>
                                    <td className="player-column">
                                        <div className="player-info">
                                            <span className="player-name">{batsman.player_name}</span>
                                            <div className="player-badges">
                                                {batsman.is_captain && <span className="badge badge-captain">C</span>}
                                                {batsman.is_keeper && <span className="badge badge-keeper">WK</span>}
                                                {batsman.is_overseas && <span className="badge badge-overseas">OS</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="dismissal-column">{formatDismissal(batsman.dismissal_info)}</td>
                                    <td className="runs-column"><strong>{batsman.runs}</strong></td>
                                    <td>{batsman.balls_faced}</td>
                                    <td>{batsman.fours}</td>
                                    <td>{batsman.sixes}</td>
                                    <td>{parseFloat(batsman.strike_rate || 0).toFixed(2)}</td>
                                </tr>
                            ))}
                            <tr className="extras-row">
                                <td colSpan="2"><strong>Extras</strong></td>
                                <td colSpan="5">
                                    <strong>{currentInnings.innings.extras_total}</strong>
                                    <span className="extras-detail">
                                        {' '}(b {currentInnings.innings.extras_byes}, 
                                        lb {currentInnings.innings.extras_legbyes}, 
                                        w {currentInnings.innings.extras_wides}, 
                                        nb {currentInnings.innings.extras_noballs}, 
                                        p {currentInnings.innings.extras_penalty})
                                    </span>
                                </td>
                            </tr>
                            <tr className="total-row">
                                <td colSpan="2"><strong>Total</strong></td>
                                <td colSpan="5">
                                    <strong>{currentInnings.innings.total_score}/{currentInnings.innings.total_wickets}</strong>
                                    {' '}({currentInnings.innings.total_overs} Overs, RR: {parseFloat(currentInnings.innings.run_rate || 0).toFixed(2)})
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bowling Table */}
            <div className="scorecard-section">
                <h3><i className="fas fa-baseball-ball"></i> Bowling</h3>
                <div className="table-responsive">
                    <table className="scorecard-table bowling-table">
                        <thead>
                            <tr>
                                <th className="player-column">Bowler</th>
                                <th>O</th>
                                <th>M</th>
                                <th>R</th>
                                <th>W</th>
                                <th>Econ</th>
                                <th>Dots</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentInnings.bowling.map((bowler, index) => (
                                <tr key={index} className={bowler.wickets > 0 ? 'wicket-taker' : ''}>
                                    <td className="player-column">
                                        <div className="player-info">
                                            <span className="player-name">{bowler.player_name}</span>
                                            <div className="player-badges">
                                                {bowler.is_captain && <span className="badge badge-captain">C</span>}
                                                {bowler.is_keeper && <span className="badge badge-keeper">WK</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td>{formatOvers(bowler.overs)}</td>
                                    <td>{bowler.maidens}</td>
                                    <td>{bowler.runs_conceded}</td>
                                    <td className="wickets-column"><strong>{bowler.wickets}</strong></td>
                                    <td>{parseFloat(bowler.economy || 0).toFixed(2)}</td>
                                    <td>{bowler.dots}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Fall of Wickets */}
            {currentInnings.fallOfWickets && currentInnings.fallOfWickets.length > 0 && (
                <div className="scorecard-section">
                    <h3><i className="fas fa-chart-line"></i> Fall of Wickets</h3>
                    <div className="fow-container">
                        {currentInnings.fallOfWickets.map((fow, index) => (
                            <div key={index} className="fow-item">
                                <span className="fow-score">{fow.runs_at_fall}-{fow.wicket_number}</span>
                                <span className="fow-player">({fow.batsman_name}, {fow.over_number} ov)</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Partnerships */}
            {currentInnings.partnerships && currentInnings.partnerships.length > 0 && (
                <div className="scorecard-section">
                    <h3><i className="fas fa-handshake"></i> Partnerships</h3>
                    <div className="table-responsive">
                        <table className="scorecard-table partnerships-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Batsmen</th>
                                    <th>Runs</th>
                                    <th>Balls</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentInnings.partnerships.map((partnership, index) => (
                                    <tr key={index}>
                                        <td>{partnership.partnership_number}</td>
                                        <td>
                                            <div className="partnership-players">
                                                <div>
                                                    <strong>{partnership.batsman1_name}</strong>: {partnership.batsman1_runs} ({partnership.batsman1_balls}b, {partnership.batsman1_fours}x4, {partnership.batsman1_sixes}x6)
                                                </div>
                                                <div>
                                                    <strong>{partnership.batsman2_name}</strong>: {partnership.batsman2_runs} ({partnership.batsman2_balls}b, {partnership.batsman2_fours}x4, {partnership.batsman2_sixes}x6)
                                                </div>
                                            </div>
                                        </td>
                                        <td><strong>{partnership.total_runs}</strong></td>
                                        <td>{partnership.total_balls}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchScorecard;
