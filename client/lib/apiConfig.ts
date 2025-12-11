// API Configuration
// Using localhost for server API access
// Default to localhost:5000 - can be overridden with VITE_API_BASE_URL environment variable
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
export const API_BASE_URL_WITH_API = `${API_BASE_URL}/api`;

