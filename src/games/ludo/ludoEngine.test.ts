import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialLudoState,
  rollLudoDice,
  moveLudoToken,
  getValidLudoMoves,
  getGlobalTrackIndex,
} from './ludoEngine';

test('token only leaves yard on a 6', () => {
  let state = createInitialLudoState(1, false);
  state = rollLudoDice(state, 4);
  assert.equal(state.activeSeatIndex, 1); // passed to AI because no moves

  let state2 = createInitialLudoState(1, false);
  state2 = rollLudoDice(state2, 6);
  assert.equal(state2.phase, 'select');
  assert.deepEqual(getValidLudoMoves(state2), [0, 1, 2, 3]);
  state2 = moveLudoToken(state2, 0);
  assert.equal(state2.players[0].tokens[0].progress, 0);
  assert.equal(state2.activeSeatIndex, 0); // bonus roll on 6
});

test('landing on opponent on non-safe square captures and grants bonus turn', () => {
  let state = createInitialLudoState(1, false);
  // Cyan startOffset = 39, Green startOffset = 13.
  // Cyan progress 2 => global (39+2)%52 = 41 (not safe)
  // Green progress 28 => global (13+28)%52 = 41
  state.players[0].tokens[0].progress = 0;
  state.players[1].tokens[0].progress = 28;
  state = rollLudoDice(state, 2);
  state = moveLudoToken(state, 0);

  assert.equal(state.players[0].tokens[0].progress, 2);
  assert.equal(state.players[1].tokens[0].progress, -1); // captured back to yard
  assert.equal(state.activeSeatIndex, 0); // bonus turn
});

test('safe square prevents capture', () => {
  let state = createInitialLudoState(1, false);
  // Global 47 is safe. Cyan progress 8 => (39+8)%52 = 47. Green progress 34 => (13+34)%52 = 47.
  assert.equal(getGlobalTrackIndex(39, 8), 47);
  assert.equal(getGlobalTrackIndex(13, 34), 47);
  state.players[0].tokens[0].progress = 6;
  state.players[1].tokens[0].progress = 34;
  state = rollLudoDice(state, 2);
  state = moveLudoToken(state, 0);
  assert.equal(state.players[1].tokens[0].progress, 34); // still safe
});

test('winning triggers when all 4 tokens reach progress 56', () => {
  let state = createInitialLudoState(1, false);
  state.players[0].tokens[0].progress = 56;
  state.players[0].tokens[1].progress = 56;
  state.players[0].tokens[2].progress = 56;
  state.players[0].tokens[3].progress = 54;
  state = rollLudoDice(state, 2);
  state = moveLudoToken(state, 3);
  assert.equal(state.phase, 'gameover');
  assert.equal(state.winner, 'cyan');
});
