# J.A.R.V.I.S. Autonomous Mobile AI System

A state-of-the-art **Iron Man J.A.R.V.I.S. AI Agent** designed specifically for personal assistance, hands-free voice interaction, and mobile phone control.

---

## 🌟 Key Capabilities & Features

1. **Futuristic Arc Reactor HUD Interface**:
   - Interactive 2D/3D Canvas audio spectrum visualizer.
   - Pulsing energy core, dynamic concentric rings, and audio reactivity.
   - Live telemetry status bar (Battery %, Network status, GPS location, Native Mobile Bridge).

2. **Autonomous Voice Engine**:
   - **Speech-to-Text (STT)**: Continuous microphone listening with hotword detection (`"Jarvis"`, `"Hey Jarvis"`).
   - **Text-to-Speech (TTS)**: Custom British intelligent assistant voice synthesis with pitch and speed tuning.
   - Haptic vibration responses on supported mobile devices.

3. **Mobile Hardware Telemetry & Control**:
   - **Battery Monitor**: Live percentage & charging state.
   - **GPS Telemetry**: Real-time latitude and longitude retrieval.
   - **Optic Sensors**: Voice-triggered camera snapshot capability.
   - **Haptic Pulse Engine**: Voice-triggered vibration alerts.
   - **Memory System**: Saves quick notes and reminders to local storage.

4. **Intelligence Core (Gemini AI Integration)**:
   - Built-in rule engine for instant offline response.
   - Supports Google Gemini API key for advanced natural language reasoning, tool execution, and rich conversation.

---

## 📱 Mobile Installation & Setup

### Option 1: Install as a Native Mobile Web App (PWA)
You can install J.A.R.V.I.S. directly onto your mobile phone's home screen like a native app:

#### On Android (Chrome):
1. Serve or open the web app URL in Chrome on your phone.
2. Tap the **3 dots menu** (`⋮`) in the top right.
3. Select **"Add to Home screen"** or **"Install app"**.
4. J.A.R.V.I.S. will appear on your home screen with the Arc Reactor icon and run in full-screen mode!

#### On iPhone / iPad (Safari):
1. Open the web app URL in Safari.
2. Tap the **Share button** at the bottom.
3. Scroll and select **"Add to Home Screen"**.

---

### Option 2: Deep Phone Control via Android Native Bridge (Termux)
To allow J.A.R.V.I.S. to perform **deep phone actions** (such as launching native phone apps like WhatsApp/YouTube/Maps, making phone calls, sending SMS, or toggling device settings):

1. **Install Termux** on your Android phone (from F-Droid or GitHub).
2. Install the **Termux:API** app from F-Droid.
3. In Termux, run:
   ```bash
   pkg update && pkg install termux-api python -y
   ```
4. Copy `mobile_bridge/jarvis_android_bridge.py` to your phone and start the server:
   ```bash
   python jarvis_android_bridge.py
   ```
5. J.A.R.V.I.S. web interface will automatically connect to `http://localhost:5050` and display **NATIVE BRIDGE: CONNECTED**!

---

## 🚀 Quick Start (Local Server)

To start a local development server on your computer:

```bash
# Option A: Using Python built-in server
python -m http.server 8080

# Option B: Using Node npx serve
npx serve .
```

Then open `http://localhost:8080` in your web browser.

---

## 🛠️ Voice Commands Examples

- `"Hey Jarvis, check battery status"`
- `"Jarvis, where am I right now?"`
- `"Jarvis, what time is it?"`
- `"Jarvis, snap a photo"`
- `"Jarvis, open WhatsApp / launch YouTube"`
- `"Jarvis, remember to pick up groceries at 5 PM"`
- `"Hey Jarvis, tell me a quick fact about space"`
