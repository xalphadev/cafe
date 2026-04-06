import { create } from "zustand";

interface AuthUser {
  id: string;
  phone?: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  role: "CUSTOMER" | "ADMIN";
  pointsBalance?: number;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null });
  },
}));
