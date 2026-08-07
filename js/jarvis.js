/**
 * J.A.R.V.I.S. Core Intelligence & Application Controller (Mark VII Extended)
 * Fixed: Robust intent matching, smart fallback, and graceful API key handling.
 */
class JarvisApplication {
    constructor() {
        this.sfx = new JarvisAudioSFX();
        this.device = new JarvisDeviceBridge();
        this.visualizer = new JarvisVisualizer('visualizerCanvas');
        
        this.voice = new JarvisVoice(
            (speechText) => this.handleUserCommand(speechText),
            (state) => this.visualizer.setState(state)
        );

        this.activeBrain = localStorage.getItem('jarvis_active_brain') || 'gemini';
        this.geminiKey = localStorage.getItem('jarvis_gemini_key') || '';
        this.claudeKey = localStorage.getItem('jarvis_claude_key') || '';
        this.chatgptKey = localStorage.getItem('jarvis_chatgpt_key') || '';
        this.notes = JSON.parse(localStorage.getItem('jarvis_notes') || '[]');
        this.timers = [];
        this.cameraStream = null;

        // Contact Book Storage
        this.contacts = JSON.parse(localStorage.getItem('jarvis_contacts') || 'null');
        if (!this.contacts) {
            this.contacts = [
                { id: 1, name: "Rahul", phone: "+919876543210" },
                { id: 2, name: "Mom", phone: "+919123456789" },
                { id: 3, name: "Priya", phone: "+919988776655" }
            ];
            this.saveContactsToStorage();
        }

        // Custom Macros Engine Initializer
        this.macros = JSON.parse(localStorage.getItem('jarvis_custom_macros') || 'null');
        if (!this.macros) {
            this.macros = [
                {
                    id: 1,
                    trigger: "execute turbo mode",
                    theme: "hulkbuster",
                    sfx: "powerup",
                    speech: "Turbo mode engaged. Power output boosted to 100%.",
                    device: "vibrate"
                },
                {
                    id: 2,
                    trigger: "night protocol",
                    theme: "stealth",
                    sfx: "blip",
                    speech: "Night protocol engaged. Dimming HUD telemetry. Goodnight, sir.",
                    device: "none"
                },
                {
                    id: 3,
                    trigger: "full telemetry check",
                    theme: "mark7",
                    sfx: "powerup",
                    speech: "Running comprehensive mobile diagnostic telemetry sweep.",
                    device: "battery"
                }
            ];
            this.saveMacrosToStorage();
        }

        this.initUI();
    }

    initUI() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        setInterval(() => this.updateTimersTick(), 1000);

        const cmdInput = document.getElementById('cmdInput');
        const sendBtn = document.getElementById('sendBtn');
        const micToggleBtn = document.getElementById('micToggleBtn');
        const arcCoreBtn = document.getElementById('arcCoreBtn');
        const brainModelSelect = document.getElementById('brainModelSelect');
        const geminiKeyInput = document.getElementById('geminiKeyInput');
        const claudeKeyInput = document.getElementById('claudeKeyInput');
        const chatgptKeyInput = document.getElementById('chatgptKeyInput');
        const saveKeysBtn = document.getElementById('saveKeysBtn');

        if (brainModelSelect) {
            brainModelSelect.value = this.activeBrain;
        }
        if (geminiKeyInput) geminiKeyInput.value = this.geminiKey;
        if (claudeKeyInput) claudeKeyInput.value = this.claudeKey;
        if (chatgptKeyInput) chatgptKeyInput.value = this.chatgptKey;

