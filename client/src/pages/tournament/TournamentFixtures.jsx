import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import './TournamentFixtures.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function TournamentFixtures() {
  const { tournamentId } = useParams();
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${API_BASE}/api/tournament/${tournamentId}/fixtures`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        // Expecting data.fixtures or data.rows depending on backend; normalize
        const fixturesList = data.fixtures || data.rows || data || [];
        setFixtures(fixturesList);
      } catch (err) {
        console.error('Failed to load fixtures', err);
        setError(err.message || 'Failed to load fixtures');
      } finally {
        setLoading(false);
      }
    }

    if (tournamentId) load();
  }, [tournamentId]);

  if (loading) return <div className="tournament-fixtures">Loading fixtures...</div>;
  if (error) return <div className="tournament-fixtures error">Error: {error}</div>;

  return (
    <div className="tournament-fixtures">
      <h2>Fixtures</h2>
      {fixtures.length === 0 ? (
        <div className="no-fixtures">No fixtures available.</div>
      ) : (
        <ul className="fixtures-list">
          {fixtures.map((f) => {
            // Support different shapes
            const matchId = f.id ?? f.match_id ?? f.matchId;
            const description = f.match_description || f.description || `${f.home_team} vs ${f.away_team}`;
            return (
              <li key={matchId} className="fixture-row">
                <Link to={`/tournament/tournament-fixtures/${tournamentId}/${matchId}`} className="fixture-link">
                  <span className="fixture-desc">{description}</span>
                  <span className="fixture-time">{f.match_start ? new Date(f.match_start).toLocaleString() : ''}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
