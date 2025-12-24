export class ZenMusicBox {
  private readonly pentatonicScale = [
    65.41, 73.42, 82.41, 98.0, 110.0, 130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5,
    1174.66, 1318.51,
  ];

  private triadIndices = [5, 8, 12];
  private audioContext?: AudioContext;
  private volume: number;

  constructor(props?: { volume?: number }) {
    this.volume = Math.max(0, Math.min(1, props?.volume ?? 0.5));
  }

  public setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
  }

  public playAscend(): void {
    this.triadIndices.sort((a, b) => a - b);

    const currentHigh = this.triadIndices[2];
    const step = Math.floor(Math.random() * 2) + 2;
    const nextHigh = currentHigh + step;

    // Pivot: Keep the two highest notes, move the lowest to the new top
    this.triadIndices = [this.triadIndices[1], this.triadIndices[2], nextHigh];

    this.handleBoundaries();
    this.triggerTriad([0.4, 0.2, 0.1]);
  }

  public playDescend(): void {
    this.triadIndices.sort((a, b) => a - b);

    const currentLow = this.triadIndices[0];
    const step = Math.floor(Math.random() * 2) + 2;
    const nextLow = currentLow - step;

    // Pivot: Keep the two lowest notes, move the highest to the new bottom
    this.triadIndices = [nextLow, this.triadIndices[0], this.triadIndices[1]];

    this.handleBoundaries();
    this.triggerTriad([0.1, 0.2, 0.4]);
  }

  private handleBoundaries(): void {
    const octaveSteps = 5;

    if (this.triadIndices[2] >= this.pentatonicScale.length) {
      this.triadIndices = this.triadIndices.map((i) => i - octaveSteps);
    }

    if (this.triadIndices[0] < 0) {
      this.triadIndices = this.triadIndices.map((i) => i + octaveSteps);
    }
  }

  private triggerTriad(volumes: number[]): void {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const attack = 0.1;
    const release = 0.95;
    const duration = attack + release;

    const masterGain = this.audioContext.createGain();
    masterGain.gain.setValueAtTime(this.volume, now);
    masterGain.connect(this.audioContext.destination);

    this.triadIndices.forEach((scaleIndex, i) => {
      const oscillator = this.audioContext!.createOscillator();
      const noteGain = this.audioContext!.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(this.pentatonicScale[scaleIndex], now);

      const peakVolume = volumes[i];

      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(peakVolume, now + attack);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.connect(noteGain);
      noteGain.connect(masterGain);

      oscillator.start(now);
      oscillator.stop(now + duration);
    });
  }

  private ensureAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }
}
