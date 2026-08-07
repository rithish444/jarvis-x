/**
 * J.A.R.V.I.S. Multi-Mode Visualizer Module
 * Renders Arc Reactor Core, Waveform Oscilloscope, and Equalizer Bars.
 */
class JarvisVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;

        this.state = 'idle'; // 'idle', 'listening', 'speaking'
        this.mode = 'arc'; // 'arc', 'oscilloscope', 'bars'
        this.audioData = new Array(36).fill(10);
        this.angleOffset = 0;
        this.particles = [];
        this.isAnimating = false;

        this.initParticles();
        this.start();
    }

    initParticles() {
        this.particles = [];
        for (let i = 0; i < 24; i++) {
            this.particles.push({
                r: 40 + Math.random() * 80,
                angle: Math.random() * Math.PI * 2,
                speed: 0.005 + Math.random() * 0.01,
                size: 1 + Math.random() * 2,
                alpha: 0.2 + Math.random() * 0.6
            });
        }
    }

    setState(newState) {
        this.state = newState;
    }

    setMode(newMode) {
        this.mode = newMode;
    }

    start() {
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.render();
        }
    }

    render() {
        if (!this.isAnimating) return;

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.angleOffset += 0.01;
        this.updateAudioData();

        // Active color scheme detection
        let glowColor = 'rgba(0, 240, 255, ';
        if (document.body.classList.contains('theme-hulkbuster')) glowColor = 'rgba(255, 51, 102, ';
        if (document.body.classList.contains('theme-stealth')) glowColor = 'rgba(0, 255, 170, ';

        if (this.state === 'speaking') glowColor = 'rgba(255, 183, 0, ';
        if (this.state === 'listening') glowColor = 'rgba(0, 255, 170, ';

        if (this.mode === 'arc') {
            this.renderArcMode(glowColor);
        } else if (this.mode === 'oscilloscope') {
            this.renderOscilloscopeMode(glowColor);
        } else if (this.mode === 'bars') {
            this.renderBarsMode(glowColor);
        }

        requestAnimationFrame(() => this.render());
    }

    // MODE 1: Arc Reactor Ring
    renderArcMode(glowColor) {
        const grad = this.ctx.createRadialGradient(this.centerX, this.centerY, 10, this.centerX, this.centerY, 130);
        grad.addColorStop(0, glowColor + '0.25)');
        grad.addColorStop(0.7, glowColor + '0.05)');
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, 140, 0, Math.PI * 2);
        this.ctx.fill();

        const numBars = 36;
        const radius = 95;
        const angleStep = (Math.PI * 2) / numBars;

        for (let i = 0; i < numBars; i++) {
            const angle = i * angleStep + this.angleOffset;
            const barHeight = this.audioData[i];

            const x1 = this.centerX + Math.cos(angle) * radius;
            const y1 = this.centerY + Math.sin(angle) * radius;
            const x2 = this.centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = this.centerY + Math.sin(angle) * (radius + barHeight);

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.strokeStyle = glowColor + '0.8)';
            this.ctx.lineWidth = 3;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        }

        this.particles.forEach(p => {
            p.angle += p.speed;
            const px = this.centerX + Math.cos(p.angle) * p.r;
            const py = this.centerY + Math.sin(p.angle) * p.r;

            this.ctx.beginPath();
            this.ctx.arc(px, py, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = glowColor + p.alpha + ')';
            this.ctx.fill();
        });
    }

    // MODE 2: Waveform Oscilloscope
    renderOscilloscopeMode(glowColor) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = glowColor + '0.9)';
        this.ctx.lineWidth = 3;

        const sliceWidth = this.width / this.audioData.length;
        let x = 0;

        for (let i = 0; i < this.audioData.length; i++) {
            const v = this.audioData[i] / 40;
            const y = (v * this.height) / 2 + 80;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        this.ctx.stroke();

        // Mirror line
        this.ctx.beginPath();
        this.ctx.strokeStyle = glowColor + '0.4)';
        this.ctx.lineWidth = 1.5;
        x = 0;
        for (let i = 0; i < this.audioData.length; i++) {
            const v = this.audioData[i] / 40;
            const y = this.height - ((v * this.height) / 2 + 80);
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
            x += sliceWidth;
        }
        this.ctx.stroke();
    }

    // MODE 3: Equalizer Spectrum Bars
    renderBarsMode(glowColor) {
        const barWidth = (this.width / this.audioData.length) - 3;
        let x = 1.5;

        for (let i = 0; i < this.audioData.length; i++) {
            const barHeight = this.audioData[i] * 3.5;
            const y = this.height - barHeight - 40;

            this.ctx.fillStyle = glowColor + '0.85)';
            this.ctx.fillRect(x, y, barWidth, barHeight);

            x += barWidth + 3;
        }
    }

    updateAudioData() {
        for (let i = 0; i < this.audioData.length; i++) {
            if (this.state === 'speaking') {
                this.audioData[i] = 12 + Math.random() * 32;
            } else if (this.state === 'listening') {
                this.audioData[i] = 8 + Math.sin(Date.now() * 0.008 + i) * 18 + Math.random() * 6;
            } else {
                this.audioData[i] = 6 + Math.sin(Date.now() * 0.003 + i) * 8;
            }
        }
    }
}

window.JarvisVisualizer = JarvisVisualizer;
