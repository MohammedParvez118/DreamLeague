import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { leagueAPI, tournamentAPI } from '../../services/api';
import LeagueInfo from '../../components/LeagueInfo';
import PlayingXIForm from '../../components/PlayingXIForm';
import ReplacementPanel from '../../components/ReplacementPanel';
import LeaderboardTable from '../../components/LeaderboardTable';
import TopPerformersTable from '../../components/TopPerformersTable';
import {
  LeagueHeader,
  TabNavigation,
  LeagueOverviewTab,
  MatchesTab,
  MyTeamTab,
  PlayingXITab
} from '../../components/league';
import './ViewLeague.css';

function ViewLeague() {
  const { id: leagueId } = useParams();
  const navigate = useNavigate();
  const [league, setLeague] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Tab management
  const [activeTab, setActiveTab] = useState('overview');
  
  // Tournament data
  const [tournament, setTournament] = useState(null);
  const [squadsData, setSquadsData] = useState([]);
  const [squadNames, setSquadNames] = useState([]);
  const [selectedSquad, setSelectedSquad] = useState('');
  const [tournamentLoading, setTournamentLoading] = useState(false);
  
  // Matches data
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchPlayers, setMatchPlayers] = useState([]);
  const [loadingMatchPlayers, setLoadingMatchPlayers] = useState(false);
  
  // User team management
  const [user, setUser] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [captain, setCaptain] = useState(null);
  const [viceCaptain, setViceCaptain] = useState(null);
  
  // Squad size - will be fetched from league data
  const MIN_SQUAD_SIZE = 15;
  const MAX_SQUAD_SIZE = 20;
  const squadSize = league?.squad_size || 15; // Get from league, default to 15
  
  // Available players
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [usedPlayers, setUsedPlayers] = useState([]);
  const [savingSquad, setSavingSquad] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    // Load user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    fetchLeagueDetails();
  }, [leagueId]);

  useEffect(() => {
    // Fetch tournament data when league is loaded and has a tournament_id
    // Tournament section is now shown in the overview tab
    if (league && league.tournament_id && activeTab === 'overview') {
      fetchTournamentData();
    }
    
    // Fetch matches when matches tab is active
    if (league && league.tournament_id && activeTab === 'matches') {
      fetchMatches();
    }
    
    // Fetch unavailable players and user's squad when viewing players, myteam, or playingxi tab
    if (league && league.tournament_id && (activeTab === 'players' || activeTab === 'myteam' || activeTab === 'playingxi')) {
      fetchUnavailablePlayers();
      if (myTeam) {
        fetchMySquad();
      }
    }
  }, [league, activeTab, myTeam]);

  const fetchLeagueDetails = async () => {
    try {
      setLoading(true);
      const response = await leagueAPI.getLeagueDetails(leagueId);
      setLeague(response.data.league);
      setTeams(response.data.teams);
      
      // Find user's team if logged in
      const userData = localStorage.getItem('user');
      if (userData) {
        const currentUser = JSON.parse(userData);
        const userTeam = response.data.teams.find(team => team.team_owner === currentUser.email);
        setMyTeam(userTeam);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching league details:', err);
      setError('Failed to load league details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTournamentData = async () => {
    if (!league?.tournament_id) return;
    
    try {
      setTournamentLoading(true);
      
      // Fetch tournament details
      const tournamentResponse = await tournamentAPI.getTournament(league.tournament_id);
      if (tournamentResponse.data.tournaments && tournamentResponse.data.tournaments.length > 0) {
        setTournament(tournamentResponse.data.tournaments[0]);
      }
      
      // Fetch squads
      const squadsResponse = await tournamentAPI.getSquads(league.tournament_id, '');
      setSquadsData(squadsResponse.data.squadsWithPlayers || []);
      setSquadNames(squadsResponse.data.squadNames || []);
      
      // Calculate available players (all players minus used players in other teams)
      calculateAvailablePlayers(squadsResponse.data.squadsWithPlayers || []);
      
    } catch (err) {
      console.error('Error fetching tournament data:', err);
    } finally {
      setTournamentLoading(false);
    }
  };

  const calculateAvailablePlayers = (squads) => {
    // Flatten all players from all squads
    const allPlayers = squads.flatMap(squad => 
      squad.players.map(player => ({
        ...player,
        team: squad.squadName,
        player_id: player.player_id || player.name // Ensure player_id exists
      }))
    );
    
    setAvailablePlayers(allPlayers);
  };

  const fetchUnavailablePlayers = async () => {
    if (!league?.id) return;
    
    try {
      const response = await leagueAPI.getUnavailablePlayers(league.id);
      if (response.data.success) {
        // Create a Set of used player IDs for quick lookup
        const usedPlayerIds = new Set(
          response.data.data.unavailablePlayers.map(p => p.player_id)
        );
        setUsedPlayers(usedPlayerIds);
      }
    } catch (err) {
      console.error('Error fetching unavailable players:', err);
    }
  };

  const fetchMySquad = async () => {
    if (!league?.id || !myTeam?.id) return;
    
    try {
      const response = await leagueAPI.getTeamSquad(league.id, myTeam.id);
      if (response.data.success && response.data.data.squad.length > 0) {
        const squad = response.data.data.squad;
        
        // Set selected players with role information
        const players = squad.map(s => ({
          player_id: s.player_id,
          name: s.player_name,
          team: s.squad_name,
          role: s.role // Include role for validation
        }));
        setSelectedPlayers(players);
        
        // Set captain and vice-captain
        const captainPlayer = squad.find(s => s.is_captain);
        const viceCaptainPlayer = squad.find(s => s.is_vice_captain);
        
        if (captainPlayer) {
          setCaptain({
            player_id: captainPlayer.player_id,
            name: captainPlayer.player_name,
            team: captainPlayer.squad_name,
            role: captainPlayer.role
          });
        }
        
        if (viceCaptainPlayer) {
          setViceCaptain({
            player_id: viceCaptainPlayer.player_id,
            name: viceCaptainPlayer.player_name,
            team: viceCaptainPlayer.squad_name,
            role: viceCaptainPlayer.role
          });
        }
      }
    } catch (err) {
      console.error('Error fetching my squad:', err);
    }
  };

  const fetchMatches = async () => {
    if (!league?.tournament_id) return;
    
    try {
      setTournamentLoading(true);
      const response = await tournamentAPI.getFixtures(league.tournament_id);
      
      // Sort matches by description (same logic as TournamentFixtures)
      const sortedMatches = sortMatchesByDescription(response.data.matches || []);
      setMatches(sortedMatches);
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setTournamentLoading(false);
    }
  };

  const sortMatchesByDescription = (matches) => {
    const getPlayoffPriority = (desc) => {
      const lowerDesc = desc.toLowerCase();
      if (lowerDesc.includes('quarter') || lowerDesc.includes('qualifier')) return 1;
      if (lowerDesc.includes('semi') || lowerDesc.includes('eliminator')) return 2;
      if (lowerDesc.includes('final') && !lowerDesc.includes('semi') && !lowerDesc.includes('quarter')) return 3;
      return 0;
    };

    return matches.sort((a, b) => {
      const descA = a.match_description || '';
      const descB = b.match_description || '';
      
      const matchA = descA.match(/(\d+)(st|nd|rd|th)\s+Match/i);
      const matchB = descB.match(/(\d+)(st|nd|rd|th)\s+Match/i);
      
      const playoffA = getPlayoffPriority(descA);
      const playoffB = getPlayoffPriority(descB);
      
      if (matchA && matchB) {
        return parseInt(matchA[1]) - parseInt(matchB[1]);
      }
      
      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;
      
      if (playoffA > 0 && playoffB > 0) {
        if (playoffA !== playoffB) {
          return playoffA - playoffB;
        }
        return descA.localeCompare(descB);
      }
      
      if (playoffA > 0 && playoffB === 0) return 1;
      if (playoffA === 0 && playoffB > 0) return -1;
      
      return descA.localeCompare(descB);
    });
  };

  const fetchMatchPlayers = async (matchId) => {
    if (!league?.id || !matchId) return;
    
    try {
      setLoadingMatchPlayers(true);
      const response = await leagueAPI.getMatchFantasyPoints(league.id, matchId);
      
      if (response.data.success) {
        const players = response.data.data?.players || [];
        setMatchPlayers(players);
      } else {
        setMatchPlayers([]);
      }
    } catch (err) {
      console.error('Error fetching match players:', err);
      setMatchPlayers([]);
    } finally {
      setLoadingMatchPlayers(false);
    }
  };

  const handleMatchClick = (match) => {
    setSelectedMatch(match);
    fetchMatchPlayers(match.match_id);
  };

  const handleCopyCode = () => {
    if (league?.league_code) {
      navigator.clipboard.writeText(league.league_code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="view-league-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading league details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-league-page">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={() => navigate('/home')} className="btn-secondary">
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="view-league-page">
        <div className="error-container">
          <p className="error-message">League not found</p>
          <button onClick={() => navigate('/home')} className="btn-secondary">
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  const handleSquadFilter = (e) => {
    const squad = e.target.value;
    setSelectedSquad(squad);
    
    if (squad) {
      const filteredSquads = squadsData.filter(s => s.squadName === squad);
      setSquadsData(filteredSquads);
    } else {
      fetchTournamentData();
    }
  };

  // Helper function to calculate role statistics
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
      const role = (player.role || '').toLowerCase();
      
      if (role.includes('wicket') || role.includes('wk')) {
        stats.wicketkeeper++;
      } else if (role.includes('bowling') && role.includes('allrounder')) {
        stats.bowlingAllrounder++;
        stats.totalOvers += 4; // Bowling Allrounder contributes 4 overs
      } else if (role.includes('batting') && role.includes('allrounder')) {
        stats.battingAllrounder++;
        stats.totalOvers += 2; // Batting Allrounder contributes 2 overs
      } else if (role.includes('bowl')) {
        stats.bowler++;
        stats.totalOvers += 4; // Bowler contributes 4 overs
      } else if (role.includes('bat')) {
        stats.batsman++;
      }
    });
    
    return stats;
  };

  const handlePlayerSelect = (player) => {
    const playerKey = player.player_id || `${player.name}-${player.team}`;
    
    // Check if player is already used by another team
    if (usedPlayers.has(player.player_id) && !selectedPlayers.find(p => (p.player_id || `${p.name}-${p.team}`) === playerKey)) {
      alert('This player has already been selected by another team');
      return;
    }
    
    const isAlreadySelected = selectedPlayers.find(p => (p.player_id || `${p.name}-${p.team}`) === playerKey);
    
    if (isAlreadySelected) {
      // Remove player
      setSelectedPlayers(selectedPlayers.filter(p => (p.player_id || `${p.name}-${p.team}`) !== playerKey));
      if (captain?.player_id === player.player_id) setCaptain(null);
      if (viceCaptain?.player_id === player.player_id) setViceCaptain(null);
    } else {
      // Check if adding player exceeds squad size
      if (selectedPlayers.length >= squadSize) {
        alert(`You can only select up to ${squadSize} players`);
        return;
      }
      
      // Add player
      setSelectedPlayers([...selectedPlayers, { ...player, player_id: player.player_id || player.name, team: player.team }]);
    }
  };

  const handleSaveTeam = async () => {
    if (selectedPlayers.length !== squadSize) {
      alert(`Please select exactly ${squadSize} players for this league`);
      return;
    }
    
    // Validate role requirements
    const roleStats = getRoleStats(selectedPlayers);
    
    // Check for minimum 1 wicketkeeper
    if (roleStats.wicketkeeper < 1) {
      alert('Team requirement: Minimum 1 Wicketkeeper (WK) required');
      return;
    }
    
    // Check for minimum 1 batsman
    if (roleStats.batsman < 1) {
      alert('Team requirement: Minimum 1 Batsman required');
      return;
    }
    
    // Check for minimum 20 overs quota (Bowlers: 4 overs, Bowling Allrounders: 4 overs, Batting Allrounders: 2 overs)
    if (roleStats.totalOvers < 20) {
      alert(`Bowling quota requirement: Minimum 20 overs required\n\nCurrent: ${roleStats.totalOvers} overs\n• Bowlers: ${roleStats.bowler} × 4 = ${roleStats.bowler * 4} overs\n• Bowling Allrounders: ${roleStats.bowlingAllrounder} × 4 = ${roleStats.bowlingAllrounder * 4} overs\n• Batting Allrounders: ${roleStats.battingAllrounder} × 2 = ${roleStats.battingAllrounder * 2} overs\n\nPlease select more bowlers or allrounders`);
      return;
    }
    
    setSavingSquad(true);
    setSaveError(null);
    
    try {
      const response = await leagueAPI.saveTeamSquad(league.id, myTeam.id, {
        players: selectedPlayers,
        captain,
        viceCaptain
      });
      
      if (response.data.success) {
        alert('Team saved successfully!');
        // Refresh unavailable players
        await fetchUnavailablePlayers();
      }
    } catch (err) {
      console.error('Error saving team:', err);
      
      if (err.response?.data?.errorCode === 'PLAYER_ALREADY_SELECTED') {
        setSaveError(err.response.data.error);
        alert(err.response.data.error + '\n\nPlease remove the conflicting player(s) and try again.');
        // Refresh to show updated unavailable players
        await fetchUnavailablePlayers();
      } else {
        setSaveError('Failed to save team. Please try again.');
        alert('Failed to save team. Please try again.');
      }
    } finally {
      setSavingSquad(false);
    }
  };

  return (
    <div className="view-league-page">
      {/* Header Section */}
      <LeagueHeader league={league} />

      {/* Tab Navigation */}
      <TabNavigation 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        league={league}
        myTeam={myTeam}
        selectedPlayers={selectedPlayers}
        leagueId={leagueId}
      />

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab - Combines League Info, Details, Leaderboard, Tournament */}
        {activeTab === 'overview' && (
          <LeagueOverviewTab 
            leagueId={leagueId}
            league={league}
            teams={teams}
            tournament={tournament}
            tournamentLoading={tournamentLoading}
            formatDate={formatDate}
          />
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <MatchesTab 
            league={league}
            matches={matches}
            tournamentLoading={tournamentLoading}
            handleMatchClick={handleMatchClick}
            selectedMatch={selectedMatch}
            matchPlayers={matchPlayers}
            loadingMatchPlayers={loadingMatchPlayers}
            setSelectedMatch={setSelectedMatch}
          />
        )}

        {/* Playing XI (New Component) */}
        {activeTab === 'playing-xi' && (
          <div className="tab-panel">
            {!myTeam || !myTeam.id ? (
              <div className="empty-state">
                <div className="empty-icon">🏏</div>
                <p>You are not a member of this league</p>
                <button onClick={() => navigate('/home')} className="btn-primary">
                  Join League
                </button>
              </div>
            ) : (
              <PlayingXIForm 
                leagueId={parseInt(leagueId)} 
                teamId={parseInt(myTeam.id)} 
                tournamentId={league?.tournament_id ? parseInt(league.tournament_id) : null}
              />
            )}
          </div>
        )}

        {/* Transfers */}
        {activeTab === 'transfers' && (
          <div className="tab-panel">
            {!myTeam ? (
              <div className="empty-state">
                <div className="empty-icon">🔄</div>
                <p>You are not a member of this league</p>
                <button onClick={() => navigate('/home')} className="btn-primary">
                  Join League
                </button>
              </div>
            ) : (
              <ReplacementPanel 
                leagueId={leagueId} 
                teamId={myTeam.id}
                userEmail={user?.email}
                isAdmin={league?.created_by === user?.email}
              />
            )}
          </div>
        )}

        {/* Top Performers */}
        {activeTab === 'top-performers' && (
          <div className="tab-panel">
            <TopPerformersTable leagueId={leagueId} />
          </div>
        )}

        {/* My Team Tab */}
        {activeTab === 'myteam' && (
          <MyTeamTab 
            myTeam={myTeam}
            squadSize={squadSize}
            selectedPlayers={selectedPlayers}
            captain={captain}
            viceCaptain={viceCaptain}
            getRoleStats={getRoleStats}
          />
        )}

        {/* Playing XI (Old) - Shows Latest Playing XI */}
        {activeTab === 'playingxi' && (
          <PlayingXITab 
            leagueId={leagueId}
            myTeam={myTeam}
            selectedPlayers={selectedPlayers}
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button onClick={() => navigate('/home')} className="btn-secondary">
          ← Back to Home
        </button>
        <button 
          onClick={() => alert('Edit functionality coming soon!')} 
          className="btn-primary"
        >
          ✏️ Edit League
        </button>
      </div>
    </div>
  );
}

export default ViewLeague;