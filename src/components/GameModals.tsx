import React from 'react';
import { Play, RotateCcw, Home, Trophy, ShieldAlert } from 'lucide-react';
import type { MatchResult } from '../types/game';

interface PauseModalProps {
  gameTitle: string;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  gameTitle,
  onResume,
  onRestart,
  onTitle,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#111826] border border-slate-700 p-7 shadow-2xl space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-medium text-cyan-400">{gameTitle}</p>
          <h2 id="pause-title" className="font-display text-2xl font-bold text-white">
            Match Paused
          </h2>
          <p className="text-sm text-slate-400">
            Simulation is frozen. Resume play or switch to another board.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Match</span>
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm border border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Board</span>
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-sm border border-slate-800 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Title</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  result: MatchResult;
  onPlayAgain: () => void;
  onTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  result,
  onPlayAgain,
  onTitle,
}) => {
  const isVictory = result.outcome === 'victory';
  const isDraw = result.outcome === 'draw';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#111826] border border-slate-700 p-7 shadow-2xl space-y-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isVictory
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-400/40'
                : isDraw
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-400/40'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-400/40'
            }`}
          >
            {isVictory ? <Trophy className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">
              {isVictory ? 'Match Complete · Victory' : isDraw ? 'Match Complete · Draw' : 'Match Complete · Defeat'}
            </p>
            <h2 id="gameover-title" className="font-display text-2xl font-bold text-white">
              {result.headline}
            </h2>
            <p className="text-sm text-slate-400">{result.subline}</p>
          </div>
        </div>

        {/* 2-3 Tabular Metrics */}
        <div className="grid grid-cols-3 gap-2.5">
          {result.metrics.slice(0, 3).map((m) => (
            <div key={m.label} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-[11px] font-medium text-slate-400 truncate">{m.label}</div>
              <div className="mt-1 font-mono-tabular text-lg font-bold text-white truncate">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-colors cursor-pointer"
          >
            Title Screen
          </button>
        </div>
      </div>
    </div>
  );
};
