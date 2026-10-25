import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useGameStore } from './store/gameStore';
import { supabase } from './lib/supabase';
import { AuthPage } from './ui/AuthPage';
import { Dashboard } from './ui/Dashboard';
import { GamePage } from './game/GamePage';

type AppView = 'auth' | 'dashboard' | 'game';

export default function App() {
  const { user, setUser, refreshProfile, initialized, setInitialized } = useAuthStore();
  const { room, roomCode, mySessionId } = useGameStore();
  const [view, setView] = useState<AppView>('auth');

  // Initialize auth on mount
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await refreshProfile();
        }
      } catch {
        // Fallback for offline/guest
      }
      setInitialized(true);
    };
    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) refreshProfile();
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manage view transitions
  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      setView('auth');
    } else if (view === 'auth') {
      setView('dashboard');
    }
  }, [user, initialized, view]);

  // Sync game view when room or roomCode becomes active
  useEffect(() => {
    if ((room || roomCode) && view !== 'game') {
      setView('game');
    } else if (!room && !roomCode && view === 'game') {
      setView('dashboard');
    }
  }, [room, roomCode, view]);

  if (!initialized) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100dvh', background: '#060620', color: '#FFD700', fontSize: 32,
        flexDirection: 'column', gap: 16
      }}>
        <div style={{ fontSize: 64 }}>🚽</div>
        <div>Loading Fun Together...</div>
      </div>
    );
  }

  if (view === 'auth' || !user) return <AuthPage />;

  if (view === 'game' && (room || roomCode)) {
    const activePlayerId = room?.sessionId || mySessionId || 'local';
    return (
      <GamePage
        myPlayerId={activePlayerId}
        displayName={useAuthStore.getState().profile?.display_name ?? 'Player'}
      />
    );
  }

  return <Dashboard onEnterGame={() => setView('game')} />;
}
