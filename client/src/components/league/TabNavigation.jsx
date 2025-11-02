import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LeagueComponents.css';

function TabNavigation({ activeTab, setActiveTab, league, myTeam, selectedPlayers, leagueId }) {
  const navigate = useNavigate();

  return (
    <div className="tabs-container">
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
          disabled={!league?.tournament_id}
          title={!league?.tournament_id ? 'No tournament associated with this league' : 'View matches and fantasy points'}
        >
          ⚡ Matches
        </button>
        <button 
          className="tab"
          onClick={() => navigate(`/league/${leagueId}/stats`)}
          disabled={!league?.tournament_id}
          title={!league?.tournament_id ? 'No tournament associated with this league' : 'View player statistics'}
        >
          📊 Player Stats
        </button>
        <button 
          className={`tab ${activeTab === 'myteam' ? 'active' : ''}`}
          onClick={() => setActiveTab('myteam')}
          disabled={!myTeam}
        >
          👥 My Team
        </button>
        <button 
          className={`tab ${activeTab === 'playing-xi' ? 'active' : ''}`}
          onClick={() => setActiveTab('playing-xi')}
          disabled={!myTeam}
          title={!myTeam ? 'Join league first' : 'Select your Playing XI'}
        >
          🏏 Playing XI
        </button>
        <button 
          className={`tab ${activeTab === 'transfers' ? 'active' : ''}`}
          onClick={() => setActiveTab('transfers')}
          disabled={!myTeam}
          title={!myTeam ? 'Join league first' : 'Replace injured or unavailable players'}
        >
          🔄 Replacements
        </button>
        <button 
          className={`tab ${activeTab === 'top-performers' ? 'active' : ''}`}
          onClick={() => setActiveTab('top-performers')}
        >
          ⭐ Top Performers
        </button>
        <button 
          className={`tab ${activeTab === 'playingxi' ? 'active' : ''}`}
          onClick={() => setActiveTab('playingxi')}
          disabled={!myTeam}
          title={!myTeam ? 'Join league first' : 'View your latest Playing XI'}
        >
          👁️ View Playing XI
        </button>
      </div>
    </div>
  );
}

export default TabNavigation;
