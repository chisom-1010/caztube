"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { apiClient } from "../lib/api";
import { User } from "../shared/types/user";
import { toast } from "sonner";

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUsername: (username: string) => Promise<void>;
}

const STORAGE_KEY = "caztube_user";

function saveUserToStorage(user: User) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // storage unavailable — session just won't survive a refresh
  }
}

function loadUserFromStorage(): User | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (parsed?.id && parsed?.username && parsed?.email) {
      return parsed as User;
    }
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

const AuthContext = createContext<UseAuthReturn | null>(null);


// component re-instantiates. AuthProvider wraps the whole app (in
// app/layout.tsx), and every call to useAuth() below reads from this one
// shared instance. So when AuthForm logs someone in (or signs them up),
// the Header's UserNavigation — and every other consumer — sees it
// immediately, without needing to remount or re-read localStorage itself.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(loadUserFromStorage());
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { user: loggedInUser } = await apiClient.login(email, password);
      saveUserToStorage(loggedInUser);
      setUser(loggedInUser);
      toast("Login Successful", { description: `Welcome back, ${loggedInUser.username}!` });
    } catch (error) {
      apiClient.logout();
      setUser(null);
      const message = error instanceof Error ? error.message : "Invalid credentials";
      toast("Login Failed", { description: message });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      await apiClient.register(username, email, password);
      // Registration doesn't return a session — log in right after
      const { user: newUser } = await apiClient.login(email, password);
      saveUserToStorage(newUser);
      setUser(newUser);
      toast("Account Created", { description: `Welcome to caZTube, ${newUser.username}!` });
    } catch (error) {
      apiClient.logout();
      setUser(null);
      const message = error instanceof Error ? error.message : "Failed to create account";
      toast("Registration Failed", { description: message });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.logout();
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    toast("Logged Out", { description: "You have been logged out successfully" });
  }, []);

  const updateUsername = useCallback(
    async (username: string) => {
      try {
        const updated = await apiClient.updateUsername(username);
        saveUserToStorage(updated);
        setUser(updated);
        toast("Profile Updated", { description: "Your username has been updated" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update profile";
        toast("Update Failed", { description: message });
        throw error;
      }
    },
    []
  );

  const value: UseAuthReturn = {
    user,
    isAuthenticated: !!user && !loading,
    loading,
    login,
    register,
    logout,
    updateUsername,
  };


  return React.createElement(AuthContext.Provider, { value }, children);
}

export const useAuth = (): UseAuthReturn => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      "useAuth() was called outside <AuthProvider>. Wrap app/layout.tsx's children in <AuthProvider>."
    );
  }
  return ctx;
};
