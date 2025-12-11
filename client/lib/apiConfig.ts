// API Configuration
// Using ngrok URL for server API access
// Default to ngrok URL - can be overridden with VITE_API_BASE_URL environment variable
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://nonprohibitory-katheryn-unbewitched.ngrok-free.dev";
export const API_BASE_URL_WITH_API = `${API_BASE_URL}/api`;

