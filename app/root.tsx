import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  NavLink,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";
import { AppContextProvider, useApp } from "./context/AppContext";
import { AlertTriangle, AlertCircle, X, ShieldAlert, Cpu } from "lucide-react";
import { useState, useEffect } from "react";
import { sfx } from "./utils/audio";
import { MascotMoji } from "./components/MascotMoji";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Share+Tech+Mono&display=swap",
  },
  {
    rel: "icon",
    type: "image/png",
    href: "/sora_mascot_transparent.png",
  },
];

export function meta() {
  return [
    { title: "Sora - Secure End-to-End Encrypted P2P File Transfer" },
    { name: "description", content: "Zero registration. Zero storage. Direct peer-to-peer file sharing via WebRTC and Web Crypto AES-GCM 256-bit encryption. Map rooms with client-side secrets." },
    { property: "og:title", content: "Sora - Secure End-to-End Encrypted P2P File Transfer" },
    { property: "og:description", content: "Direct, server-free, client-side encrypted file streaming over WebRTC." },
    { property: "og:image", content: "/sora_mascot_transparent.png" },
    { property: "og:url", content: "https://sorap2p.me" },
    { name: "twitter:card", content: "summary" },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="tobu-pixel">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="antialiased flex flex-col min-h-screen">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function AppShell() {
  const {
    connectionStatus,
    currentTransfer,
    errorMessage,
    setErrorMessage,
    hasWeakKey,
    roomId,
    theme,
    setTheme,
    accent,
    setAccent
  } = useApp();

  const getMascotStatus = () => {
    if (connectionStatus === "connecting") return "connecting";
    if (connectionStatus === "connected") {
      return currentTransfer ? "transferring" : "idle";
    }
    if (connectionStatus === "failed" || connectionStatus === "disconnected") return "failed";
    return "idle";
  };
  const [mounted, setMounted] = useState(false);
  const [modalType, setModalType] = useState<"privacy" | "terms" | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#4a748c] text-white">
        <div className="font-pixel text-[10px] animate-pulse">BOOTING SORA NETWORK CLIENT...</div>
      </div>
    );
  }

  // Get status color & text
  let statusText = "IDLE";
  if (connectionStatus === "connecting") statusText = "CONNECTING";
  else if (connectionStatus === "connected") statusText = "CONNECTED";
  else if (connectionStatus === "disconnected") statusText = "DISCONNECTED";
  else if (connectionStatus === "failed") statusText = "FAILED";

  return (
    <div className="flex-1 flex flex-col p-4 max-w-6xl w-full mx-auto gap-4">
      {/* Weak Key Warning Banner */}
      {hasWeakKey && roomId && (
        <div className="bg-[#fff8e7] text-[#3c290c] border-2 border-black p-3 font-mono text-xs flex items-center gap-3 rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.15)] select-none">
          <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 animate-bounce" />
          <div>
            <strong className="font-pixel text-[9px] text-red-600">SECURITY WARNING:</strong> Room key is derived from the 6-digit code <span className="font-bold underline">#{roomId}</span>. For optimal cryptographic security, share the original secure share link!
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-[#fff8e7] text-[#3c290c] border-2 border-black p-3 font-mono text-xs flex items-center justify-between gap-3 rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.15)]">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <strong className="font-pixel text-[9px] text-red-600">ENGINE WARNING:</strong> {errorMessage}
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 border border-black bg-white hover:bg-gray-100 transition-all shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[0px_0px_0px_#000] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP ROW: Brand and Isometric Scene Banner */}
      <header className="w-full flex flex-col md:flex-row items-center md:items-stretch gap-4 select-none">
        {/* Left Column Logo */}
        <div className="w-full md:w-64 flex flex-col justify-center items-center md:items-start p-2">
          <div className="flex items-center gap-2 mb-1">
            <MascotMoji status={getMascotStatus()} size={96} />
            <div className="habbo-logo mb-0">SORA</div>
          </div>
          <span className="text-[10px] font-pixel text-white opacity-85">
            sorap2p.me
          </span>
        </div>

        {/* Right Column Isometric Banner */}
        <div className="flex-1 panel-blue flex items-center justify-center p-1 overflow-hidden relative min-h-[96px] max-h-[120px] md:max-h-[140px] w-full">
          <img
            src="/tobu_header_banner.png"
            alt="Tobu Network Adventure Banner"
            className="w-full h-full object-cover object-center select-none rounded-xl"
          />
        </div>
      </header>

      {/* BOTTOM ROW: Sidebar & Main Workspace */}
      <div className="w-full flex flex-col md:flex-row items-start gap-4">

        {/* LEFT COLUMN: Sidebar Panels */}
        <aside className="w-full md:w-64 flex flex-col gap-4 flex-shrink-0 select-none">

          {/* Peer lobby counter */}
          <div className="panel-blue p-4 flex flex-col items-center text-center gap-2">
            <span className="font-pixel text-[9px] text-[#fff580] tracking-wider">
              PEERS IN THE ROOM
            </span>
            <span className="text-2xl font-bold font-pixel text-white">
              {connectionStatus === "connected" ? "1" : "0"}
            </span>
            <span className="font-mono text-xs text-[#a4c5dd] underline">
              Status: {statusText}
            </span>
          </div>

          {/* HOTEL SETTINGS CONTROL PANEL */}
          <div className="panel-blue p-4 flex flex-col gap-3">
            <span className="font-pixel text-[9px] text-[#fff580] tracking-wider block">
              HOTEL SETTINGS
            </span>

            {/* Light / Dark Mode selector */}
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] text-white/70 uppercase">
                Color Theme:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => { sfx.playClick(); setTheme("light"); }}
                  className={`btn-retro flex-1 py-1 px-2 text-center text-[8px] ${theme === "light" ? "border-white bg-[#ffd54f] text-black" : "opacity-75 hover:opacity-100"
                    }`}
                >
                  LIGHT
                </button>
                <button
                  onClick={() => { sfx.playClick(); setTheme("dark"); }}
                  className={`btn-retro flex-1 py-1 px-2 text-center text-[8px] ${theme === "dark" ? "border-white bg-[#ffd54f] text-black" : "opacity-75 hover:opacity-100"
                    }`}
                >
                  DARK
                </button>
              </div>
            </div>

            {/* Accent color picker */}
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="font-mono text-[10px] text-white/70 uppercase">
                Accent Theme:
              </span>
              <div className="flex justify-between items-center gap-1 bg-black/25 p-1.5 rounded-lg border border-black/20">
                {[
                  { id: "classic-gold", name: "Gold", color: "bg-[#ffca28]" },
                  { id: "cyber-cyan", name: "Cyan", color: "bg-[#00f0ff]" },
                  { id: "hacker-green", name: "Green", color: "bg-[#39ff14]" },
                  { id: "arcade-pink", name: "Pink", color: "bg-[#ff4081]" },
                  { id: "crimson-red", name: "Red", color: "bg-[#e53935]" },
                ].map((acc) => (
                  <button
                    key={acc.id}
                    title={acc.name}
                    onClick={() => { sfx.playClick(); setAccent(acc.id as any); }}
                    className={`w-6 h-6 border-2 border-black cursor-pointer transition-all ${acc.color} ${accent === acc.id
                      ? "ring-2 ring-white scale-110 shadow-[inset_0_0_0_2px_#000]"
                      : "opacity-75 hover:opacity-100 hover:scale-105"
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Security Status Box */}
          <div className="panel-blue p-4 flex flex-col gap-3 font-mono text-xs">
            <h3 className="font-pixel text-[9px] text-[#fff580] uppercase tracking-wider">
              SECURITY ADVISORY
            </h3>
            <p className="text-white opacity-90 leading-relaxed text-center md:text-left">
              {hasWeakKey && roomId ? (
                <span className="text-red-300 font-bold">⚠️ Room key generated from temporary numeric passcode. Not fully secure.</span>
              ) : connectionStatus === "connected" ? (
                <span className="text-accent font-bold">✓ End-to-end 256-bit AES cryptographic channel established.</span>
              ) : (
                <span className="text-[#a4c5dd]">Waiting for network connection...</span>
              )}
            </p>
          </div>

          {/* Retro Badges Panel */}
          <div className="flex flex-col gap-2 items-center justify-center p-2 border-2 border-dashed border-[#2d5069] rounded-xl bg-black/10">
            {/* macromedia engine badge */}
            <div className="flex items-center border border-black bg-white rounded-none p-1 w-44 shadow-[2px_2px_0px_#000]">
              <div className="bg-red-600 text-white font-pixel text-[8px] font-bold px-1.5 py-1 mr-2 select-none">
                GET
              </div>
              <div className="flex flex-col font-sans select-none">
                <span className="text-[9px] font-bold tracking-tighter leading-none text-gray-800">
                  macromedia
                </span>
                <span className="text-[10px] font-extrabold tracking-tight leading-none text-red-600">
                  SORA ENGINE
                </span>
              </div>
            </div>

            {/* crypto badge */}
            <div className="flex items-center border border-black bg-white rounded-none p-1 w-44 shadow-[2px_2px_0px_#000]">
              <div className="bg-blue-600 text-white font-pixel text-[8px] font-bold px-1.5 py-1 mr-2 select-none">
                E2E
              </div>
              <div className="flex flex-col font-sans select-none">
                <span className="text-[9px] font-bold tracking-tighter leading-none text-gray-800">
                  encryption
                </span>
                <span className="text-[10px] font-extrabold tracking-tight leading-none text-blue-600">
                  AES-256-GCM
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Folder Tabs and Workspace Panel */}
        <main className="flex-1 flex flex-col w-full min-w-0">

          {/* Overlapping Folder Navigation Tabs */}
          <div className="flex justify-start gap-1 px-4 z-10 relative top-[3px] select-none overflow-x-auto scrollbar-none">
            <NavLink
              to="/"
              onClick={() => sfx.playClick()}
              className={({ isActive }) =>
                `tab-folder ${isActive ? "tab-folder-active" : ""}`
              }
            >
              HOME PAGE
            </NavLink>
            <NavLink
              to="/history"
              onClick={() => sfx.playClick()}
              className={({ isActive }) =>
                `tab-folder ${isActive ? "tab-folder-active" : ""}`
              }
            >
              TRANSLOGS
            </NavLink>
            <NavLink
              to="/cli"
              onClick={() => sfx.playClick()}
              className={({ isActive }) =>
                `tab-folder ${isActive ? "tab-folder-active" : ""}`
              }
            >
              TERMINAL
            </NavLink>
            <NavLink
              to="/docs"
              onClick={() => sfx.playClick()}
              className={({ isActive }) =>
                `tab-folder ${isActive ? "tab-folder-active" : ""}`
              }
            >
              DOCS
            </NavLink>
          </div>

          {/* Main Gold Container Workspace */}
          <div className="panel-gold p-6 flex flex-col min-h-[500px]">
            <Outlet />
          </div>
        </main>

      </div>

      {/* FOOTER */}
      <footer className="w-full text-center font-mono text-xs text-white opacity-80 py-4 select-none border-t border-white/20 mt-4">
        <div>All rights including trademarks, copyright, and database rights in this website are owned by mirimomekiku</div>
        <div className="mt-2 text-[10px]">
          <button
            onClick={() => { sfx.playClick(); setModalType("terms"); }}
            className="underline hover:text-white cursor-pointer select-none focus:outline-none"
          >
            Terms & Conditions
          </button>
          {" | "}
          <button
            onClick={() => { sfx.playClick(); setModalType("privacy"); }}
            className="underline hover:text-white cursor-pointer select-none focus:outline-none"
          >
            Privacy Policy
          </button>
          {" | Sora P2P Network"}
        </div>
      </footer>

      {/* PRIVACY & TERMS MODAL */}
      {modalType && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <div className="max-w-2xl w-full panel-blue flex flex-col max-h-[85vh] shadow-[10px_10px_0px_#000]">

            {/* Modal Title Bar */}
            <div className="flex items-center justify-between bg-black/25 px-4 py-2 border-b-2 border-black/20">
              <span className="font-pixel text-[9px] text-[#fff580] tracking-wider uppercase">
                {modalType === "privacy" ? "SORA HOTEL - PRIVACY POLICY" : "SORA HOTEL - TERMS & CONDITIONS"}
              </span>
              <button
                onClick={() => { sfx.playClick(); setModalType(null); }}
                className="font-pixel text-[9px] text-white hover:text-red-300 cursor-pointer focus:outline-none"
              >
                [X]
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 font-mono text-xs text-[#3c290c] flex flex-col gap-4 bg-[#fff8e7] select-text border-b-2 border-black/10">
              {modalType === "privacy" ? (
                <>
                  <h2 className="font-pixel text-[9px] text-blue-900 uppercase">
                    1. ZERO COLLECTION POLICY
                  </h2>
                  <p className="leading-relaxed">
                    Sora operates on a strict zero-data-collection philosophy. We do not register accounts, track IP addresses, or log your file transfer history on any server.
                  </p>

                  <h2 className="font-pixel text-[9px] text-blue-900 uppercase">
                    2. LOCAL BROWSER STORAGE
                  </h2>
                  <p className="leading-relaxed">
                    Any transaction history, active passcodes, and customized theme settings (light/dark/accent) are saved directly in your web browser's <code>localStorage</code>. This data never leaves your device and can be cleared instantly by clicking "Clear Logs" inside the Translogs page.
                  </p>

                  <h2 className="font-pixel text-[9px] text-blue-900 uppercase">
                    3. PEER-TO-PEER ENCRYPTION
                  </h2>
                  <p className="leading-relaxed">
                    All file transfers are encrypted client-side using 256-bit AES-GCM via the Web Crypto API. The cryptographic keys reside strictly in your URL fragment (the <code>#</code> portion of the link). Since browsers do not transmit URL fragments to web servers during HTTP requests, your keys are invisible to our signaling server, internet service providers, and routers.
                  </p>

                  <h2 className="font-pixel text-[9px] text-blue-900 uppercase">
                    4. NO ADVERTISING / NO TRACKING
                  </h2>
                  <p className="leading-relaxed">
                    Sora does not use cookies, advertising trackers, or telemetry scripts. Our service is completely free, open-source, and clean of third-party profiling.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-pixel text-[9px] text-blue-900 uppercase">
                    1. USE OF THE SERVICE
                  </h2>
                  <p className="leading-relaxed">
                    Sora is a decentralized, peer-to-peer file transfer utility. By using this service, you agree to transfer files directly with your connected peers. You are solely responsible for the content you choose to share.
                  </p>

                  <h2 className="font-pixel text-[9px] text-blue-900 uppercase">
                    2. DECENTRALIZED TRANSMISSION
                  </h2>
                  <p className="leading-relaxed">
                    You acknowledge that files are not uploaded to, hosted on, or stored by Sora. Transmission occurs entirely in-memory between the browser windows of the sender and receiver. Once a transfer is aborted or closed, the data connection is severed.
                  </p>

                  <h2 className="font-pixel text-[9px] text-blue-900 uppercase">
                    3. CRYPTOGRAPHIC RESPONSIBILITY
                  </h2>
                  <p className="leading-relaxed">
                    Sora is designed with end-to-end security. However, if you share weak numeric room passcodes (e.g., manually generated 6-digit codes) instead of the secure generated cryptographic link, the encryption key strength is reduced. You accept full responsibility for securely sharing room links with your intended recipients.
                  </p>

                  <h2 className="font-pixel text-[9px] text-blue-900 uppercase">
                    4. DISCLAIMER & WARRANTY
                  </h2>
                  <p className="leading-relaxed">
                    Sora is provided "as is" without warranties of any kind. We are not liable for transfer interruptions, network connectivity failures, or data losses arising from the use of WebRTC channels.
                  </p>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-black/10 flex justify-end">
              <button
                onClick={() => setModalType(null)}
                className="btn-retro px-4 py-1 cursor-pointer focus:outline-none"
              >
                CLOSE
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppContextProvider>
      <AppShell />
    </AppContextProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "System Crash!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404 - PANEL NOT FOUND" : "ERROR DETECTED";
    details =
      error.status === 404
        ? "The requested page does not exist in this client."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 bg-[#4a748c]">
      <div className="max-w-xl w-full panel-gold p-6 text-center flex flex-col items-center gap-4">
        <AlertTriangle className="w-16 h-16 text-red-600 animate-bounce" />
        <h1 className="font-pixel text-sm uppercase tracking-wider">{message}</h1>

        <div className="card-cream p-4 font-mono text-xs leading-relaxed text-left w-full">
          {details}
        </div>

        {stack && (
          <pre className="w-full max-h-40 overflow-y-auto p-4 bg-black text-[#39ff14] font-mono text-xs border-2 border-black text-left rounded-xl">
            <code>{stack}</code>
          </pre>
        )}

        <a href="/" className="btn-retro font-pixel text-[9px] uppercase">
          Reload Hotel Homepage
        </a>
      </div>
    </main>
  );
}
