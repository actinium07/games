import React, { useEffect, useState } from 'react';
import { Shield, Zap } from 'lucide-react';
import {
  applySnakesRoll,
  createInitialSnakesState,
  getSquareGridCoord,
  HYPER_BOOSTS,
  LADDERS,
  SHIELD_PADS,
  SNAKES,
  type SnakesGameState,
} from '../games/snakes/snakesEngine';
import type { FuturisticOptions, MatchResult } from '../types/game';
import { QuantumDie } from './QuantumDie';
import { sound } from '../utils/sound';

interface SnakesBoardProps {
  options: FuturisticOptions;
  isPaused: boolean;
  onGameOver: (result: MatchResult) => void;
}

function squareCenter(sq: number): { x: number; y: number } {
  const { row, col } = getSquareGridCoord(sq);
  return { x: col * 100 + 50, y: row * 100 + 50 };
}

export const SnakesBoard: React.FC<SnakesBoardProps> = ({ options, isPaused, onGameOver }) => {
  const [game, setGame] = useState<SnakesGameState>(() =>
    createInitialSnakesState(options.tacticalAssist)
  );
  const [rolling, setRolling] = useState(false);

  const activePlayer = game.players[game.activeIndex];
  const isAITurn = activePlayer.id === 'ai';

  // Game Over callback
  useEffect(() => {
    if (!game.winner) return;
    const t = setTimeout(() => {
      const isWin = game.winner === 'player';
      if (isWin) sound.playVictory();
      else sound.playDefeat();
      const player = game.players[0];
      onGameOver({
        gameId: 'snakes',
        outcome: isWin ? 'victory' : 'defeat',
        headline: isWin ? 'Sector 100 Reached — You Win' : 'Vanguard AI Reached 100',
        subline: isWin
          ? 'You navigated the cyber serpents and ascended to Sector 100 first.'
          : 'Vanguard AI beat you to the summit.',
        metrics: [
          { label: 'Total Turns', value: `${game.turnCount}` },
          { label: 'Ladders Used', value: `${player.laddersClimbed}` },
          { label: 'Serpents Hit', value: `${player.snakesHit}` },
        ],
      });
    }, 550);
    return () => clearTimeout(t);
  }, [game.winner, game.turnCount, game.players, onGameOver]);

  // Sound feedback on resolution
  const playResolutionFx = (nextState: SnakesGameState) => {
    const res = nextState.lastResolution;
    if (!res) return;
    if (res.eventType === 'ladder' || res.eventType === 'boost' || res.eventType === 'shielded') {
      sound.playBoost();
    } else if (res.eventType === 'snake') {
      sound.playHazard();
    } else {
      sound.playMove();
    }
  };

  // Automated AI Turn
  useEffect(() => {
    if (isPaused || game.winner || !isAITurn) return;
    const t = setTimeout(() => {
      sound.playDice();
      setGame((prev) => {
        const next = applySnakesRoll(prev);
        playResolutionFx(next);
        return next;
      });
    }, 680);
    return () => clearTimeout(t);
  }, [game, isPaused, isAITurn]);

  const handlePlayerRoll = () => {
    if (isPaused || game.winner || isAITurn || rolling) return;
    sound.playDice();
    setRolling(true);
    setTimeout(() => {
      setRolling(false);
      setGame((prev) => {
        const next = applySnakesRoll(prev);
        playResolutionFx(next);
        return next;
      });
    }, 220);
  };

  // Spacebar shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isPaused && !game.winner && !isAITurn) {
        e.preventDefault();
        handlePlayerRoll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Build 100 visual cells in top-left to bottom-right DOM grid order
  const gridCells: { num: number; row: number; col: number }[] = [];
  for (let r = 0; r < 10; r++) {
    const rowFromBottom = 9 - r;
    for (let c = 0; c < 10; c++) {
      const colInRow = rowFromBottom % 2 === 0 ? c : 9 - c;
      const num = rowFromBottom * 10 + colInRow + 1;
      gridCells.push({ num, row: r, col: c });
    }
  }

  const p0Coord = getSquareGridCoord(game.players[0].position);
  const p1Coord = getSquareGridCoord(game.players[1].position);
  const sameSquare = game.players[0].position === game.players[1].position;

  return (
    <div className="w-full h-full flex flex-col lg:flex-row items-center justify-center gap-5 px-3 py-2">
      {/* 10x10 Board */}
      <div className="relative p-2.5 sm:p-3.5 rounded-2xl bg-[#111722] border border-slate-700/80 shadow-[0_24px_56px_rgba(0,0,0,0.65)]">
        <div
          data-testid="snakes-board"
          className="relative w-[min(86vw,540px)] h-[min(86vw,540px)] sm:w-[min(74vh,560px)] sm:h-[min(74vh,560px)] rounded-xl overflow-hidden bg-[#0c121e] border border-slate-700"
        >
          {/* 100 Tiles */}
          <div className="grid grid-cols-10 grid-rows-10 w-full h-full">
            {gridCells.map(({ num, row, col }) => {
              const alt = (row + col) % 2 === 0;
              const isBoost = game.cyberMode && HYPER_BOOSTS.has(num);
              const isShield = game.cyberMode && SHIELD_PADS.has(num);
              const isGoal = num === 100;

              return (
                <div
                  key={num}
                  className={`relative border border-slate-800/70 p-1 flex flex-col justify-between ${
                    isGoal
                      ? 'bg-amber-500/20'
                      : isBoost
                        ? 'bg-cyan-500/15'
                        : isShield
                          ? 'bg-emerald-500/15'
                          : alt
                            ? 'bg-[#121a2a]'
                            : 'bg-[#162033]'
                  }`}
                >
                  <span
                    className={`font-mono-tabular text-[10px] sm:text-xs font-semibold leading-none ${
                      isGoal ? 'text-amber-300' : 'text-slate-400'
                    }`}
                  >
                    {num}
                  </span>
                  {isBoost && (
                    <span className="self-end text-[9px] font-bold text-cyan-300 leading-none">+4</span>
                  )}
                  {isShield && (
                    <Shield className="self-end w-3 h-3 text-emerald-400" aria-hidden="true" />
                  )}
                  {isGoal && (
                    <span className="self-end text-[9px] font-bold text-amber-300 leading-none">GOAL</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Vector Plasma Ladders & Cyber Serpents Overlay */}
          <svg
            viewBox="0 0 1000 1000"
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          >
            {/* Plasma Ladders */}
            {Object.entries(LADDERS).map(([fromStr, toNum]) => {
              const a = squareCenter(Number(fromStr));
              const b = squareCenter(toNum);
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const len = Math.hypot(dx, dy);
              const nx = (-dy / len) * 14;
              const ny = (dx / len) * 14;
              const steps = Math.max(4, Math.floor(len / 42));

              return (
                <g key={`ladder-${fromStr}`} opacity="0.88">
                  <line
                    x1={a.x - nx}
                    y1={a.y - ny}
                    x2={b.x - nx}
                    y2={b.y - ny}
                    stroke="#22d3ee"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  <line
                    x1={a.x + nx}
                    y1={a.y + ny}
                    x2={b.x + nx}
                    y2={b.y + ny}
                    stroke="#22d3ee"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  {Array.from({ length: steps - 1 }).map((_, idx) => {
                    const t = (idx + 1) / steps;
                    const rx = a.x + dx * t;
                    const ry = a.y + dy * t;
                    return (
                      <line
                        key={idx}
                        x1={rx - nx}
                        y1={ry - ny}
                        x2={rx + nx}
                        y2={ry + ny}
                        stroke="#cffafe"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* Cyber Serpents */}
            {Object.entries(SNAKES).map(([fromStr, toNum]) => {
              const head = squareCenter(Number(fromStr));
              const tail = squareCenter(toNum);
              const mx = (head.x + tail.x) / 2;
              const my = (head.y + tail.y) / 2;
              const dx = tail.x - head.x;
              const dy = tail.y - head.y;
              const len = Math.max(1, Math.hypot(dx, dy));
              const perpX = (-dy / len) * 62;
              const perpY = (dx / len) * 62;

              const c1x = head.x + dx * 0.28 + perpX;
              const c1y = head.y + dy * 0.28 + perpY;
              const c2x = head.x + dx * 0.72 - perpX;
              const c2y = head.y + dy * 0.72 - perpY;

              return (
                <g key={`snake-${fromStr}`} opacity="0.9">
                  <path
                    d={`M ${head.x} ${head.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tail.x} ${tail.y}`}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="11"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M ${head.x} ${head.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tail.x} ${tail.y}`}
                    fill="none"
                    stroke="#fda4af"
                    strokeWidth="3"
                    strokeDasharray="10 12"
                    strokeLinecap="round"
                  />
                  {/* Serpent Head */}
                  <circle cx={head.x} cy={head.y} r="15" fill="#e11d48" stroke="#ffe4e6" strokeWidth="2.5" />
                  <circle cx={head.x - 5} cy={head.y - 3} r="2.6" fill="#fff" />
                  <circle cx={head.x + 5} cy={head.y - 3} r="2.6" fill="#fff" />
                  <circle cx={mx} cy={my} r="0" fill="none" />
                </g>
              );
            })}
          </svg>

          {/* Animated Player & AI Tokens */}
          <div
            style={{
              left: `${(p0Coord.col + 0.5) * 10 + (sameSquare ? -1.6 : 0)}%`,
              top: `${(p0Coord.row + 0.5) * 10}%`,
              transition: 'left 340ms cubic-bezier(0.16, 1, 0.3, 1), top 340ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            aria-label={`Player token at square ${game.players[0].position}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-[5.8%] h-[5.8%] rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_14px_rgba(34,211,238,0.85)] z-20 flex items-center justify-center"
          >
            <span className="text-[9px] font-bold text-slate-950">P1</span>
          </div>

          <div
            style={{
              left: `${(p1Coord.col + 0.5) * 10 + (sameSquare ? 1.6 : 0)}%`,
              top: `${(p1Coord.row + 0.5) * 10}%`,
              transition: 'left 340ms cubic-bezier(0.16, 1, 0.3, 1), top 340ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            aria-label={`AI token at square ${game.players[1].position}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-[5.8%] h-[5.8%] rounded-full bg-rose-500 border-2 border-rose-100 shadow-[0_0_14px_rgba(244,63,94,0.8)] z-20 flex items-center justify-center"
          >
            <span className="text-[9px] font-bold text-white">AI</span>
          </div>
        </div>
      </div>

      {/* Right Control Dock */}
      <aside className="w-full lg:w-72 flex flex-col gap-3.5 bg-[#101622] border border-slate-800 rounded-2xl p-4">
        <div className="space-y-1 border-b border-slate-800 pb-3">
          <div className="text-xs text-slate-400">Sector Race · Turn {game.turnCount}</div>
          <div className="font-display text-base font-bold text-white">
            {isAITurn ? 'Vanguard AI Rolling...' : 'Your Turn to Roll'}
          </div>
        </div>

        <QuantumDie
          value={game.lastRoll}
          rolling={rolling}
          disabled={isPaused || isAITurn || Boolean(game.winner)}
          onRoll={handlePlayerRoll}
          label={isAITurn ? 'AI Turn...' : 'Roll Quantum Die'}
        />

        {/* Event Feed */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed min-h-[56px]">
          {game.lastEvent}
        </div>

        {/* Sector Positions */}
        <div className="space-y-2">
          {game.players.map((p, idx) => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs ${
                game.activeIndex === idx ? 'bg-slate-800/90 border-slate-600 text-white' : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${p.id === 'player' ? 'bg-cyan-400' : 'bg-rose-500'}`} />
                <span className="font-medium">{p.name}</span>
              </div>
              <div className="flex items-center gap-2.5">
                {game.cyberMode && p.shields > 0 && (
                  <span className="flex items-center gap-0.5 text-emerald-400 font-mono-tabular">
                    <Shield className="w-3 h-3" /> {p.shields}
                  </span>
                )}
                <span className="font-mono-tabular font-bold">Sector {p.position}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
          <span className="text-cyan-400">Cyan = Ladders</span>
          <span className="text-rose-400">Rose = Serpents</span>
          {game.cyberMode && (
            <span className="flex items-center gap-0.5 text-emerald-400">
              <Zap className="w-3 h-3" /> Boosts On
            </span>
          )}
        </div>
      </aside>
    </div>
  );
};
