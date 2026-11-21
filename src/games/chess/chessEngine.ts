import type { AIDifficulty } from '../../types/game';

export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface ChessPiece {
  color: PieceColor;
  type: PieceType;
}

export interface SquareCoord {
  r: number;
  c: number;
}

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface ChessMove {
  from: SquareCoord;
  to: SquareCoord;
  piece: ChessPiece;
  captured?: ChessPiece;
  promotion?: PieceType;
  isCastle?: 'K' | 'Q';
  isEnPassant?: boolean;
  notation?: string;
}

export interface ChessGameState {
  board: (ChessPiece | null)[][];
  turn: PieceColor;
  castling: CastlingRights;
  enPassant: SquareCoord | null;
  halfMoveClock: number;
  fullMoveNumber: number;
  history: ChessMove[];
  capturedByWhite: ChessPiece[];
  capturedByBlack: ChessPiece[];
  status: 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';
  winner: PieceColor | 'draw' | null;
}

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables from White's perspective (row 0 = rank 8, row 7 = rank 1)
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const PST_MAP: Record<PieceType, number[][]> = {
  p: PAWN_PST,
  n: KNIGHT_PST,
  b: BISHOP_PST,
  r: ROOK_PST,
  q: QUEEN_PST,
  k: KING_PST,
};

export function createInitialChessState(): ChessGameState {
  const backRank: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const board: (ChessPiece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));

  for (let c = 0; c < 8; c++) {
    board[0][c] = { color: 'b', type: backRank[c] };
    board[1][c] = { color: 'b', type: 'p' };
    board[6][c] = { color: 'w', type: 'p' };
    board[7][c] = { color: 'w', type: backRank[c] };
  }

  return {
    board,
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    history: [],
    capturedByWhite: [],
    capturedByBlack: [],
    status: 'playing',
    winner: null,
  };
}

export function cloneBoard(board: (ChessPiece | null)[][]): (ChessPiece | null)[][] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function coordToAlg(r: number, c: number): string {
  const files = 'abcdefgh';
  return `${files[c]}${8 - r}`;
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function findKing(board: (ChessPiece | null)[][], color: PieceColor): SquareCoord | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.type === 'k') {
        return { r, c };
      }
    }
  }
  return null;
}

export function isSquareAttacked(
  board: (ChessPiece | null)[][],
  targetR: number,
  targetC: number,
  byColor: PieceColor
): boolean {
  // Pawn attacks
  const pawnDir = byColor === 'w' ? 1 : -1; // Pawns of byColor attack from targetR + pawnDir
  for (const dc of [-1, 1]) {
    const pr = targetR + pawnDir;
    const pc = targetC + dc;
    if (inBounds(pr, pc)) {
      const p = board[pr][pc];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
  }

  // Knight attacks
  const knightOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of knightOffsets) {
    const nr = targetR + dr;
    const nc = targetC + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === 'n') return true;
    }
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const kr = targetR + dr;
      const kc = targetC + dc;
      if (inBounds(kr, kc)) {
        const p = board[kr][kc];
        if (p && p.color === byColor && p.type === 'k') return true;
      }
    }
  }

  // Rook / Queen orthogonal rays
  const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of orthoDirs) {
    let rr = targetR + dr;
    let cc = targetC + dc;
    while (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p) {
        if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }

  // Bishop / Queen diagonal rays
  const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diagDirs) {
    let rr = targetR + dr;
    let cc = targetC + dc;
    while (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p) {
        if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }

  return false;
}

export function isKingInCheck(board: (ChessPiece | null)[][], color: PieceColor): boolean {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king.r, king.c, color === 'w' ? 'b' : 'w');
}

export function getThreatenedSquares(board: (ChessPiece | null)[][], byColor: PieceColor): Set<string> {
  const set = new Set<string>();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (isSquareAttacked(board, r, c, byColor)) {
        set.add(`${r},${c}`);
      }
    }
  }
  return set;
}

