# Sora P2P — Secure End-to-End Encrypted File Transfer

Sora (**[sorap2p.me](https://sorap2p.me)**) is a minimalist, retro-Habbo-style browser-based, zero-registration, E2E encrypted peer-to-peer file sharing utility.

<p align="center">
  <img src="public/sora_mascot_transparent.png" width="128" alt="Sora Mascot" />
</p>

---

## ⚡ Key Features

- 🔒 **Zero Storage / Zero Accounts**: Files never touch the cloud. Connection keys are never logged or stored server-side.
- 🔑 **Local 256-bit AES-GCM Encryption**: Encryption occurs directly in the browser's memory via the Web Crypto API. Decryption keys are stored inside the URL hash fragment (`#`) and are never sent over HTTP requests.
- 🤝 **Secure ECDH Key Exchange Handshake**: If users manually enter a 6-digit passcode (without a pre-shared link hash), Sora negotiates a secure key using **Elliptic-Curve Diffie-Hellman (P-256)** over the signaling channel to guarantee cryptographic strength and protect against passive network sniffers.
- 📁 **Folder & Multi-file Zipping (JSZip)**: Select entire directory trees or drag multiple files. Sora compresses them on-the-fly inside the browser memory before streaming the resulting zip file.
- 🔄 **Resumable Transfers**: If your connection drops midway, Sora preserves your transfer buffer. Upon reconnecting, the receiver requests transmission from the exact byte offset it left off, avoiding complete restarts.
- 🛡️ **SHA-256 integrity Verification**: Calculates cryptographic checksums on files/zips and compares them after assembly to guarantee error-free delivery.
- 🔊 **Synthesized 8-Bit Sound Design**: Utilizes the native Web Audio API to generate vintage 2003 Shockwave/Habbo-style sound chimes for click feedbacks, connection handshakes, success metrics, and warnings.
- 📡 **WebRTC Data Channels**: Encrypted chunks stream directly between browser windows.

---

## 🛠️ Architecture & Under the Hood

```
[ Sender Browser ]                                [ Receiver Browser ]
       │                                                   ▲
       │ 1. Read file chunks (32KB)                        │ 5. Decrypt locally
       ▼                                                   │    Assemble to Blob
  [ Local AES-GCM Encrypt ]                                │    SHA-256 Hash Match
       │                                                   │    Trigger Auto-Save
       │ 2. Direct WebRTC Data Channel Tunnel              │
       └───────────────────────────────────────────────────┘
```

1. **Signaling Handshake**: Peers discover each other via a lightweight WebSocket signaling lobby. Once connected, signaling server is bypassed.
2. **ECDH negotiation**: If no pre-shared key is found in the link hash, both clients exchange ephemeral public keys to derive a unique session key.
3. **Backpressure management**: Avoids browser memory saturation by pausing file reading when the WebRTC `bufferedAmount` threshold exceeds 64KB, resuming dynamically.
4. **Decryption Key Isolation**: Decryption secrets are derived from the URL `#` hash string. Since browsers never transmit hash strings to internet routers or signal servers, the transfer key remains exclusively yours.

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
│   ├── context/          # Core WebRTC connection state, ECDH handshakes, and AES-GCM pipelines
│   ├── routes/           # Routing screens (Home, Translogs, Terminal, Docs)
│   ├── utils/            # Utilities (Audio synthesizer sound effects engine)
│   ├── app.css           # Styling system config, CRT scanlines, and mascot keyframes
│   ├── root.tsx          # Global hotel layout structure & theme providers
│   └── routes.ts         # Route module definitions
├── public/               # Transparent sprites and asset images
├── generated/assets/     # High-resolution branding outputs
└── signaling.ts          # Orchestrates peer matching handshakes
```
