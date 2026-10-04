import type { CommercialPlaybackObserver } from '../application/commercial/contracts';

type GamePlayback = {
  readonly snapshot: {
    readonly screen: string;
    readonly session: { readonly state: { readonly status: string } } | null;
  };
  pause(): Promise<void>;
  resumePausedGame(): Promise<void>;
};

/** Restore only a game that was active when the rewarded ad began. */
export function createGameAdPlaybackObserver(
  coordinator: GamePlayback,
): CommercialPlaybackObserver {
  let resumeAfterAd = false;
  return {
    async onPlaybackStart() {
      resumeAfterAd =
        coordinator.snapshot.screen === 'game' &&
        coordinator.snapshot.session?.state.status === 'active';
      await coordinator.pause();
    },
    async onPlaybackEnd() {
      const shouldResume = resumeAfterAd;
      resumeAfterAd = false;
      if (shouldResume && coordinator.snapshot.screen === 'game') {
        await coordinator.resumePausedGame();
      }
    },
  };
}
