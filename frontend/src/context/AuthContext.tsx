import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AuthUser,
  authService,
  ChangePasswordResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from "../services/authService";

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<ForgotPasswordResponse>;
  resetPassword: (token: string, password: string) => Promise<ResetPasswordResponse>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<ChangePasswordResponse>;
  getToken: () => string | null;
}

interface StoredAuthState {
  accessToken: string | null;
  refreshToken: string | null;
}

const STORAGE_KEY = "ldgroup_admin_auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readStoredState = (): StoredAuthState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuthState) : null;
  } catch (error) {
    console.error("Failed to parse stored auth state", error);
    return null;
  }
};

const writeStoredState = (state: StoredAuthState | null) => {
  if (typeof window === "undefined") return;
  if (!state) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuthState = useCallback(
    (tokens: { accessToken: string; refreshToken: string }, nextUser: AuthUser) => {
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);
      setUser(nextUser);
      writeStoredState(tokens);
    },
    [],
  );

  const clearAuthState = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    writeStoredState(null);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        const stored = readStoredState();
        if (!stored || !stored.accessToken) {
          return;
        }

        const { accessToken: storedAccess, refreshToken: storedRefresh } = stored;

        try {
          const profile = await authService.getProfile(storedAccess);
          applyAuthState(
            {
              accessToken: storedAccess,
              refreshToken: storedRefresh ?? "",
            },
            profile,
          );
          return;
        } catch (error) {
          if (!storedRefresh) {
            clearAuthState();
            return;
          }
        }

        if (!storedRefresh) {
          clearAuthState();
          return;
        }

        try {
          const refreshed = await authService.refresh(storedRefresh);
          const profile = await authService.getProfile(refreshed.accessToken);
          applyAuthState(
            {
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken,
            },
            profile,
          );
        } catch (error) {
          clearAuthState();
        }
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [applyAuthState, clearAuthState]);

  const login = useCallback(
    async (usernameOrEmail: string, password: string) => {
      const result = await authService.login(usernameOrEmail, password);
      applyAuthState(
        {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        result.user,
      );
    },
    [applyAuthState],
  );

  const logout = useCallback(() => {
    clearAuthState();
  }, [clearAuthState]);

  const requestPasswordReset = useCallback((email: string) => {
    return authService.requestPasswordReset(email);
  }, []);

  const resetPassword = useCallback((token: string, password: string) => {
    return authService.resetPassword(token, password);
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!accessToken) {
        throw new Error("You must be logged in to change password");
      }
      const response = await authService.changePassword(accessToken, currentPassword, newPassword);
      return response;
    },
    [accessToken],
  );

  const getToken = useCallback(() => accessToken, [accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      loading,
      login,
      logout,
      requestPasswordReset,
      resetPassword,
      changePassword,
      getToken,
    }),
    [
      user,
      accessToken,
      loading,
      login,
      logout,
      requestPasswordReset,
      resetPassword,
      changePassword,
      getToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
