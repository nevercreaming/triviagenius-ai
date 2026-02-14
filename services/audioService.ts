
class AudioService {
  private ctx: AudioContext | null = null;
  private musicNode: GainNode | null = null;
  private currentTrack: 'pre' | 'in' | null = null;
  private isMuted: boolean = false;
  private loopInterval: number | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.musicNode && this.ctx) {
      this.musicNode.gain.setTargetAtTime(this.isMuted ? 0 : this.getVolume(), this.ctx.currentTime, 0.1);
    }
    return this.isMuted;
  }

  private getVolume() {
    return this.currentTrack === 'pre' ? 0.08 : 0.05;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playClick() { this.playTone(800, 'sine', 0.1, 0.05); }
  playTick() { this.playTone(1200, 'sine', 0.05, 0.02); }
  playTimeUp() { this.playTone(150, 'sawtooth', 0.5, 0.1); }
  playHint() {
    this.playTone(392.00, 'sine', 0.1, 0.05);
    setTimeout(() => this.playTone(493.88, 'sine', 0.1, 0.05), 50);
    setTimeout(() => this.playTone(587.33, 'sine', 0.2, 0.05), 100);
  }
  playCorrect() {
    this.playTone(523.25, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(659.25, 'sine', 0.3, 0.1), 100);
  }
  playWrong() {
    this.playTone(220, 'sawtooth', 0.4, 0.05);
    this.playTone(210, 'sawtooth', 0.4, 0.05);
  }
  playStart() {
    const tones = [440, 554.37, 659.25, 880];
    tones.forEach((freq, i) => setTimeout(() => this.playTone(freq, 'sine', 0.4, 0.05), i * 100));
  }
  playEnd() {
    const tones = [523.25, 659.25, 783.99, 1046.50];
    tones.forEach((freq, i) => setTimeout(() => this.playTone(freq, 'triangle', 0.6, 0.05), i * 150));
  }

  private stopMusic() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    if (this.musicNode && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicNode.gain.cancelScheduledValues(now);
      this.musicNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      const nodeToCleanup = this.musicNode;
      setTimeout(() => {
        try { nodeToCleanup.disconnect(); } catch (e) {}
      }, 1000);
      this.musicNode = null;
    }
    this.currentTrack = null;
  }

  playPreGameMusic() {
    if (this.currentTrack === 'pre') return;
    this.init();
    if (!this.ctx) return;
    this.stopMusic();
    this.currentTrack = 'pre';
    
    const now = this.ctx.currentTime;
    this.musicNode = this.ctx.createGain();
    this.musicNode.gain.setValueAtTime(0, now);
    this.musicNode.gain.linearRampToValueAtTime(this.isMuted ? 0 : this.getVolume(), now + 2);
    this.musicNode.connect(this.ctx.destination);

    const createOsc = (freq: number, type: OscillatorType = 'sine', vol: number = 0.05) => {
      if (!this.ctx || !this.musicNode) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      
      // LFO for movement
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 0.2;
      lfoGain.gain.value = vol * 0.5;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      lfo.start();

      osc.connect(g);
      g.connect(this.musicNode);
      osc.start();
    };

    createOsc(73.42, 'sine', 0.4); // D2
    createOsc(110.00, 'triangle', 0.2); // A2
    createOsc(146.83, 'sine', 0.2); // D3
    createOsc(220.00, 'sine', 0.1); // A3
  }

  playInGameMusic() {
    if (this.currentTrack === 'in') return;
    this.init();
    if (!this.ctx) return;
    this.stopMusic();
    this.currentTrack = 'in';

    const now = this.ctx.currentTime;
    this.musicNode = this.ctx.createGain();
    this.musicNode.gain.setValueAtTime(0, now);
    this.musicNode.gain.linearRampToValueAtTime(this.isMuted ? 0 : this.getVolume(), now + 1);
    this.musicNode.connect(this.ctx.destination);

    let step = 0;
    const notes = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83]; // A2 bassline
    
    this.loopInterval = window.setInterval(() => {
      if (!this.ctx || !this.musicNode || this.currentTrack !== 'in') return;
      const time = this.ctx.currentTime;

      try {
        // Kick Drum every beat
        if (step % 2 === 0) {
          const kick = this.ctx.createOscillator();
          const kickG = this.ctx.createGain();
          kick.frequency.setValueAtTime(150, time);
          kick.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
          kickG.gain.setValueAtTime(0.6, time);
          kickG.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
          kick.connect(kickG);
          kickG.connect(this.musicNode);
          kick.start(time);
          kick.stop(time + 0.15);
        }

        // Bassline every half beat
        const bass = this.ctx.createOscillator();
        const bassG = this.ctx.createGain();
        bass.type = 'triangle';
        bass.frequency.setValueAtTime(notes[step % notes.length], time);
        bassG.gain.setValueAtTime(0.2, time);
        bassG.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        bass.connect(bassG);
        bassG.connect(this.musicNode);
        bass.start(time);
        bass.stop(time + 0.2);

        // Hi-hat style tick
        if (step % 2 !== 0) {
          const hat = this.ctx.createOscillator();
          const hatG = this.ctx.createGain();
          hat.type = 'sine';
          hat.frequency.setValueAtTime(10000, time);
          hatG.gain.setValueAtTime(0.05, time);
          hatG.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
          hat.connect(hatG);
          hatG.connect(this.musicNode);
          hat.start(time);
          hat.stop(time + 0.05);
        }

        step++;
      } catch (e) {}
    }, 250);
  }
}

export const audioService = new AudioService();
