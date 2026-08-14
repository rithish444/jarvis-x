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
        this.gender = localStorage.getItem('jarvis_voice_gender') || 'female'; // Default: Girl Voice

        this._lastSpokenText = '';
        this._speakingEndTime = 0;

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

    setGender(gender) {
        this.gender = gender === 'male' ? 'male' : 'female';
        localStorage.setItem('jarvis_voice_gender', this.gender);
        this.populateVoices();
        return this.gender;
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

            const currentTranscript = (finalTranscript || interimTranscript).trim();

            // Suppress displaying Jarvis's own spoken output in the User Input UI box
            if (this.isSpeaking && this._lastSpokenText && currentTranscript) {
                const cleanSpoken = this._lastSpokenText.toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim();
                const cleanTranscript = currentTranscript.toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim();
                if (cleanSpoken.includes(cleanTranscript) || cleanTranscript.includes(cleanSpoken)) {
                    return;
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
        const cleanInput = normalizedText.replace(/[^a-z0-9\s]/gi, '').trim();

        // 1. SELF-VOICE ECHO FILTER: Ignore speech if mic picks up Jarvis's own TTS output
        if (this._lastSpokenText) {
            const cleanSpoken = this._lastSpokenText.toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim();
            
            const isSpokenOverlap = cleanInput.length > 0 && cleanSpoken.length > 0 && (
                cleanSpoken.includes(cleanInput) ||
                cleanInput.includes(cleanSpoken) ||
                (cleanInput.length >= 6 && cleanSpoken.slice(0, 40).includes(cleanInput.slice(0, 15)))
            );

            if ((this.isSpeaking || (now - this._speakingEndTime < 1500)) && isSpokenOverlap) {
                console.log("[VoiceEngine] Suppressed self-voice audio feedback loop:", text);
                return;
            }
        }

        // 2. WHILE SPEAKING FILTER: Ignore ambient speech unless user explicitly interrupts with wake word or stop command
        if (this.isSpeaking) {
            const isExplicitInterrupt = normalizedText.includes('stop') || 
                                        normalizedText.includes('shut up') || 
                                        normalizedText.includes('quiet') || 
                                        normalizedText.includes('cancel') ||
                                        normalizedText.includes('hey jarvis') ||
                                        normalizedText.includes('ok jarvis') ||
                                        normalizedText.includes('jarvis');
            if (!isExplicitInterrupt) {
                console.log("[VoiceEngine] Suppressed audio input while Jarvis is speaking:", text);
                return;
            }
            // User explicitly interrupted — cancel active speech
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

        const handleVoicesChanged = () => {
            this.populateVoices();
        };

        handleVoicesChanged();
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = handleVoicesChanged;
        }

        // Chrome bug fix: speech synthesis freezes after ~15s of inactivity
        setInterval(() => {
            if (!this.isSpeaking && this.synthesis.pending) {
                this.synthesis.cancel();
            }
        }, 10000);
    }

    populateVoices() {
        if (!this.synthesis) return;
        const voices = this.synthesis.getVoices();
        if (!voices || voices.length === 0) return;

        const femaleKeywords = [
            'female', 'zira', 'samantha', 'victoria', 'karen', 'fiona', 'eva', 
            'jenny', 'aria', 'sonia', 'moira', 'veena', 'google uk english female', 
            'google us english female', 'alice', 'amanda', 'clara', 'sara', 'emily', 
            'serena', 'stephanie', 'girl', 'woman', 'natural female', 'natural',
            'helena', 'catherine', 'hazel', 'susan', 'linda', 'lisa', 'mary'
        ];

        const maleKeywords = [
            'male', 'david', 'mark', 'george', 'alex', 'daniel', 'richard', 
            'james', 'john', 'paul', 'google us english', 'google uk english male',
            'microsoft david', 'microsoft mark'
        ];

        if (this.gender === 'female') {
            // Priority 1: English female voice
            this.selectedVoice = voices.find(v => {
                const name = v.name.toLowerCase();
                return v.lang.startsWith('en') && femaleKeywords.some(k => name.includes(k));
            })
            // Priority 2: Female voice in any language
            || voices.find(v => {
                const name = v.name.toLowerCase();
                return femaleKeywords.some(k => name.includes(k));
            })
            // Priority 3: English voice not explicitly male
            || voices.find(v => {
                const name = v.name.toLowerCase();
                return v.lang.startsWith('en') && !maleKeywords.some(m => name.includes(m));
            })
            // Fallback
            || voices.find(v => v.lang.startsWith('en'))
            || voices[0];
        } else {
            // Male voice
            this.selectedVoice = voices.find(v => {
                const name = v.name.toLowerCase();
                return v.lang.startsWith('en') && maleKeywords.some(k => name.includes(k));
            })
            || voices.find(v => v.lang.startsWith('en'))
            || voices[0];
        }

        const voiceLabel = document.getElementById('activeVoiceName');
        if (voiceLabel) {
            const genderTag = this.gender === 'female' ? '👧 Girl Voice' : '👦 Boy Voice';
            voiceLabel.innerText = `Voice: ${genderTag} (${this.selectedVoice ? this.selectedVoice.name : 'Default'})`;
        }

        const btn = document.getElementById('voiceGenderBtn');
        if (btn) {
            btn.innerText = this.gender === 'female' ? '👧 GIRL VOICE' : '👦 BOY VOICE';
            btn.classList.toggle('active', this.gender === 'female');
        }
    }

    speak(text, onComplete) {
        if (!this.synthesis) {
            if (onComplete) onComplete();
            return;
        }

        this._lastSpokenText = text;

        // Make sure voices are loaded
        if (!this.selectedVoice) {
            this.populateVoices();
        }

        // Instantly cancel previous speech — no waiting
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        if (this.selectedVoice) utterance.voice = this.selectedVoice;
        utterance.lang = 'en-US';

        if (this.gender === 'female') {
            utterance.pitch = 1.3;  // Bright, cheerful, feminine girl voice tone
            utterance.rate = 1.05;  // Smooth and clear speed
        } else {
            utterance.pitch = 0.95; // Deeper male tone
            utterance.rate = 1.0;
        }

        const arcCore = document.getElementById('arcCoreBtn');

        utterance.onstart = () => {
            this.isSpeaking = true;
            if (arcCore) arcCore.classList.add('speaking');
            if (this.onStateChange) this.onStateChange('speaking');
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            this._speakingEndTime = Date.now();
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
            this._speakingEndTime = Date.now();
            if (arcCore) arcCore.classList.remove('speaking');
            if (onComplete) onComplete();
        };

        this.synthesis.speak(utterance);
    }
}

window.JarvisVoice = JarvisVoice;

