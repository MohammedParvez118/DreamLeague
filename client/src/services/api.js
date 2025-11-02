import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fantasy League API
export const fantasyAPI = {
  getLeagues: () => api.get('/api/leagues'),
  createLeague: (data) => api.post('/api/fantasy', data),
  getLeague: (id) => api.get(`/api/fantasy/${id}`),
  setupTeams: (leagueId, teams) => api.post(`/api/fantasy/setup-teams/${leagueId}`, teams),
  submitSquads: (leagueId, squads) => api.post(`/api/fantasy/setup-teams/submit-squads/${leagueId}`, squads),
};

// Tournament API
export const tournamentAPI = {
  getTournaments: () => api.get('/api/tournaments'),
  getTournament: (id) => api.get(`/api/tournament/${id}`),
  getSeries: (type, year) => api.get(`/api/tournament/series?type=${type}&year=${year}`),
  addTournament: (data) => api.post('/api/tournament/add', data),
  refreshTournament: (id) => api.get(`/api/tournament/refresh/${id}`),
  deleteTournament: (id) => api.delete(`/api/tournament/${id}`),
  getFixtures: (id) => api.get(`/api/tournament/${id}/fixtures`),
  getSquads: (id, squad = '') => api.get(`/api/tournament/${id}/squads?squad=${squad}`),
  getSquadPlayers: (id, squad = '') => api.get(`/api/tournament/${id}/squad-players?squad=${squad}`),
};

// League API
export const leagueAPI = {
  getPublicLeagues: (userEmail = '') => api.get(`/api/leagues/public${userEmail ? `?userEmail=${userEmail}` : ''}`),
  getLeagueDetails: (id) => api.get(`/api/league/${id}`),
  joinLeague: (id, data) => api.post(`/api/league/${id}/join`, data),
  joinLeagueByCode: (data) => api.post('/api/league/join-by-code', data),
  deleteLeague: (id, data) => api.delete(`/api/league/${id}`, { data }),
  
  // Fantasy Squad Management
  getUnavailablePlayers: (leagueId) => api.get(`/api/league/${leagueId}/unavailable-players`),
  getTeamSquad: (leagueId, teamId) => api.get(`/api/league/${leagueId}/team/${teamId}/squad`),
  saveTeamSquad: (leagueId, teamId, data) => api.post(`/api/league/${leagueId}/team/${teamId}/squad`, data),
  addPlayerToSquad: (leagueId, teamId, player) => api.post(`/api/league/${leagueId}/team/${teamId}/squad/add-player`, { player }),
  removePlayerFromSquad: (leagueId, teamId, playerId) => api.delete(`/api/league/${leagueId}/team/${teamId}/squad/player/${playerId}`),
  
  // League Match Stats
  getMatchFantasyPoints: (leagueId, matchId) => api.get(`/api/league/${leagueId}/match/${matchId}/fantasy-points`),
  
  // Extended League Features
  getLeagueInfo: (leagueId) => api.get(`/api/league/${leagueId}/info`),
  getLeagueMatches: (leagueId, status = '') => api.get(`/api/league/${leagueId}/matches${status ? `?status=${status}` : ''}`),
  getLeaderboard: (leagueId) => api.get(`/api/league/${leagueId}/leaderboard`),
  getTopPerformers: (leagueId, role = '', limit = 10) => api.get(`/api/league/${leagueId}/top-performers?role=${role}&limit=${limit}`),
  getTeamMatchBreakdown: (leagueId, teamId) => api.get(`/api/league/${leagueId}/team/${teamId}/match-breakdown`),
};

// Playing XI API
export const playingXIAPI = {
  getPlayingXI: (leagueId, teamId, matchId) => api.get(`/api/league/${leagueId}/team/${teamId}/match/${matchId}/playing-xi`),
  savePlayingXI: (leagueId, teamId, matchId, data) => api.post(`/api/league/${leagueId}/team/${teamId}/match/${matchId}/playing-xi`, data),
  // deletePlayingXI removed - incompatible with sequential locking system
  checkMatchLock: (leagueId, matchId) => api.get(`/api/league/${leagueId}/match/${matchId}/is-locked`),
  getMatchesWithStatus: (leagueId, teamId) => api.get(`/api/league/${leagueId}/team/${teamId}/matches-status`),
  copyPlayingXI: (leagueId, teamId, fromMatchId, toMatchId) => api.post(`/api/league/${leagueId}/team/${teamId}/match/${toMatchId}/copy-playing-xi`, { fromMatchId }),
  getTransferStats: (leagueId, teamId) => api.get(`/api/league/${leagueId}/team/${teamId}/transfer-stats`),
};

// Transfer API
export const transferAPI = {
  getRemainingTransfers: (leagueId, teamId) => api.get(`/api/transfer/${leagueId}/team/${teamId}/remaining`),
  getTransferHistory: (leagueId, teamId, page = 1, limit = 10) => api.get(`/api/transfer/${leagueId}/team/${teamId}/history?page=${page}&limit=${limit}`),
  transferPlayer: (leagueId, teamId, data) => api.post(`/api/transfer/${leagueId}/team/${teamId}/transfer`, data),
  getAvailablePlayers: (leagueId, role = '', search = '') => api.get(`/api/transfer/${leagueId}/available-players?role=${role}&search=${search}`),
  undoLastTransfer: (leagueId, teamId) => api.post(`/api/transfer/${leagueId}/team/${teamId}/undo`),
};

// Replacement API (Squad replacements for injured players)
export const replacementAPI = {
  requestReplacement: (leagueId, teamId, data) => api.post(`/api/league/${leagueId}/team/${teamId}/replacements/request`, data),
  getTeamReplacements: (leagueId, teamId) => api.get(`/api/league/${leagueId}/team/${teamId}/replacements`),
  cancelReplacement: (leagueId, teamId, replacementId) => api.delete(`/api/league/${leagueId}/team/${teamId}/replacements/${replacementId}`),
  getSquadWithStatus: (leagueId, teamId) => api.get(`/api/league/${leagueId}/team/${teamId}/squad-with-status`),
  // Admin endpoints
  getPendingReplacements: (leagueId, userEmail) => api.get(`/api/league/${leagueId}/admin/replacements/pending?userEmail=${userEmail}`),
  reviewReplacement: (leagueId, replacementId, data) => api.post(`/api/league/${leagueId}/admin/replacements/${replacementId}/review`, data),
};

// Match Stats API
export const matchStatsAPI = {
  calculateMatchPoints: (leagueId, matchId) => api.post(`/api/league/${leagueId}/match/${matchId}/calculate-points`),
  getTeamMatchPointsBreakdown: (leagueId, teamId, matchId) => api.get(`/api/league/${leagueId}/team/${teamId}/match/${matchId}/points-breakdown`),
  recalculateLeaguePoints: (leagueId) => api.post(`/api/league/${leagueId}/recalculate-all-points`),
};

// Authentication API
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  verifyEmail: (token) => api.get(`/api/auth/verify-email?token=${token}`),
  forgotPassword: (data) => api.post('/api/auth/forgot-password', data),
  resetPassword: (data) => api.post('/api/auth/reset-password', data),
  logout: () => api.post('/api/auth/logout'),
};

export default api;