/** Measures one exercise visit; time spent outside the active app is excluded. */
export class PracticeTimer {
  private elapsedMs = 0;
  private runningSince: number | null;
  private finished = false;

  constructor(now: number, active: boolean) {
    this.runningSince = active ? now : null;
  }

  setActive(active: boolean, now: number): void {
    if (this.finished) return;
    if (active) {
      this.runningSince ??= now;
    } else if (this.runningSince !== null) {
      this.elapsedMs += Math.max(0, now - this.runningSince);
      this.runningSince = null;
    }
  }

  finish(now: number): number {
    if (!this.finished) {
      this.setActive(false, now);
      this.finished = true;
    }
    return this.elapsedMs;
  }
}
