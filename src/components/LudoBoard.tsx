import React, { useEffect, useMemo, useState } from 'react';
import { Zap, Star } from 'lucide-react';
import {
  createInitialLudoState,
  getTokenGridCoord,
  getValidLudoMoves,
  LUDO_HOME_LANES,
  LUDO_TRACK_COORDS,
  moveLudoToken,
  rollLudoDice,
  SAFE_TRACK_INDICES,
  selectBestLudoToken,
  WARP_TRACK_INDICES,
  type LudoGameState,
  type LudoSeatId,
} from '../games/ludo/ludoEngine';
import type { FuturisticOptions, MatchResult } from '../types/game';
import { QuantumDie } from './QuantumDie';
import { sound } from '../utils/sound';

interface LudoBoardProps {
  options: FuturisticOptions;
  isPaused: boolean;
  onGameOver: (result: MatchResult) => void;
}

const SEAT_COLORS: Record<LudoSeatId, { main: string; light: string; border: string; label: string }> = {
  cyan: { main: '#22d3ee', light: 'rgba(34,211,238,0.2)', border: '#06b6d4', label: 'Cyan' },
  coral: { main: '#f43f5e', light: 'rgba(244,63,94,0.2)', border: '#e11d48', label: 'Coral' },
  green: { main: '#10b981', light: 'rgba(16,185,129,0.2)', border: '#059669', label: 'Green' },
  amber: { main: '#f59e0b', light: 'rgba(245,158,11,0.2)', border: '#d97706', label: 'Amber' },
};

