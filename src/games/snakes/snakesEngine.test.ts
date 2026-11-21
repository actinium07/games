import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialSnakesState,
  applySnakesRoll,
  getSquareGridCoord,
} from './snakesEngine';

test('serpentine board coordinates map 1, 10, 11, and 100 accurately', () => {
  assert.deepEqual(getSquareGridCoord(1), { row: 9, col: 0 });
  assert.deepEqual(getSquareGridCoord(10), { row: 9, col: 9 });
  assert.deepEqual(getSquareGridCoord(11), { row: 8, col: 9 });
  assert.deepEqual(getSquareGridCoord(100), { row: 0, col: 0 });
});

test('ladder climbs and snake slides update player position', () => {
  let state = createInitialSnakesState(false);
  // Start at 1 -> roll 3 -> 4 (ladder to 25)
  state = applySnakesRoll(state, 3);
  assert.equal(state.players[0].position, 25);
  assert.equal(state.lastResolution?.eventType, 'ladder');

  // AI roll 2 -> 3, back to player
  state = applySnakesRoll(state, 2);
  // Player at 25 -> roll 2 -> 27 (snake to 5)
  state = applySnakesRoll(state, 2);
  assert.equal(state.players[0].position, 5);
  assert.equal(state.lastResolution?.eventType, 'snake');
});

test('deflector shield absorbs cyber serpent in cyber mode', () => {
  let state = createInitialSnakesState(true);
  state.players[0].position = 13;
  state = applySnakesRoll(state, 2); // lands on 15 (shield pad)
  assert.equal(state.players[0].shields, 1);

  state = applySnakesRoll(state, 2); // AI turn
  state.players[0].position = 24;
  state = applySnakesRoll(state, 3); // lands on 27 (snake) -> shielded!
  assert.equal(state.players[0].position, 27);
  assert.equal(state.players[0].shields, 0);
  assert.equal(state.lastResolution?.eventType, 'shielded');
});

test('exact 100 required to win and overshoot stays put', () => {
  let state = createInitialSnakesState(false);
  state.players[0].position = 97;
  state = applySnakesRoll(state, 5); // 97 + 5 = 102 > 100
  assert.equal(state.players[0].position, 97);
  assert.equal(state.winner, null);

  state = applySnakesRoll(state, 2); // AI turn
  state = applySnakesRoll(state, 3); // 97 + 3 = 100
  assert.equal(state.players[0].position, 100);
  assert.equal(state.winner, 'player');
});
