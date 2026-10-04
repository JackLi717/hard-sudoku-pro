import { createGameAdPlaybackObserver } from '../src/app/game-ad-playback';

function gamePlayback(initialStatus: 'active' | 'paused') {
  let status: 'active' | 'paused' = initialStatus;
  let screen = 'game';
  const coordinator = {
    get snapshot() {
      return { screen, session: { state: { status } } };
    },
    pause: jest.fn(async () => {
      status = 'paused';
    }),
    resumePausedGame: jest.fn(async () => {
      status = 'active';
    }),
  };
  return {
    coordinator,
    get status() {
      return status;
    },
    leaveGame() {
      screen = 'home';
    },
  };
}

test('rewarded ad dismissal restores the previously active game', async () => {
  const game = gamePlayback('active');
  const playback = createGameAdPlaybackObserver(game.coordinator);

  await playback.onPlaybackStart();
  expect(game.status).toBe('paused');
  await playback.onPlaybackEnd();
  expect(game.status).toBe('active');
  expect(game.coordinator.resumePausedGame).toHaveBeenCalledTimes(1);
});

test('rewarded ad preserves an already paused game and does not reopen a left game', async () => {
  const pausedGame = gamePlayback('paused');
  const pausedPlayback = createGameAdPlaybackObserver(pausedGame.coordinator);
  await pausedPlayback.onPlaybackStart();
  await pausedPlayback.onPlaybackEnd();
  expect(pausedGame.status).toBe('paused');
  expect(pausedGame.coordinator.resumePausedGame).not.toHaveBeenCalled();

  const leftGame = gamePlayback('active');
  const leftPlayback = createGameAdPlaybackObserver(leftGame.coordinator);
  await leftPlayback.onPlaybackStart();
  leftGame.leaveGame();
  await leftPlayback.onPlaybackEnd();
  expect(leftGame.coordinator.resumePausedGame).not.toHaveBeenCalled();
});
