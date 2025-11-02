// Centralized API base URL for client
// Use Vite env var when building for production; fall back to localhost for dev
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
