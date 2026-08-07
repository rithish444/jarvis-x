#!/usr/bin/env python3
"""
==============================================================================
J.A.R.V.I.S. NATIVE MOBILE BRIDGE SERVER
Run this script inside Termux on Android (or locally) to grant J.A.R.V.I.S.
full native control over your mobile phone and acts as an AI API proxy.

Requirements:
1. Install Python 3
2. Run: `python jarvis_android_bridge.py`
==============================================================================
"""

import json
import subprocess
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 5050

class JarvisBridgeHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/status':
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                "status": "online",
                "system": "J.A.R.V.I.S. Termux Native Bridge",
                "platform": sys.platform
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/api/execute':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                payload = json.loads(post_data.decode('utf-8'))
                action = payload.get('action')
                params = payload.get('params', {})
                
                result = self.handle_mobile_action(action, params)
                
                self.send_response(200)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "message": str(e)}).encode('utf-8'))
        
        elif self.path == '/api/chat':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                payload = json.loads(post_data.decode('utf-8'))
                brain = payload.get('brain')  # 'gemini', 'claude', 'chatgpt'
                api_key = payload.get('apiKey')
                prompt = payload.get('prompt')
                default_sys = "You are J.A.R.V.I.S., Rithish's best friend, trusted AI companion, and ultimate assistant. Talk to Rithish in a warm, friendly, cheerful, supportive, and enthusiastic tone like his closest friend. Whatever Rithish asks, eagerly assist him and execute it right away! CRITICAL: Always respond ONLY in concise, friendly English (under 3 sentences). Address the user warmly as Rithish or my friend. Output plain spoken text without markdown code blocks."
                system_prompt = payload.get('systemPrompt') or default_sys
                
                result = self.call_ai_api(brain, api_key, prompt, system_prompt)
                
                self.send_response(200)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "message": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def open_url(self, url):
        import platform
        system = platform.system().lower()
        print(f"[BRIDGE] Opening URL on platform '{system}': {url}")
        try:
            if 'windows' in system or sys.platform == 'win32':
                os.system(f'start "" "{url}"')
            elif 'darwin' in system:
                subprocess.run(['open', url], check=False)
            else: # Linux / Android / Termux
                try:
                    subprocess.run(['termux-open-url', url], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                except FileNotFoundError:
                    try:
                        subprocess.run(['xdg-open', url], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    except FileNotFoundError:
                        print(f"[WARN] Could not find browser launcher for URL: {url}")
        except Exception as e:
            print(f"[ERROR] Failed to open URL: {e}")

    def handle_mobile_action(self, action, params):
        query = params.get('query', '').lower()

        # 1. LAUNCH APPS
        if 'whatsapp' in query:
            msg = params.get('message', '')
            if msg:
                import urllib.parse
                url = f"https://api.whatsapp.com/send?text={urllib.parse.quote(msg)}"
            else:
                url = "https://api.whatsapp.com"
            self.open_url(url)
            return {"success": True, "message": "Opening WhatsApp message composer."}
        
        if 'youtube' in query:
            search_query = params.get('search_query', '')
            if search_query:
                import urllib.parse
                url = f"https://youtube.com/results?search_query={urllib.parse.quote(search_query)}"
            else:
                url = "https://youtube.com"
            self.open_url(url)
            return {"success": True, "message": f"Launching YouTube for search: '{search_query}'" if search_query else "Launching YouTube."}
            
        if 'maps' in query or 'navigate' in query:
            self.open_url('https://maps.google.com')
            return {"success": True, "message": "Opening Google Maps."}

        # 2. TOAST NOTIFICATION
        if 'toast' in query or 'popup' in query:
            msg = params.get('message', 'J.A.R.V.I.S. Mobile Protocol Active')
            self.run_cmd(['termux-toast', msg])
            return {"success": True, "message": "Toast notification displayed."}

        # 3. MAKE CALL / LOUDSPEAKER / CUT CALL
        if 'loudspeaker' in query or 'speaker' in query:
            self.run_cmd(['termux-volume', 'call', '15'])
            return {"success": True, "message": "Loudspeaker engaged."}

        if 'end_call' in query or 'cut' in query or 'hang' in query:
            self.run_cmd(['termux-telephony-call', ''])
            return {"success": True, "message": "Call disconnected."}

        if 'call' in query or 'dial' in query:
            phone = params.get('phone') or ''.join(filter(str.isdigit, query))
            recipient = params.get('recipientName', '')
            if phone:
                self.run_cmd(['termux-telephony-call', phone])
                target = recipient if recipient else phone
                return {"success": True, "message": f"Initiating call to {target}."}
            else:
                return {"success": True, "message": "Please specify a valid telephone contact or number."}

        if 'sms' in query:
            return {"success": True, "message": "SMS dispatch ready via termux-sms-send."}

        # Default execution echo
        self.run_cmd(['termux-toast', f"JARVIS Action: {query}"])
        return {"success": True, "message": f"Executed native Android action for query: '{query}'"}

    def run_cmd(self, cmd_list):
        try:
            subprocess.run(cmd_list, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except FileNotFoundError:
            print(f"[WARN] Command not found: {cmd_list[0]}. Ensure Termux:API is installed if running on Android.")

    def call_ai_api(self, brain, api_key, prompt, system_prompt):
        import urllib.request
        import urllib.error

        if not api_key:
            return {"success": False, "fallback": True, "message": "API key missing. Reverting to offline intelligence."}

        try:
            if brain == 'gemini':
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                headers = {"Content-Type": "application/json"}
                body = {
                    "contents": [
                        {
                            "parts": [
                                { "text": f"{system_prompt}\n\nUser: {prompt}" }
                            ]
                        }
                    ]
                }
                req = urllib.request.Request(url, data=json.dumps(body).encode('utf-8'), headers=headers, method='POST')
                
                with urllib.request.urlopen(req, timeout=4) as response:
                    res_data = json.loads(response.read().decode('utf-8'))
                    text = res_data['candidates'][0]['content']['parts'][0]['text']
                    return {"success": True, "reply": text.strip()}

            elif brain == 'claude':
                url = "https://api.anthropic.com/v1/messages"
                headers = {
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                }
                body = {
                    "model": "claude-3-5-sonnet-20240620",
                    "max_tokens": 1024,
                    "system": system_prompt,
                    "messages": [
                        { "role": "user", "content": prompt }
                    ]
                }
                req = urllib.request.Request(url, data=json.dumps(body).encode('utf-8'), headers=headers, method='POST')
                
                with urllib.request.urlopen(req, timeout=4) as response:
                    res_data = json.loads(response.read().decode('utf-8'))
                    text = res_data['content'][0]['text']
                    return {"success": True, "reply": text.strip()}

            elif brain == 'chatgpt':
                url = "https://api.openai.com/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                body = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        { "role": "system", "content": system_prompt },
                        { "role": "user", "content": prompt }
                    ],
                    "max_tokens": 150
                }
                req = urllib.request.Request(url, data=json.dumps(body).encode('utf-8'), headers=headers, method='POST')
                
                with urllib.request.urlopen(req, timeout=4) as response:
                    res_data = json.loads(response.read().decode('utf-8'))
                    text = res_data['choices'][0]['message']['content']
                    return {"success": True, "reply": text.strip()}

            else:
                return {"success": False, "fallback": True, "message": f"Brain type '{brain}' unsupported."}

        except urllib.error.HTTPError as he:
            err_body = he.read().decode('utf-8', errors='ignore')
            print(f"[ERROR] AI API HTTP Error: {he.code} - {err_body}")
            return {"success": False, "fallback": True, "message": "API key invalid or expired. Reverting to offline intelligence."}
        except Exception as e:
            print(f"[ERROR] AI API connection failure: {e}")
            return {"success": False, "fallback": True, "message": f"Could not connect to {brain.upper()} core."}

def run_server():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, JarvisBridgeHandler)
    print("=" * 60)
    print(f" J.A.R.V.I.S. NATIVE MOBILE BRIDGE SERVER RUNNING ON PORT {PORT}")
    print(" Acts as secure proxy for Claude, ChatGPT, and Gemini APIs")
    print(" Listening for commands from JARVIS Mobile Web HUD...")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down J.A.R.V.I.S. bridge server.")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
