// Backend origin. Empty in development, where Vite proxies /api to the local
// server; set VITE_API_URL to the deployed server's URL for production builds.
const API_BASE = import.meta.env.VITE_API_URL || '';
export default API_BASE;
