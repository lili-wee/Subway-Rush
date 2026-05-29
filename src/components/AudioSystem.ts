class AudioSystem {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freqs: number[],
    duration: number,
    type: OscillatorType = 'sine',
    sweep: boolean = false
  ) {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = type;

      const now = this.ctx.currentTime;
      if (freqs.length === 1) {
        osc.frequency.setValueAtTime(freqs[0], now);
      } else if (freqs.length > 1) {
        if (sweep) {
          osc.frequency.setValueAtTime(freqs[0], now);
          osc.frequency.exponentialRampToValueAtTime(freqs[freqs.length - 1], now + duration);
        } else {
          const step = duration / freqs.length;
          freqs.forEach((f, i) => {
            osc.frequency.setValueAtTime(f, now + i * step);
          });
        }
      }

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Autoplay blocked by browser policy; silently ignore
    }
  }

  public playJump() {
    this.playTone([250, 600], 0.15, 'triangle', true);
  }

  public playSlide() {
    this.playTone([500, 150], 0.2, 'sawtooth', true);
  }

  public playCoin() {
    this.playTone([880, 1200], 0.1, 'sine', false);
  }

  public playCrash() {
    this.playTone([180, 60, 10], 0.45, 'sawtooth', true);
  }

  public playPowerUp() {
    this.playTone([300, 450, 600, 900], 0.3, 'sine', false);
  }

  public playPurchase() {
    this.playTone([600, 800, 1000], 0.25, 'triangle', false);
  }

  public playClick() {
    this.playTone([400], 0.05, 'sine', false);
  }
}

export const sound = new AudioSystem();
