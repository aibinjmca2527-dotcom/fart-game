// ============================================================
// Fun Together — Procedural Web Audio Sound Generator
// Generates funny cartoon fart sounds, water splashes, and chimes
// ============================================================

class SoundManager {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private getNoiseBuffer(): AudioBuffer {
    if (!this.ctx) this.initContext();
    if (!this.noiseBuffer && this.ctx) {
      const bufferSize = this.ctx.sampleRate * 1.5;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.noiseBuffer!;
  }

  /** Play a rich, funny cartoon fart sound */
  playFart(pitchVariation = 1.0) {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const duration = 0.22 + Math.random() * 0.12;

      // Base pitch between 65Hz and 130Hz
      const baseFreq = (75 + Math.random() * 45) * pitchVariation;

      // 1. Primary Low-Frequency Oscillator (for the rumble)
      const osc = this.ctx.createOscillator();
      osc.type = Math.random() > 0.4 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      // Frequency flutter / modulation for hilarious wobble
      osc.frequency.linearRampToValueAtTime(baseFreq * (0.8 + Math.random() * 0.4), now + duration * 0.5);
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, baseFreq * 0.45), now + duration);

      // 2. Frequency Modulator (FM for wet/raspy texture)
      const modOsc = this.ctx.createOscillator();
      modOsc.type = 'sawtooth';
      modOsc.frequency.setValueAtTime(25 + Math.random() * 20, now);
      const modGain = this.ctx.createGain();
      modGain.gain.setValueAtTime(baseFreq * 0.4, now);
      modOsc.connect(osc.frequency);

      // 3. Noise layer for the airy/puffy squelch
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer();
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(350 + Math.random() * 200, now);
      noiseFilter.Q.setValueAtTime(3.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.85);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);

      // 4. Master Low-pass filter for cartoon warmth
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + duration);

      // 5. Volume envelope
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.55, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      noiseGain.connect(gain);
      gain.connect(this.ctx.destination);

      modOsc.start(now);
      osc.start(now);
      noise.start(now);

      modOsc.stop(now + duration);
      osc.stop(now + duration);
      noise.stop(now + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /** Water splash whoosh when hitting bumper or steering */
  playSplash() {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.25);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.25);
    } catch {
      // ignore
    }
  }

  /** Cartoon obstacle crash / bonk sound */
  playCrash() {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Heavy low pitch drop
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer();
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'lowpass';
      nFilter.frequency.setValueAtTime(500, now);
      nFilter.frequency.exponentialRampToValueAtTime(100, now + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      noise.connect(nFilter);
      nFilter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      noise.start(now);
      osc.stop(now + 0.35);
      noise.stop(now + 0.35);
    } catch {
      // ignore
    }
  }

  /** Cheerful ding for checkpoints */
  playCheckpoint() {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.0, now + 0.08); // A5
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // ignore
    }
  }

  /** Triumphant fanfare for finishing */
  playFinish() {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const now = this.ctx!.currentTime + i * 0.12;
        const osc = this.ctx!.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      });
    } catch {
      // ignore
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
  }
}

export const soundManager = new SoundManager();
