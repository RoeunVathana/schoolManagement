import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import api, { unwrap } from '../api/axios';
import { clearSession, getStoredUser, saveSession, saveTokens } from '../utils/storage';
import { useLanguage } from './LanguageContext';

export const AuthContext = createContext(null);

const normalizeUser = (profile) => profile?.role === 'ADMIN' ? { ...profile, canCreate: true, canEdit: true, canDelete: true } : profile;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => normalizeUser(getStoredUser()));
  const [loading, setLoading] = useState(true);
  const { setLanguage } = useLanguage();

  const syncLanguage = (profile) => setLanguage(localStorage.getItem('sms_language') || profile.language || 'en');

  useEffect(() => {
    if (user) {
      api.get('/auth/profile')
        .then((response) => {
          const profile = normalizeUser(unwrap(response));
          setUser(profile);
          syncLanguage(profile);
          saveTokens({ user: profile });
        })
        .catch(() => {
          clearSession();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;

    const heartbeat = () => {
      if (document.visibilityState === 'visible') api.patch('/auth/presence', { online: true }).catch(() => undefined);
    };

    heartbeat();
    const interval = window.setInterval(heartbeat, 30_000);
    window.addEventListener('focus', heartbeat);
    document.addEventListener('visibilitychange', heartbeat);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', heartbeat);
      document.removeEventListener('visibilitychange', heartbeat);
    };
  }, [user?.id]);

  const saveLoginSession = useCallback((session) => {
    const normalizedSession = { ...session, user: normalizeUser(session.user) };
    saveSession(normalizedSession);
    setUser(normalizedSession.user);
    syncLanguage(normalizedSession.user);
    return normalizedSession.user;
  }, [setLanguage]);

  const login = useCallback(async (credentials) => {
    return saveLoginSession(unwrap(await api.post('/auth/login', credentials)));
  }, [saveLoginSession]);

  const loginWithGoogle = useCallback(async (credentials) => {
    return saveLoginSession(unwrap(await api.post('/auth/google', credentials)));
  }, [saveLoginSession]);

  const updateUser = useCallback((profile) => {
    const normalizedProfile = normalizeUser(profile);
    setUser(normalizedProfile);
    syncLanguage(normalizedProfile);
    saveTokens({ user: normalizedProfile });
  }, [setLanguage]);

  const logout = useCallback(async () => {
    try { await api.patch('/auth/presence', { online: false }); } catch {}
    try { await api.post('/auth/logout', { refreshToken: localStorage.getItem('sms_refresh_token') }); } catch {}
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, loginWithGoogle, updateUser, logout, isAuthenticated: !!user }), [user, loading, login, loginWithGoogle, updateUser, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