export const LudoBoard: React.FC<LudoBoardProps> = ({ options, isPaused, onGameOver }) => {
  const [game, setGame] = useState<LudoGameState>(() =>
    createInitialLudoState(options.ludoOpponents, options.tacticalAssist)
  );
  const [rolling, setRolling] = useState(false);

  const activePlayer = game.players[game.activeSeatIndex];
  const validTokenIds = useMemo(() => {
    if (activePlayer.isAI || game.phase !== 'select') return new Set<number>();
    return new Set(getValidLudoMoves(game));
  }, [game, activePlayer.isAI]);

  // Game Over handler
  useEffect(() => {
    if (game.phase !== 'gameover' || !game.winner) return;
    const t = setTimeout(() => {
      const isWin = game.winner === 'cyan';
      if (isWin) sound.playVictory();
      else sound.playDefeat();
      const playerDocked = game.players[0].tokens.filter((tk) => tk.progress === 56).length;
      onGameOver({
        gameId: 'ludo',
        outcome: isWin ? 'victory' : 'defeat',
        headline: isWin ? 'All Tokens Docked — Victory' : `${SEAT_COLORS[game.winner!].label} AI Wins`,
        subline: isWin
          ? 'You secured all four Quantum Cores inside the Nexus.'
          : 'An AI opponent completed the circuit first.',
        metrics: [
          { label: 'Your Docked', value: `${playerDocked}/4` },
          { label: 'Total Turns', value: `${game.turnCount}` },
          { label: 'Warp Mode', value: game.overdrive ? 'ON' : 'OFF' },
        ],
      });
    }, 500);
    return () => clearTimeout(t);
  }, [game.phase, game.winner, game.players, game.turnCount, game.overdrive, onGameOver]);

  // Automated AI Turn Loop
  useEffect(() => {
    if (isPaused || game.phase === 'gameover' || !activePlayer.isAI) return;

    if (game.phase === 'roll') {
      const t = setTimeout(() => {
        sound.playDice();
        setGame((prev) => rollLudoDice(prev));
      }, 520);
      return () => clearTimeout(t);
    }

    if (game.phase === 'select') {
      const t = setTimeout(() => {
        const bestToken = selectBestLudoToken(game, options.difficulty);
        if (bestToken !== null) {
          sound.playMove();
          setGame((prev) => moveLudoToken(prev, bestToken));
        }
      }, 550);
      return () => clearTimeout(t);
    }
  }, [game, activePlayer.isAI, isPaused, options.difficulty]);

  const handlePlayerRoll = () => {
    if (isPaused || activePlayer.isAI || game.phase !== 'roll' || rolling) return;
    sound.playDice();
    setRolling(true);
    setTimeout(() => {
      setRolling(false);
      setGame((prev) => rollLudoDice(prev));
    }, 220);
  };

  // Spacebar to roll on player turn
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isPaused && !activePlayer.isAI && game.phase === 'roll') {
        e.preventDefault();
        handlePlayerRoll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleTokenClick = (tokenId: number) => {
    if (isPaused || activePlayer.isAI || game.phase !== 'select') return;
    if (!validTokenIds.has(tokenId)) return;
    sound.playMove();
    setGame((prev) => moveLudoToken(prev, tokenId));
  };

  // Helper to offset overlapping tokens on the same cell
  const tokenPositions = useMemo(() => {
    const groups = new Map<string, { seat: LudoSeatId; tokenId: number; r: number; c: number; isValid: boolean }[]>();
    for (const p of game.players) {
      for (const tk of p.tokens) {
        const [r, c] = getTokenGridCoord(p, tk);
        const key = `${r.toFixed(1)},${c.toFixed(1)}`;
        const isValid = p.seat === 'cyan' && validTokenIds.has(tk.id);
        const arr = groups.get(key) ?? [];
        arr.push({ seat: p.seat, tokenId: tk.id, r, c, isValid });
        groups.set(key, arr);
      }
    }

    const result: { seat: LudoSeatId; tokenId: number; xPct: number; yPct: number; isValid: boolean; scale: number }[] = [];
    groups.forEach((items) => {
      items.forEach((item, idx) => {
        const angle = items.length > 1 ? (idx * Math.PI * 2) / items.length : 0;
        const offset = items.length > 1 ? 0.22 : 0;
        const cx = item.c + 0.5 + Math.cos(angle) * offset;
        const cy = item.r + 0.5 + Math.sin(angle) * offset;
        result.push({
          seat: item.seat,
          tokenId: item.tokenId,
          xPct: (cx / 15) * 100,
          yPct: (cy / 15) * 100,
          isValid: item.isValid,
          scale: items.length > 1 ? 0.82 : 1,
        });
      });
    });
    return result;
  }, [game.players, validTokenIds]);

  const cellSize = 40; // 15 * 40 = 600 SVG viewBox

  return (
    <div className="w-full h-full flex flex-col lg:flex-row items-center justify-center gap-5 px-3 py-2">
      {/* 15x15 Ludo Arena Board */}
      <div className="relative p-2.5 sm:p-3.5 rounded-2xl bg-[#111722] border border-slate-700/80 shadow-[0_24px_56px_rgba(0,0,0,0.65)]">
        <div
          data-testid="ludo-board"
          className="relative w-[min(86vw,540px)] h-[min(86vw,540px)] sm:w-[min(74vh,560px)] sm:h-[min(74vh,560px)] rounded-xl overflow-hidden bg-[#0c121d] border border-slate-700"
        >
          <svg viewBox="0 0 600 600" className="w-full h-full block" aria-hidden="true">
            {/* Base Track Cells */}
            {LUDO_TRACK_COORDS.map(([r, c], idx) => {
              const isSafe = SAFE_TRACK_INDICES.has(idx);
              const isWarp = game.overdrive && WARP_TRACK_INDICES.has(idx);
              let fill = '#151e2e';
              if (idx === 0) fill = 'rgba(244,63,94,0.32)';
              else if (idx === 13) fill = 'rgba(16,185,129,0.32)';
              else if (idx === 26) fill = 'rgba(245,158,11,0.32)';
              else if (idx === 39) fill = 'rgba(34,211,238,0.32)';
              else if (isSafe) fill = '#1e293b';

              return (
                <g key={idx}>
                  <rect
                    x={c * cellSize}
                    y={r * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill={fill}
                    stroke="#243147"
                    strokeWidth="1"
                  />
                  {isSafe && (
                    <path
                      d={`M ${c * cellSize + 20} ${r * cellSize + 10} L ${c * cellSize + 23} ${r * cellSize + 17} L ${c * cellSize + 30} ${r * cellSize + 20} L ${c * cellSize + 23} ${r * cellSize + 23} L ${c * cellSize + 20} ${r * cellSize + 30} L ${c * cellSize + 17} ${r * cellSize + 23} L ${c * cellSize + 10} ${r * cellSize + 20} L ${c * cellSize + 17} ${r * cellSize + 17} Z`}
                      fill="none"
                      stroke="#94a3b8"
                      strokeOpacity="0.7"
                      strokeWidth="1.4"
                    />
                  )}
                  {isWarp && (
                    <circle
                      cx={c * cellSize + 20}
                      cy={r * cellSize + 20}
                      r="10"
                      fill="rgba(34,211,238,0.16)"
                      stroke="#22d3ee"
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                    />
                  )}
                </g>
              );
            })}

            {/* Home Lanes */}
            {(Object.keys(LUDO_HOME_LANES) as LudoSeatId[]).map((seat) =>
              LUDO_HOME_LANES[seat].map(([r, c], i) => (
                <rect
                  key={`${seat}-${i}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={SEAT_COLORS[seat].light}
                  stroke={SEAT_COLORS[seat].border}
                  strokeOpacity="0.55"
                  strokeWidth="1"
                />
              ))
            )}

            {/* 4 Corner Yards */}
            {[
              { seat: 'coral' as LudoSeatId, x: 0, y: 0 },
              { seat: 'green' as LudoSeatId, x: 360, y: 0 },
              { seat: 'amber' as LudoSeatId, x: 360, y: 360 },
              { seat: 'cyan' as LudoSeatId, x: 0, y: 360 },
            ].map(({ seat, x, y }) => {
              const active = activePlayer.seat === seat;
              return (
                <g key={seat}>
                  <rect
                    x={x + 6}
                    y={y + 6}
                    width="228"
                    height="228"
                    rx="18"
                    fill="#111826"
                    stroke={SEAT_COLORS[seat].main}
                    strokeWidth={active ? '3' : '1.5'}
                    strokeOpacity={active ? '0.95' : '0.45'}
                  />
                  <rect
                    x={x + 30}
                    y={y + 30}
                    width="180"
                    height="180"
                    rx="14"
                    fill={SEAT_COLORS[seat].light}
                    stroke={SEAT_COLORS[seat].border}
                    strokeOpacity="0.35"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {/* Center Nexus Goal Core (rows 6..8, cols 6..8 -> x=240..360, y=240..360) */}
            <polygon points="240,240 300,300 240,360" fill="rgba(244,63,94,0.35)" stroke="#334155" strokeWidth="1" />
            <polygon points="240,240 360,240 300,300" fill="rgba(16,185,129,0.35)" stroke="#334155" strokeWidth="1" />
            <polygon points="360,240 360,360 300,300" fill="rgba(245,158,11,0.35)" stroke="#334155" strokeWidth="1" />
            <polygon points="240,360 360,360 300,300" fill="rgba(34,211,238,0.4)" stroke="#334155" strokeWidth="1" />
            <circle cx="300" cy="300" r="14" fill="#0f172a" stroke="#e2e8f0" strokeWidth="2" />
          </svg>

          {/* Interactive Sculpted Tokens Layer */}
          {tokenPositions.map((tp) => {
            const color = SEAT_COLORS[tp.seat];
            const clickable = tp.isValid;
            return (
              <button
                key={`${tp.seat}-${tp.tokenId}`}
                type="button"
                disabled={!clickable}
                aria-label={`${color.label} Token ${tp.tokenId + 1}${clickable ? ' — click to move' : ''}`}
                onClick={() => handleTokenClick(tp.tokenId)}
                style={{
                  left: `${tp.xPct}%`,
                  top: `${tp.yPct}%`,
                  transform: `translate(-50%, -50%) scale(${clickable ? 1.15 : tp.scale})`,
                  borderColor: clickable ? '#ffffff' : color.main,
                  backgroundColor: color.main,
                }}
                className={`absolute w-[5.4%] h-[5.4%] rounded-full border-2 shadow-[0_3px_8px_rgba(0,0,0,0.75)] transition-all duration-200 flex items-center justify-center ${
                  clickable
                    ? 'z-20 cursor-pointer ring-4 ring-white/45 animate-bounce'
                    : 'z-10 cursor-default'
                }`}
              >
                <span className="w-[46%] h-[46%] rounded-full bg-slate-950/75 border border-white/40 pointer-events-none" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Control & Telemetry Dock */}
      <aside className="w-full lg:w-72 flex flex-col gap-3.5 bg-[#101622] border border-slate-800 rounded-2xl p-4">
        <div className="space-y-1 border-b border-slate-800 pb-3">
          <div className="text-xs text-slate-400">Active Turn · Turn {game.turnCount}</div>
          <div className="font-display text-base font-bold text-white flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full inline-block shrink-0"
              style={{ backgroundColor: SEAT_COLORS[activePlayer.seat].main }}
            />
            <span>{activePlayer.name}</span>
          </div>
        </div>

        {/* Quantum Die Control */}
        <QuantumDie
          value={game.diceValue}
          rolling={rolling}
          disabled={isPaused || activePlayer.isAI || game.phase !== 'roll'}
          onRoll={handlePlayerRoll}
          label={activePlayer.isAI ? 'AI Turn...' : game.phase === 'select' ? 'Select Token' : 'Roll Quantum Die'}
        />

        {/* Last Event Feed */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed min-h-[54px]">
          {game.lastEvent}
        </div>

        {/* Seat Dock Progress */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-400">Core Docking Progress</div>
          {game.players.map((p) => {
            const docked = p.tokens.filter((t) => t.progress === 56).length;
            const active = p.seat === activePlayer.seat;
            return (
              <div
                key={p.seat}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                  active ? 'bg-slate-800/90 border-slate-600 text-white' : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEAT_COLORS[p.seat].main }} />
                  <span className="font-medium truncate max-w-[130px]">{p.name}</span>
                </div>
                <span className="font-mono-tabular font-bold">{docked}/4</span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-slate-400" /> Star = Safe Zone
          </span>
          {game.overdrive && (
            <span className="flex items-center gap-1 text-cyan-400">
              <Zap className="w-3 h-3" /> Dashed = Warp +3
            </span>
          )}
        </div>
      </aside>
    </div>
  );
};
