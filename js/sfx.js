/**
 * J.A.R.V.I.S. Audio SFX Synthesizer
 * Uses Web Audio API to generate high-tech futuristic sound effects procedurally without external assets.
 */
class JarvisAudioSFX {
    constructor() {
        this.ctx = null;
    }

    initCtx() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // 1. High-Tech UI Click / Blip Sound
    playBlip(freq = 880, type = 'sine', duration = 0.08) {
        try {
            this.initCtx();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn('Audio SFX error:', e);
        }
    }

    // 2. Arc Reactor Power-Up Chime
    playPowerUp() {
        try {
            this.initCtx();
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(1760, now + 0.6);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.6);
        } catch (e) {}
    }

    // 3. Alert Siren (Hulkbuster / Lockdown Mode)
    playAlert() {
        try {
            this.initCtx();
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.25);
            osc.frequency.linearRampToValueAtTime(400, now + 0.5);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.5);
        } catch (e) {}
    }

    // 4. Timer Completion Alarm
    playAlarm() {
        try {
            this.initCtx();
            for (let i = 0; i < 3; i++) {
                setTimeout(() => this.playBlip(1200, 'square', 0.1), i * 150);
            }
        } catch (e) {}
    }
}

window.JarvisAudioSFX = JarvisAudioSFX;
