import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { loginRequest } from '../api/authApi';
import { AUTH_TOKEN_EXPIRED_EVENT } from '../api/httpClient';

const AUTH_STORAGE_KEY = 'work_timer_auth';
const AUTH_NOTICE_STORAGE_KEY = 'work_timer_auth_notice';

const AuthContext = createContext(null);

function readPersistedAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readPersistedNotice() {
  try {
    return sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function AuthProvider({ children }) {
  const initialData = readPersistedAuth();
  const initialNotice = readPersistedNotice();
  const forceLogoutRef = useRef(false);

  const [token, setToken] = useState(initialData?.token || null);
  const [user, setUser] = useState(initialData?.user || null);
  const [authNotice, setAuthNotice] = useState(initialNotice);

  const persistAuth = useCallback((authData) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
  }, []);

  const persistNotice = useCallback((noticeMessage) => {
    if (noticeMessage) {
      sessionStorage.setItem(AUTH_NOTICE_STORAGE_KEY, noticeMessage);
      return;
    }

    sessionStorage.removeItem(AUTH_NOTICE_STORAGE_KEY);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const clearAuthNotice = useCallback(() => {
    setAuthNotice('');
    persistNotice('');
  }, [persistNotice]);

  const login = useCallback(
    async ({ employeeId, pin }) => {
      clearAuthNotice();
      const data = await loginRequest({ employeeId, pin });

      forceLogoutRef.current = false;
      setToken(data.token);
      setUser(data.user);
      persistAuth({ token: data.token, user: data.user });
      clearAuthNotice();

      return data;
    },
    [clearAuthNotice, persistAuth]
  );

  const logout = useCallback((reason = '') => {
    const normalizedReason = String(reason || '').trim();

    setToken(null);
    setUser(null);
    clearAuth();

    if (normalizedReason) {
      setAuthNotice(normalizedReason);
      persistNotice(normalizedReason);
      return;
    }

    clearAuthNotice();
  }, [clearAuth, clearAuthNotice, persistNotice]);

  useEffect(() => {
    function handleTokenExpired() {
      if (!token || forceLogoutRef.current) {
        return;
      }

      forceLogoutRef.current = true;
      logout('Se cerró la sesión porque el token expiró. Inicia sesión nuevamente.');
    }

    window.addEventListener(AUTH_TOKEN_EXPIRED_EVENT, handleTokenExpired);

    return () => {
      window.removeEventListener(AUTH_TOKEN_EXPIRED_EVENT, handleTokenExpired);
    };
  }, [logout, token]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout,
      authNotice,
      clearAuthNotice
    }),
    [authNotice, clearAuthNotice, token, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
