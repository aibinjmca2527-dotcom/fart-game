import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { BugReportForm } from './BugReportForm';
import { TipSection } from './TipSection';
import { Footer } from './Footer';
import styles from './AuthPage.module.css';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'bug'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { signIn, signUp, loading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!isSupabaseConfigured) {
      setError("Supabase credentials are not saved in client/.env yet (or still using placeholder). Please save real credentials (Ctrl+S) and restart, or click '👾 Play as Guest' below to start immediately!");
      return;
    }

    if (mode === 'signup') {
      if (!displayName.trim()) { setError('Please enter a display name.'); return; }
      const err = await signUp(email, password, displayName);
      if (err) setError(err);
      else setInfo('Account created! Check your email or log in.');
    } else if (mode === 'login') {
      const err = await signIn(email, password);
      if (err) setError(err);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🚽</div>
        <h1 className={styles.title}>Fun Together</h1>
        <p className={styles.subtitle}>Fart-Powered Multiplayer Racing!</p>

        {!isSupabaseConfigured && (
          <div className={styles.configNotice}>
            💡 <strong>Quick Start:</strong> Click <strong>"👾 Play as Guest"</strong> below to play all 5 levels right now! To enable email accounts, save your Supabase URL & Key in <code>client/.env</code>.
          </div>
        )}

        {/* Existing form tabs with added Report a Bug option */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${mode === 'login' ? styles.activeTab : ''}`} onClick={() => setMode('login')}>Log In</button>
          <button className={`${styles.tab} ${mode === 'signup' ? styles.activeTab : ''}`} onClick={() => setMode('signup')}>Sign Up</button>
          <button className={`${styles.tab} ${mode === 'bug' ? styles.activeTab : ''}`} onClick={() => setMode('bug')}>Report a Bug 🐛</button>
        </div>

        {mode === 'bug' ? (
          <BugReportForm compact />
        ) : (
          <>
            <form className={styles.form} onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={24}
                  required
                />
              )}
              <input
                className={styles.input}
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className={styles.input}
                type="password"
                placeholder="Password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />

              {error && <div className={styles.error}>{error}</div>}
              {info && <div className={styles.info}>{info}</div>}

              <button className={styles.submitBtn} type="submit" disabled={loading}>
                {loading ? '...' : mode === 'login' ? '🎮 Log In' : '🚀 Create Account'}
              </button>
            </form>

            {/* Guest play option */}
            <div className={styles.guestSection}>
              <div className={styles.divider}>or</div>
              <p className={styles.guestNote}>
                No account? You can still play as a guest.
              </p>
              <button
                className={styles.guestBtn}
                onClick={() => {
                  useAuthStore.getState().setUser({
                    id: `guest_${Date.now()}`,
                    email: 'guest@fun-together.local',
                    app_metadata: {},
                    user_metadata: { display_name: 'Guest' },
                    aud: 'guest',
                    created_at: new Date().toISOString(),
                  } as never);
                  useAuthStore.getState().setProfile({
                    id: `guest_${Date.now()}`,
                    display_name: 'Guest',
                    avatar_index: 0,
                  });
                }}
              >
                👾 Play as Guest
              </button>
            </div>
          </>
        )}
      </div>

      {/* Tip the Developer Section (above footer) */}
      <TipSection />

      {/* Website Footer */}
      <Footer
        onOpenBugReport={() => setMode('bug')}
        onOpenTip={() => {
          document.getElementById('tip-the-developer')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </div>
  );
}
