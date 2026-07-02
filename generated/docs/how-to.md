# 🚀 Hosting Sora on Vercel & Troubleshooting "Connecting..." Status

When deploying **Sora** to Vercel, you may find that the room status remains stuck on **"connecting"**. This guide explains why this happens and how to resolve it.

---

## 🔍 The Root Cause

**Vercel is a serverless hosting platform.** 
- It hosts static files and routes server-side logic into short-lived Edge/Serverless functions.
- Serverless functions have execution limits and **do not support persistent WebSocket connections** (`ws://` or `wss://`).
- The signaling server (`signaling.ts`) must run as a continuous, stateful Node.js process to negotiate WebRTC handshakes between users. 

Because Vercel cannot run the signaling server, the browser's attempt to connect to port `3001` on the Vercel hostname (e.g., `wss://sora-p2p.vercel.app:3001`) fails, resulting in a persistent "connecting" state.

---

## 🛠️ The Solution

To host Sora successfully in production, you must split the hosting:
1. **Frontend (Vercel)**: Hosts the fast, static React Router UI.
2. **Signaling Server (Render/Fly.io/Railway)**: Hosts the persistent Node.js WebSocket process.

---

### Step 1: Deploy the Signaling Server

Deploy the backend to any platform supporting persistent Node.js servers (e.g. Render, Fly.io, Railway, or a VPS).

#### Configuration Example (Render)
1. Create a new **Web Service** on Render.
2. Point it to your repository.
3. Use the following build & start parameters:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npx tsx signaling.ts`
4. Render will assign you a secure URL (e.g., `https://sora-signaling.onrender.com`). Because it is HTTPS, your WebSocket protocol will be `wss://sora-signaling.onrender.com`.

---

### Step 2: Configure Vercel Environment Variables

Now, link your Vercel deployment to your new signaling backend.

1. Go to your **Vercel Dashboard** and select your project.
2. Navigate to **Settings** > **Environment Variables**.
3. Add a new variable:
   - **Key**: `VITE_SIGNALING_URL`
   - **Value**: `wss://your-signaling-app.onrender.com` (use the URL from Step 1)
4. Redeploy the Vercel project to apply the new env variables.

---

### 💻 Local Development

In local development, the client automatically defaults to port `3001` (`ws://localhost:3001`). You do not need to configure any environment variables locally.
