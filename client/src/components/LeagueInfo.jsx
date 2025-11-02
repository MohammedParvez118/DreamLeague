import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LeagueInfo.css';

const LeagueInfo = ({ leagueId }) => {
  const [leagueInfo, setLeagueInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeagueInfo = async () => {
      try {
        setLoading(true);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const response = await axios.get(`${API_BASE}/api/league/${leagueId}/info`);
        console.log('League info fetched:', response.data);
        setLeagueInfo(response.data.data); // Extract data from the API response wrapper
        setError(null);
      } catch (err) {
        console.error('Error fetching league info:', err);
        setError('Failed to load league information');
      } finally {
        setLoading(false);
      }
    };

    if (leagueId) {
      fetchLeagueInfo();
    }
  }, [leagueId]);

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Not set';
    
    // Handle Unix timestamp (if it's a string of digits)
    let timestamp = dateValue;
    if (typeof dateValue === 'string' && /^\d+$/.test(dateValue)) {
      timestamp = parseInt(dateValue, 10);
    }
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Not set';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="league-info-loading">Loading league information...</div>;
  }

  if (error) {
    return <div className="league-info-error">{error}</div>;
  }

  if (!leagueInfo) {
    return <div className="league-info-error">No league information available</div>;
  }

  return (
    <div className="league-info-container">
      <h3 className="league-info-title">League Information & Details</h3>
      
      <div className="info-grid">
        {/* League Name */}
        <div className="info-card">
          <div className="info-icon">🏆</div>
          <div className="info-content">
            <div className="info-label">League Name</div>
            <div className="info-value">{leagueInfo.league_name || 'N/A'}</div>
          </div>
        </div>

        {/* Created By */}
        <div className="info-card">
          <div className="info-icon">👤</div>
          <div className="info-content">
            <div className="info-label">Created By</div>
            <div className="info-value">{leagueInfo.created_by || 'Unknown'}</div>
          </div>
        </div>

        {/* Tournament */}
        <div className="info-card">
          <div className="info-icon">🏏</div>
          <div className="info-content">
            <div className="info-label">Tournament</div>
            <div className="info-value">{leagueInfo.tournament_name || 'N/A'}</div>
          </div>
        </div>

        {/* Start Date */}
        <div className="info-card">
          <div className="info-icon">📅</div>
          <div className="info-content">
            <div className="info-label">Start Date</div>
            <div className="info-value">{formatDate(leagueInfo.start_date || leagueInfo.created_at)}</div>
          </div>
        </div>

        {/* End Date */}
        <div className="info-card">
          <div className="info-icon">🏁</div>
          <div className="info-content">
            <div className="info-label">End Date</div>
            <div className="info-value">{formatDate(leagueInfo.end_date)}</div>
          </div>
        </div>

        {/* Teams */}
        <div className="info-card">
          <div className="info-icon">👥</div>
          <div className="info-content">
            <div className="info-label">Teams</div>
            <div className="info-value">
              {leagueInfo.current_teams || 0} / {leagueInfo.max_teams || 'Unlimited'}
            </div>
          </div>
        </div>

        {/* Total Matches */}
        <div className="info-card">
          <div className="info-icon">🎯</div>
          <div className="info-content">
            <div className="info-label">Total Matches</div>
            <div className="info-value">{leagueInfo.total_matches || 0}</div>
          </div>
        </div>

        {/* Squad Size */}
        <div className="info-card">
          <div className="info-icon">👥</div>
          <div className="info-content">
            <div className="info-label">Squad Size</div>
            <div className="info-value">{leagueInfo.squad_size || 'N/A'}</div>
          </div>
        </div>

        {/* Transfer Limit */}
        <div className="info-card">
          <div className="info-icon">🔄</div>
          <div className="info-content">
            <div className="info-label">Transfer Limit</div>
            <div className="info-value">{leagueInfo.transfer_limit || 'N/A'}</div>
          </div>
        </div>

        {/* Privacy */}
        <div className="info-card">
          <div className="info-icon">🔒</div>
          <div className="info-content">
            <div className="info-label">Privacy</div>
            <div className="info-value">
              {leagueInfo.privacy === 'private' ? 'Private' : 'Public'}
            </div>
          </div>
        </div>
      </div>

      {/* League Description */}
      {leagueInfo.description && (
        <div className="league-description">
          <h4>Description</h4>
          <p>{leagueInfo.description}</p>
        </div>
      )}

      {/* Match Statistics */}
      {leagueInfo.total_matches > 0 && (
        <div className="match-statistics">
          <h4>Match Statistics</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Completed:</span>
              <span className="stat-value">{leagueInfo.completed_matches || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Upcoming:</span>
              <span className="stat-value">{leagueInfo.upcoming_matches || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">In Progress:</span>
              <span className="stat-value">{leagueInfo.live_matches || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeagueInfo;
