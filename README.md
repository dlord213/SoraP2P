# Sora P2P — Secure End-to-End Encrypted File Transfer

Sora (**[sorap2p.me](https://sorap2p.me)**) is a minimalist, browser-based, zero-registration, E2E encrypted peer-to-peer file sharing utility.

<p align="center">
  <img src="public/sora_mascot_transparent.png" width="128" alt="Sora Mascot" />
</p>

---

## ⚡ Key Features

- 🔒 **Zero Storage / Zero Accounts**: Files never touch the cloud. Connection keys are never logged or stored server-side.
- 🔑 **Local 256-bit AES-GCM Encryption**: Encryption occurs directly in the browser's memory via the Web Crypto API. Decryption keys are stored inside the URL hash fragment (`#`) and are never sent over HTTP requests.
- 📡 **WebRTC Data Channels**: Encrypted chunks stream directly between browser windows.

---

## 🛠️ Architecture & Under the Hood

```
[ Sender Browser ]                                [ Receiver Browser ]
       │                                                   ▲
       │ 1. Read file chunks (32KB)                        │ 4. Decrypt locally
       ▼                                                   │    Assemble to Blob
  [ Local AES-GCM Encrypt ]                                │    Trigger Auto-Save
       │                                                   │
       │ 2. Direct WebRTC Data Channel Tunnel              │
       └───────────────────────────────────────────────────┘
```

1. **Signaling Handshake**: Peers discover each other via a lightweight WebSocket signaling lobby. Once connected, signaling server is bypassed.
2. **Backpressure management**: Avoids browser memory saturation by pausing file reading when the WebRTC `bufferedAmount` threshold exceeds 64KB, resuming dynamically.
3. **Decryption Key Isolation**: Decryption secrets are derived from the URL `#` hash string. Since browsers never transmit hash strings to internet routers or signal servers, the transfer key remains exclusively yours.

---

## 🚀 Getting Started

### 1. Installation

Install dependencies:

```bash
npm install
```

### 2. Run the Development Server

Starts the React Router client (port `5173`, falling back to `5174`/`5175` if bound) alongside the WebSocket signaling server (port `3001`):

```bash
npm run dev
```

### 3. Build for Production

Compiles optimization bundles for client static assets and server-side rendering (SSR):

```bash
npm run build
```

---

## 📦 Directory Structure

```
├── app/
│   ├── context/          # Core WebRTC connection state and AES-GCM pipelines
│   ├── routes/           # Routing screens (Home, Translogs, Terminal, Docs)
│   ├── app.css           # Styling system config, CRT scanlines, and mascot keyframes
│   ├── root.tsx          # Global hotel layout structure & theme providers
│   └── routes.ts         # Route module definitions
├── public/               # Transparent sprites and asset images
├── generated/assets/     # High-resolution branding outputs
└── signaling.ts          # Orchestrates peer matching handshakes
```

---
