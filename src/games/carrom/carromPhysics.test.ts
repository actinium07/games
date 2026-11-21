import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialCarromState,
  stepCarromPhysics,
  resolveCarromShotEnd,
  computeAIShot,
  POCKETS,
} from './carromPhysics';

test('initial carrom rack has 9 white, 9 black, 1 queen, and 1 striker', () => {
  const state = createInitialCarromState();
  assert.equal(state.discs.filter((d) => d.kind === 'white').length, 9);
  assert.equal(state.discs.filter((d) => d.kind === 'black').length, 9);
  assert.equal(state.discs.filter((d) => d.kind === 'queen').length, 1);
  assert.equal(state.discs.filter((d) => d.kind === 'striker').length, 1);
});

test('striker collides with target piece and transfers momentum', () => {
  const state = createInitialCarromState();
  const striker = state.discs.find((d) => d.kind === 'striker')!;
  striker.vx = 0;
  striker.vy = -850;

  let totalCollisions = 0;
  for (let i = 0; i < 60; i++) {
    const ev = stepCarromPhysics(state.discs, 1 / 60);
    totalCollisions += ev.collisions;
  }
  assert.ok(totalCollisions > 0);
});

test('pocketing own piece keeps turn while striker foul passes turn', () => {
  let state = createInitialCarromState();
  // Simulate pocketing 1 white piece
  const w0 = state.discs.find((d) => d.kind === 'white')!;
  w0.pocketed = true;
  state = resolveCarromShotEnd(state, state.discs, ['white']);
  assert.equal(state.turn, 'player');
  assert.equal(state.playerPocketed, 1);

  // Now simulate striker foul -> returns 1 white piece and passes turn to AI
  state = resolveCarromShotEnd(state, state.discs, ['striker']);
  assert.equal(state.turn, 'ai');
  assert.equal(state.playerPocketed, 0);
});

test('AI computes a valid shot directed downward from AI baseline', () => {
  const state = createInitialCarromState();
  const shot = computeAIShot(state.discs, 'grandmaster');
  assert.ok(shot.strikerX >= 136 && shot.strikerX <= 464);
  assert.ok(Math.hypot(shot.vx, shot.vy) > 100);
  // Pocket detection sanity check
  assert.equal(POCKETS.length, 4);
});
