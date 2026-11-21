import React, { useState } from 'react';
import { Volume2, VolumeX, Play, Cpu, Sparkles, Layers } from 'lucide-react';
import type { AIDifficulty, BoardTheme, FuturisticOptions, GameId } from '../types/game';

interface TitleScreenProps {
  selectedGame: GameId;
  onSelectGame: (game: GameId) => void;
  options: FuturisticOptions;
  onUpdateOptions: (next: Partial<FuturisticOptions>) => void;
  onStart: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

const GAMES: {
  id: GameId;
  num: string;
  title: string;
  subtitle: string;
  assistLabel: string;
}[] = [
  {
    id: 'ludo',
    num: '01',
    title: 'Ludo',
    subtitle: '4-quadrant tactical race with Quantum Warp pads',
    assistLabel: 'Quantum Warp',
  },
  {
    id: 'chess',
    num: '02',
    title: 'Chess',
    subtitle: 'Full ruleset vs Alpha-Beta Minimax engine',
    assistLabel: 'Threat Overlay',
  },
  {
    id: 'carrom',
    num: '03',
    title: 'Carrom',
    subtitle: '60fps elastic disc physics & Queen cover rules',
    assistLabel: 'Laser Sight',
  },
  {
    id: 'snakes',
    num: '04',
    title: 'Snake & Ladder',
    subtitle: '100-sector climb with Plasma Ladders & Serpents',
    assistLabel: 'Cyber Boosts',
  },
];

function ShowcaseGraphic({ gameId, theme }: { gameId: GameId; theme: BoardTheme }) {
  const accent = theme === 'brass' ? '#f59e0b' : '#22d3ee';
  const secondary = theme === 'brass' ? '#fbbf24' : '#38bdf8';
  const surface = theme === 'holographic' ? '#071426' : theme === 'brass' ? '#15120d' : '#0f1623';

  return (
    <svg
      viewBox="0 0 420 420"
      className="w-full h-full max-w-[400px] max-h-[400px] drop-shadow-[0_24px_48px_rgba(0,0,0,0.65)]"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="showcaseGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
          <stop offset="70%" stopColor={accent} stopOpacity="0.04" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="frameMetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a364b" />
          <stop offset="100%" stopColor="#111824" />
        </linearGradient>
      </defs>

      <circle cx="210" cy="210" r="196" fill="url(#showcaseGlow)" />
      <circle cx="210" cy="210" r="184" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="1" strokeDasharray="6 8" />

      <rect x="44" y="44" width="332" height="332" rx="28" fill="url(#frameMetal)" stroke="#334155" strokeWidth="1.5" />
      <rect x="58" y="58" width="304" height="304" rx="20" fill={surface} stroke={accent} strokeOpacity="0.25" strokeWidth="1" />

      {gameId === 'ludo' && (
        <g>
          {/* 4 Quadrants */}
          <rect x="74" y="74" width="110" height="110" rx="14" fill="#f43f5e" fillOpacity="0.16" stroke="#f43f5e" strokeWidth="1.5" />
          <rect x="236" y="74" width="110" height="110" rx="14" fill="#10b981" fillOpacity="0.16" stroke="#10b981" strokeWidth="1.5" />
          <rect x="74" y="236" width="110" height="110" rx="14" fill={accent} fillOpacity="0.18" stroke={accent} strokeWidth="1.5" />
          <rect x="236" y="236" width="110" height="110" rx="14" fill="#f59e0b" fillOpacity="0.16" stroke="#f59e0b" strokeWidth="1.5" />
          {/* Home lanes */}
          <rect x="196" y="82" width="28" height="96" rx="6" fill="#10b981" fillOpacity="0.24" />
          <rect x="196" y="242" width="28" height="96" rx="6" fill={accent} fillOpacity="0.28" />
          <rect x="82" y="196" width="96" height="28" rx="6" fill="#f43f5e" fillOpacity="0.24" />
          <rect x="242" y="196" width="96" height="28" rx="6" fill="#f59e0b" fillOpacity="0.24" />
          {/* Nexus core */}
          <polygon points="210,180 240,210 210,240 180,210" fill={accent} fillOpacity="0.28" stroke={accent} strokeWidth="2" />
          {/* Sample tokens */}
          <circle cx="110" cy="272" r="13" fill={accent} stroke="#fff" strokeWidth="2" />
          <circle cx="148" cy="272" r="13" fill={accent} stroke="#fff" strokeWidth="2" />
          <circle cx="272" cy="110" r="13" fill="#10b981" stroke="#fff" strokeWidth="2" />
          <circle cx="310" cy="148" r="13" fill="#10b981" stroke="#fff" strokeWidth="2" />
          <circle cx="210" cy="210" r="8" fill="#ffffff" />
        </g>
      )}

      {gameId === 'chess' && (
        <g>
          {Array.from({ length: 6 }).map((_, r) =>
            Array.from({ length: 6 }).map((__, c) => {
              const dark = (r + c) % 2 === 1;
              return (
                <rect
                  key={`${r}-${c}`}
                  x={78 + c * 44}
                  y={78 + r * 44}
                  width="44"
                  height="44"
                  fill={dark ? '#1a2436' : '#26344b'}
                  stroke="#0f172a"
                  strokeWidth="0.5"
                />
              );
            })
          )}
          {/* Highlighted tactical line */}
          <line x1="122" y1="276" x2="298" y2="100" stroke={accent} strokeWidth="2.5" strokeDasharray="6 5" strokeOpacity="0.8" />
          <circle cx="298" cy="100" r="18" fill="none" stroke="#f43f5e" strokeWidth="2.5" />
          {/* Stylized Crown / King & Knight silhouettes */}
          <g transform="translate(102, 256)">
            <circle cx="20" cy="20" r="18" fill="#0f172a" stroke={accent} strokeWidth="2" />
            <path d="M12 28 L28 28 L26 16 L20 11 L14 16 Z M20 7 L20 12 M17 9 L23 9" stroke="#f8fafc" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
          <g transform="translate(278, 80)">
            <circle cx="20" cy="20" r="18" fill="#1e293b" stroke="#f43f5e" strokeWidth="2" />
            <path d="M11 27 L29 27 L27 14 L23 18 L20 11 L17 18 L13 14 Z" fill="#f43f5e" fillOpacity="0.85" />
          </g>
        </g>
      )}

      {gameId === 'carrom' && (
        <g>
          {/* 4 Pockets */}
          {[
            [82, 82],
            [338, 82],
            [82, 338],
            [338, 338],
          ].map(([px, py], i) => (
            <g key={i}>
              <circle cx={px} cy={py} r="18" fill="#04070d" stroke={accent} strokeOpacity="0.4" strokeWidth="1.5" />
            </g>
          ))}
          {/* Center target rings */}
          <circle cx="210" cy="210" r="56" fill="none" stroke={accent} strokeOpacity="0.32" strokeWidth="1.5" />
          <circle cx="210" cy="210" r="22" fill="none" stroke="#f43f5e" strokeOpacity="0.65" strokeWidth="1.5" />
          {/* Baseline */}
          <line x1="120" y1="306" x2="300" y2="306" stroke={secondary} strokeOpacity="0.45" strokeWidth="2" />
          <circle cx="120" cy="306" r="7" fill="#f43f5e" fillOpacity="0.5" />
          <circle cx="300" cy="306" r="7" fill="#f43f5e" fillOpacity="0.5" />
          {/* Queen & cluster */}
          <circle cx="210" cy="210" r="11" fill="#f43f5e" stroke="#fecdd3" strokeWidth="1.5" />
          <circle cx="190" cy="196" r="11" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="230" cy="196" r="11" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="210" cy="182" r="11" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Trajectory ray & Striker */}
          <line x1="210" y1="306" x2="210" y2="225" stroke={accent} strokeWidth="2" strokeDasharray="5 4" />
          <circle cx="210" cy="306" r="15" fill={accent} fillOpacity="0.25" stroke={accent} strokeWidth="2.5" />
        </g>
      )}

      {gameId === 'snakes' && (
        <g>
          {/* 5x5 representative cells */}
          {Array.from({ length: 5 }).map((_, r) =>
            Array.from({ length: 5 }).map((__, c) => (
              <rect
                key={`${r}-${c}`}
                x={76 + c * 54}
                y={76 + r * 54}
                width="50"
                height="50"
                rx="6"
                fill={(r + c) % 2 === 0 ? '#141e2e' : '#192538'}
                stroke="#25344d"
                strokeWidth="1"
              />
            ))
          )}
          {/* Plasma ladder */}
          <line x1="112" y1="316" x2="196" y2="112" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          <line x1="132" y1="322" x2="216" y2="118" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          {[0.2, 0.4, 0.6, 0.8].map((t, i) => (
            <line
              key={i}
              x1={112 + (196 - 112) * t}
              y1={316 + (112 - 316) * t}
              x2={132 + (216 - 132) * t}
              y2={322 + (118 - 322) * t}
              stroke="#e0f2fe"
              strokeWidth="2.5"
            />
          ))}
          {/* Cyber Serpent */}
          <path
            d="M 296 108 C 336 148, 224 188, 276 236 C 322 276, 226 296, 242 328"
            fill="none"
            stroke="#f43f5e"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="296" cy="108" r="9" fill="#f43f5e" stroke="#ffe4e6" strokeWidth="2" />
          {/* Player marker */}
          <circle cx="101" cy="317" r="11" fill={accent} stroke="#fff" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedGame,
  onSelectGame,
  options,
  onUpdateOptions,
  onStart,
  muted,
  onToggleMute,
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setTilt({ x: -ny * 4, y: nx * 4 });
  };

  const activeMeta = GAMES.find((g) => g.id === selectedGame)!;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative h-full w-full overflow-y-auto arena-grid-bg flex flex-col justify-between px-6 py-5 md:px-12 md:py-8"
    >
      {/* Top quiet utility bar (Mute only — no website navbar!) */}
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 36 36" className="w-8 h-8" aria-hidden="true">
            <rect x="2" y="2" width="32" height="32" rx="8" fill="#131c2b" stroke="#22d3ee" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="3.5" fill="#22d3ee" />
            <circle cx="24" cy="12" r="3.5" fill="#f43f5e" />
            <circle cx="12" cy="24" r="3.5" fill="#10b981" />
            <circle cx="24" cy="24" r="3.5" fill="#f59e0b" />
          </svg>
          <span className="font-display text-lg font-semibold tracking-tight text-slate-100">
            Orbital Quartet
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:border-cyan-400/60 hover:text-white transition-colors text-xs font-medium cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          <span>{muted ? 'Audio Muted' : 'Audio On'}</span>
        </button>
      </div>

      {/* Main Split Focal Stage */}
      <main className="max-w-6xl w-full mx-auto my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left: Title Lockup + 4 Game Selector + Futuristic Options + Start CTA */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-cyan-400 tracking-wide">
              Offline Precision Tabletop · Single Player vs AI
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08] text-balance">
              Four Classic Boards, Reimagined for Solo Play
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
              Select a board below, configure tactical assists and surface finishes, and challenge the built-in AI offline.
            </p>
          </div>

          {/* 4-Game Selector Grid (Strictly the 4 requested games) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Select Game">
            {GAMES.map((game) => {
              const isSelected = selectedGame === game.id;
              return (
                <button
                  key={game.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSelectGame(game.id)}
                  className={`text-left px-4 py-3.5 rounded-xl border transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    isSelected
                      ? 'bg-slate-800/95 border-cyan-400 shadow-[0_0_0_1px_rgba(34,211,238,0.35)]'
                      : 'bg-slate-900/75 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-base font-semibold text-white">
                      {game.num}. {game.title}
                    </span>
                    <span className={`text-xs font-medium ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {isSelected ? 'Selected' : 'Select'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400 leading-snug">{game.subtitle}</p>
                </button>
              );
            })}
          </div>

          {/* Futuristic Options Bar */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* AI Difficulty */}
            <div className="space-y-1.5">
              <label htmlFor="diff-select" className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI Difficulty</span>
              </label>
              <select
                id="diff-select"
                value={options.difficulty}
                onChange={(e) => onUpdateOptions({ difficulty: e.target.value as AIDifficulty })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-medium text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                <option value="standard">Standard AI</option>
                <option value="tactical">Tactical AI</option>
                <option value="grandmaster">Grandmaster AI</option>
              </select>
            </div>

            {/* Surface Finish */}
            <div className="space-y-1.5">
              <label htmlFor="theme-select" className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Board Finish</span>
              </label>
              <select
                id="theme-select"
                value={options.theme}
                onChange={(e) => onUpdateOptions({ theme: e.target.value as BoardTheme })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-medium text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                <option value="obsidian">Obsidian Alloy</option>
                <option value="holographic">Holographic Grid</option>
                <option value="brass">Solar Brass</option>
              </select>
            </div>

            {/* Futuristic Mode Toggle */}
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Futuristic Option</span>
              </span>
              <button
                type="button"
                aria-pressed={options.tacticalAssist}
                onClick={() => onUpdateOptions({ tacticalAssist: !options.tacticalAssist })}
                className={`w-full px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  options.tacticalAssist
                    ? 'bg-cyan-500/15 border-cyan-400/70 text-cyan-200'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="whitespace-nowrap">{activeMeta.assistLabel}</span>
                <span className="font-mono-tabular font-bold">{options.tacticalAssist ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Ludo Opponents sub-option when Ludo is selected */}
          {selectedGame === 'ludo' && (
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="font-medium text-slate-400">Ludo Arena Format:</span>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => onUpdateOptions({ ludoOpponents: 1 })}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    options.ludoOpponents === 1 ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  1 vs 1 Duel
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateOptions({ ludoOpponents: 3 })}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    options.ludoOpponents === 3 ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  1 vs 3 Skirmish
                </button>
              </div>
            </div>
          )}

          {/* Primary Start CTA */}
          <div className="flex items-center gap-4 pt-1">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:scale-[0.98] text-slate-950 font-display font-bold text-base tracking-tight transition-all cursor-pointer shadow-[0_10px_30px_rgba(34,211,238,0.25)] focus-visible:outline-2 focus-visible:outline-white"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start {activeMeta.title}</span>
            </button>
            <span className="text-xs text-slate-400">
              Press Enter or Space to launch
            </span>
          </div>
        </section>

        {/* Right: Interactive Live Board Centerpiece */}
        <section className="lg:col-span-5 flex flex-col items-center justify-center">
          <div
            style={{
              transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="w-full flex items-center justify-center"
          >
            <ShowcaseGraphic gameId={selectedGame} theme={options.theme} />
          </div>
        </section>
      </main>

      {/* Single Flat Borderless Control Hint Line */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-slate-500 pt-2">
        1-4 Select Game · Enter Start Match · Esc Pause · M Mute Audio
      </footer>
    </div>
  );
};
