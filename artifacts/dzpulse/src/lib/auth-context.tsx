import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("dzpulse_token"));
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(!!localStorage.getItem("dzpulse_token"));

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("dzpulse_token"));
    return () => {
      setAuthTokenGetter(null);
    };
  }, []);

  // Rehydrate user from stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("dzpulse_token");
    if (!storedToken) {
      setLoading(false);
      return;
    }
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then(res => {
        if (res.ok) return res.json();
        // Token is invalid — clear it
        localStorage.removeItem("dzpulse_token");
        setToken(null);
        return null;
      })
      .then(data => {
        if (data) setUserState(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((newToken: string, loggedInUser: User) => {
    localStorage.setItem("dzpulse_token", newToken);
    setToken(newToken);
    setUserState(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("dzpulse_token");
    setToken(null);
    setUserState(null);
  }, []);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!token, token, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
