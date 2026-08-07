/**
 * J.A.R.V.I.S. Mobile Device Bridge
 * Connects the web app to native mobile hardware APIs & native server endpoints.
 */
class JarvisDeviceBridge {
    constructor() {
        this.battery = null;
        this.geolocation = null;
        this.nativeBridgeUrl = 'http://localhost:5050'; // Default Termux / local bridge IP
        this.isBridgeConnected = false;
        
        this.initBattery();
        this.checkNativeBridge();
    }

    // 1. BATTERY STATUS
    async initBattery() {
        if ('getBattery' in navigator) {
            try {
                this.battery = await navigator.getBattery();
                this.battery.addEventListener('levelchange', () => this.updateBatteryUI());
                this.battery.addEventListener('chargingchange', () => this.updateBatteryUI());
                this.updateBatteryUI();
            } catch (err) {
                console.warn('Battery API unavailable:', err);
            }
        }
    }

    updateBatteryUI() {
        if (!this.battery) return;
        const level = Math.round(this.battery.level * 100);
        const charging = this.battery.charging;
        
        const batVal = document.getElementById('batteryVal');
        const batBar = document.getElementById('batteryBar');
        
        if (batVal) batVal.innerText = `${level}%${charging ? ' ⚡' : ''}`;
        if (batBar) batBar.style.width = `${level}%`;
    }

    getBatteryInfo() {
        if (this.battery) {
            const level = Math.round(this.battery.level * 100);
            const charging = this.battery.charging;
            return `Battery is at ${level} percent${charging ? ' and currently charging' : ''}.`;
        }
        return "Battery telemetry unavailable.";
    }

    // 2. GEOLOCATION
    async getLocation() {
        return new Promise((resolve) => {
            if (!('geolocation' in navigator)) {
                resolve("Geolocation is not supported on this device.");
                return;
            }

            const locEl = document.getElementById('locationVal');
            if (locEl) locEl.innerText = "LOCATING...";

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude.toFixed(4);
                    const lon = pos.coords.longitude.toFixed(4);
                    if (locEl) locEl.innerText = `${lat}, ${lon}`;
                    resolve(`Latitude ${lat}, Longitude ${lon}`);
                },
                (err) => {
                    if (locEl) locEl.innerText = "DENIED/OFF";
                    resolve("Location access denied or unavailable.");
                },
                { timeout: 8000 }
            );
        });
    }

    // 3. HAPTIC VIBRATION
    vibrate(pattern = [100, 50, 100]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
            return true;
        }
        return false;
    }

    // 4. CAMERA SNAPSHOT
    async snapPhoto() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return { success: false, message: "Camera API unavailable." };
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            const video = document.createElement('video');
            video.srcObject = stream;
            await video.play();

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);

            // Stop track
            stream.getTracks().forEach(track => track.stop());

            const dataUrl = canvas.toDataURL('image/jpeg');
            return { success: true, imageData: dataUrl, message: "Photo captured successfully." };
        } catch (err) {
            return { success: false, message: `Camera error: ${err.message}` };
        }
    }

    // 5. WEB NOTIFICATIONS
    async sendNotification(title, body) {
        if (!('Notification' in window)) return false;
        
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: 'icon.png' });
            return true;
        } else if (Notification.permission !== 'denied') {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
                new Notification(title, { body, icon: 'icon.png' });
                return true;
            }
        }
        return false;
    }

    // 6. NATIVE PHONE BRIDGE (Termux / Python Local Server)
    async checkNativeBridge() {
        const bridgeEl = document.getElementById('bridgeStatus');
        try {
            const res = await fetch(`${this.nativeBridgeUrl}/api/status`, { method: 'GET' });
            if (res.ok) {
                this.isBridgeConnected = true;
                if (bridgeEl) {
                    bridgeEl.innerText = "CONNECTED";
                    bridgeEl.className = "m-val bridge-on";
                }
                return true;
            }
        } catch (err) {
            this.isBridgeConnected = false;
            if (bridgeEl) {
                bridgeEl.innerText = "OFFLINE";
                bridgeEl.className = "m-val bridge-off";
            }
        }
        return false;
    }

    async sendNativeCommand(action, params = {}) {
        if (!this.isBridgeConnected) {
            const connected = await this.checkNativeBridge();
            if (!connected) {
                return { success: false, message: "Native Mobile Bridge is offline. Please run jarvis_android_bridge.py on your phone." };
            }
        }

        try {
            const res = await fetch(`${this.nativeBridgeUrl}/api/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, params })
            });
            const data = await res.json();
            return data;
        } catch (err) {
            return { success: false, message: `Bridge dispatch error: ${err.message}` };
        }
    }
}

window.JarvisDeviceBridge = JarvisDeviceBridge;
