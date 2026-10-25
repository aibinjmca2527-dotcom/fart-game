import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { LEVELS } from '../shared/levels';
import styles from './Dashboard.module.css';

interface DashboardProps {
  onEnterGame: () => void;
}

export function Dashboard({ onEnterGame }: DashboardProps) {
  const { profile, signOut } = useAuthStore();
  const { createRoom, joinRoom } = useMultiplayer();
  const { setRoomCode } = useGameStore();

  const [view, setView] = useState<'home' | 'create' | 'join' | 'howto' | 'settings'>('home');
  const [joinCode, setJoinCode] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [customName, setCustomName] = useState('');

  const displayName = profile?.display_name ?? 'Guest';

  // Check URL query parameters for auto-joining party (?room=XXXXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setJoinCode(roomParam.toUpperCase());
      setView('join');
    }
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    const { roomCode, error: e } = await createRoom(selectedLevel, displayName);
    setLoading(false);
    if (e) {
      setError(e);
      return;
    }
    if (roomCode) {
      setCreatedRoomCode(roomCode);
    } else {
      onEnterGame();
    }
  };

  const handleJoin = async () => {
    if (joinCode.trim().length < 4) {
      setError('Enter a valid room code.');
      return;
    }
    setLoading(true);
    setError('');
    const playerName = customName.trim() || displayName;
    const { error: e } = await joinRoom(joinCode.toUpperCase(), playerName);
    setLoading(false);
    if (e) {
      setError(e);
      return;
    }
    onEnterGame();
  };

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const LEVEL_EMOJIS = ['🚽', '🌊', '🔄', '🌪️', '🏆'];

  return (
    <div className={styles.page}>
      {/* Animated background particles */}
      <div className={styles.particles}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={styles.particle}
            style={{
              left: `${(i * 8.3) % 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${6 + (i % 4)}s`,
              fontSize: `${24 + (i % 24)}px`,
            }}
          >
            {['💨', '🌊', '🚽', '💦', '✨'][i % 5]}
          </div>
        ))}
      </div>

      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.brandLogo}>🚽</div>
          <div className={styles.brandName}>Fun Together</div>
          <div className={styles.avatar}>
            {['🐻 Bear', '🐸 Frog', '🦛 Hippo', '🦏 Rhino'][profile?.avatar_index ?? 0]}
          </div>
          <div className={styles.playerName}>{displayName}</div>

          <nav className={styles.nav}>
            {[
              { id: 'home', icon: '🏠', label: 'Home' },
              { id: 'create', icon: '🎮', label: 'Create Party' },
              { id: 'join', icon: '🔗', label: 'Join Party' },
              { id: 'howto', icon: '❓', label: 'How to Play' },
              { id: 'settings', icon: '⚙️', label: 'Settings' },
            ].map((item) => (
              <button
                key={item.id}
                className={`${styles.navBtn} ${view === item.id ? styles.navActive : ''}`}
                onClick={() => {
                  setView(item.id as typeof view);
                  setError('');
                  if (item.id === 'create') {
                    setCreatedRoomCode(null);
                    setRoomCode('');
                  }
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <button className={styles.signOutBtn} onClick={signOut}>Sign Out</button>
        </aside>

        {/* Main */}
        <main className={styles.main}>
          {view === 'home' && (
            <div className={styles.homeView}>
              <h1 className={styles.mainTitle}>Welcome back, {displayName}! 👋</h1>
              <p className={styles.mainSub}>Ready for some rapid fart-powered river racing?</p>

              <div className={styles.actionCards}>
                <div
                  className={styles.actionCard}
                  onClick={() => {
                    setCreatedRoomCode(null);
                    setRoomCode('');
                    setView('create');
                  }}
                >
                  <div className={styles.actionIcon}>🎮</div>
                  <div className={styles.actionTitle}>Create Party</div>
                  <div className={styles.actionDesc}>Pick a level, generate a room code, and race with friends</div>
                </div>
                <div className={styles.actionCard} onClick={() => setView('join')}>
                  <div className={styles.actionIcon}>🔗</div>
                  <div className={styles.actionTitle}>Join Party</div>
                  <div className={styles.actionDesc}>Enter a friend's room code to jump straight in</div>
                </div>
              </div>

              {/* Level grid */}
              <h2 className={styles.sectionTitle}>Levels</h2>
              <div className={styles.levelGrid}>
                {LEVELS.map((lvl, i) => (
                  <div key={lvl.id} className={styles.levelCard}>
                    <div className={styles.levelEmoji}>{LEVEL_EMOJIS[i]}</div>
                    <div className={styles.levelNum}>Level {lvl.id}</div>
                    <div className={styles.levelName}>{lvl.name}</div>
                    <div className={styles.levelDesc}>{lvl.description}</div>
                    <button
                      className={styles.playLevelBtn}
                      onClick={() => {
                        setSelectedLevel(lvl.id);
                        setCreatedRoomCode(null);
                        setRoomCode('');
                        setView('create');
                      }}
                    >
                      Play
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className={styles.panelView}>
              <h2 className={styles.panelTitle}>🎮 Create Party</h2>
              <p className={styles.panelSub}>Choose your course, then click Create Room to invite friends.</p>

              {!createdRoomCode ? (
                <>
                  <div className={styles.levelSelector}>
                    {LEVELS.map((lvl, i) => (
                      <button
                        key={lvl.id}
                        className={`${styles.lvlBtn} ${selectedLevel === lvl.id ? styles.lvlSelected : ''}`}
                        onClick={() => setSelectedLevel(lvl.id)}
                      >
                        {LEVEL_EMOJIS[i]} {lvl.name}
                      </button>
                    ))}
                  </div>

                  {error && <div className={styles.errorMsg}>{error}</div>}

                  <button className={styles.bigBtn} onClick={handleCreate} disabled={loading}>
                    {loading ? 'Creating Room...' : '🚀 Create Room & Generate Code'}
                  </button>
                </>
              ) : (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '2px solid #7B2FFF',
                  borderRadius: '20px',
                  padding: '28px',
                  textAlign: 'center',
                  marginTop: '16px',
                  boxShadow: '0 8px 32px rgba(123, 47, 255, 0.35)',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
                  <h3 style={{ color: '#fff', fontSize: '24px', margin: '0 0 8px 0' }}>Room Created Successfully!</h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: '0 0 20px 0' }}>
                    Share this code with your friends so they can join your raft:
                  </p>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    background: 'rgba(255, 215, 0, 0.12)',
                    border: '2px solid rgba(255, 215, 0, 0.4)',
                    borderRadius: '16px',
                    padding: '16px 24px',
                    marginBottom: '24px',
                  }}>
                    <span style={{
                      color: '#FFD700',
                      fontSize: '36px',
                      fontWeight: 900,
                      letterSpacing: '6px',
                      fontFamily: 'monospace',
                    }}>
                      {createdRoomCode}
                    </span>
                    <button
                      className={styles.copyBtn}
                      onClick={() => copyRoomCode(createdRoomCode)}
                      style={{ padding: '10px 18px', fontSize: '14px' }}
                    >
                      {copied ? '✅ Copied!' : '📋 Copy Code'}
                    </button>
                  </div>

                  <button
                    className={styles.bigBtn}
                    onClick={onEnterGame}
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                  >
                    🚀 Enter Party Lobby
                  </button>
                </div>
              )}
            </div>
          )}

          {view === 'join' && (
            <div className={styles.panelView}>
              <h2 className={styles.panelTitle}>🔗 Join Party</h2>
              <p className={styles.panelSub}>Enter the 6-character room code to join your friends on the raft.</p>

              <input
                className={styles.codeInput}
                type="text"
                placeholder="XXXXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                autoFocus
              />

              <div style={{ marginBottom: 18, textAlign: 'left' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6, fontWeight: 700 }}>
                  👤 Your Name (Optional):
                </label>
                <input
                  type="text"
                  placeholder={displayName}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  maxLength={20}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {error && <div className={styles.errorMsg}>{error}</div>}

              <button className={styles.bigBtn} onClick={handleJoin} disabled={loading}>
                {loading ? 'Joining Room...' : '🎯 Join Party'}
              </button>
            </div>
          )}

          {view === 'howto' && (
            <div className={styles.panelView}>
              <h2 className={styles.panelTitle}>❓ How to Play</h2>
              <div className={styles.howtoGrid}>
                {[
                  { icon: '🛶', title: 'The Inflatable Raft', desc: 'Up to 4 chunky animal pals share a river rafting tube.' },
                  { icon: '💨', title: 'Continuous Farting', desc: 'Tap repeatedly or mash SPACE/button for continuous high-speed rocket fart bursts!' },
                  { icon: '↔️', title: 'Side-by-Side Steering', desc: 'Press A / D, Left / Right keys, or touch steer arrows to carve across the flume.' },
                  { icon: '🟢', title: 'Green Smoke Trails', desc: 'Every fart produces an animated green smoke cloud pushing the boat forward.' },
                  { icon: '🏁', title: 'Race to the Finish', desc: 'Pass through the checkpoints and cross the checkered finish line!' },
                  { icon: '💥', title: 'Sawtooth Bumpers', desc: 'Bounce off the purple & pink bumpers along the water channel walls.' },
                ].map((item) => (
                  <div key={item.title} className={styles.howtoCard}>
                    <div className={styles.howtoIcon}>{item.icon}</div>
                    <div className={styles.howtoTitle}>{item.title}</div>
                    <div className={styles.howtoDesc}>{item.desc}</div>
                  </div>
                ))}
              </div>

              <div className={styles.controlsTable}>
                <h3>Controls</h3>
                <table>
                  <tbody>
                    <tr><td>Continuous Fart</td><td>Tap FART button rapidly or press SPACE / F key</td></tr>
                    <tr><td>Move Side-by-Side</td><td>A / D keys, ◄ / ► Arrow keys, or onscreen ◀ / ▶ buttons</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'settings' && (
            <div className={styles.panelView}>
              <h2 className={styles.panelTitle}>⚙️ Settings</h2>
              <div className={styles.settingRow}>
                <span>Fart Sound Effects</span>
                <input type="range" min="0" max="100" defaultValue="100" />
              </div>
              <div className={styles.settingRow}>
                <span>Display Name</span>
                <input
                  className={styles.textInput}
                  type="text"
                  defaultValue={displayName}
                  maxLength={24}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
