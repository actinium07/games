import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Pause, RotateCcw, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { TitleScreen } from './components/TitleScreen';
import { ChessBoard } from './components/ChessBoard';
import { LudoBoard } from './components/LudoBoard';
import { CarromBoard } from './components/CarromBoard';
import { SnakesBoard } from './components/SnakesBoard';
import { GameOverModal, PauseModal } from './components/GameModals';
import type { AppScreenState, FuturisticOptions, GameId, MatchResult } from './types/game';
import { sound } from './utils/sound';

const GAME_TITLES: Record<GameId, string> = {
  ludo: 'Ludo Arena',
  chess: 'Chess Tactics',
  carrom: 'Carrom Striker',
  snakes: 'Snake & Ladder',
};

function getInitialQueryConfig(): { autostart: boolean; game: GameId } {
  if (typeof window === 'undefined') return { autostart: false, game: 'chess' };
  const params = new URLSearchParams(window.location.search);
  const g = params.get('game');
  const validGames: GameId[] = ['ludo', 'chess', 'carrom', 'snakes'];
  const game = validGames.includes(g as GameId) ? (g as GameId) : 'ludo';
  const autostart = params.get('autostart') === '1';
  return { autostart, game };
}

export default function App() {
  const initial = getInitialQueryConfig();
  const [screen, setScreen] = useState<AppScreenState>(initial.autostart ? 'playing' : 'title');
  const [selectedGame, setSelectedGame] = useState<GameId>(initial.game);
  const [matchKey, setMatchKey] = useState(1);
  const [muted, setMuted] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [options, setOptions] = useState<FuturisticOptions>({
    difficulty: 'tactical',
    theme: 'obsidian',
    tacticalAssist: true,
    ludoOpponents: 1,
  });

  // Mirror game state machine to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = screen;
  }, [screen]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      sound.setMuted(next);
      return next;
    });
  }, []);

  const handleStartGame = useCallback(() => {
    sound.playClick();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setMatchResult(null);
    setMatchKey((k) => k + 1);
    setScreen('playing');
  }, []);

  const handleRestartMatch = useCallback(() => {
    sound.playClick();
    setMatchResult(null);
    setMatchKey((k) => k + 1);
    setScreen('playing');
  }, []);

  const handleReturnTitle = useCallback(() => {
    sound.playClick();
    setMatchResult(null);
    setScreen('title');
  }, []);

  const handleUpdateOptions = useCallback((patch: Partial<FuturisticOptions>) => {
    sound.playClick();
    setOptions((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleGameOver = useCallback((result: MatchResult) => {
    setMatchResult(result);
    setScreen('gameover');
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';

      if (e.key === 'm' || e.key === 'M') {
        if (!isInput) handleToggleMute();
        return;
      }

      if (screen === 'title') {
        if (e.key === '1') setSelectedGame('ludo');
        else if (e.key === '2') setSelectedGame('chess');
        else if (e.key === '3') setSelectedGame('carrom');
        else if (e.key === '4') setSelectedGame('snakes');
        else if ((e.key === 'Enter' || e.code === 'Space') && !isInput && tag !== 'BUTTON') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      if (screen === 'playing') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          setScreen('paused');
        } else if ((e.key === 'r' || e.key === 'R') && !isInput) {
          e.preventDefault();
          handleRestartMatch();
        }
        return;
      }

      if (screen === 'paused') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          setScreen('playing');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, handleStartGame, handleRestartMatch, handleToggleMute]);

  const themeClass =
    options.theme === 'holographic'
      ? 'theme-holographic'
      : options.theme === 'brass'
        ? 'theme-brass'
        : 'theme-obsidian';

  if (screen === 'title') {
    return (
      <div className={`h-dvh w-screen overflow-hidden ${themeClass}`}>
        <TitleScreen
          selectedGame={selectedGame}
          onSelectGame={(g) => {
            sound.playClick();
            setSelectedGame(g);
          }}
          options={options}
          onUpdateOptions={handleUpdateOptions}
          onStart={handleStartGame}
          muted={muted}
          onToggleMute={handleToggleMute}
        />
      </div>
    );
  }

  return (
    <div className={`h-dvh w-screen overflow-y-auto lg:overflow-hidden arena-grid-bg flex flex-col ${themeClass}`}>
      {/* Unified Perimeter HUD Header */}
      <header className="shrink-0 w-full max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4 border-b border-slate-800/70">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleReturnTitle}
            aria-label="Back to Title Screen"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Boards</span>
          </button>

          <div className="flex items-baseline gap-2 truncate">
            <h1 className="font-display text-base sm:text-lg font-bold text-white truncate">
              {GAME_TITLES[selectedGame]}
            </h1>
            <span className="hidden sm:inline text-xs text-slate-400">
              vs {options.difficulty} AI
            </span>
          </div>
        </div>

        {/* Live Futuristic Assist Toggle + Utility Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-pressed={options.tacticalAssist}
            onClick={() => handleUpdateOptions({ tacticalAssist: !options.tacticalAssist })}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              options.tacticalAssist
                ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Futuristic Assist: {options.tacticalAssist ? 'On' : 'Off'}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              handleToggleMute();
            }}
            aria-label={muted ? 'Unmute audio [M]' : 'Mute audio [M]'}
            title="Mute [M]"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              handleRestartMatch();
            }}
            aria-label="Restart match [R]"
            title="Restart [R]"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setScreen('paused');
            }}
            aria-label="Pause match [P]"
            title="Pause [P]"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Active Game Board Viewport */}
      <main className="flex-1 w-full max-w-6xl mx-auto flex items-center justify-center py-2">
        {selectedGame === 'chess' && (
          <ChessBoard
            key={`chess-${matchKey}`}
            options={options}
            isPaused={screen !== 'playing'}
            onGameOver={handleGameOver}
          />
        )}
        {selectedGame === 'ludo' && (
          <LudoBoard
            key={`ludo-${matchKey}`}
            options={options}
            isPaused={screen !== 'playing'}
            onGameOver={handleGameOver}
          />
        )}
        {selectedGame === 'carrom' && (
          <CarromBoard
            key={`carrom-${matchKey}`}
            options={options}
            isPaused={screen !== 'playing'}
            onGameOver={handleGameOver}
          />
        )}
        {selectedGame === 'snakes' && (
          <SnakesBoard
            key={`snakes-${matchKey}`}
            options={options}
            isPaused={screen !== 'playing'}
            onGameOver={handleGameOver}
          />
        )}
      </main>

      {/* Pause & Victory / Defeat Modals */}
      {screen === 'paused' && (
        <PauseModal
          gameTitle={GAME_TITLES[selectedGame]}
          onResume={() => setScreen('playing')}
          onRestart={handleRestartMatch}
          onTitle={handleReturnTitle}
        />
      )}

      {screen === 'gameover' && matchResult && (
        <GameOverModal
          result={matchResult}
          onPlayAgain={handleRestartMatch}
          onTitle={handleReturnTitle}
        />
      )}
    </div>
  );
}
