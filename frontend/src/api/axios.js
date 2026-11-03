import axios from 'axios'; import { clearSession, getAccessToken, getRefreshToken, saveTokens } from '../utils/storage';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001', headers: { 'Content-Type': 'application/json' } });
let refreshing = null;

function notifyServerBusy(error) {
  if (typeof window === 'undefined' || error?.code === 'ERR_CANCELED') return;
  const status = error?.response?.status;
  // A missing response is usually a browser/network/CORS interruption, not
  // proof that the whole API is unavailable. The status guard performs its
  // own health check for those cases. Only gateway/service failures should
  // trigger an immediate confirmation check.
  if ([502, 503, 504].includes(status)) window.dispatchEvent(new Event('campusflow:server-busy'));
}

function notifyMutationSuccess(response) {
  if (typeof window === 'undefined') return;
  const method = String(response.config?.method || 'get').toLowerCase();
  if (!['post', 'put', 'patch', 'delete'].includes(method)) return;

  const url = String(response.config?.url || '');
  // These requests are background/session operations or already have their
  // own result UI. Showing a toast for them would make chat and polling noisy.
  const silentPaths = [
    '/auth/login', '/auth/register', '/auth/google', '/auth/refresh', '/auth/logout',
    '/auth/forgot-password', '/auth/reset-password', '/auth/presence',
    '/notifications', '/api/chat/', '/api/friends', '/code/run', '/payments/', '/attendance/teacher/telegram/test',
  ];
  if (silentPaths.some((path) => url.includes(path))) return;

  const kind = method === 'post' ? 'create' : method === 'delete' ? 'delete' : 'update';
  const serverMessage = response.data?.message;
  const message = Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage && serverMessage !== 'Success' ? serverMessage : undefined;
  window.dispatchEvent(new CustomEvent('campusflow:toast', { detail: { type: 'success', kind, message } }));
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Let the browser add the multipart boundary for FormData uploads.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData && config.headers) {
    // AxiosHeaders keeps normalized names internally. Use its delete API when
    // available so a JSON default never prevents Multer from seeing the file.
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    } else {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  }
  return config;
});
api.interceptors.response.use((response) => { notifyMutationSuccess(response); return response; }, async (error) => { notifyServerBusy(error); const original = error.config; if (error.response?.status !== 401 || original?._retry || original?.url?.includes('/auth/refresh')) { return Promise.reject(error); } original._retry = true; try { refreshing ||= api.post('/auth/refresh', { refreshToken: getRefreshToken() }); const result = await refreshing; refreshing = null; const session = result.data?.data ?? result.data; saveTokens(session); original.headers.Authorization = `Bearer ${session.accessToken}`; return api(original); } catch (refreshError) { refreshing = null; clearSession(); window.location.assign('/login'); return Promise.reject(refreshError); } });
export const unwrap = (response) => response.data?.data ?? response.data;
export default api;
