import { useState, useEffect, useCallback } from "react";
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

export const useAuth = (): UseAuthReturn => {
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
      if (!user) throw new Error("Not authenticated");

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
    [user]
  );

  return {
    user,
    isAuthenticated: !!user && !loading,
    loading,
    login,
    register,
    logout,
    updateUsername,
  };
};