function generatePseudoMoves(state: ChessGameState, color: PieceColor): ChessMove[] {
  const moves: ChessMove[] = [];
  const { board, castling, enPassant } = state;
  const enemy: PieceColor = color === 'w' ? 'b' : 'w';

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== color) continue;

      if (piece.type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;
        const promoRow = color === 'w' ? 0 : 7;

        // Forward 1
        const r1 = r + dir;
        if (inBounds(r1, c) && !board[r1][c]) {
          if (r1 === promoRow) {
            for (const promo of ['q', 'r', 'b', 'n'] as PieceType[]) {
              moves.push({ from: { r, c }, to: { r: r1, c }, piece, promotion: promo });
            }
          } else {
            moves.push({ from: { r, c }, to: { r: r1, c }, piece });
            // Forward 2
            const r2 = r + dir * 2;
            if (r === startRow && !board[r2][c]) {
              moves.push({ from: { r, c }, to: { r: r2, c }, piece });
            }
          }
        }

        // Captures & En Passant
        for (const dc of [-1, 1]) {
          const nc = c + dc;
          if (!inBounds(r1, nc)) continue;
          const target = board[r1][nc];
          if (target && target.color === enemy) {
            if (r1 === promoRow) {
              for (const promo of ['q', 'r', 'b', 'n'] as PieceType[]) {
                moves.push({ from: { r, c }, to: { r: r1, c: nc }, piece, captured: target, promotion: promo });
              }
            } else {
              moves.push({ from: { r, c }, to: { r: r1, c: nc }, piece, captured: target });
            }
          } else if (enPassant && enPassant.r === r1 && enPassant.c === nc) {
            const epCaptured = board[r][nc];
            if (epCaptured && epCaptured.color === enemy && epCaptured.type === 'p') {
              moves.push({
                from: { r, c },
                to: { r: r1, c: nc },
                piece,
                captured: epCaptured,
                isEnPassant: true,
              });
            }
          }
        }
      } else if (piece.type === 'n') {
        const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (const [dr, dc] of offsets) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds(nr, nc)) continue;
          const target = board[nr][nc];
          if (!target || target.color === enemy) {
            moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece, captured: target ?? undefined });
          }
        }
      } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
        const dirs: number[][] = [];
        if (piece.type === 'b' || piece.type === 'q') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        if (piece.type === 'r' || piece.type === 'q') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        for (const [dr, dc] of dirs) {
          let nr = r + dr;
          let nc = c + dc;
          while (inBounds(nr, nc)) {
            const target = board[nr][nc];
            if (!target) {
              moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece });
            } else {
              if (target.color === enemy) {
                moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece, captured: target });
              }
              break;
            }
            nr += dr;
            nc += dc;
          }
        }
      } else if (piece.type === 'k') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (!inBounds(nr, nc)) continue;
            const target = board[nr][nc];
            if (!target || target.color === enemy) {
              moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece, captured: target ?? undefined });
            }
          }
        }

        // Castling
        const homeRow = color === 'w' ? 7 : 0;
        if (r === homeRow && c === 4 && !isSquareAttacked(board, homeRow, 4, enemy)) {
          const canK = color === 'w' ? castling.wK : castling.bK;
          if (
            canK &&
            !board[homeRow][5] &&
            !board[homeRow][6] &&
            board[homeRow][7]?.type === 'r' &&
            board[homeRow][7]?.color === color &&
            !isSquareAttacked(board, homeRow, 5, enemy) &&
            !isSquareAttacked(board, homeRow, 6, enemy)
          ) {
            moves.push({ from: { r, c }, to: { r: homeRow, c: 6 }, piece, isCastle: 'K' });
          }

          const canQ = color === 'w' ? castling.wQ : castling.bQ;
          if (
            canQ &&
            !board[homeRow][3] &&
            !board[homeRow][2] &&
            !board[homeRow][1] &&
            board[homeRow][0]?.type === 'r' &&
            board[homeRow][0]?.color === color &&
            !isSquareAttacked(board, homeRow, 3, enemy) &&
            !isSquareAttacked(board, homeRow, 2, enemy)
          ) {
            moves.push({ from: { r, c }, to: { r: homeRow, c: 2 }, piece, isCastle: 'Q' });
          }
        }
      }
    }
  }

  return moves;
}

function applyRawBoardMove(board: (ChessPiece | null)[][], move: ChessMove): (ChessPiece | null)[][] {
  const next = cloneBoard(board);
  const moving: ChessPiece = move.promotion
    ? { color: move.piece.color, type: move.promotion }
    : { ...move.piece };

  next[move.from.r][move.from.c] = null;
  next[move.to.r][move.to.c] = moving;

  if (move.isEnPassant) {
    next[move.from.r][move.to.c] = null;
  }

  if (move.isCastle === 'K') {
    const row = move.from.r;
    next[row][5] = next[row][7];
    next[row][7] = null;
  } else if (move.isCastle === 'Q') {
    const row = move.from.r;
    next[row][3] = next[row][0];
    next[row][0] = null;
  }

  return next;
}

