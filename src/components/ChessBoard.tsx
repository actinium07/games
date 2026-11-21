import React, { useEffect, useMemo, useState } from 'react';
import { Lightbulb, Flag, Shield } from 'lucide-react';
import {
  applyChessMove,
  coordToAlg,
  createInitialChessState,
  findKing,
  getLegalMovesFromSquare,
  getThreatenedSquares,
  selectBestChessMove,
  type ChessGameState,
  type ChessMove,
  type PieceType,
  type SquareCoord,
} from '../games/chess/chessEngine';
import type { FuturisticOptions, MatchResult } from '../types/game';
import { ChessPieceSvg } from './ChessPieceSvg';
import { sound } from '../utils/sound';

interface ChessBoardProps {
  options: FuturisticOptions;
  isPaused: boolean;
  onGameOver: (result: MatchResult) => void;
}

const PIECE_NAMES: Record<PieceType, string> = {
  k: 'King',
  q: 'Queen',
  r: 'Rook',
  b: 'Bishop',
  n: 'Knight',
  p: 'Pawn',
};

const PIECE_WORTH: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const ChessBoard: React.FC<ChessBoardProps> = ({ options, isPaused, onGameOver }) => {
  const [game, setGame] = useState<ChessGameState>(() => createInitialChessState());
  const [selected, setSelected] = useState<SquareCoord | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: SquareCoord; to: SquareCoord; moves: ChessMove[] } | null>(null);
  const [hintMove, setHintMove] = useState<ChessMove | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  const legalMovesForSelected = useMemo(() => {
    if (!selected || game.turn !== 'w' || game.winner) return [];
    return getLegalMovesFromSquare(game, selected.r, selected.c);
  }, [game, selected]);

  const threatenedByAI = useMemo(() => {
    if (!options.tacticalAssist) return new Set<string>();
    return getThreatenedSquares(game.board, 'b');
  }, [game.board, options.tacticalAssist]);

  const whiteKingInCheck = useMemo(() => {
    if (game.status !== 'check' && game.status !== 'checkmate') return null;
    return findKing(game.board, game.turn);
  }, [game.board, game.status, game.turn]);

  // Trigger Game Over callback cleanly
  useEffect(() => {
    if (!game.winner) return;
    const timer = setTimeout(() => {
      const outcome = game.winner === 'w' ? 'victory' : game.winner === 'b' ? 'defeat' : 'draw';
      if (outcome === 'victory') sound.playVictory();
      else sound.playDefeat();
      onGameOver({
        gameId: 'chess',
        outcome,
        headline:
          outcome === 'victory'
            ? 'Checkmate — You Win'
            : outcome === 'defeat'
              ? 'Checkmate — AI Wins'
              : `Draw by ${game.status === 'stalemate' ? 'Stalemate' : 'Rule'}`,
        subline:
          outcome === 'victory'
            ? 'You outmaneuvered the Minimax engine and secured the king.'
            : outcome === 'defeat'
              ? 'Vanguard AI broke through your defenses.'
              : 'Neither side could force a decisive advantage.',
        metrics: [
          { label: 'Total Moves', value: `${game.history.length}` },
          { label: 'Captures', value: `${game.capturedByWhite.length}` },
          { label: 'AI Tier', value: options.difficulty.toUpperCase() },
        ],
      });
    }, 450);
    return () => clearTimeout(timer);
  }, [game.winner, game.status, game.history.length, game.capturedByWhite.length, options.difficulty, onGameOver]);

  // Automated AI Turn
  useEffect(() => {
    if (isPaused || game.winner || game.turn !== 'b') return;
    setAiThinking(true);
    const delay = setTimeout(() => {
      const aiMove = selectBestChessMove(game, options.difficulty);
      if (aiMove) {
        if (aiMove.captured) sound.playCapture();
        else sound.playMove();
        setGame((prev) => applyChessMove(prev, aiMove));
        setHintMove(null);
      }
      setAiThinking(false);
    }, 480);

    return () => {
      clearTimeout(delay);
      setAiThinking(false);
    };
  }, [game, isPaused, options.difficulty]);

  const executePlayerMove = (move: ChessMove) => {
    if (move.captured) sound.playCapture();
    else sound.playMove();
    setGame((prev) => applyChessMove(prev, move));
    setSelected(null);
    setPendingPromotion(null);
    setHintMove(null);
  };

  const handleSquareClick = (r: number, c: number) => {
    if (isPaused || game.turn !== 'w' || game.winner || aiThinking) return;

    const matchingMoves = legalMovesForSelected.filter((m) => m.to.r === r && m.to.c === c);
    if (matchingMoves.length > 0) {
      if (matchingMoves.length > 1 && matchingMoves[0].promotion) {
        setPendingPromotion({ from: selected!, to: { r, c }, moves: matchingMoves });
        return;
      }
      executePlayerMove(matchingMoves[0]);
      return;
    }

    const piece = game.board[r][c];
    if (piece && piece.color === 'w') {
      sound.playClick();
      setSelected({ r, c });
    } else {
      setSelected(null);
    }
  };

  const handleRequestHint = () => {
    if (game.turn !== 'w' || game.winner || aiThinking) return;
    sound.playBoost();
    const best = selectBestChessMove(game, 'tactical');
    setHintMove(best);
    if (best) setSelected(best.from);
  };

  const handleResign = () => {
    if (game.winner) return;
    sound.playDefeat();
    onGameOver({
      gameId: 'chess',
      outcome: 'defeat',
      headline: 'Match Resigned',
      subline: 'You conceded the board to Vanguard AI.',
      metrics: [
        { label: 'Moves Played', value: `${game.history.length}` },
        { label: 'Captures', value: `${game.capturedByWhite.length}` },
        { label: 'AI Tier', value: options.difficulty.toUpperCase() },
      ],
    });
  };

  const lastMove = game.history[game.history.length - 1];
  const whiteMaterial = game.capturedByWhite.reduce((acc, p) => acc + PIECE_WORTH[p.type], 0);
  const blackMaterial = game.capturedByBlack.reduce((acc, p) => acc + PIECE_WORTH[p.type], 0);
  const materialDiff = whiteMaterial - blackMaterial;

  // Theme colors
  const lightSq =
    options.theme === 'brass'
      ? 'bg-[#2c251d]'
      : options.theme === 'holographic'
        ? 'bg-[#12253e]'
        : 'bg-[#232d3f]';
  const darkSq =
    options.theme === 'brass'
      ? 'bg-[#17130e]'
      : options.theme === 'holographic'
        ? 'bg-[#091322]'
        : 'bg-[#131924]';

  // Group move history into pairs
  const movePairs: { num: number; w?: string; b?: string }[] = [];
  for (let i = 0; i < game.history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      w: game.history[i]?.notation,
      b: game.history[i + 1]?.notation,
    });
  }

  return (
    <div className="w-full h-full flex flex-col lg:flex-row items-center justify-center gap-5 px-3 py-2">
      {/* Main 8x8 Chessboard */}
      <div className="relative flex flex-col items-center">
        <div className="p-2.5 sm:p-3.5 rounded-2xl bg-[#111722] border border-slate-700/80 shadow-[0_24px_56px_rgba(0,0,0,0.65)]">
          <div
            data-testid="chess-board"
            className="grid grid-cols-8 grid-rows-8 w-[min(86vw,540px)] h-[min(86vw,540px)] sm:w-[min(74vh,560px)] sm:h-[min(74vh,560px)] rounded-lg overflow-hidden border border-slate-700"
          >
            {game.board.map((row, r) =>
              row.map((piece, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected = selected?.r === r && selected?.c === c;
                const moveTarget = legalMovesForSelected.find((m) => m.to.r === r && m.to.c === c);
                const isLastMove =
                  (lastMove?.from.r === r && lastMove?.from.c === c) ||
                  (lastMove?.to.r === r && lastMove?.to.c === c);
                const isCheckSq = whiteKingInCheck?.r === r && whiteKingInCheck?.c === c;
                const isThreatened = options.tacticalAssist && threatenedByAI.has(`${r},${c}`);
                const isHintTarget = hintMove?.to.r === r && hintMove?.to.c === c;
                const alg = coordToAlg(r, c);

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    aria-label={`Square ${alg}${piece ? ` ${piece.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[piece.type]}` : ''}`}
                    onClick={() => handleSquareClick(r, c)}
                    className={`relative w-full h-full flex items-center justify-center transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                      isDark ? darkSq : lightSq
                    } ${isLastMove ? 'ring-inset ring-2 ring-amber-400/50' : ''} ${
                      isSelected ? 'ring-inset ring-2 ring-cyan-400 bg-cyan-500/20' : ''
                    } ${isCheckSq ? 'bg-rose-600/45 ring-inset ring-2 ring-rose-400' : ''}`}
                  >
                    {/* Coordinate labels on edge squares */}
                    {c === 0 && (
                      <span className="absolute top-0.5 left-1 text-[10px] font-mono-tabular text-slate-500 pointer-events-none">
                        {8 - r}
                      </span>
                    )}
                    {r === 7 && (
                      <span className="absolute bottom-0.5 right-1 text-[10px] font-mono-tabular text-slate-500 pointer-events-none">
                        {'abcdefgh'[c]}
                      </span>
                    )}

                    {/* Futuristic Threat Vector Overlay */}
                    {isThreatened && !isCheckSq && (
                      <span
                        className="absolute inset-1 rounded-sm bg-rose-500/12 border border-rose-500/25 pointer-events-none"
                        aria-hidden="true"
                      />
                    )}

                    {/* Tactical Hint Highlight */}
                    {isHintTarget && (
                      <span
                        className="absolute inset-1 rounded-md border-2 border-dashed border-amber-400 pointer-events-none"
                        aria-hidden="true"
                      />
                    )}

                    {/* Piece */}
                    {piece && <ChessPieceSvg color={piece.color} type={piece.type} />}

                    {/* Valid Move Indicator */}
                    {moveTarget && !piece && (
                      <span className="w-3.5 h-3.5 rounded-full bg-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.65)] pointer-events-none" />
                    )}
                    {moveTarget && piece && (
                      <span className="absolute inset-1 rounded-lg border-2 border-cyan-400 pointer-events-none" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Pawn Promotion Dialog */}
        {pendingPromotion && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75 rounded-2xl">
            <div className="p-4 rounded-xl bg-slate-900 border border-cyan-400/60 shadow-2xl space-y-3">
              <p className="text-xs font-semibold text-cyan-300 text-center">Promote Pawn</p>
              <div className="flex items-center gap-2">
                {pendingPromotion.moves.map((m) => (
                  <button
                    key={m.promotion}
                    type="button"
                    aria-label={`Promote to ${PIECE_NAMES[m.promotion!]}`}
                    onClick={() => executePlayerMove(m)}
                    className="w-14 h-14 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center cursor-pointer"
                  >
                    <ChessPieceSvg color="w" type={m.promotion!} className="w-10 h-10" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compact Right Telemetry Strip */}
      <aside className="w-full lg:w-72 flex flex-col gap-3 bg-[#101622] border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="text-xs text-slate-400">Active Turn</div>
            <div className="font-display text-base font-bold text-white flex items-center gap-2">
              <span>{game.turn === 'w' ? 'Your Move (White)' : 'Vanguard AI Thinking'}</span>
            </div>
          </div>
          {game.status === 'check' && (
            <span className="text-xs font-bold text-rose-400">CHECK</span>
          )}
        </div>

        {/* Material Balance */}
        <div className="flex items-center justify-between text-xs bg-slate-900/80 rounded-lg px-3 py-2 border border-slate-800">
          <span className="text-slate-400">Material Delta</span>
          <span className={`font-mono-tabular font-bold ${materialDiff >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
            {materialDiff > 0 ? `+${materialDiff}` : materialDiff}
          </span>
        </div>

        {/* Futuristic Overlay Status */}
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Shield className={`w-3.5 h-3.5 ${options.tacticalAssist ? 'text-rose-400' : 'text-slate-500'}`} />
          <span>
            Threat Overlay: {options.tacticalAssist ? 'Active (Red zones = AI range)' : 'Off'}
          </span>
        </div>

        {/* Move Notation Log */}
        <div className="flex-1 min-h-[140px] max-h-[240px] overflow-y-auto rounded-lg bg-slate-950/70 border border-slate-800/80 p-2.5 space-y-1">
          {movePairs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Click any White piece to begin.</p>
          ) : (
            movePairs.map((pair) => (
              <div key={pair.num} className="grid grid-cols-12 text-xs font-mono-tabular py-0.5 border-b border-slate-900/80">
                <span className="col-span-2 text-slate-500">{pair.num}.</span>
                <span className="col-span-5 text-slate-100">{pair.w}</span>
                <span className="col-span-5 text-rose-300">{pair.b ?? ''}</span>
              </div>
            ))
          )}
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleRequestHint}
            disabled={game.turn !== 'w' || aiThinking}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-45 text-cyan-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Tactical Hint</span>
          </button>
          <button
            type="button"
            onClick={handleResign}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-rose-950/50 text-rose-300 text-xs font-medium border border-slate-800 hover:border-rose-500/40 transition-colors cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Resign</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
