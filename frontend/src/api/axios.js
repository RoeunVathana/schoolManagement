import axios from 'axios'; import { clearSession, getAccessToken, getRefreshToken, saveTokens } from '../utils/storage';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000', headers: { 'Content-Type': 'application/json' } });
let refreshing = null;
api.interceptors.request.use((config) => { const token = getAccessToken(); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use((response) => response, async (error) => { const original = error.config; if (error.response?.status !== 401 || original?._retry || original?.url?.includes('/auth/refresh')) { return Promise.reject(error); } original._retry = true; try { refreshing ||= api.post('/auth/refresh', { refreshToken: getRefreshToken() }); const result = await refreshing; refreshing = null; const session = result.data?.data ?? result.data; saveTokens(session); original.headers.Authorization = `Bearer ${session.accessToken}`; return api(original); } catch (refreshError) { refreshing = null; clearSession(); window.location.assign('/login'); return Promise.reject(refreshError); } });
export const unwrap = (response) => response.data?.data ?? response.data;
export default api;