export function getLegalMoves(state: ChessGameState, color: PieceColor = state.turn): ChessMove[] {
  const pseudo = generatePseudoMoves(state, color);
  return pseudo.filter((move) => {
    const nextBoard = applyRawBoardMove(state.board, move);
    return !isKingInCheck(nextBoard, color);
  });
}

export function getLegalMovesFromSquare(state: ChessGameState, r: number, c: number): ChessMove[] {
  return getLegalMoves(state, state.turn).filter((m) => m.from.r === r && m.from.c === c);
}

function hasInsufficientMaterial(board: (ChessPiece | null)[][]): boolean {
  const pieces: { color: PieceColor; type: PieceType; r: number; c: number }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type !== 'k') pieces.push({ ...p, r, c });
    }
  }
  if (pieces.length === 0) return true;
  if (pieces.length === 1 && (pieces[0].type === 'b' || pieces[0].type === 'n')) return true;
  if (
    pieces.length === 2 &&
    pieces[0].type === 'b' &&
    pieces[1].type === 'b' &&
    pieces[0].color !== pieces[1].color &&
    (pieces[0].r + pieces[0].c) % 2 === (pieces[1].r + pieces[1].c) % 2
  ) {
    return true;
  }
  return false;
}

function buildNotation(move: ChessMove, inCheck: boolean, isMate: boolean): string {
  if (move.isCastle === 'K') return isMate ? 'O-O#' : inCheck ? 'O-O+' : 'O-O';
  if (move.isCastle === 'Q') return isMate ? 'O-O-O#' : inCheck ? 'O-O-O+' : 'O-O-O';

  const pieceLetter = move.piece.type === 'p' ? '' : move.piece.type.toUpperCase();
  const fromFile = move.piece.type === 'p' && move.captured ? 'abcdefgh'[move.from.c] : '';
  const captureChar = move.captured ? 'x' : '';
  const dest = coordToAlg(move.to.r, move.to.c);
  const promo = move.promotion ? `=${move.promotion.toUpperCase()}` : '';
  const suffix = isMate ? '#' : inCheck ? '+' : '';
  return `${pieceLetter}${fromFile}${captureChar}${dest}${promo}${suffix}`;
}

export function applyChessMove(state: ChessGameState, move: ChessMove): ChessGameState {
  const nextBoard = applyRawBoardMove(state.board, move);
  const nextCastling = { ...state.castling };

  // Revoke castling rights if king or rook moves/captured
  if (move.piece.type === 'k') {
    if (move.piece.color === 'w') {
      nextCastling.wK = false;
      nextCastling.wQ = false;
    } else {
      nextCastling.bK = false;
      nextCastling.bQ = false;
    }
  }
  if (move.from.r === 7 && move.from.c === 0) nextCastling.wQ = false;
  if (move.from.r === 7 && move.from.c === 7) nextCastling.wK = false;
  if (move.from.r === 0 && move.from.c === 0) nextCastling.bQ = false;
  if (move.from.r === 0 && move.from.c === 7) nextCastling.bK = false;
  if (move.to.r === 7 && move.to.c === 0) nextCastling.wQ = false;
  if (move.to.r === 7 && move.to.c === 7) nextCastling.wK = false;
  if (move.to.r === 0 && move.to.c === 0) nextCastling.bQ = false;
  if (move.to.r === 0 && move.to.c === 7) nextCastling.bK = false;

  let nextEnPassant: SquareCoord | null = null;
  if (move.piece.type === 'p' && Math.abs(move.to.r - move.from.r) === 2) {
    nextEnPassant = { r: (move.from.r + move.to.r) / 2, c: move.from.c };
  }

  const nextTurn: PieceColor = state.turn === 'w' ? 'b' : 'w';
  const nextHalfMove = move.piece.type === 'p' || move.captured ? 0 : state.halfMoveClock + 1;
  const nextFullMove = state.turn === 'b' ? state.fullMoveNumber + 1 : state.fullMoveNumber;

  const capturedByWhite = [...state.capturedByWhite];
  const capturedByBlack = [...state.capturedByBlack];
  if (move.captured) {
    if (state.turn === 'w') capturedByWhite.push(move.captured);
    else capturedByBlack.push(move.captured);
  }

  const intermediateState: ChessGameState = {
    board: nextBoard,
    turn: nextTurn,
    castling: nextCastling,
    enPassant: nextEnPassant,
    halfMoveClock: nextHalfMove,
    fullMoveNumber: nextFullMove,
    history: state.history,
    capturedByWhite,
    capturedByBlack,
    status: 'playing',
    winner: null,
  };

  const opponentLegalMoves = getLegalMoves(intermediateState, nextTurn);
  const opponentInCheck = isKingInCheck(nextBoard, nextTurn);
  const isMate = opponentLegalMoves.length === 0 && opponentInCheck;

  let status: ChessGameState['status'] = 'playing';
  let winner: ChessGameState['winner'] = null;

  if (opponentLegalMoves.length === 0) {
    if (opponentInCheck) {
      status = 'checkmate';
      winner = state.turn;
    } else {
      status = 'stalemate';
      winner = 'draw';
    }
  } else if (nextHalfMove >= 100 || hasInsufficientMaterial(nextBoard)) {
    status = 'draw';
    winner = 'draw';
  } else if (opponentInCheck) {
    status = 'check';
  }

  const annotatedMove: ChessMove = {
    ...move,
    notation: buildNotation(move, opponentInCheck, isMate),
  };

  return {
    ...intermediateState,
    history: [...state.history, annotatedMove],
    status,
    winner,
  };
}

