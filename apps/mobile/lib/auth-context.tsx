import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { User } from "@tanky/domain";
import { api, ApiError } from "./api-client";
import { tokenStorage } from "./storage";

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await tokenStorage.get();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const { user, isAdmin } = await api.auth.me();
        setUser(user);
        setIsAdmin(isAdmin);
      } catch {
        await tokenStorage.clear();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await api.auth.login({ email, password });
    await tokenStorage.set(token);
    setUser(user);
    const me = await api.auth.me();
    setIsAdmin(me.isAdmin);
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; firstName: string; lastName: string }) => {
      const { token, user } = await api.auth.register(input);
      await tokenStorage.set(token);
      setUser(user);
      setIsAdmin(false);
    },
    [],
  );

  const logout = useCallback(async () => {
    await tokenStorage.clear();
    setUser(null);
    setIsAdmin(false);
  }, []);

  const value = useMemo(
    () => ({ user, isAdmin, isLoading, login, register, logout }),
    [user, isAdmin, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
