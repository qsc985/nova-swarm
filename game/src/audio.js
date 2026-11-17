// All sound is synthesized with WebAudio — no audio files, no network.
// Each effect is a short oscillator/noise burst. A quiet pulsing bass line
// runs under play. M toggles mute; the setting persists in localStorage.

export class SoundEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = localStorage.getItem('novaswarm-muted') === '1';
    this.musicTimer = null;
    this.musicStep = 0;
  }

  // Browsers require a user gesture before audio can start; call from the
  // first click / keypress that starts the game.
  ensure() {
    if (!this.context) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.context = new AC();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') this.context.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    localStorage.setItem('novaswarm-muted', muted ? '1' : '0');
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  tone({ freq = 440, freqEnd = null, type = 'sine', dur = 0.12, vol = 0.25, delay = 0 }) {
    if (!this.context || this.muted) return;
    const t0 = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.2, vol = 0.3, lowpass = 1200, delay = 0 }) {
    if (!this.context || this.muted) return;
    const t0 = this.context.currentTime + delay;
    const len = Math.max(1, Math.floor(this.context.sampleRate * dur));
    const buffer = this.context.createBuffer(1, len, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(t0);
  }

  shoot() {
    this.tone({ freq: 720, freqEnd: 240, type: 'square', dur: 0.07, vol: 0.1 });
  }

  enemyDie(big = false) {
    this.noise({ dur: big ? 0.35 : 0.18, vol: big ? 0.4 : 0.22, lowpass: big ? 900 : 1600 });
    this.tone({ freq: big ? 160 : 220, freqEnd: 50, type: 'sawtooth', dur: 0.22, vol: 0.16 });
  }

  gem(combo = 1) {
    const base = 660 + Math.min(combo, 8) * 60;
    this.tone({ freq: base, freqEnd: base * 1.5, type: 'sine', dur: 0.09, vol: 0.14 });
  }

  hurt() {
    this.tone({ freq: 200, freqEnd: 60, type: 'sawtooth', dur: 0.3, vol: 0.3 });
    this.noise({ dur: 0.25, vol: 0.25, lowpass: 700 });
  }

  waveClear() {
    [523, 659, 784].forEach((f, i) => this.tone({ freq: f, dur: 0.14, vol: 0.16, delay: i * 0.09 }));
  }

  upgrade() {
    [392, 523, 659, 784].forEach((f, i) => this.tone({ freq: f, dur: 0.16, vol: 0.15, delay: i * 0.07 }));
  }

  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.28, vol: 0.2, delay: i * 0.16 }));
  }

  uiClick() {
    this.tone({ freq: 880, freqEnd: 660, type: 'sine', dur: 0.06, vol: 0.12 });
  }

  startMusic() {
    if (!this.context || this.musicTimer) return;
    // A slow pulsing bass: root notes cycling every half second.
    const roots = [55, 55, 65.41, 49];
    this.musicTimer = window.setInterval(() => {
      if (this.muted) return;
      const root = roots[this.musicStep % roots.length];
      this.musicStep += 1;
      this.tone({ freq: root, type: 'triangle', dur: 0.42, vol: 0.07 });
      this.tone({ freq: root * 2, type: 'sine', dur: 0.2, vol: 0.03 });
    }, 500);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