function evaluateBoard(board: (ChessPiece | null)[][]): number {
  let score = 0; // Positive = White advantage, Negative = Black advantage
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const pstRow = p.color === 'w' ? r : 7 - r;
      const val = PIECE_VALUES[p.type] + PST_MAP[p.type][pstRow][c];
      score += p.color === 'w' ? val : -val;
    }
  }
  return score;
}

function orderMoves(moves: ChessMove[]): ChessMove[] {
  return [...moves].sort((a, b) => {
    const scoreA =
      (a.captured ? PIECE_VALUES[a.captured.type] * 10 - PIECE_VALUES[a.piece.type] : 0) +
      (a.promotion ? PIECE_VALUES[a.promotion] : 0);
    const scoreB =
      (b.captured ? PIECE_VALUES[b.captured.type] * 10 - PIECE_VALUES[b.piece.type] : 0) +
      (b.promotion ? PIECE_VALUES[b.promotion] : 0);
    return scoreB - scoreA;
  });
}

function minimax(
  state: ChessGameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizingWhite: boolean
): number {
  if (state.status === 'checkmate') {
    return state.winner === 'w' ? 100000 + depth : -100000 - depth;
  }
  if (state.status === 'stalemate' || state.status === 'draw') {
    return 0;
  }
  if (depth === 0) {
    return evaluateBoard(state.board);
  }

  const moves = orderMoves(getLegalMoves(state, state.turn));
  if (maximizingWhite) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const child = applyChessMove(state, move);
      const ev = minimax(child, depth - 1, alpha, beta, false);
      if (ev > maxEval) maxEval = ev;
      if (ev > alpha) alpha = ev;
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const child = applyChessMove(state, move);
      const ev = minimax(child, depth - 1, alpha, beta, true);
      if (ev < minEval) minEval = ev;
      if (ev < beta) beta = ev;
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function selectBestChessMove(state: ChessGameState, difficulty: AIDifficulty): ChessMove | null {
  const legal = orderMoves(getLegalMoves(state, state.turn));
  if (legal.length === 0) return null;

  const depth = difficulty === 'grandmaster' ? 3 : difficulty === 'tactical' ? 2 : 1;
  const maximizingWhite = state.turn === 'w';

  let bestScore = maximizingWhite ? -Infinity : Infinity;
  let bestMoves: ChessMove[] = [];

  for (const move of legal) {
    const next = applyChessMove(state, move);
    const score = minimax(next, depth - 1, -Infinity, Infinity, !maximizingWhite);
    if (maximizingWhite) {
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }
  }

  // Slight variety among equal-best moves on standard difficulty
  if (difficulty === 'standard' && bestMoves.length > 1) {
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }
  return bestMoves[0];
}