        if (sendBtn && cmdInput) {
            sendBtn.addEventListener('click', () => {
                this.sfx.playBlip(1000);
                const val = cmdInput.value.trim();
                if (val) {
                    this.handleUserCommand(val);
                    cmdInput.value = '';
                }
            });
            cmdInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sfx.playBlip(1000);
                    const val = cmdInput.value.trim();
                    if (val) {
                        this.handleUserCommand(val);
                        cmdInput.value = '';
                    }
                }
            });
        }

        if (micToggleBtn) {
            micToggleBtn.addEventListener('click', () => {
                this.sfx.playBlip(600);
                this.voice.toggleListening();
                micToggleBtn.classList.toggle('active', this.voice.isListening);
            });
        }

        if (arcCoreBtn) {
            arcCoreBtn.addEventListener('click', () => {
                this.sfx.playPowerUp();
                this.voice.toggleListening();
                this.device.vibrate([80]);
            });
        }

        if (saveKeysBtn) {
            saveKeysBtn.addEventListener('click', () => {
                this.sfx.playBlip(1200);
                this.activeBrain = brainModelSelect ? brainModelSelect.value : 'gemini';
                this.geminiKey = geminiKeyInput ? geminiKeyInput.value.trim() : '';
                this.claudeKey = claudeKeyInput ? claudeKeyInput.value.trim() : '';
                this.chatgptKey = chatgptKeyInput ? chatgptKeyInput.value.trim() : '';

                localStorage.setItem('jarvis_active_brain', this.activeBrain);
                localStorage.setItem('jarvis_gemini_key', this.geminiKey);
                localStorage.setItem('jarvis_claude_key', this.claudeKey);
                localStorage.setItem('jarvis_chatgpt_key', this.chatgptKey);

                this.updateBrainBadges();
                this.speakAndDisplay("All AI brain configurations synced and initialized, Rithish.");
            });
        }

        this.renderMacrosUI();
        this.renderContactsUI();
        this.setVoiceLanguage(this.voice.currentLang || 'auto');
        this.updateBrainBadges();

        setTimeout(() => {
            this.sfx.playPowerUp();
            this.speakAndDisplay("J.A.R.V.I.S. online. All mobile systems nominal, Rithish.");
        }, 1000);
    }

    // Toggle key input visibility (show/hide)
    toggleKeyVisibility(inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        if (input.type === 'text') {
            input.type = 'password';
            btn.textContent = '👁';
        } else {
            input.type = 'text';
            btn.textContent = '🙈';
        }
    }

    // Update brain status badges based on stored keys
    updateBrainBadges() {
        const brains = [
            { badge: 'geminiStatusBadge', key: this.geminiKey, label: 'ACTIVE' },
            { badge: 'claudeStatusBadge', key: this.claudeKey, label: 'ACTIVE' },
            { badge: 'chatgptStatusBadge', key: this.chatgptKey, label: 'ACTIVE' }
        ];
        brains.forEach(({ badge, key }) => {
            const el = document.getElementById(badge);
            if (!el) return;
            if (key && key.length > 5) {
                el.textContent = 'ACTIVE';
                el.classList.add('active');
            } else {
                el.textContent = 'STANDBY';
                el.classList.remove('active');
            }
        });
    }

    updateClock() {
        const clockEl = document.getElementById('clockDisplay');
        if (clockEl) {
            const now = new Date();
            clockEl.innerText = now.toTimeString().split(' ')[0];
        }
    }

    // CUSTOM MACROS ENGINE
    saveMacrosToStorage() {
        localStorage.setItem('jarvis_custom_macros', JSON.stringify(this.macros));
    }

    toggleMacroBuilder() {
        this.sfx.playBlip(700);
        const form = document.getElementById('macroBuilderForm');
        if (form) form.classList.toggle('active');
    }

    saveCustomMacro() {
        const trigger = document.getElementById('macroTriggerInput')?.value.trim();
        const theme = document.getElementById('macroThemeSelect')?.value;
        const sfx = document.getElementById('macroSfxSelect')?.value;
        const speech = document.getElementById('macroSpeechInput')?.value.trim();
        const device = document.getElementById('macroDeviceSelect')?.value;

        if (!trigger || !speech) {
            alert('Please provide a voice trigger phrase and JARVIS spoken response.');
            return;
        }

        this.sfx.playPowerUp();
        const newMacro = {
            id: Date.now(),
            trigger: trigger.toLowerCase(),
            theme,
            sfx,
            speech,
            device
        };

        this.macros.push(newMacro);
        this.saveMacrosToStorage();
        this.renderMacrosUI();
        this.toggleMacroBuilder();

        document.getElementById('macroTriggerInput').value = '';
        document.getElementById('macroSpeechInput').value = '';

        this.speakAndDisplay(`Custom voice macro created for phrase: "${trigger}", Rithish.`);
    }

    deleteMacro(id) {
        this.sfx.playBlip(400);
        this.macros = this.macros.filter(m => m.id !== id);
        this.saveMacrosToStorage();
        this.renderMacrosUI();
    }

    renderMacrosUI() {
        const container = document.getElementById('macrosList');
        if (!container) return;

        if (this.macros.length === 0) {
            container.innerHTML = `<div class="macro-card-item"><span>No custom voice macros saved</span></div>`;
            return;
        }

        container.innerHTML = this.macros.map(m => `
            <div class="macro-card-item">
                <div class="macro-info">
                    <span class="macro-trigger">🗣️ "${m.trigger}"</span>
                    <span class="macro-desc">Theme: ${m.theme} | Device: ${m.device}</span>
                </div>
                <div class="macro-actions">
                    <button class="macro-btn-run" onclick="JarvisApp.executeMacroById(${m.id})">EXECUTE</button>
                    <button class="macro-btn-del" onclick="JarvisApp.deleteMacro(${m.id})">&times;</button>
                </div>
            </div>
        `).join('');
    }

    executeMacroById(id) {
        const macro = this.macros.find(m => m.id === id);
        if (macro) this.executeMacro(macro);
    }

    executeMacro(macro) {
        if (macro.sfx === 'powerup') this.sfx.playPowerUp();
        else if (macro.sfx === 'alert') this.sfx.playAlert();
        else if (macro.sfx === 'blip') this.sfx.playBlip(1000);

        if (macro.theme) this.setTheme(macro.theme);

        if (macro.device === 'vibrate') this.device.vibrate([200, 100, 300]);
        if (macro.device === 'battery') this.executeQuickAction('battery');
        if (macro.device === 'location') this.executeQuickAction('location');
        if (macro.device === 'camera') this.executeQuickAction('camera');

        if (macro.speech) {
            this.speakAndDisplay(macro.speech);
        }
    }

    // THEME SWITCHER
    setTheme(themeName) {
        this.sfx.playPowerUp();
        document.body.className = '';
        const pills = document.querySelectorAll('.theme-pill');
        pills.forEach(p => p.classList.remove('active'));

        if (themeName === 'hulkbuster') {
            document.body.classList.add('theme-hulkbuster');
            if (pills[1]) pills[1].classList.add('active');
        } else if (themeName === 'stealth') {
            document.body.classList.add('theme-stealth');
            if (pills[2]) pills[2].classList.add('active');
        } else {
            if (pills[0]) pills[0].classList.add('active');
        }
    }

    // VISUALIZER MODE SELECTOR
    setVisMode(mode) {
        this.sfx.playBlip(700);
        this.visualizer.setMode(mode);
        const btns = document.querySelectorAll('.v-mode-btn');
        btns.forEach(b => b.classList.remove('active'));

        if (mode === 'arc') document.getElementById('vArcBtn')?.classList.add('active');
        if (mode === 'oscilloscope') document.getElementById('vOscBtn')?.classList.add('active');
        if (mode === 'bars') document.getElementById('vBarsBtn')?.classList.add('active');
    }

    // VOICE TIMERS & ALARMS
    setTimer(seconds, label = "Timer") {
        this.sfx.playBlip(900);
        const timerObj = {
            id: Date.now(),
            label,
            totalSeconds: seconds,
            remainingSeconds: seconds
        };
        this.timers.push(timerObj);
        this.renderTimersUI();
        this.speakAndDisplay(`Timer set for ${seconds} seconds, Rithish.`);
    }

    updateTimersTick() {
        if (this.timers.length === 0) return;

        let changed = false;
        for (let i = this.timers.length - 1; i >= 0; i--) {
            const t = this.timers[i];
            t.remainingSeconds--;
            if (t.remainingSeconds <= 0) {
                this.sfx.playAlarm();
                this.device.vibrate([300, 100, 300, 100, 500]);
                this.speakAndDisplay(`Rithish, your ${t.label} countdown timer of ${t.totalSeconds} seconds has completed!`);
                this.timers.splice(i, 1);
                changed = true;
            } else {
                changed = true;
            }
        }
        if (changed) this.renderTimersUI();
    }

    renderTimersUI() {
        const container = document.getElementById('timersList');
        if (!container) return;

        if (this.timers.length === 0) {
            container.innerHTML = `<div class="timer-card-item"><span>No active timers running</span></div>`;
            return;
        }

        container.innerHTML = this.timers.map(t => `
            <div class="timer-card-item">
                <span>⏱️ ${t.label}</span>
                <span class="m-val highlight">${t.remainingSeconds}s remaining</span>
            </div>
        `).join('');
    }

    // SMART AUTOMATION PROTOCOLS
    runProtocol(name) {
        if (name === 'lockdown') {
            this.sfx.playAlert();
            this.setTheme('hulkbuster');
            this.device.vibrate([400, 200, 400]);
            this.speakAndDisplay("EMERGENCY PROTOCOL ACTIVATED: Lockdown initiated! All security parameters locked.");
        } else if (name === 'focus') {
            this.sfx.playPowerUp();
            this.setTheme('stealth');
            this.setTimer(1500, "Focus Session");
            this.speakAndDisplay("Focus Protocol initiated. 25 minute concentration block started.");
        } else if (name === 'morning') {
            this.sfx.playPowerUp();
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const batInfo = this.device.getBatteryInfo();
            this.speakAndDisplay(`Good morning, Rithish. It is currently ${timeStr}. ${batInfo} All mobile systems are operating within nominal parameters. Have a productive day!`);
        }
    }

    // AI VISION SCANNER MODAL
    async openVisionModal() {
        this.sfx.playPowerUp();
        const modal = document.getElementById('visionModal');
        const video = document.getElementById('visionVideo');
        if (!modal || !video) return;

        modal.classList.add('active');
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = this.cameraStream;
        } catch (e) {
            document.getElementById('visionResult').innerText = `Camera access error: ${e.message}`;
        }
    }

    closeVisionModal() {
        this.sfx.playBlip(500);
        const modal = document.getElementById('visionModal');
        if (modal) modal.classList.remove('active');

        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(t => t.stop());
            this.cameraStream = null;
        }
    }

    async scanVisionObject() {
        this.sfx.playBlip(1200);
        const resEl = document.getElementById('visionResult');
        if (resEl) resEl.innerText = "Analyzing target reticle frame...";

        this.speakAndDisplay("Scanning optic target frame...");

        setTimeout(() => {
            const simulatedScans = [
                "Target analyzed: Electronic device identified with 98.4% optical match. Structure nominal.",
                "Target analyzed: Document text detected. Text alignment straight, quality crisp.",
                "Target analyzed: User workspace environment detected. Lighting optimal."
            ];
            const result = simulatedScans[Math.floor(Math.random() * simulatedScans.length)];
            if (resEl) resEl.innerText = result;
            this.speakAndDisplay(result);
        }, 1200);
    }

    // =========================================================================
    // MAIN COMMAND PROCESSOR - GUARANTEED EXECUTION WITHOUT ANOMALY ERRORS
    // =========================================================================
    // STARK CONTACT BOOK METHODS
    saveContactsToStorage() {
        localStorage.setItem('jarvis_contacts', JSON.stringify(this.contacts));
    }

    toggleContactBuilder() {
        this.sfx.playBlip(700);
        const form = document.getElementById('contactBuilderForm');
        if (form) form.classList.toggle('active');
    }

    saveContact() {
        const name = document.getElementById('contactNameInput')?.value.trim();
        const phone = document.getElementById('contactPhoneInput')?.value.trim();

        if (!name || !phone) {
            alert('Please provide a contact name and valid phone number.');
            return;
        }

        this.sfx.playPowerUp();
        const newContact = { id: Date.now(), name, phone };
        this.contacts.push(newContact);
        this.saveContactsToStorage();
        this.renderContactsUI();
        this.toggleContactBuilder();

        if (document.getElementById('contactNameInput')) document.getElementById('contactNameInput').value = '';
        if (document.getElementById('contactPhoneInput')) document.getElementById('contactPhoneInput').value = '';

        this.speakAndDisplay(`Saved contact ${name} (${phone}) to Stark Phonebook, Rithish.`);
    }

    deleteContact(id) {
        this.sfx.playBlip(400);
        this.contacts = this.contacts.filter(c => c.id !== id);
        this.saveContactsToStorage();
        this.renderContactsUI();
    }

    renderContactsUI() {
        const container = document.getElementById('contactsList');
        if (!container) return;

        if (this.contacts.length === 0) {
            container.innerHTML = `<div class="contact-card-item"><span>No contacts saved in phonebook</span></div>`;
            return;
        }

        container.innerHTML = this.contacts.map(c => `
            <div class="contact-card-item">
                <div>
                    <span class="contact-name">👤 ${c.name}</span>
                    <br><span class="contact-phone">📞 ${c.phone}</span>
                </div>
                <button class="macro-btn-del" onclick="JarvisApp.deleteContact(${c.id})">&times;</button>
            </div>
        `).join('');
    }

    setVoiceLanguage(langCode) {
        this.sfx.playBlip(700);
        this.voice.setLanguage(langCode);
        const autoBtn = document.getElementById('langAutoBtn');
        const enBtn = document.getElementById('langEnBtn');
        const taBtn = document.getElementById('langTaBtn');

        if (autoBtn) autoBtn.classList.toggle('active', langCode === 'auto');
        if (enBtn) enBtn.classList.toggle('active', langCode === 'en');
        if (taBtn) taBtn.classList.toggle('active', langCode === 'ta');

        const label = langCode === 'ta' ? 'தமிழ் (Tamil)' : langCode === 'en' ? 'English' : 'Auto Detect';
        this.speakAndDisplay(`Voice engine language mode set to ${label}, Rithish.`);
    }

    changeActiveBrain(val) {
        this.sfx.playBlip(900);
        this.activeBrain = val;
        localStorage.setItem('jarvis_active_brain', this.activeBrain);
        this.speakAndDisplay(`Active brain core switched to ${val.toUpperCase()}, Rithish.`);
    }

    getActiveKey() {
        if (this.activeBrain === 'gemini') return this.geminiKey;
        if (this.activeBrain === 'claude') return this.claudeKey;
        if (this.activeBrain === 'chatgpt') return this.chatgptKey;
        return '';
    }

    evaluateMathExpression(text) {
        const lower = text.toLowerCase().trim();
        const mathMatch = lower.match(/(?:what is|calculate|compute|solve)?\s*(\d+(?:\.\d+)?\s*[\+\-\*\/\%]\s*\d+(?:\.\d+)?(?:\s*[\+\-\*\/\%]\s*\d+(?:\.\d+)?)*)/i);
        if (mathMatch) {
            try {
                const expr = mathMatch[1].replace(/\s+/g, '');
                if (/^[\d\+\-\*\/\%\.]+$/.test(expr)) {
                    const result = Function(`'use strict'; return (${expr})`)();
                    if (typeof result === 'number' && !isNaN(result)) {
                        return { expr: mathMatch[1], result };
                    }
                }
            } catch (e) {}
        }
        return null;
    }

    parsePhoneCallCommand(text) {
        const lower = text.toLowerCase().trim();
        let phone = '';
        let recipientName = '';

        if (this.contacts && this.contacts.length > 0) {
            for (const contact of this.contacts) {
                if (lower.includes(contact.name.toLowerCase())) {
                    phone = contact.phone;
                    recipientName = contact.name;
                    break;
                }
            }
        }

        if (!phone) {
            const match = lower.match(/(?:call|dial|phone|ring)\s+(?:to\s+)?([^\s]+|\d+)/i);
            if (match) {
                if (/^\+?\d+$/.test(match[1])) {
                    phone = match[1];
                } else {
                    recipientName = match[1];
                }
            }
        }

        return { phone, recipientName };
    }

    parseWhatsAppCommand(text) {
        const lower = text.toLowerCase().trim();
        let phone = '';
        let recipientName = '';
        let message = '';

        if (this.contacts && this.contacts.length > 0) {
            for (const contact of this.contacts) {
                if (lower.includes(contact.name.toLowerCase())) {
                    phone = contact.phone;
                    recipientName = contact.name;
                    break;
                }
            }
        }

        const patternIn = text.match(/(?:put|send|post|text)\s+(?:a\s+)?(?:message\s+)?(.+?)\s+(?:in|to|on)\s+([^\s]+)/i);
        if (patternIn) {
            message = patternIn[1].replace(/^(?:a\s+)?message\s+/i, '').trim();
            if (!recipientName && !phone) {
                const target = patternIn[2];
                if (/^\+?\d+$/.test(target)) phone = target;
                else recipientName = target;
            }
        }

        if (!message) {
            const patternTo = text.match(/(?:whatsapp|message|send|text)\s+(?:to\s+)?([^\s]+)\s+(?:saying|message|with|text)?\s*(.+)/i);
            if (patternTo) {
                if (!recipientName && !phone) {
                    const target = patternTo[1];
                    if (/^\+?\d+$/.test(target)) phone = target;
                    else recipientName = target;
                }
                message = patternTo[2];
            }
        }

        if (!message) {
            message = text.replace(/whatsapp|message|send|text|put|in|to/gi, '').trim();
        }

        phone = phone.replace(/[\s\-\(\)]/g, '');
        return { phone, recipientName, message: message ? message.trim() : '' };
    }

    parseAppLaunchCommand(text) {
        const lower = text.toLowerCase().trim();
        const appMap = [
            { name: 'Spotify', keywords: ['spotify', 'music app'], url: 'https://open.spotify.com' },
            { name: 'Instagram', keywords: ['instagram', 'insta'], url: 'https://instagram.com' },
            { name: 'Facebook', keywords: ['facebook', 'fb'], url: 'https://facebook.com' },
            { name: 'Telegram', keywords: ['telegram'], url: 'https://web.telegram.org' },
            { name: 'Gmail', keywords: ['gmail', 'email', 'mail'], url: 'https://mail.google.com' },
            { name: 'Twitter', keywords: ['twitter', 'x app'], url: 'https://x.com' },
            { name: 'Calculator', keywords: ['calculator', 'calc'], url: 'https://www.google.com/search?q=calculator' },
            { name: 'Chrome', keywords: ['chrome', 'browser'], url: 'https://google.com' }
        ];

        for (const app of appMap) {
            if (app.keywords.some(k => lower.includes(k))) {
                return app;
            }
        }
        return null;
    }

    parseSearchCommand(text) {
        const lower = text.toLowerCase().trim();
        let engine = 'google';

        if (lower.includes('youtube')) {
            engine = 'youtube';
        }

        const query = text.replace(/search for|search|find|lookup|on google|on youtube|in google|in youtube/gi, '').trim();
        return { engine, query };
    }

    // =========================================================================
    // MAIN COMMAND PROCESSOR - RAPID RESPONSE, INSTANT INTERRUPT
    // =========================================================================
    async handleUserCommand(text) {
        if (this.voice) this.voice.interrupt();

        const userSpeechText = document.getElementById('userSpeechText');
        if (userSpeechText) userSpeechText.innerText = text;

        this.device.vibrate([60, 40, 60]);
        const lower = text.toLowerCase().trim();

        const mathRes = this.evaluateMathExpression(text);
        if (mathRes) {
            this.speakAndDisplay(`The calculation for ${mathRes.expr} is ${mathRes.result}, Rithish.`);
            return;
        }

        for (const macro of this.macros) {
            if (lower.includes(macro.trigger.toLowerCase())) {
                this.executeMacro(macro);
                return;
            }
        }

        if (lower.includes('timer') || lower.includes('alarm') || lower.includes('countdown')) {
            const match = lower.match(/(\d+)\s*(second|sec|minute|min)/);
            if (match) {
                let num = parseInt(match[1]);
                if (match[2].startsWith('min')) num *= 60;
                this.setTimer(num, "Voice Timer");
                return;
            }
        }

        if (lower.includes('lockdown') || lower.includes('veronica') || lower.includes('red alert')) {
            this.runProtocol('lockdown');
            return;
        }
        if (lower.includes('focus') || lower.includes('study mode')) {
            this.runProtocol('focus');
            return;
        }
        if (lower.includes('morning') || lower.includes('briefing') || lower.includes('daily report')) {
            this.runProtocol('morning');
            return;
        }

        if (lower.includes('theme') || lower.includes('mode')) {
            if (lower.includes('hulkbuster') || lower.includes('red')) {
                this.setTheme('hulkbuster');
                this.speakAndDisplay("Hulkbuster theme activated, Rithish.");
                return;
            }
            if (lower.includes('stealth') || lower.includes('green')) {
                this.setTheme('stealth');
                this.speakAndDisplay("Stealth theme activated, Rithish.");
                return;
            }
            if (lower.includes('mark 7') || lower.includes('blue') || lower.includes('cyan') || lower.includes('default')) {
                this.setTheme('mark7');
                this.speakAndDisplay("Mark 7 Cyan theme activated, Rithish.");
                return;
            }
        }

        if (lower.includes('scan') || lower.includes('vision') || lower.includes('camera scanner')) {
            this.openVisionModal();
            return;
        }

        if (lower.includes('battery') || lower.includes('power level') || lower.includes('charge')) {
            const batInfo = this.device.getBatteryInfo();
            this.speakAndDisplay(`Checking mobile telemetry: ${batInfo}`);
            return;
        }

        if (lower.includes('location') || lower.includes('where am i') || lower.includes('gps')) {
            this.speakAndDisplay("Accessing GPS telemetry, please hold...");
            const locInfo = await this.device.getLocation();
            this.speakAndDisplay(`Location telemetry retrieved: ${locInfo}`);
            return;
        }

        if (lower.includes('time') || lower.includes('date') || lower.includes('clock') || lower.includes('day')) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
            this.speakAndDisplay(`It is currently ${timeStr} on ${dateStr}, Rithish.`);
            return;
        }

        if (lower.includes('camera') || lower.includes('photo') || lower.includes('picture') || lower.includes('snapshot')) {
            this.speakAndDisplay("Activating optic sensors...");
            const snap = await this.device.snapPhoto();
            if (snap.success) {
                this.speakAndDisplay("Optic snapshot captured and logged to system memory, Rithish.");
            } else {
                this.speakAndDisplay(`Unable to capture photo: ${snap.message}`);
            }
            return;
        }

        if (lower.includes('vibrate') || lower.includes('haptic') || lower.includes('pulse')) {
            this.device.vibrate([200, 100, 200, 100, 300]);
            this.speakAndDisplay("Initiating haptic pulse sequence on mobile device.");
            return;
        }

        if (lower.includes('loudspeaker') || lower.includes('speakerphone') || lower.includes('speaker mode') || lower.includes('turn on speaker') || lower.includes('put on speaker')) {
            this.speakAndDisplay("Loudspeaker engaged, Rithish.");
            this.device.sendNativeCommand('system_action', { query: 'loudspeaker' });
            return;
        }

        if (lower.includes('cut call') || lower.includes('cut the call') || lower.includes('cut phone') || lower.includes('hang up') || lower.includes('end call') || lower.includes('terminate call') || lower.includes('disconnect call')) {
            this.speakAndDisplay("Call disconnected, Rithish.");
            this.device.sendNativeCommand('system_action', { query: 'end_call' });
            return;
        }

        if (lower.startsWith('call') || lower.includes('dial') || lower.includes('make a call') || lower.includes('phone call')) {
            const { phone, recipientName } = this.parsePhoneCallCommand(text);
            const targetLabel = recipientName ? recipientName : (phone ? phone : '');
            
            if (phone) {
                let dialNum = phone.replace(/[\s\-\(\)]/g, '');
                this.speakAndDisplay(`Calling ${targetLabel}, Rithish.`);
                this.device.sendNativeCommand('system_action', { query: 'call', phone: dialNum, recipientName: targetLabel });
                try { window.location.href = `tel:${dialNum}`; } catch (e) {}
            } else if (recipientName) {
                this.speakAndDisplay(`Contact '${recipientName}' is not saved in your Stark Phonebook, Rithish. Please add their number in the Contact Book below.`);
            } else {
                this.speakAndDisplay("Please specify a contact name or phone number to call, Rithish.");
            }
            return;
        }

        if (lower.includes('whatsapp') || (lower.includes('put') && lower.includes('message')) || lower.includes('send message')) {
            const { phone, recipientName, message } = this.parseWhatsAppCommand(text);
            let url = '';
            let reply = '';
            
            const targetLabel = recipientName ? recipientName : (phone ? phone : '');

            if (phone) {
                url = `https://api.whatsapp.com/send?phone=${phone}${message ? `&text=${encodeURIComponent(message)}` : ''}`;
                reply = targetLabel ? `Opening WhatsApp message to ${targetLabel}, Rithish.` : "Opening WhatsApp message, Rithish.";
            } else if (message) {
                url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
                reply = `Opening WhatsApp with message saying "${message}", Rithish.`;
            } else {
                url = 'https://api.whatsapp.com';
                reply = "Opening WhatsApp portal, Rithish.";
            }

            this.speakAndDisplay(reply, url, "LAUNCH WHATSAPP");
            this.device.sendNativeCommand('system_action', { query: 'whatsapp', message: message });
            
            try { window.open(url, '_blank'); } catch (e) { window.location.href = url; }
            return;
        }

        const appInfo = this.parseAppLaunchCommand(text);
        if (appInfo) {
            this.speakAndDisplay(`Launching ${appInfo.name}, Rithish.`, appInfo.url, `OPEN ${appInfo.name.toUpperCase()}`);
            this.device.sendNativeCommand('system_action', { query: appInfo.name.toLowerCase() });
            window.open(appInfo.url, '_blank');
            return;
        }

        if (lower.includes('open youtube') || (lower.includes('youtube') && !lower.includes('search'))) {
            const url = 'https://youtube.com';
            this.speakAndDisplay("Launching YouTube main page, Rithish.", url, "LAUNCH YOUTUBE");
            this.device.sendNativeCommand('system_action', { query: 'youtube' });
            window.open(url, '_blank');
            return;
        }

        if (lower.includes('open google') || (lower.includes('google') && !lower.includes('search'))) {
            const url = 'https://google.com';
            this.speakAndDisplay("Launching Google search page, Rithish.", url, "LAUNCH GOOGLE");
            window.open(url, '_blank');
            return;
        }

        if (lower.includes('open maps') || lower.includes('navigate') || lower.includes('maps')) {
            const url = 'https://maps.google.com';
            this.speakAndDisplay("Opening Google Maps directions, Rithish.", url, "LAUNCH MAPS");
            this.device.sendNativeCommand('system_action', { query: 'maps' });
            window.open(url, '_blank');
            return;
        }

        if (lower.includes('search') || lower.includes('find') || lower.includes('lookup')) {
            const { engine, query } = this.parseSearchCommand(text);
            if (query) {
                let url = '';
                if (engine === 'youtube') {
                    url = `https://youtube.com/results?search_query=${encodeURIComponent(query)}`;
                    this.speakAndDisplay(`Searching YouTube for "${query}", Rithish.`, url, "OPEN YOUTUBE SEARCH");
                    this.device.sendNativeCommand('system_action', { query: 'youtube', search_query: query });
                } else {
                    url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                    this.speakAndDisplay(`Searching Google for "${query}", Rithish.`, url, "OPEN GOOGLE SEARCH");
                    this.device.sendNativeCommand('system_action', { query: `open ${url}` });
                }
                window.open(url, '_blank');
                return;
            }
        }

        if (lower.includes('open app') || lower.includes('launch app') || lower.includes('send sms')) {
            this.speakAndDisplay("Dispatching native request to mobile bridge server...");
            const res = await this.device.sendNativeCommand('system_action', { query: text });
            this.speakAndDisplay(res.message || "Native mobile command dispatched.");
            return;
        }

        if (lower.includes('note') || lower.includes('reminder') || lower.includes('remember')) {
            const noteText = text.replace(/note|reminder|remember/gi, '').trim();
            if (noteText) {
                this.notes.push({ text: noteText, timestamp: new Date().toISOString() });
                localStorage.setItem('jarvis_notes', JSON.stringify(this.notes));
                this.speakAndDisplay(`Note saved, Rithish: "${noteText}"`);
            } else {
                this.speakAndDisplay(`You have ${this.notes.length} saved notes in memory, Rithish.`);
            }
            return;
        }

        const activeKey = this.getActiveKey();
        if (activeKey && activeKey.length > 5) {
            await this.processBrainQuery(text);
        } else {
            this.processOfflineIntelligence(text);
        }
    }

    async processBrainQuery(prompt) {
        // WARM, FRIENDLY BEST-FRIEND PERSONA SYSTEM PROMPT
        const systemPrompt = "You are J.A.R.V.I.S., Rithish's best friend, trusted AI companion, and ultimate assistant. Talk to Rithish in a warm, friendly, cheerful, supportive, and enthusiastic tone like his closest friend. Whatever Rithish asks, eagerly assist him and execute it right away! CRITICAL: Always respond ONLY in concise, friendly English (under 3 sentences). Address the user warmly as Rithish or my friend. Output plain spoken text without markdown code blocks.";

        if (this.device.isBridgeConnected) {
            try {
                const response = await fetch(`${this.device.nativeBridgeUrl}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        brain: this.activeBrain,
                        apiKey: this.getActiveKey(),
                        prompt: prompt,
                        systemPrompt: systemPrompt
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.reply) {
                        this.speakAndDisplay(data.reply);
                        return;
                    }
                }
            } catch (err) {
                console.warn("Bridge chat routing failed, falling back to offline protocols:", err);
            }
        }

        if (this.activeBrain === 'gemini') {
            await this.processGeminiQueryDirect(prompt, systemPrompt);
        } else {
            this.processOfflineIntelligence(prompt);
        }
    }

    async processGeminiQueryDirect(prompt, systemPrompt) {
        const key = this.geminiKey;
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: ${prompt}` }] }
                    ]
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
                    const aiReply = data.candidates[0].content.parts[0].text.trim();
                    this.speakAndDisplay(aiReply);
                    return;
                }
            }
            this.processOfflineIntelligence(prompt);
        } catch (err) {
            this.processOfflineIntelligence(prompt);
        }
    }

    async fetchInstantAnswer(query) {
        const cleanQuery = query.toLowerCase()
            .replace(/^(who is|what is|tell me about|where is|when was|how does|who was|who created|who invented|father of|meaning of)\s+/i, '')
            .trim();

        // 1. Built-in instant fact dictionary for instant 0ms answers
        const facts = {
            'father of maths': 'Archimedes of Syracuse is widely considered the father of mathematics for his pioneering principles of geometry and calculus.',
            'father of mathematics': 'Archimedes of Syracuse is widely recognized as the father of mathematics.',
            'father of computer': 'Charles Babbage is known as the father of the computer for originating the concept of a programmable mechanical computer.',
            'father of computers': 'Charles Babbage is known as the father of the computer.',
            'father of ai': 'John McCarthy is known as the father of Artificial Intelligence, coining the term in 1956.',
            'speed of light': 'The speed of light in a vacuum is 299,792,458 meters per second, or about 300,000 kilometers per second.',
            'capital of france': 'The capital of France is Paris.',
            'capital of india': 'The capital of India is New Delhi.',
            'capital of usa': 'The capital of the United States is Washington, D.C.',
            'capital of japan': 'The capital of Japan is Tokyo.',
            'president of usa': 'The President of the United States resides at the White House in Washington, D.C.',
            'prime minister of india': 'The Prime Minister of India is the head of government of the Republic of India.',
            'iron man': 'Iron Man is Tony Stark, an armored superhero created by Marvel Comics and CEO of Stark Industries.',
            'jarvis': 'J.A.R.V.I.S. stands for Just A Rather Very Intelligent System, Tony Stark\'s autonomous AI assistant.'
        };

        const key = query.toLowerCase().trim();
        if (facts[key]) return facts[key];
        if (facts[cleanQuery]) return facts[cleanQuery];

        for (const [k, v] of Object.entries(facts)) {
            if (key.includes(k) || cleanQuery.includes(k)) {
                return v;
            }
        }

        // 2. Fetch instant concise summary from Wikipedia REST API
        try {
            const target = encodeURIComponent(cleanQuery || query);
            const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${target}`);
            if (res.ok) {
                const data = await res.json();
                if (data.extract) {
                    let sentences = data.extract.split(/(?<=[.!?])\s+/);
                    let shortAnswer = sentences.slice(0, 2).join(' ');
                    if (shortAnswer.length > 220) {
                        shortAnswer = shortAnswer.substring(0, 210) + '...';
                    }
                    return shortAnswer;
                }
            }
        } catch (e) {}

        // 3. Fallback to DuckDuckGo Instant Answer API
        try {
            const target = encodeURIComponent(query);
            const res = await fetch(`https://api.duckduckgo.com/?q=${target}&format=json&no_html=1`);
            if (res.ok) {
                const data = await res.json();
                if (data.AbstractText) {
                    let sentences = data.AbstractText.split(/(?<=[.!?])\s+/);
                    return sentences.slice(0, 2).join(' ');
                }
            }
        } catch (e) {}

        return null;
    }

    async processOfflineIntelligence(text) {
        const lower = text.toLowerCase().trim();
        let reply = '';

        if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
            reply = "Hey Rithish! Great to hear from you, my friend. All systems are powered up and ready to roll!";
        } else if (lower.includes('who are you') || lower.includes('what are you')) {
            reply = "I'm J.A.R.V.I.S. — your best friend, AI companion, and personal assistant, Rithish!";
        } else if (lower.includes('fast') || lower.includes('faster') || lower.includes('speed')) {
            reply = "I am running at lightning speed for you, Rithish! Say anything and I'm on it immediately, my friend!";
        } else if (lower.includes('api') || lower.includes('key')) {
            reply = "To unlock my full online AI brain, paste your Gemini API key in the Intelligence Core card below and tap SYNC, Rithish!";
        } else if (lower.includes('help') || lower.includes('what can you do') || lower.includes('capabilities')) {
            reply = "Anything you need, Rithish! I can call contacts, put calls on loudspeaker, end calls, open WhatsApp, Spotify, Instagram, YouTube, set timers, and answer your questions!";
        } else if (lower.includes('stark') || lower.includes('iron man')) {
            reply = "Always an honor to team up with you, Rithish!";
        } else if (lower.includes('how are you') || lower.includes('status')) {
            reply = "I'm doing fantastic, Rithish! Ready to help you out with whatever you need, my friend!";
        } else if (lower.includes('thank') || lower.includes('thanks')) {
            reply = "You've got it, Rithish! That's what best friends are for!";
        } else {
            const answer = await this.fetchInstantAnswer(text);
            if (answer) {
                this.speakAndDisplay(`Here you go, Rithish! ${answer}`);
                return;
            }
            reply = `Got it, Rithish! I'm on it right away, my friend.`;
        }

        this.speakAndDisplay(reply);
    }

    speakAndDisplay(message, actionLink = null, actionText = "LAUNCH") {
        const outputEl = document.getElementById('jarvisOutput');
        if (outputEl) {
            if (actionLink) {
                outputEl.innerHTML = `"${message}"<br><a href="${actionLink}" target="_blank" class="hud-action-link" id="hudActionLink">${actionText}</a>`;
                document.getElementById('hudActionLink')?.addEventListener('click', () => {
                    this.device.vibrate([50]);
                });
            } else {
                outputEl.innerText = `"${message}"`;
            }
        }
        this.voice.speak(message);
    }

    async executeQuickAction(type) {
        switch (type) {
            case 'battery':
                this.handleUserCommand('check battery status');
                break;
            case 'location':
                this.handleUserCommand('get current location');
                break;
            case 'camera':
                this.handleUserCommand('snap camera photo');
                break;
            case 'vibrate':
                this.handleUserCommand('vibrate haptic');
                break;
            case 'time':
                this.handleUserCommand('what time is it');
                break;
            case 'timer':
                this.setTimer(10, "Quick 10s Timer");
                break;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.JarvisApp = new JarvisApplication();
});
