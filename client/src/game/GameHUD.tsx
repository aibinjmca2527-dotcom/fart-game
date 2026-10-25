import { useCallback, useRef, useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useMultiplayer } from '../hooks/useMultiplayer';
import styles from './GameHUD.module.css';
import { LEVELS } from '../shared/levels';

interface GameHUDProps {
  myPlayerId: string;
}

export function GameHUD({ myPlayerId }: GameHUDProps) {
  const {
    phase, countdownRemaining, elapsedMs, levelId,
    players, currentCheckpoint, bowl, roomCode, isCrashed,
    hostId, restartCurrentLevel, crashToast, crashToastMs,
  } = useGameStore();
  const { sendFart, sendSteer, sendReady, sendStart, sendRestart, sendNextLevel, leaveRoom } = useMultiplayer();

  const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0];
  const myPlayer = players.get(myPlayerId);
  const speed = Math.sqrt(bowl.velX ** 2 + bowl.velZ ** 2);

  const [copied, setCopied] = useState(false);
  const [fartPressed, setFartPressed] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const turboTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const copyRoomCode = useCallback((code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Stop any active turbo fart timer
  const stopTurboFart = useCallback(() => {
    setFartPressed(false);
    if (turboTimerRef.current) {
      clearInterval(turboTimerRef.current);
      turboTimerRef.current = null;
    }
  }, []);

  // Rapid Directional Fart Action
  const triggerFart = useCallback(() => {
    const seatIdx = myPlayer ? myPlayer.seatIndex : 0;
    sendFart(seatIdx);
  }, [myPlayer, sendFart]);

  // Start turbo farting on pointer down
  const onFartPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (phase !== 'playing') return;
    setFartPressed(true);
    triggerFart();

    if (turboTimerRef.current) clearInterval(turboTimerRef.current);
    turboTimerRef.current = setInterval(() => {
      triggerFart();
    }, 110);
  };

  // Global event listeners to guarantee turbo fart never gets stuck running!
  useEffect(() => {
    const handleGlobalRelease = () => stopTurboFart();
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('blur', handleGlobalRelease);

    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('blur', handleGlobalRelease);
      stopTurboFart();
    };
  }, [stopTurboFart]);

  // Unconditionally stop fart timer if game phase leaves playing
  useEffect(() => {
    if (phase !== 'playing') {
      stopTurboFart();
    }
  }, [phase, stopTurboFart]);

  const handleRetry = () => {
    stopTurboFart();
    restartCurrentLevel();
    sendRestart();
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const msRemainder = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(msRemainder).padStart(2, '0')}`;
  };

  // Lobby Ready & Start Logic:
  // Requires at least 2 players for custom multiplayer rooms!
  const playerList = [...players.values()];
  const isMultiplayerRoom = Boolean(roomCode);
  const isHost = myPlayerId === hostId || myPlayer?.seatIndex === 0;
  const otherPlayers = playerList.filter((p) => p.id !== myPlayerId);
  const allOthersReady = otherPlayers.length > 0 && otherPlayers.every((p) => p.ready);
  const hasMinPlayers = !isMultiplayerRoom || playerList.length >= 2;
  const canStartRace = isHost && hasMinPlayers && allOthersReady;

  const ANIMAL_EMOJIS = ['🐻', '🐸', '🦛', '🦏'];

  return (
    <div className={styles.hud}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.levelTag}>
          Level {levelId}: {level.name}
        </div>

        {/* Room Code Badge */}
        {roomCode && (
          <div
            className={styles.roomTag}
            onClick={() => copyRoomCode(roomCode)}
            title="Click to copy Room Code"
          >
            <span className={styles.roomTagLabel}>Room:</span>
            <span className={styles.roomCodeBadge}>{roomCode}</span>
            <span className={styles.copyMiniBtn}>{copied ? 'Copied!' : '📋'}</span>
          </div>
        )}

        <div className={styles.timer}>
          ⏱ {formatTime(elapsedMs)}
        </div>

        <div className={styles.speedometer}>
          {speed.toFixed(1)} m/s
        </div>

        {/* Top-corner Exit Game Button */}
        <button
          className={styles.exitBtn}
          onClick={() => setShowPauseModal(true)}
          title="Exit Game"
        >
          🚪 Exit
        </button>
      </div>

      {/* Non-blocking Auto-Restart Notification */}
      {crashToastMs > 0 && (
        <div className={styles.crashBanner}>
          💥 {crashToast} — Level Auto-Restarted!
        </div>
      )}

      {/* Checkpoint progress */}
      <div className={styles.checkpoints}>
        {level.checkpoints.map((cp, i) => (
          <div
            key={cp.id}
            className={`${styles.cpDot} ${i <= currentCheckpoint ? styles.cpDone : ''}`}
          />
        ))}
        <div className={`${styles.cpDot} ${styles.cpFinish}`}>🏁</div>
      </div>

      {/* Players list */}
      <div className={styles.playerList}>
        {playerList.map((p) => (
          <div
            key={p.id}
            className={`${styles.playerChip} ${p.id === myPlayerId ? styles.myChip : ''}`}
          >
            <span className={styles.seatEmoji}>
              {ANIMAL_EMOJIS[p.seatIndex % 4]}
            </span>
            {p.displayName}
            {p.isFarting && <span className={styles.fartIcon}>💨</span>}
            {!p.connected && <span className={styles.offlineIcon}>⚡</span>}
          </div>
        ))}
      </div>

      {/* Countdown overlay */}
      {phase === 'countdown' && (
        <div className={styles.countdown}>
          <span className={styles.countdownNum}>{countdownRemaining}</span>
        </div>
      )}

      {/* Party Lobby overlay */}
      {phase === 'lobby' && (
        <div className={styles.lobbyOverlay}>
          <h2 className={styles.lobbyTitle}>🚽 River Raft Party</h2>

          {/* Level & Team Continuation Badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#FFD700', fontSize: '18px', fontWeight: 800 }}>
              Course: Level {levelId} — {level.name}
            </span>
            {playerList.length >= 2 ? (
              <div className={levelId > 1 ? styles.returningBadge : styles.newTeamBadge}>
                {levelId > 1
                  ? `🔄 Returning Squad! Continuing from Level ${levelId}`
                  : `✨ New Crew Member! Starting at Level 1`}
              </div>
            ) : (
              <div className={styles.newTeamBadge}>
                ⏳ Waiting for at least 1 friend to connect...
              </div>
            )}
          </div>

          {/* Room Code Card in Lobby */}
          {roomCode && (
            <div className={styles.lobbyCodeCard}>
              <span className={styles.lobbyCodeLabel}>ROOM CODE:</span>
              <span className={styles.lobbyCode}>{roomCode}</span>
              <button
                className={styles.copyBtn}
                onClick={() => copyRoomCode(roomCode)}
              >
                {copied ? '✅ Copied!' : '📋 Copy Code'}
              </button>
            </div>
          )}

          <div className={styles.playerReadyList}>
            {playerList.map((p) => (
              <div key={p.id} className={styles.readyRow}>
                <span>{ANIMAL_EMOJIS[p.seatIndex % 4]} {p.displayName}</span>
                <span>{p.ready ? '✅ Ready' : '⏳ Waiting'}</span>
              </div>
            ))}
          </div>

          <button
            className={styles.readyBtn}
            onClick={() => sendReady(!(myPlayer?.ready ?? false))}
          >
            {myPlayer?.ready ? 'Change to Not Ready' : '✅ Ready Up!'}
          </button>

          {/* Start Race: Enabled ONLY when another player is in room and ready */}
          <button
            className={styles.startBtn}
            onClick={() => {
              if (canStartRace) sendStart(levelId);
            }}
            disabled={!canStartRace}
            style={{
              opacity: canStartRace ? 1 : 0.6,
              cursor: canStartRace ? 'pointer' : 'not-allowed',
              background: canStartRace
                ? 'linear-gradient(135deg, #FF8C00, #CC5500)'
                : 'linear-gradient(135deg, #666, #444)',
            }}
          >
            {isMultiplayerRoom && playerList.length < 2
              ? '⏳ Waiting for Player 2 to Join (Min 2 Players)...'
              : otherPlayers.length > 0 && !allOthersReady
              ? '⏳ Waiting for Player 2 to Ready Up...'
              : '🚀 Start Race'}
          </button>

          <button className={styles.leaveBtn} onClick={leaveRoom}>
            Leave Room
          </button>
        </div>
      )}

      {/* Finish overlay -> Advance to Next Level! */}
      {phase === 'finished' && (
        <div className={styles.finishOverlay}>
          <div className={styles.finishText}>🎉 LEVEL {levelId} COMPLETE! 🎉</div>
          <div className={styles.finishTime}>Final Time: {formatTime(elapsedMs)}</div>

          {levelId < LEVELS.length ? (
            <button className={styles.readyBtn} onClick={() => sendNextLevel(levelId + 1)}>
              🚀 Next Level (Level {levelId + 1})
            </button>
          ) : (
            <button className={styles.readyBtn} onClick={handleRetry}>
              🏆 You Beat All Levels! Play Again
            </button>
          )}

          <button className={styles.leaveBtn} onClick={leaveRoom}>
            Back to Dashboard
          </button>
        </div>
      )}

      {/* Failed / Crashed overlay -> Obstacle collision game over! */}
      {phase === 'failed' && (
        <div className={styles.finishOverlay}>
          <div className={styles.failText}>
            {isCrashed ? '💥 CRASHED! GAME OVER' : "💀 TIME'S UP!"}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, margin: '4px 0 16px 0' }}>
            {isCrashed
              ? 'The tube touched an obstacle! Move around the tube to steer clear.'
              : 'You ran out of time! Fart faster to cross the finish line.'}
          </p>

          <button className={styles.readyBtn} onClick={handleRetry}>
            🔁 Try Again (Level {levelId})
          </button>
          <button className={styles.leaveBtn} onClick={leaveRoom}>
            Back to Dashboard
          </button>
        </div>
      )}

      {/* Onscreen Controls for Gameplay (Move on Tube + Continuous Directional Fart) */}
      {phase === 'playing' && (
        <div className={styles.controls}>
          {/* Move Counter-Clockwise around Tube */}
          <button
            className={styles.steerBtn}
            onPointerDown={(e) => { e.preventDefault(); sendSteer(-1); }}
            onPointerUp={(e) => { e.preventDefault(); sendSteer(0); }}
            onPointerLeave={() => sendSteer(0)}
            title="Move Around Tube Left (A or ◄)"
          >
            ◀
          </button>

          {/* Continuous Fart Button */}
          <button
            className={`${styles.fartBtn} ${fartPressed ? styles.fartActive : ''}`}
            onPointerDown={onFartPointerDown}
            onPointerUp={stopTurboFart}
            onPointerLeave={stopTurboFart}
            title="Continuous Directional Fart! (SPACE or F)"
          >
            <span className={styles.fartEmoji}>💨</span>
            <span className={styles.fartLabel}>FART!</span>
          </button>

          {/* Move Clockwise around Tube */}
          <button
            className={styles.steerBtn}
            onPointerDown={(e) => { e.preventDefault(); sendSteer(1); }}
            onPointerUp={(e) => { e.preventDefault(); sendSteer(0); }}
            onPointerLeave={() => sendSteer(0)}
            title="Move Around Tube Right (D or ►)"
          >
            ▶
          </button>
        </div>
      )}

      {/* Pause / Exit Confirmation Modal */}
      {showPauseModal && (
        <div className={styles.pauseOverlay}>
          <div className={styles.pauseCard}>
            <h3 className={styles.pauseTitle}>⏸️ Game Menu</h3>
            <p className={styles.pauseSub}>Level {levelId}: {level.name}</p>
            <button
              className={styles.resumeBtn}
              onClick={() => setShowPauseModal(false)}
            >
              ▶ Resume Game
            </button>
            <button
              className={styles.exitConfirmBtn}
              onClick={() => {
                setShowPauseModal(false);
                leaveRoom();
              }}
            >
              🚪 Exit to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
