import { useEffect, useRef } from 'react';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { useGameStore } from '../store/gameStore';
import { GameCanvas } from './GameCanvas';
import { GameHUD } from './GameHUD';

interface GamePageProps {
  myPlayerId: string;
  displayName: string;
}

/** Full game view: 3D canvas + HUD + Keyboard Controls + Physics Loop */
export function GamePage({ myPlayerId }: GamePageProps) {
  const { sendFart, sendSteer } = useMultiplayer();
  const { players, phase, stepLocalPhysics } = useGameStore();
  const myPlayer = players.get(myPlayerId);

  const keysDown = useRef<Set<string>>(new Set());
  const turboFartRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keyboard handling: Space/F for continuous rapid farting, A/D or Left/Right for side-by-side steering
  useEffect(() => {
    if (phase !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat && (e.code === 'Space' || e.code === 'KeyF')) return; // handled by interval
      keysDown.current.add(e.code);

      // Fart
      if (e.code === 'Space' || e.code === 'KeyF') {
        e.preventDefault();
        const seatIdx = myPlayer ? myPlayer.seatIndex : 0;
        sendFart(seatIdx);

        // Hold-down turbo farting
        if (!turboFartRef.current) {
          turboFartRef.current = setInterval(() => {
            sendFart(seatIdx);
          }, 110);
        }
      }

      // Steering
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        e.preventDefault();
        sendSteer(-1);
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        e.preventDefault();
        sendSteer(1);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current.delete(e.code);

      if (e.code === 'Space' || e.code === 'KeyF') {
        if (turboFartRef.current) {
          clearInterval(turboFartRef.current);
          turboFartRef.current = null;
        }
      }

      if (e.code === 'KeyA' || e.code === 'ArrowLeft' || e.code === 'KeyD' || e.code === 'ArrowRight') {
        const hasLeft = keysDown.current.has('KeyA') || keysDown.current.has('ArrowLeft');
        const hasRight = keysDown.current.has('KeyD') || keysDown.current.has('ArrowRight');
        if (hasLeft) sendSteer(-1);
        else if (hasRight) sendSteer(1);
        else sendSteer(0);
      }
    };

    const handleBlur = () => {
      keysDown.current.clear();
      if (turboFartRef.current) {
        clearInterval(turboFartRef.current);
        turboFartRef.current = null;
      }
      sendSteer(0);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (turboFartRef.current) {
        clearInterval(turboFartRef.current);
        turboFartRef.current = null;
      }
      sendSteer(0);
    };
  }, [phase, myPlayer, sendFart, sendSteer]);

  // Client animation loop for responsive local physics & steering
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      stepLocalPhysics(dt);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [stepLocalPhysics]);

  return (
    <div style={{ width: '100vw', height: '100dvh', position: 'relative', overflow: 'hidden' }}>
      <GameCanvas />
      <GameHUD myPlayerId={myPlayerId} />
    </div>
  );
}
