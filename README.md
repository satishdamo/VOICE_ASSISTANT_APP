# 🎤 Voice Assistant App

A mobile-optimized React interface for your GenAI-powered voice assistant.  
Push-to-talk recording, real-time waveform animation, transcript playback, and chatbot response — all in one elegant UI.

---

## 🚀 Features

### 🎙️ Push-to-Talk Recording

- Tap and hold to record voice input
- Uses `MediaRecorder` API with `audio/webm;codecs=opus`
- Sends finalized audio blob to backend via WebSocket

### 📊 Real-Time Waveform Animation

- Visualizes live microphone input using `AnalyserNode`
- Smooth canvas rendering with `requestAnimationFrame`
- Automatically stops when recording ends

### 📝 Transcript Playback

- Transcribed text animated word-by-word with fade-in
- Responsive layout for mobile and desktop
- Transcript synced with backend response lifecycle

### 🤖 Chatbot Response

- GenAI response streamed as audio
- Playback triggers animated chatbot avatar
- Progress bar updates in real time

### 📱 Mobile-First UX

- Touch-friendly controls (`onTouchStart`, `onTouchEnd`)
- Spinner overlay during backend processing
- Playback controls and download button for response audio

---

## 🧩 Tech Stack

| Layer         | Technology                    |
| ------------- | ----------------------------- |
| UI Framework  | React + TypeScript            |
| Audio Input   | MediaRecorder API             |
| Visualization | Web Audio API + Canvas        |
| Transport     | WebSocket (binary streaming)  |
| Styling       | CSS Modules (`VoiceChat.css`) |

---

## 📦 Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```
