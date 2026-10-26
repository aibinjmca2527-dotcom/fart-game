import { useCallback, useRef, useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useMultiplayer } from '../hooks/useMultiplayer';
import styles from './GameHUD.module.css';
import { LEVELS } from '../shared/levels';
import { getTeamSignature, getSavedTeamLevel, getSoloMaxUnlockedLevel } from '../lib/teamProgression';

interface GameHUDProps {
  myPlayerId: string;
}

export function GameHUD({ myPlayerId }: GameHUDProps) {
  const {
    phase, countdownRemaining, elapsedMs, levelId,
    players, currentCheckpoint, bowl, roomCode, isCrashed,
    hostId, restartCurrentLevel, crashToast, crashToastMs,
  } = useGameStore();
  const { sendFart, sendSteer, sendReady, sendStart, sendRestart, sendNextLevel, sendSelectLevel, leaveRoom } = useMultiplayer();

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

  // Steer hold-down handling for continuous movement around tube
  const steerDirRef = useRef<number>(0);
  const steerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSteer = useCallback((dir: number, e?: React.PointerEvent) => {
    if (e) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
    if (steerDirRef.current === dir || dir === 0) {
      steerDirRef.current = 0;
      if (steerIntervalRef.current) {
        clearInterval(steerIntervalRef.current);
        steerIntervalRef.current = null;
      }
      sendSteer(0);
    }
  }, [sendSteer]);

  const startSteer = useCallback((dir: number, e: React.PointerEvent) => {
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    steerDirRef.current = dir;
    sendSteer(dir);

    // Continuous smooth motion loop while held down
    if (steerIntervalRef.current) clearInterval(steerIntervalRef.current);
    useGameStore.getState().movePlayerAngle(myPlayerId, dir * 0.07);
    steerIntervalRef.current = setInterval(() => {
      useGameStore.getState().movePlayerAngle(myPlayerId, dir * 0.07);
    }, 25);
  }, [sendSteer, myPlayerId]);

  // Global event listeners to guarantee turbo fart and continuous steer never get stuck running!
  useEffect(() => {
    const handleGlobalRelease = () => {
      stopTurboFart();
      if (steerIntervalRef.current) {
        clearInterval(steerIntervalRef.current);
        steerIntervalRef.current = null;
      }
      if (steerDirRef.current !== 0) {
        steerDirRef.current = 0;
        sendSteer(0);
      }
    };
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('touchcancel', handleGlobalRelease);
    window.addEventListener('blur', handleGlobalRelease);

    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('touchcancel', handleGlobalRelease);
      window.removeEventListener('blur', handleGlobalRelease);
      stopTurboFart();
      if (steerIntervalRef.current) {
        clearInterval(steerIntervalRef.current);
        steerIntervalRef.current = null;
      }
      sendSteer(0);
    };
  }, [stopTurboFart, sendSteer]);

  // Unconditionally stop timers if game phase leaves playing
  useEffect(() => {
    if (phase !== 'playing') {
      stopTurboFart();
      if (steerIntervalRef.current) {
        clearInterval(steerIntervalRef.current);
        steerIntervalRef.current = null;
      }
      if (steerDirRef.current !== 0) {
        steerDirRef.current = 0;
        sendSteer(0);
      }
    }
  }, [phase, stopTurboFart, sendSteer]);

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
  const teamSig = getTeamSignature(playerList.map((p) => p.displayName));
  const maxTeamLevel = playerList.length >= 2 && teamSig
    ? getSavedTeamLevel(teamSig)
    : (playerList.length < 2 ? getSoloMaxUnlockedLevel() : 1);
  const isMultiplayerRoom = Boolean(roomCode);
  const storeIsHost = useGameStore((s) => s.isHost);
  const isHost = storeIsHost || (myPlayerId === hostId) || (myPlayer?.seatIndex === 0);
  const otherPlayers = playerList.filter((p) => p.id !== myPlayerId);
  const allOthersReady = otherPlayers.length > 0 && otherPlayers.every((p) => p.ready);
  const hasMinPlayers = !isMultiplayerRoom || playerList.length >= 2;
  const canStartRace = isHost && hasMinPlayers && allOthersReady;

  const ANIMAL_EMOJIS = ['🐻', '🐸', '🦛', '🦏'];

  return (
    <div className={styles.hud}>
      {/* Sleek, Properly Aligned Top Header (Never cuts off or overlaps on mobile!) */}
      <div className={styles.topHeader}>
        {/* Left: Menu/Pause Button + Course Info */}
        <div className={styles.headerLeft}>
          <button
            className={styles.menuBtn}
            onClick={() => setShowPauseModal(true)}
            title="Open Game Menu / Pause"
          >
            <span className={styles.menuIcon}>⏸️</span>
            <span className={styles.menuText}>Menu</span>
          </button>
          <div className={styles.levelBadge} title={`Level ${levelId}: ${level.name}`}>
            <span className={styles.levelTagNum}>Lvl {levelId}</span>
            <span className={styles.levelTagName}>{level.name}</span>
          </div>
        </div>

        {/* Center: Digital Timer + Room Pill + Checkpoints */}
        <div className={styles.headerCenter}>
          <div className={styles.timerBadge}>
            ⏱ {formatTime(elapsedMs)}
          </div>
          {roomCode && (
            <button
              className={styles.roomBadge}
              onClick={() => copyRoomCode(roomCode)}
              title="Click to copy Room Code"
            >
              <span className={styles.roomPrefix}>Room:</span>
              <span className={styles.roomCodeText}>{roomCode}</span>
              <span className={styles.roomCopyIcon}>{copied ? '✓' : '📋'}</span>
            </button>
          )}
          <div className={styles.checkpointsRow}>
            {level.checkpoints.map((cp, i) => (
              <span
                key={cp.id}
                className={`${styles.cpPip} ${i <= currentCheckpoint ? styles.cpPipDone : ''}`}
              />
            ))}
            <span className={styles.cpFlag}>🏁</span>
          </div>
        </div>

        {/* Right: Speedometer + Compact Player Chips */}
        <div className={styles.headerRight}>
          <div className={styles.speedBadge}>
            <span className={styles.speedNumber}>{speed.toFixed(1)}</span>
            <span className={styles.speedLabel}>m/s</span>
          </div>
          <div className={styles.headerPlayerList}>
            {playerList.map((p) => (
              <div
                key={p.id}
                className={`${styles.playerMiniChip} ${p.id === myPlayerId ? styles.myMiniChip : ''}`}
                title={p.displayName}
              >
                <span className={styles.miniChipEmoji}>
                  {ANIMAL_EMOJIS[p.seatIndex % 4]}
                </span>
                <span className={styles.miniChipName}>{p.displayName}</span>
                {p.isFarting && <span className={styles.miniChipFart}>💨</span>}
                {!p.connected && <span className={styles.miniChipOffline}>⚡</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Non-blocking Auto-Restart Notification */}
      {crashToastMs > 0 && (
        <div className={styles.crashBanner}>
          💥 {crashToast} — Level Auto-Restarted!
        </div>
      )}

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
          <div className={styles.lobbyCourseContainer}>
            <div className={styles.lobbyCourseHeading}>
              Course: <span style={{ color: '#FFD700' }}>Level {levelId} — {level.name}</span>
            </div>

            {/* Squad status message */}
            {playerList.length >= 2 ? (
              <div className={maxTeamLevel > 1 ? styles.returningBadge : styles.newTeamBadge}>
                {maxTeamLevel > 1
                  ? `🔄 Returning Squad! Highest Achieved: Level ${maxTeamLevel}`
                  : `✨ New Crew Member Joined! Starting at Level 1`}
              </div>
            ) : (
              <div className={styles.newTeamBadge}>
                ⏳ Waiting for at least 1 friend to connect...
              </div>
            )}

            {/* In-Lobby Level Selection Pills */}
            {maxTeamLevel > 1 && (
              <div className={styles.lobbyLevelSelectBox}>
                <span className={styles.lobbyLevelSelectLabel}>
                  {isHost ? 'Select Level to Play:' : 'Unlocked Levels:'}
                </span>
                <div className={styles.lobbyLevelPills}>
                  {LEVELS.slice(0, maxTeamLevel).map((lvl) => (
                    <button
                      key={lvl.id}
                      className={`${styles.lobbyLevelPill} ${levelId === lvl.id ? styles.lobbyLevelPillActive : ''}`}
                      disabled={!isHost}
                      onClick={() => {
                        if (isHost) sendSelectLevel(lvl.id);
                      }}
                      title={isHost ? `Switch course to Level ${lvl.id}: ${lvl.name}` : `Level ${lvl.id}`}
                    >
                      Level {lvl.id} {levelId === lvl.id && '✓'}
                    </button>
                  ))}
                </div>
                {!isHost && (
                  <span className={styles.lobbyLevelSelectHint}>
                    (Host selects course level)
                  </span>
                )}
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

      {/* Onscreen Controls for Gameplay (Continuous Move on Tube + Continuous Directional Fart) */}
      {phase === 'playing' && (
        <div className={styles.controls}>
          {/* Move Counter-Clockwise around Tube */}
          <button
            className={styles.steerBtn}
            onPointerDown={(e) => startSteer(-1, e)}
            onPointerUp={(e) => stopSteer(-1, e)}
            onPointerCancel={(e) => stopSteer(-1, e)}
            onLostPointerCapture={(e) => stopSteer(-1, e)}
            onContextMenu={(e) => e.preventDefault()}
            title="Press and hold to move around tube left (A or ◄)"
          >
            ◀
          </button>

          {/* Continuous Fart Button */}
          <button
            className={`${styles.fartBtn} ${fartPressed ? styles.fartActive : ''}`}
            onPointerDown={onFartPointerDown}
            onPointerUp={stopTurboFart}
            onPointerCancel={stopTurboFart}
            onLostPointerCapture={stopTurboFart}
            onContextMenu={(e) => e.preventDefault()}
            title="Continuous Directional Fart! (SPACE or F)"
          >
            <span className={styles.fartEmoji}>💨</span>
            <span className={styles.fartLabel}>FART!</span>
          </button>

          {/* Move Clockwise around Tube */}
          <button
            className={styles.steerBtn}
            onPointerDown={(e) => startSteer(1, e)}
            onPointerUp={(e) => stopSteer(1, e)}
            onPointerCancel={(e) => stopSteer(1, e)}
            onLostPointerCapture={(e) => stopSteer(1, e)}
            onContextMenu={(e) => e.preventDefault()}
            title="Press and hold to move around tube right (D or ►)"
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
              className={styles.restartBtn}
              onClick={() => {
                setShowPauseModal(false);
                handleRetry();
              }}
            >
              🔁 Restart Level
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
