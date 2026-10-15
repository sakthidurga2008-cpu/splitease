import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, setUnauthorizedHandler } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  // True after the user chose "Log out", so the next login starts at the overview
  // instead of returning to the page the previous person was on.
  const loggedOut = useRef(false);

  // On first load, ask the server whether the login cookie is still valid.
  useEffect(() => {
    api
      .get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (userId, password) => {
    const data = await api.post('/auth/login', { user_id: userId, password });
    loggedOut.current = false;
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (details) => {
    const data = await api.post('/auth/register', details);
    loggedOut.current = false;
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      loggedOut.current = true;
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, checking, login, register, logout, setUser, loggedOut }),
    [user, checking, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
