import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, login, logout, register, type AuthUser } from "../services/api";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: { email: string; password: string; name: string; companyName: string }) => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  const signIn = async (email: string, password: string) => {
    const result = await login(email, password);
    setUser(result.user);
  };
  const signUp = async (data: { email: string; password: string; name: string; companyName: string }) => {
    const result = await register(data);
    setUser(result.user);
  };
  const signOut = async () => {
    await logout();
    setUser(null);
  };
  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is missing");
  return context;
}
