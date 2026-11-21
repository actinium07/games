class SoundSynth {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.08, delay = 0, endFreq?: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playClick() {
    const jitter = 0.95 + Math.random() * 0.1;
    this.tone(620 * jitter, 0.045, 'triangle', 0.06, 0, 320);
  }

  public playMove() {
    const jitter = 0.94 + Math.random() * 0.12;
    this.tone(240 * jitter, 0.075, 'triangle', 0.1, 0, 120);
    this.tone(480 * jitter, 0.035, 'sine', 0.04, 0, 260);
  }

  public playCapture() {
    this.tone(180, 0.14, 'sawtooth', 0.09, 0, 65);
    this.tone(540, 0.11, 'triangle', 0.08, 0.015, 220);
  }

  public playDice() {
    for (let i = 0; i < 4; i++) {
      const pitch = 320 + Math.random() * 240;
      this.tone(pitch, 0.035, 'square', 0.035, i * 0.055, pitch * 0.65);
    }
  }

  public playCarromHit(intensity = 0.6) {
    const clamped = Math.max(0.15, Math.min(1, intensity));
    const jitter = 0.92 + Math.random() * 0.16;
    this.tone(420 * jitter, 0.055, 'triangle', 0.09 * clamped, 0, 170);
    this.tone(880 * jitter, 0.03, 'sine', 0.045 * clamped, 0, 440);
  }

  public playPocket() {
    this.tone(523.25, 0.11, 'sine', 0.08, 0, 784);
    this.tone(1046.5, 0.14, 'triangle', 0.05, 0.06, 1046.5);
  }

  public playBoost() {
    this.tone(330, 0.18, 'sine', 0.07, 0, 660);
    this.tone(495, 0.18, 'triangle', 0.06, 0.07, 990);
  }

  public playHazard() {
    this.tone(420, 0.24, 'sawtooth', 0.06, 0, 110);
  }

  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.tone(n, 0.24, 'triangle', 0.08, i * 0.09);
    });
  }

  public playDefeat() {
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((n, i) => {
      this.tone(n, 0.26, 'sawtooth', 0.05, i * 0.11);
    });
  }
}

export const sound = new SoundSynth();
