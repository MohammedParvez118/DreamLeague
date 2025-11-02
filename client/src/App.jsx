import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import VerifyEmail from './pages/VerifyEmail';
import Home from './pages/Home';
import JoinLeague from './pages/JoinLeague';
import Tournaments from './pages/Tournaments';
import CreateFantasy from './pages/fantasy/CreateFantasy';
import ViewLeague from './pages/league/ViewLeague';
import LeagueStats from './pages/league/LeagueStats';
import SquadSelection from './pages/league/SquadSelection';
import AddTournament from './pages/tournament/AddTournament';
import TournamentHome from './pages/tournament/TournamentHome';
import TournamentFixtures from './pages/tournament/TournamentFixtures';
import TournamentSquads from './pages/tournament/TournamentSquads';
import TournamentStats from './pages/tournament/TournamentStats';
import MatchScorecard from './pages/tournament/MatchScorecard';
// import MatchScorecardTest from './pages/tournament/MatchScorecardTest';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing page without layout */}
        <Route path="/" element={<Landing />} />
        
        {/* Auth pages without layout */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        
        {/* Protected routes with layout */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/home" element={<Home />} />
          <Route path="/join-league" element={<JoinLeague />} />
          <Route path="/tournaments" element={<Tournaments />} />
          
          {/* Fantasy League Routes */}
          <Route path="/fantasy" element={<CreateFantasy />} />
          
          {/* League Routes */}
          <Route path="/league/:leagueId/setup-squad" element={<SquadSelection />} />
          <Route path="/league/:id" element={<ViewLeague />} />
          <Route path="/league/:id/stats" element={<LeagueStats />} />
          
          {/* Tournament Routes */}
          <Route path="/tournament/add" element={<AddTournament />} />
          <Route path="/tournament/tournament-home/:tournamentId" element={<TournamentHome />} />
          <Route path="/tournament/tournament-fixtures/:tournamentId" element={<TournamentFixtures />} />
          <Route path="/tournament/tournament-fixtures/:tournamentId/:matchId" element={<MatchScorecard />} />
          <Route path="/tournament/tournament-squads/:tournamentId" element={<TournamentSquads />} />
          <Route path="/tournament/tournament-stats/:tournamentId" element={<TournamentStats />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;