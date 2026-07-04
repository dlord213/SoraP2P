# Sora P2P — Secure End-to-End Encrypted File Transfer

Sora (**[sorap2p.me](https://sorap2p.me)**) is a minimalist, retro-Habbo-inspired browser utility for secure, zero-registration, end-to-end encrypted peer-to-peer file and folder sharing.

<p align="center">
  <img src="public/sora_mascot_transparent.png" width="128" alt="Sora Mascot" />
</p>

---

## ⚡ Core Features

- 🔒 **Zero Storage / Zero Accounts**: Files never touch any cloud server. Connections are direct; peer coordination metadata is discarded immediately.
- 🔑 **Local 256-bit AES-GCM Encryption**: Encryption occurs inside the browser sandbox using the native Web Crypto API. Decryption keys are stored inside the URL hash fragment (`#`) and are never sent over network requests.
- 🤝 **Secure ECDH Passcode Handshake**: If peers manually enter a 6-digit passcode (without a pre-shared link hash), Sora negotiates session keys using **Elliptic-Curve Diffie-Hellman (P-256)** over the signaling channel to guarantee cryptographic strength against passive network sniffers.
- 📁 **Folder & Multi-file Zipping (JSZip)**: Select entire directory structures or multiple files. Sora compresses them on-the-fly inside memory before starting the transmission stream.
- 🔄 **Resumable Transfers**: If a WebRTC channel drops midway, Sora remembers the last byte offsets. Upon recovery, the receiver requests transmission from the exact offset, preventing complete restarts.
- 🛡️ **SHA-256 Integrity Verification**: Calculates cryptographic checksums on zips/files in real-time, matching the checksums on assembly to guarantee error-free delivery.
- 👾 **MascotMoji State Feedback**: An animated pixel mascot ("Packet") is integrated into the global app header, reacting dynamically to connection states:
  - `idle`: Mascot stays happy and chirps.
  - `connecting`: Mascot concentrates.
  - `transferring`: Mascot waves and displays activity energy.
  - `failed`: Mascot is sad, providing instant visual state cues.
- 🧾 **Thermal Receipt Modal**: Successful file transmissions generate a vintage thermal-printer receipt with ASCII art, SHA-256 signatures, speed indicators, and file metrics.
- 🖨️ **Print Optimization**: Integrates CSS print media rules (`@media print`) so printing a page automatically isolates and cleans the viewport, spitting out only the thermal receipt ticket.
- 🔊 **Synthesized 8-Bit Shockwave Sounds**: Utilizes the native Web Audio API to synthesize retro Shockwave/Habbo-style sound chimes for click feedbacks, connection handshakes, success, and warnings.
- 📡 **WebRTC Data Channels**: Encrypted chunks stream directly between browser windows.

---

## 🛠️ Architecture & Flow

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

### 1. Backpressure Management
To avoid browser memory crashes when sending large files, Sora monitors the WebRTC `bufferedAmount` threshold. If the buffer exceeds 64KB, file reading pauses and resumes dynamically as data is drained.

### 2. Ephemeral Key Isolation
Decryption secrets are derived from the URL `#` hash string. Since browsers never transmit hash strings to internet routers or signal servers, the transfer key remains exclusively yours.

---

## 🚀 Navigation & Pages

- 🏠 **Home (`/`)**: Main file upload portal, connection setup, file status dashboard, and the receipt ticket modal.
- 📋 **History (`/history`)**: Persistent local storage ledger storing past receipts and SHA-256 auditing tickets.
- 💻 **CLI Guide (`/cli`)**: Terminal guide for executing files transmission via local bash node lines.
- 📖 **Docs (`/docs`)**: Security architecture details, E2E cryptographic proofs, and FAQ.

---

## 💻 Installation & Local Dev

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
Starts the Vite dev server alongside the WebSocket signaling server (port `3001`):
```bash
npm run dev
```

### 3. Production Build
Compiles assets for static client pages and Server-Side Rendering (SSR):
```bash
npm run build
```

---

## 📦 Directory Structure

```
├── app/
│   ├── context/          # Core WebRTC connection state, ECDH handshakes, and AES-GCM pipelines
│   ├── routes/           # Routing screens (Home, Docs, History, CLI)
│   ├── utils/            # Utilities (Audio synthesizer sound effects engine)
│   ├── app.css           # Styling system config, CRT scanlines, and mascot keyframes
│   ├── root.tsx          # Global hotel layout structure & MascotMoji shell
│   └── routes.ts         # Route module definitions
├── public/               # Transparent sprites and asset images
├── generated/assets/     # High-resolution branding outputs
└── signaling.ts          # Orchestrates peer matching handshakes
```
