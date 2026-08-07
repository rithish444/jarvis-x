/**
 * J.A.R.V.I.S. Voice Engine (Mark VIII — RAPID RESPONSE BUILD)
 * Fixes: Instant command interrupt, zero-delay STT restart, no command stacking.
 */
class JarvisVoice {
    constructor(onSpeechRecognized, onStateChange) {
        this.onSpeechRecognized = onSpeechRecognized;
        this.onStateChange = onStateChange; // 'listening', 'speaking', 'idle'

        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.selectedVoice = null;
        this.isListening = false;
        this.isSpeaking = false;

        this.currentLang = 'en'; // LOCKED: English only
        this.tamilVoice = null;

        // Debounce: prevent duplicate final results within 600ms
        this._lastCommandTime = 0;
        this._lastCommandText = '';
        this._restartTimer = null;

        this.initSpeechRecognition();
        this.initSpeechSynthesis();
    }

    setLanguage(langCode) {
        // ENGLISH ONLY MODE — always use en-US recognition
        this.currentLang = 'en';
        localStorage.setItem('jarvis_voice_lang', 'en');
        if (this.recognition) {
            this.recognition.lang = 'en-US';
        }
    }

    // 1. SPEECH RECOGNITION (STT)
    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("SpeechRecognition API is not supported in this browser.");
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1; // Speed: only top result needed
        this.setLanguage(this.currentLang);

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateBadge(true);
            if (this.onStateChange) this.onStateChange('listening');
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            const userTextEl = document.getElementById('userSpeechText');
            if (userTextEl) {
                userTextEl.innerText = finalTranscript || interimTranscript || "Listening...";
            }

            if (finalTranscript.trim().length > 0) {
                this.handleFinalSpeech(finalTranscript.trim());
            }
        };

        this.recognition.onerror = (event) => {
            console.warn('Speech Recognition error:', event.error);
            if (event.error === 'not-allowed') {
                alert('Microphone permission is required for voice activation.');
            }
            // On aborted/network error, restart immediately
            if ((event.error === 'aborted' || event.error === 'network') && this.shouldAutoRestart) {
                this._scheduleRestart(50);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateBadge(false);
            // Zero-delay restart — no gap between listening sessions
            if (this.shouldAutoRestart) {
                this._scheduleRestart(0);
            } else {
                if (this.onStateChange) this.onStateChange('idle');
            }
        };
    }

    _scheduleRestart(delayMs) {
        clearTimeout(this._restartTimer);
        this._restartTimer = setTimeout(() => {
            if (this.shouldAutoRestart && !this.isListening) {
                try {
                    this.recognition.start();
                } catch (e) {
                    // Ignore if already running
                }
            }
        }, delayMs);
    }

    startListening() {
        if (this.recognition && !this.isListening) {
            try {
                this.shouldAutoRestart = true;
                this.recognition.start();
            } catch (e) {
                console.log('Recognition start exception:', e);
            }
        }
    }

    stopListening() {
        this.shouldAutoRestart = false;
        clearTimeout(this._restartTimer);
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    handleFinalSpeech(text) {
        const now = Date.now();
        const normalizedText = text.trim().toLowerCase();

        // RAPID RESPONSE: Immediately cancel any ongoing TTS so new command starts NOW
        if (this.isSpeaking) {
            this.synthesis.cancel();
            this.isSpeaking = false;
        }

        // Debounce: skip same command fired within 600ms (prevents double-trigger)
        if (normalizedText === this._lastCommandText && (now - this._lastCommandTime) < 600) {
            return;
        }
        this._lastCommandTime = now;
        this._lastCommandText = normalizedText;

        // Check for wake word or pass through directly
        const cleanText = normalizedText;
        if (cleanText.includes('jarvis') || cleanText.includes('hey jarvis') || cleanText.includes('ok jarvis') || text.includes('ஜார்விஸ்')) {
            const cmd = text.replace(/hey jarvis|ok jarvis|jarvis|ஜார்விஸ்/gi, '').trim();
            if (this.onSpeechRecognized) {
                this.onSpeechRecognized(cmd || text);
            }
        } else {
            if (this.onSpeechRecognized) {
                this.onSpeechRecognized(text);
            }
        }
    }

    // Immediately interrupt speech and reset
    interrupt() {
        this.synthesis.cancel();
        this.isSpeaking = false;
    }

    updateBadge(active) {
        const badge = document.getElementById('listeningBadge');
        const arcCore = document.getElementById('arcCoreBtn');
        if (badge) {
            badge.innerText = active ? "LISTENING" : "LISTEN";
            badge.className = active ? "listening-badge active" : "listening-badge";
        }
        if (arcCore && active) {
            arcCore.classList.add('listening');
        } else if (arcCore) {
            arcCore.classList.remove('listening');
        }
    }

    // 2. SPEECH SYNTHESIS (TTS)
    initSpeechSynthesis() {
        if (!this.synthesis) return;

        const populateVoices = () => {
            const voices = this.synthesis.getVoices();
            // Look for British male voice preferred for JARVIS English
            this.selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('UK') || v.name.includes('British') || v.name.includes('Daniel') || v.name.includes('Oliver') || v.name.includes('Google UK English Male')))
                || voices.find(v => v.lang.startsWith('en-US'))
                || voices[0];

            // Look for Tamil voice if present
            this.tamilVoice = voices.find(v => v.lang.startsWith('ta') || v.name.toLowerCase().includes('tamil')) || null;

            const voiceLabel = document.getElementById('activeVoiceName');
            if (voiceLabel) {
                voiceLabel.innerText = `Voice: ${this.selectedVoice ? this.selectedVoice.name : 'Default'}${this.tamilVoice ? ' + Tamil Core' : ''}`;
            }
        };

        populateVoices();
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = populateVoices;
        }

        // Chrome bug fix: speech synthesis freezes after ~15s of inactivity
        setInterval(() => {
            if (!this.isSpeaking && this.synthesis.pending) {
                this.synthesis.cancel();
            }
        }, 10000);
    }

    speak(text, onComplete) {
        if (!this.synthesis) {
            if (onComplete) onComplete();
            return;
        }

        // Instantly cancel previous speech — no waiting
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // ENGLISH ONLY — always use English voice
        if (this.selectedVoice) utterance.voice = this.selectedVoice;
        utterance.lang = 'en-US';
        utterance.rate = 1.2;  // Faster English — crisp & rapid
        utterance.pitch = 0.95;

        const arcCore = document.getElementById('arcCoreBtn');

        utterance.onstart = () => {
            this.isSpeaking = true;
            if (arcCore) arcCore.classList.add('speaking');
            if (this.onStateChange) this.onStateChange('speaking');
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            if (arcCore) arcCore.classList.remove('speaking');
            if (this.isListening) {
                if (this.onStateChange) this.onStateChange('listening');
            } else {
                if (this.onStateChange) this.onStateChange('idle');
            }
            if (onComplete) onComplete();
        };

        utterance.onerror = (err) => {
            // 'interrupted' is expected when cancel() is called — not a real error
            if (err.error !== 'interrupted') {
                console.warn('Speech Synthesis error:', err.error);
            }
            this.isSpeaking = false;
            if (arcCore) arcCore.classList.remove('speaking');
            if (onComplete) onComplete();
        };

        this.synthesis.speak(utterance);
    }
}

window.JarvisVoice = JarvisVoice;

