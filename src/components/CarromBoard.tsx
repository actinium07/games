import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, Sparkles } from 'lucide-react';
import {
  AI_BASELINE_Y,
  BASELINE_X_MAX,
  BASELINE_X_MIN,
  BOARD_SIZE,
  computeAIShot,
  createInitialCarromState,
  findSafeStrikerX,
  PLAYER_BASELINE_Y,
  POCKET_RADIUS,
  POCKETS,
  predictStrikerRay,
  resolveCarromShotEnd,
  stepCarromPhysics,
  WALL_MAX,
  WALL_MIN,
  type CarromDiscKind,
  type CarromMatchState,
} from '../games/carrom/carromPhysics';
import type { FuturisticOptions, MatchResult } from '../types/game';
import { sound } from '../utils/sound';

interface CarromBoardProps {
  options: FuturisticOptions;
  isPaused: boolean;
  onGameOver: (result: MatchResult) => void;
}

interface SparkParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

const PARTICLE_POOL_SIZE = 36;

export const CarromBoard: React.FC<CarromBoardProps> = ({ options, isPaused, onGameOver }) => {
  const [match, setMatch] = useState<CarromMatchState>(() => createInitialCarromState());
  const [aimAngleDeg, setAimAngleDeg] = useState<number>(-90); // straight up
  const [powerPct, setPowerPct] = useState<number>(68);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matchRef = useRef<CarromMatchState>(match);
  const isPausedRef = useRef<boolean>(isPaused);
  const optionsRef = useRef<FuturisticOptions>(options);

  // Drag sling state stored in ref for 60fps zero-react-rerender aiming
  const dragRef = useRef<{
    active: boolean;
    pullX: number;
    pullY: number;
  }>({ active: false, pullX: 0, pullY: 0 });

  const shotPocketedRef = useRef<CarromDiscKind[]>([]);
  const particlesRef = useRef<SparkParticle[]>(
    Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.3,
      color: '#22d3ee',
    }))
  );
  const particleCursorRef = useRef(0);

  useEffect(() => {
    matchRef.current = match;
  }, [match]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const spawnBurst = (x: number, y: number, color: string, count = 6) => {
    const pool = particlesRef.current;
    for (let i = 0; i < count; i++) {
      const p = pool[particleCursorRef.current % PARTICLE_POOL_SIZE];
      particleCursorRef.current++;
      const ang = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 140;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd;
      p.life = 0.28;
      p.maxLife = 0.28;
      p.color = color;
    }
  };

  // Game Over callback
  useEffect(() => {
    if (match.phase !== 'gameover' || !match.winner) return;
    const t = setTimeout(() => {
      const isWin = match.winner === 'player';
      if (isWin) sound.playVictory();
      else sound.playDefeat();
      onGameOver({
        gameId: 'carrom',
        outcome: isWin ? 'victory' : 'defeat',
        headline: isWin ? 'Board Cleared — You Win' : 'Vanguard AI Cleared the Board',
        subline: isWin
          ? 'All White discs and the Queen were cleanly pocketed.'
          : 'Vanguard AI pocketed all Black discs first.',
        metrics: [
          { label: 'White Pocketed', value: `${match.playerPocketed}/9` },
          { label: 'Black Pocketed', value: `${match.aiPocketed}/9` },
          { label: 'Total Turns', value: `${match.turnCount}` },
        ],
      });
    }, 550);
    return () => clearTimeout(t);
  }, [match.phase, match.winner, match.playerPocketed, match.aiPocketed, match.turnCount, onGameOver]);

  // Automated AI Turn
  useEffect(() => {
    if (isPaused || match.phase !== 'aim' || match.turn !== 'ai') return;
    const t = setTimeout(() => {
      const current = matchRef.current;
      if (current.phase !== 'aim' || current.turn !== 'ai') return;
      const plan = computeAIShot(current.discs, optionsRef.current.difficulty);
      const nextDiscs = current.discs.map((d) => ({ ...d }));
      const striker = nextDiscs.find((d) => d.kind === 'striker')!;
      striker.pocketed = false;
      striker.x = plan.strikerX;
      striker.y = AI_BASELINE_Y;
      striker.vx = plan.vx;
      striker.vy = plan.vy;

      shotPocketedRef.current = [];
      sound.playCarromHit(0.75);
      setMatch((prev) => ({
        ...prev,
        discs: nextDiscs,
        strikerX: plan.strikerX,
        phase: 'simulating',
        lastEvent: 'Vanguard AI fired!',
      }));
    }, 680);
    return () => clearTimeout(t);
  }, [match.phase, match.turn, isPaused]);

  // Main 60fps Canvas Render + Physics Loop (mounted once)
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const state = matchRef.current;
      const paused = isPausedRef.current;

      if (!paused && state.phase === 'simulating') {
        const ev = stepCarromPhysics(state.discs, dt);
        if (ev.collisions > 0 && ev.maxImpactSpeed > 55) {
          sound.playCarromHit(Math.min(1, ev.maxImpactSpeed / 600));
          const striker = state.discs.find((d) => d.kind === 'striker');
          if (striker && !striker.pocketed) {
            spawnBurst(striker.x, striker.y, '#22d3ee', 5);
          }
        }
        if (ev.newlyPocketed.length > 0) {
          sound.playPocket();
          shotPocketedRef.current.push(...ev.newlyPocketed);
          for (const p of POCKETS) {
            spawnBurst(p.x, p.y, '#f59e0b', 6);
          }
        }
        if (ev.allStopped) {
          const pocketed = [...shotPocketedRef.current];
          shotPocketedRef.current = [];
          const resolved = resolveCarromShotEnd(state, state.discs, pocketed);
          matchRef.current = resolved;
          setMatch(resolved);
        }
      }

      // Update pooled particles
      for (const p of particlesRef.current) {
        if (!p.active) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) p.active = false;
      }

      // Render Canvas
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        const theme = optionsRef.current.theme;
        const accent = theme === 'brass' ? '#f59e0b' : '#22d3ee';
        const surfaceBg = theme === 'holographic' ? '#081325' : theme === 'brass' ? '#17130e' : '#0f1623';
        const frameBg = theme === 'brass' ? '#2a2016' : '#182132';

        ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

        // Outer Frame
        ctx.fillStyle = frameBg;
        ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

        // Inner Playable Surface
        ctx.fillStyle = surfaceBg;
        ctx.beginPath();
        ctx.roundRect(WALL_MIN, WALL_MIN, WALL_MAX - WALL_MIN, WALL_MAX - WALL_MIN, 18);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.stroke();

        // Geometric Center Star & Rings
        ctx.strokeStyle = theme === 'brass' ? 'rgba(245,158,11,0.28)' : 'rgba(34,211,238,0.22)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(300, 300, 74, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(244,63,94,0.45)';
        ctx.beginPath();
        ctx.arc(300, 300, 19, 0, Math.PI * 2);
        ctx.stroke();

        // Baselines (Top AI & Bottom Player)
        for (const by of [AI_BASELINE_Y, PLAYER_BASELINE_Y]) {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(BASELINE_X_MIN, by - 14);
          ctx.lineTo(BASELINE_X_MAX, by - 14);
          ctx.moveTo(BASELINE_X_MIN, by + 14);
          ctx.lineTo(BASELINE_X_MAX, by + 14);
          ctx.stroke();

          for (const bx of [BASELINE_X_MIN, BASELINE_X_MAX]) {
            ctx.fillStyle = 'rgba(244,63,94,0.75)';
            ctx.beginPath();
            ctx.arc(bx, by, 9, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Corner Pockets
        for (const p of POCKETS) {
          ctx.fillStyle = '#03060b';
          ctx.beginPath();
          ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = accent;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Trajectory Aim Guide on Player Aim Phase
        const s = matchRef.current;
        if (s.phase === 'aim' && s.turn === 'player') {
          const striker = s.discs.find((d) => d.kind === 'striker');
          if (striker && !striker.pocketed) {
            let dirX = 0;
            let dirY = -1;
            let pullMag = 0;

            if (dragRef.current.active) {
              dirX = striker.x - dragRef.current.pullX;
              dirY = striker.y - dragRef.current.pullY;
              pullMag = Math.min(130, Math.hypot(dirX, dirY));
            } else {
              const rad = (aimAngleRef.current * Math.PI) / 180;
              dirX = Math.cos(rad);
              dirY = Math.sin(rad);
              pullMag = (powerRef.current / 100) * 115;
            }

            if (pullMag > 6) {
              // Draw pull-back indicator if dragging
              if (dragRef.current.active) {
                ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(striker.x, striker.y);
                ctx.lineTo(
                  striker.x - (dirX / Math.max(1, Math.hypot(dirX, dirY))) * pullMag,
                  striker.y - (dirY / Math.max(1, Math.hypot(dirX, dirY))) * pullMag
                );
                ctx.stroke();
              }

              // Draw forward trajectory line
              if (optionsRef.current.tacticalAssist || dragRef.current.active) {
                const ray = predictStrikerRay(s.discs, striker.x, striker.y, dirX, dirY);
                ctx.save();
                ctx.strokeStyle = accent;
                ctx.lineWidth = 2;
                ctx.setLineDash([7, 5]);
                ctx.beginPath();
                ctx.moveTo(striker.x, striker.y);
                ctx.lineTo(ray.hitX, ray.hitY);
                ctx.stroke();

                if (optionsRef.current.tacticalAssist && ray.bounceX !== undefined && ray.bounceY !== undefined) {
                  ctx.strokeStyle = '#f59e0b';
                  ctx.beginPath();
                  ctx.moveTo(ray.hitX, ray.hitY);
                  ctx.lineTo(ray.bounceX, ray.bounceY);
                  ctx.stroke();
                }
                ctx.restore();
              }
            }
          }
        }

        // Render Discs
        for (const d of s.discs) {
          if (d.pocketed) continue;

          ctx.save();
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.beginPath();
          ctx.arc(d.x + 2, d.y + 3, d.radius, 0, Math.PI * 2);
          ctx.fill();

          // Disc body
          const grad = ctx.createRadialGradient(
            d.x - d.radius * 0.3,
            d.y - d.radius * 0.3,
            d.radius * 0.15,
            d.x,
            d.y,
            d.radius
          );

          if (d.kind === 'white') {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(1, '#cbd5e1');
          } else if (d.kind === 'black') {
            grad.addColorStop(0, '#64748b');
            grad.addColorStop(1, '#1e293b');
          } else if (d.kind === 'queen') {
            grad.addColorStop(0, '#fb7185');
            grad.addColorStop(1, '#be123c');
          } else {
            grad.addColorStop(0, '#67e8f9');
            grad.addColorStop(1, '#0891b2');
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
          ctx.fill();

          // Crisp rim & concentric inlay ring
          ctx.lineWidth = d.kind === 'striker' ? 2.5 : 1.75;
          ctx.strokeStyle =
            d.kind === 'striker'
              ? '#ffffff'
              : d.kind === 'queen'
                ? '#fecdd3'
                : d.kind === 'white'
                  ? '#94a3b8'
                  : '#cbd5e1';
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(d.x, d.y, d.radius * 0.52, 0, Math.PI * 2);
          ctx.strokeStyle =
            d.kind === 'striker'
              ? 'rgba(255,255,255,0.85)'
              : d.kind === 'black'
                ? 'rgba(245,158,11,0.55)'
                : 'rgba(255,255,255,0.28)';
          ctx.lineWidth = 1.3;
          ctx.stroke();
          ctx.restore();
        }

        // Render Pooled Particles
        for (const p of particlesRef.current) {
          if (!p.active) continue;
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Keep refs synced for canvas draw loop
  const aimAngleRef = useRef(aimAngleDeg);
  const powerRef = useRef(powerPct);
  useEffect(() => {
    aimAngleRef.current = aimAngleDeg;
  }, [aimAngleDeg]);
  useEffect(() => {
    powerRef.current = powerPct;
  }, [powerPct]);

  const toBoardCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 300, y: 300 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * BOARD_SIZE,
      y: ((clientY - rect.top) / rect.height) * BOARD_SIZE,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPaused || match.phase !== 'aim' || match.turn !== 'player') return;
    const pos = toBoardCoords(e.clientX, e.clientY);
    dragRef.current = { active: true, pullX: pos.x, pullY: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return;
    const pos = toBoardCoords(e.clientX, e.clientY);
    dragRef.current.pullX = pos.x;
    dragRef.current.pullY = pos.y;
  };

  const fireStriker = (dirX: number, dirY: number, powerNorm: number) => {
    const current = matchRef.current;
    if (current.phase !== 'aim' || current.turn !== 'player') return;
    const len = Math.hypot(dirX, dirY);
    if (len < 0.001) return;

    const speed = 340 + Math.max(0.15, Math.min(1, powerNorm)) * 780;
    const nextDiscs = current.discs.map((d) => ({ ...d }));
    const striker = nextDiscs.find((d) => d.kind === 'striker')!;
    striker.vx = (dirX / len) * speed;
    striker.vy = (dirY / len) * speed;

    shotPocketedRef.current = [];
    sound.playCarromHit(Math.max(0.35, powerNorm));
    const nextState: CarromMatchState = {
      ...current,
      discs: nextDiscs,
      phase: 'simulating',
      lastEvent: 'Shot launched!',
    };
    matchRef.current = nextState;
    setMatch(nextState);
  };

  const handlePointerUp = () => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const striker = matchRef.current.discs.find((d) => d.kind === 'striker');
    if (!striker) return;
    const dx = striker.x - dragRef.current.pullX;
    const dy = striker.y - dragRef.current.pullY;
    const pullDist = Math.hypot(dx, dy);
    if (pullDist > 14) {
      fireStriker(dx, dy, Math.min(1, pullDist / 125));
    }
  };

  const handleSliderX = (rawX: number) => {
    if (match.phase !== 'aim' || match.turn !== 'player') return;
    const safeX = findSafeStrikerX(match.discs, rawX, PLAYER_BASELINE_Y);
    const nextDiscs = match.discs.map((d) =>
      d.kind === 'striker' ? { ...d, x: safeX, y: PLAYER_BASELINE_Y } : d
    );
    const nextState = { ...match, strikerX: safeX, discs: nextDiscs };
    matchRef.current = nextState;
    setMatch(nextState);
  };

  const handleButtonStrike = () => {
    const rad = (aimAngleDeg * Math.PI) / 180;
    fireStriker(Math.cos(rad), Math.sin(rad), powerPct / 100);
  };

  const isPlayerAiming = !isPaused && match.phase === 'aim' && match.turn === 'player';

  return (
    <div className="w-full h-full flex flex-col lg:flex-row items-center justify-center gap-5 px-3 py-2">
      {/* 600x600 Carrom Physics Board */}
      <div className="p-2.5 sm:p-3.5 rounded-2xl bg-[#111722] border border-slate-700/80 shadow-[0_24px_56px_rgba(0,0,0,0.65)]">
        <canvas
          ref={canvasRef}
          data-testid="carrom-canvas"
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-[min(86vw,540px)] h-[min(86vw,540px)] sm:w-[min(74vh,560px)] sm:h-[min(74vh,560px)] rounded-xl touch-none cursor-crosshair block"
        />
      </div>

      {/* Right Striker Controls & Match Telemetry */}
      <aside className="w-full lg:w-72 flex flex-col gap-3.5 bg-[#101622] border border-slate-800 rounded-2xl p-4">
        <div className="space-y-1 border-b border-slate-800 pb-3">
          <div className="text-xs text-slate-400">Carrom Arena · Turn {match.turnCount}</div>
          <div className="font-display text-base font-bold text-white">
            {match.turn === 'player'
              ? match.phase === 'simulating'
                ? 'Discs in Motion...'
                : 'Your Strike (White)'
              : 'Vanguard AI Turn (Black)'}
          </div>
        </div>

        {/* Scoreboard */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400">Player (White)</div>
            <div className="font-mono-tabular text-lg font-bold text-cyan-400">{match.playerPocketed}/9</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400">Vanguard AI (Black)</div>
            <div className="font-mono-tabular text-lg font-bold text-rose-400">{match.aiPocketed}/9</div>
          </div>
        </div>

        {/* Queen Status */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
          <span className="text-slate-400">Red Queen Status</span>
          <span className="font-medium text-rose-300">
            {match.queenState === 'on_board'
              ? 'On Board'
              : match.queenState === 'pending_player'
                ? 'Cover Now (Player)'
                : match.queenState === 'pending_ai'
                  ? 'Cover Now (AI)'
                  : match.queenState === 'covered_player'
                    ? 'Covered (Player)'
                    : 'Covered (AI)'}
          </span>
        </div>

        {/* Precision Striker Controls */}
        <div className="space-y-2.5 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <label htmlFor="striker-x" className="text-slate-300 font-medium">Striker Position</label>
              <span className="font-mono-tabular text-slate-400">{Math.round(match.strikerX)}</span>
            </div>
            <input
              id="striker-x"
              type="range"
              min={BASELINE_X_MIN}
              max={BASELINE_X_MAX}
              value={match.strikerX}
              disabled={!isPlayerAiming}
              onChange={(e) => handleSliderX(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <label htmlFor="aim-angle" className="text-slate-300 font-medium">Aim Angle</label>
              <span className="font-mono-tabular text-slate-400">{aimAngleDeg + 90}°</span>
            </div>
            <input
              id="aim-angle"
              type="range"
              min={-165}
              max={-15}
              value={aimAngleDeg}
              disabled={!isPlayerAiming}
              onChange={(e) => setAimAngleDeg(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <label htmlFor="strike-power" className="text-slate-300 font-medium">Strike Power</label>
              <span className="font-mono-tabular text-slate-400">{powerPct}%</span>
            </div>
            <input
              id="strike-power"
              type="range"
              min={20}
              max={100}
              value={powerPct}
              disabled={!isPlayerAiming}
              onChange={(e) => setPowerPct(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <button
            type="button"
            disabled={!isPlayerAiming}
            onClick={handleButtonStrike}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-45 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Crosshair className="w-4 h-4" />
            <span>Fire Striker</span>
          </button>
        </div>

        {/* Event Log */}
        <div className="text-xs text-slate-400 leading-snug">
          {match.lastEvent}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 pt-1 border-t border-slate-800/80">
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {options.tacticalAssist ? 'Laser Trajectory Sight Active · Drag board or use sliders' : 'Drag back on board or use sliders'}
          </span>
        </div>
      </aside>
    </div>
  );
};
