import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: { id: string; display_name: string; avatar_index: number } | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  setProfile: (p: AuthState['profile']) => void;
  signUp: (email: string, password: string, displayName: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  initialized: boolean;
  setInitialized: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      loading: false,
      initialized: false,

      setUser: (u) => set({ user: u }),
      setProfile: (p) => set({ profile: p }),
      setInitialized: (v) => set({ initialized: v }),

      signUp: async (email, password, displayName) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) return error.message;
          if (!data.user) return 'No user returned';

          // Create profile
          await supabase.from('profiles').upsert({
            id: data.user.id,
            display_name: displayName,
            avatar_index: 0,
          });
          return null;
        } catch (e: unknown) {
          return String(e);
        } finally {
          set({ loading: false });
        }
      },

      signIn: async (email, password) => {
        set({ loading: true });
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) return error.message;
          await get().refreshProfile();
          return null;
        } catch (e: unknown) {
          return String(e);
        } finally {
          set({ loading: false });
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null });
      },

      refreshProfile: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        set({ user });
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) set({ profile: data });
      },
    }),
    { name: 'fun-together-auth', partialize: (s) => ({ user: s.user, profile: s.profile }) }
  )
);
