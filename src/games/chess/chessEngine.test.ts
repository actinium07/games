import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialChessState,
  getLegalMovesFromSquare,
  applyChessMove,
  selectBestChessMove,
  getLegalMoves,
} from './chessEngine';

test('initial chess position has 20 legal white moves', () => {
  const state = createInitialChessState();
  const moves = getLegalMoves(state, 'w');
  assert.equal(moves.length, 20);
  assert.equal(state.status, 'playing');
});

test('fools mate triggers checkmate for black', () => {
  let state = createInitialChessState();
  // 1. f3
  const f3 = getLegalMovesFromSquare(state, 6, 5).find((m) => m.to.r === 5 && m.to.c === 5)!;
  state = applyChessMove(state, f3);
  // 1... e5
  const e5 = getLegalMovesFromSquare(state, 1, 4).find((m) => m.to.r === 3 && m.to.c === 4)!;
  state = applyChessMove(state, e5);
  // 2. g4
  const g4 = getLegalMovesFromSquare(state, 6, 6).find((m) => m.to.r === 4 && m.to.c === 6)!;
  state = applyChessMove(state, g4);
  // 2... Qh4#
  const qh4 = getLegalMovesFromSquare(state, 0, 3).find((m) => m.to.r === 4 && m.to.c === 7)!;
  state = applyChessMove(state, qh4);

  assert.equal(state.status, 'checkmate');
  assert.equal(state.winner, 'b');
  assert.equal(state.history[state.history.length - 1].notation, 'Qh4#');
});

test('castling becomes legal once path is clear', () => {
  let state = createInitialChessState();
  // Clear g1 and f1 for white kingside castle
  state.board[7][5] = null;
  state.board[7][6] = null;
  const kingMoves = getLegalMovesFromSquare(state, 7, 4);
  const castleK = kingMoves.find((m) => m.isCastle === 'K');
  assert.ok(castleK);
  const next = applyChessMove(state, castleK);
  assert.equal(next.board[7][6]?.type, 'k');
  assert.equal(next.board[7][5]?.type, 'r');
});

test('AI selects a legal response move', () => {
  let state = createInitialChessState();
  const e4 = getLegalMovesFromSquare(state, 6, 4).find((m) => m.to.r === 4 && m.to.c === 4)!;
  state = applyChessMove(state, e4);
  const aiMove = selectBestChessMove(state, 'tactical');
  assert.ok(aiMove);
  assert.equal(aiMove.piece.color, 'b');
  const afterAi = applyChessMove(state, aiMove);
  assert.equal(afterAi.turn, 'w');
});
