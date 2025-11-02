import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../tournament/TournamentStats.css'; // Reuse tournament stats styles
import PlayerMatchStatsModal from '../tournament/PlayerMatchStatsModal';

const LeagueStats = () => {
    const { id } = useParams(); // League ID
    const navigate = useNavigate();
    
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('fantasy'); // fantasy, batting, bowling, all
    const [sortBy, setSortBy] = useState('fantasy_points');
    const [sortOrder, setSortOrder] = useState('desc');
    const [league, setLeague] = useState(null);
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    useEffect(() => {
        fetchLeagueAndStats();
    }, [id]);

    const fetchLeagueAndStats = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch league details to get tournament_id
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const leagueResponse = await axios.get(`${API_BASE}/api/league/${id}`);
            
            if (!leagueResponse.data || !leagueResponse.data.league) {
                setError('League not found');
                return;
            }

            const leagueData = leagueResponse.data.league;
            setLeague(leagueData);

            // Check if league has a tournament
            if (!leagueData.tournament_id) {
                setError('This league is not associated with a tournament');
                return;
            }

            // Fetch tournament stats
            const statsResponse = await axios.get(`${API_BASE}/api/tournaments/${leagueData.tournament_id}/stats`);
            
            if (statsResponse.data.success) {
                setStats(statsResponse.data.data);
            } else {
                setError('Failed to load player stats');
            }
        } catch (err) {
            console.error('Error fetching league stats:', err);
            setError(err.response?.data?.message || 'Failed to load player stats');
        } finally {
            setLoading(false);
        }
    };

    // Calculate fantasy points for a player based on their stats
    const calculateFantasyPoints = (player) => {
        let points = 0;

        // BATTING POINTS
        if (player.total_runs > 0) {
            points += player.total_runs * 1;
            points += player.total_fours * 4;
            points += player.total_sixes * 6;

            // Milestone bonuses
            if (player.total_runs >= 100) points += 16;
            else if (player.total_runs >= 75) points += 12;
            else if (player.total_runs >= 50) points += 8;
            else if (player.total_runs >= 25) points += 4;

            // Strike rate bonus (min 10 balls)
            if (player.total_balls >= 10) {
                const sr = player.avg_strike_rate;
                if (sr > 170) points += 6;
                else if (sr > 150) points += 4;
                else if (sr >= 130) points += 2;
                else if (sr <= 50) points -= 6;
                else if (sr < 60) points -= 4;
                else if (sr <= 70) points -= 2;
            }
        }

        // Duck penalty
        if (player.ducks > 0) {
            points -= player.ducks * 2;
        }

        // BOWLING POINTS
        if (player.total_wickets > 0) {
            points += player.total_wickets * 30;

            if (player.lbw_bowled_wickets > 0) {
                points += player.lbw_bowled_wickets * 8;
            }

            // Wicket milestones
            if (player.max_wickets_in_innings >= 5) points += 12;
            else if (player.max_wickets_in_innings >= 4) points += 8;
            else if (player.max_wickets_in_innings >= 3) points += 4;

            // Economy rate bonus (min 2 overs)
            if (player.total_overs >= 2) {
                const economy = player.avg_economy;
                if (economy < 5) points += 6;
                else if (economy < 6) points += 4;
                else if (economy <= 7) points += 2;
                else if (economy > 12) points -= 6;
                else if (economy > 11) points -= 4;
                else if (economy >= 10) points -= 2;
            }
        }

        // Maiden overs
        if (player.total_maidens > 0) {
            points += player.total_maidens * 12;
        }

        // Dot balls
        if (player.total_dots > 0) {
            points += player.total_dots * 1;
        }

        // FIELDING POINTS
        if (player.total_catches > 0) {
            points += player.total_catches * 8;
            if (player.total_catches >= 3) points += 4;
        }

        if (player.total_stumpings > 0) {
            points += player.total_stumpings * 12;
        }

        if (player.total_runouts_direct > 0) {
            points += player.total_runouts_direct * 12;
        }

        if (player.total_runouts_indirect > 0) {
            points += player.total_runouts_indirect * 6;
        }

        // PLAYING XI BONUS
        if (player.matches_in_xi > 0) {
            points += player.matches_in_xi * 4;
        }

        return Math.round(points * 10) / 10;
    };

    // Add fantasy points to each player
    const enrichedStats = stats.map(player => ({
        ...player,
        fantasy_points: calculateFantasyPoints(player)
    }));

    // Filter and sort based on active tab
    const getFilteredStats = () => {
        let filtered = [...enrichedStats];

        if (activeTab === 'batting') {
            filtered = filtered.filter(p => p.total_runs > 0 || p.total_balls > 0);
        } else if (activeTab === 'bowling') {
            filtered = filtered.filter(p => p.total_overs > 0 || p.total_wickets > 0);
        }

        filtered.sort((a, b) => {
            const aVal = a[sortBy] || 0;
            const bVal = b[sortBy] || 0;
            return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        });

        return filtered;
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    const getSortIcon = (column) => {
        if (sortBy !== column) return '⇅';
        return sortOrder === 'desc' ? '↓' : '↑';
    };

    if (loading) {
        return (
            <div className="stats-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading player statistics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="stats-container">
                <div className="error-message">
                    <i className="fas fa-exclamation-triangle"></i>
                    <h3>Stats Not Available</h3>
                    <p>{error}</p>
                    <button onClick={() => navigate(`/league/${id}`)} className="btn-back">
                        <i className="fas fa-arrow-left"></i> Back to League
                    </button>
                </div>
            </div>
        );
    }

    const filteredStats = getFilteredStats();

    return (
        <div className="stats-container">
            <div className="stats-header">
                <div className="header-top">
                    <button onClick={() => navigate(`/league/${id}`)} className="btn-back">
                        <i className="fas fa-arrow-left"></i> Back to League
                    </button>
                    <div className="header-title-section">
                        <h1>Player Statistics</h1>
                        {league && <p className="league-name">{league.league_name}</p>}
                    </div>
                    <button onClick={fetchLeagueAndStats} className="btn-refresh">
                        <i className="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>

                <div className="stats-tabs">
                    <button
                        className={`tab ${activeTab === 'fantasy' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('fantasy');
                            setSortBy('fantasy_points');
                        }}
                    >
                        <i className="fas fa-trophy"></i> Fantasy Points
                    </button>
                    <button
                        className={`tab ${activeTab === 'batting' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('batting');
                            setSortBy('total_runs');
                        }}
                    >
                        <i className="fas fa-baseball-ball"></i> Batting
                    </button>
                    <button
                        className={`tab ${activeTab === 'bowling' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('bowling');
                            setSortBy('total_wickets');
                        }}
                    >
                        <i className="fas fa-bowling-ball"></i> Bowling
                    </button>
                    <button
                        className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('all');
                            setSortBy('fantasy_points');
                        }}
                    >
                        <i className="fas fa-list"></i> All Stats
                    </button>
                </div>

                <div className="stats-info">
                    <p>
                        <i className="fas fa-info-circle"></i>
                        Showing stats from {stats.length} players across all matches
                    </p>
                </div>
            </div>

            <div className="stats-content">
                {activeTab === 'fantasy' && (
                    <div className="stats-table-container">
                        <table className="stats-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Player</th>
                                    <th onClick={() => handleSort('fantasy_points')} className="sortable">
                                        Fantasy Points {getSortIcon('fantasy_points')}
                                    </th>
                                    <th onClick={() => handleSort('total_runs')} className="sortable">
                                        Runs {getSortIcon('total_runs')}
                                    </th>
                                    <th onClick={() => handleSort('total_wickets')} className="sortable">
                                        Wickets {getSortIcon('total_wickets')}
                                    </th>
                                    <th>Matches</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStats.map((player, index) => (
                                    <tr 
                                        key={player.player_id} 
                                        className={`${index < 3 ? 'top-performer' : ''} clickable-row`}
                                        onClick={() => setSelectedPlayer({
                                            playerId: player.player_id,
                                            playerName: player.player_name,
                                            tournamentId: league?.tournament_id
                                        })}
                                        title="Click to view match-by-match stats"
                                    >
                                        <td className="rank-cell">
                                            {index === 0 && <span className="medal gold">🥇</span>}
                                            {index === 1 && <span className="medal silver">🥈</span>}
                                            {index === 2 && <span className="medal bronze">🥉</span>}
                                            {index > 2 && <span className="rank-number">{index + 1}</span>}
                                        </td>
                                        <td className="player-cell">
                                            <strong>{player.player_name}</strong>
                                        </td>
                                        <td className="fantasy-points">
                                            <strong>{player.fantasy_points}</strong>
                                        </td>
                                        <td>{player.total_runs}</td>
                                        <td>{player.total_wickets}</td>
                                        <td>{player.matches_played}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'batting' && (
                    <div className="stats-table-container">
                        <table className="stats-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Player</th>
                                    <th onClick={() => handleSort('total_runs')} className="sortable">
                                        Runs {getSortIcon('total_runs')}
                                    </th>
                                    <th onClick={() => handleSort('avg_strike_rate')} className="sortable">
                                        SR {getSortIcon('avg_strike_rate')}
                                    </th>
                                    <th onClick={() => handleSort('total_fours')} className="sortable">
                                        4s {getSortIcon('total_fours')}
                                    </th>
                                    <th onClick={() => handleSort('total_sixes')} className="sortable">
                                        6s {getSortIcon('total_sixes')}
                                    </th>
                                    <th onClick={() => handleSort('highest_score')} className="sortable">
                                        HS {getSortIcon('highest_score')}
                                    </th>
                                    <th onClick={() => handleSort('total_catches')} className="sortable">
                                        Catches {getSortIcon('total_catches')}
                                    </th>
                                    <th>Balls</th>
                                    <th>Innings</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStats.map((player, index) => (
                                    <tr 
                                        key={player.player_id} 
                                        className={`${index < 3 ? 'top-performer' : ''} clickable-row`}
                                        onClick={() => setSelectedPlayer({
                                            playerId: player.player_id,
                                            playerName: player.player_name,
                                            tournamentId: league?.tournament_id
                                        })}
                                        title="Click to view match-by-match stats"
                                    >
                                        <td className="rank-cell">{index + 1}</td>
                                        <td className="player-cell">
                                            <strong>{player.player_name}</strong>
                                        </td>
                                        <td className="runs-cell"><strong>{player.total_runs}</strong></td>
                                        <td>{parseFloat(player.avg_strike_rate || 0).toFixed(2)}</td>
                                        <td>{player.total_fours}</td>
                                        <td>{player.total_sixes}</td>
                                        <td>{player.highest_score}</td>
                                        <td>{player.total_catches || 0}</td>
                                        <td>{player.total_balls}</td>
                                        <td>{player.batting_innings}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'bowling' && (
                    <div className="stats-table-container">
                        <table className="stats-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Player</th>
                                    <th onClick={() => handleSort('total_wickets')} className="sortable">
                                        Wickets {getSortIcon('total_wickets')}
                                    </th>
                                    <th onClick={() => handleSort('avg_economy')} className="sortable">
                                        Econ {getSortIcon('avg_economy')}
                                    </th>
                                    <th onClick={() => handleSort('total_dots')} className="sortable">
                                        Dots {getSortIcon('total_dots')}
                                    </th>
                                    <th onClick={() => handleSort('total_maidens')} className="sortable">
                                        Maidens {getSortIcon('total_maidens')}
                                    </th>
                                    <th onClick={() => handleSort('best_bowling')} className="sortable">
                                        Best {getSortIcon('best_bowling')}
                                    </th>
                                    <th>Overs</th>
                                    <th>Innings</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStats.map((player, index) => (
                                    <tr 
                                        key={player.player_id} 
                                        className={`${index < 3 ? 'top-performer' : ''} clickable-row`}
                                        onClick={() => setSelectedPlayer({
                                            playerId: player.player_id,
                                            playerName: player.player_name,
                                            tournamentId: league?.tournament_id
                                        })}
                                        title="Click to view match-by-match stats"
                                    >
                                        <td className="rank-cell">{index + 1}</td>
                                        <td className="player-cell">
                                            <strong>{player.player_name}</strong>
                                        </td>
                                        <td className="wickets-cell"><strong>{player.total_wickets}</strong></td>
                                        <td>{parseFloat(player.avg_economy || 0).toFixed(2)}</td>
                                        <td>{player.total_dots}</td>
                                        <td>{player.total_maidens}</td>
                                        <td>{player.max_wickets_in_innings || 0}</td>
                                        <td>{parseFloat(player.total_overs || 0).toFixed(1)}</td>
                                        <td>{player.bowling_innings}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'all' && (
                    <div className="stats-table-container">
                        <table className="stats-table all-stats">
                            <thead>
                                <tr>
                                    <th rowSpan="2">Rank</th>
                                    <th rowSpan="2">Player</th>
                                    <th rowSpan="2" onClick={() => handleSort('fantasy_points')} className="sortable">
                                        Fantasy {getSortIcon('fantasy_points')}
                                    </th>
                                    <th colSpan="4" className="section-header">Batting</th>
                                    <th colSpan="4" className="section-header">Bowling</th>
                                    <th colSpan="3" className="section-header">Fielding</th>
                                    <th rowSpan="2">Matches</th>
                                </tr>
                                <tr>
                                    <th onClick={() => handleSort('total_runs')} className="sortable sub-header">
                                        Runs {getSortIcon('total_runs')}
                                    </th>
                                    <th className="sub-header">SR</th>
                                    <th className="sub-header">4s</th>
                                    <th className="sub-header">6s</th>
                                    <th onClick={() => handleSort('total_wickets')} className="sortable sub-header">
                                        Wkts {getSortIcon('total_wickets')}
                                    </th>
                                    <th className="sub-header">Econ</th>
                                    <th className="sub-header">Dots</th>
                                    <th className="sub-header">Maidens</th>
                                    <th onClick={() => handleSort('total_catches')} className="sortable sub-header">
                                        Catches {getSortIcon('total_catches')}
                                    </th>
                                    <th className="sub-header">Stumps</th>
                                    <th className="sub-header">R/O</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStats.map((player, index) => (
                                    <tr 
                                        key={player.player_id}
                                        className="clickable-row"
                                        onClick={() => setSelectedPlayer({
                                            playerId: player.player_id,
                                            playerName: player.player_name,
                                            tournamentId: league?.tournament_id
                                        })}
                                        title="Click to view match-by-match stats"
                                    >
                                        <td className="rank-cell">{index + 1}</td>
                                        <td className="player-cell">
                                            <strong>{player.player_name}</strong>
                                        </td>
                                        <td className="fantasy-points">
                                            <strong>{player.fantasy_points}</strong>
                                        </td>
                                        <td>{player.total_runs}</td>
                                        <td>{parseFloat(player.avg_strike_rate || 0).toFixed(1)}</td>
                                        <td>{player.total_fours}</td>
                                        <td>{player.total_sixes}</td>
                                        <td>{player.total_wickets}</td>
                                        <td>{parseFloat(player.avg_economy || 0).toFixed(2)}</td>
                                        <td>{player.total_dots}</td>
                                        <td>{player.total_maidens}</td>
                                        <td>{player.total_catches || 0}</td>
                                        <td>{player.total_stumpings || 0}</td>
                                        <td>{(player.total_runouts_direct || 0) + (player.total_runouts_indirect || 0)}</td>
                                        <td>{player.matches_played}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedPlayer && (
                <PlayerMatchStatsModal
                    playerId={selectedPlayer.playerId}
                    playerName={selectedPlayer.playerName}
                    tournamentId={selectedPlayer.tournamentId}
                    onClose={() => setSelectedPlayer(null)}
                />
            )}
        </div>
    );
};

export default LeagueStats;
