const ACCESS = 'sms_access_token'; const REFRESH = 'sms_refresh_token'; const USER = 'sms_user';
export const getAccessToken = () => localStorage.getItem(ACCESS); export const getRefreshToken = () => localStorage.getItem(REFRESH); export const getStoredUser = () => { try { return JSON.parse(localStorage.getItem(USER) || 'null'); } catch { return null; } };
export const saveSession = ({ accessToken, refreshToken, user }) => { localStorage.setItem(ACCESS, accessToken); localStorage.setItem(REFRESH, refreshToken); localStorage.setItem(USER, JSON.stringify(user)); };
export const saveTokens = ({ accessToken, refreshToken, user }) => { if (accessToken) localStorage.setItem(ACCESS, accessToken); if (refreshToken) localStorage.setItem(REFRESH, refreshToken); if (user) localStorage.setItem(USER, JSON.stringify(user)); };
export const clearSession = () => [ACCESS, REFRESH, USER].forEach((key) => localStorage.removeItem(key));
