import type { Route } from "./+types/docs";
import { BookOpen, Key, Wifi, Terminal, AlertTriangle, ShieldCheck, Zap } from "lucide-react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Sora - Documentation" },
    { name: "description", content: "Learn how Sora P2P encrypted file sharing works under the hood." },
  ];
}

export default function Docs() {
  return (
    <div className="flex flex-col gap-6">

      {/* Page Title Header */}
      <div className="flex items-center gap-3 border-b border-black/10 pb-3">
        <BookOpen className="w-6 h-6 text-accent" />
        <h1 className="font-pixel text-xs md:text-sm uppercase tracking-wider text-black">
          SORA KNOWLEDGE DATABASE & PROTOCOL SPECS
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: GETTING STARTED */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="card-cream p-4 flex flex-col gap-3 min-h-[420px]">
            <h2 className="font-pixel text-[9px] text-[#3c290c] border-b border-black/10 pb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-blue-900" />
              1. GETTING STARTED
            </h2>

            <ol className="list-decimal pl-4 font-mono text-xs text-[#3c290c] flex flex-col gap-3">
              <li>
                <strong>Select a File or Folder:</strong> Drag any file (up to 1GB limit), choose multiple files, or click <em>Select Folder</em> to compress directories on-the-fly into a zip archive inside your browser.
              </li>
              <li>
                <strong>Share the Handshake:</strong> Copy the secure room passcode link or open the QR Handshake modal.
              </li>
              <li>
                <strong>Connect Recipients:</strong> Share the code or QR link with the receiver. Or let them scan it directly on mobile.
              </li>
              <li>
                <strong>Standby for Stream:</strong> Keep both browser windows active. The network tunnel starts streaming chunks immediately when the receiver joins.
              </li>
            </ol>

            <div className="bg-blue-500/10 border border-blue-900/20 p-3 rounded-lg mt-auto text-[11px] font-mono text-[#1a3a5f] leading-relaxed">
              💡 <strong>Tip:</strong> Transfer speeds are restricted by the lower upload bandwidth of the two peers. Keep tabs active to prevent browser throttle.
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: HOW IT WORKS */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="card-cream p-4 flex flex-col gap-3 min-h-[420px]">
            <h2 className="font-pixel text-[9px] text-[#3c290c] border-b border-black/10 pb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-800" />
              2. HOW IT WORKS
            </h2>

            <div className="font-mono text-xs text-[#3c290c] flex flex-col gap-2.5 leading-relaxed overflow-y-auto max-h-[400px] scrollbar-none pr-1">
              <div>
                <strong className="text-black block mb-0.5">A. LOCAL AES-GCM ENCRYPTION</strong>
                Every shared room generates a 256-bit cryptokey via the browser Web Crypto API. Chunks are encrypted locally in CPU registers before entering the network.
              </div>

              <div>
                <strong className="text-black block mb-0.5">B. URL HASH KEY SEGREGATION</strong>
                Decryption keys are stored in the URL fragment (the <code>#room!key</code>). Browsers never submit hash fragments to routers or the signaling server, keeping keys strictly peer-side.
              </div>

              <div>
                <strong className="text-black block mb-0.5">C. ECDH PASSCODE HANDSHAKES</strong>
                Manual 6-digit passcode entrances without link hashes initiate an **Elliptic-Curve Diffie-Hellman (P-256)** key-exchange over signaling websockets. This derives a strong shared secret key dynamically, preserving absolute forward secrecy.
              </div>

              <div>
                <strong className="text-black block mb-0.5">D. RESUMABLE CHUNKING</strong>
                Sora supports interactive offset handshakes. If a connection drops, the receiver preserves its packet buffer, negotiates the exact byte offset it left off on, and resumes instantly on handshake restoration.
              </div>

              <div>
                <strong className="text-black block mb-0.5">E. SHA-256 INTEGRITY VERIFICATION</strong>
                Files are client-side hashed before transmission. To protect memory, large files (&gt;100MB) hash the start/end 10MB ranges. The receiver recalculates and verifies this checksum to guarantee block-perfect files.
              </div>

              <div>
                <strong className="text-black block mb-0.5">F. 8-BIT AUDIO SYNTHESIS</strong>
                All user feedback (chimes, ticks, handshakes, level-up completions) is generated dynamically on-the-fly using the HTML5 Web Audio API, synthesizing classic sine and square wave vintage oscillators.
              </div>

              <div className="flex items-center gap-2 border border-emerald-300 bg-emerald-500/10 p-2.5 rounded-lg text-emerald-950 text-[11px] mt-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>Zero server logs, zero database logs, absolute E2E privacy.</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REFERENCE */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="card-cream p-4 flex flex-col gap-3 min-h-[420px]">
            <h2 className="font-pixel text-[9px] text-[#3c290c] border-b border-black/10 pb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-purple-900" />
              3. CLI REFERENCE
            </h2>

            <div className="font-mono text-xs text-[#3c290c] flex flex-col gap-3 leading-relaxed">
              <p>
                Automate or execute connections using the Sora interactive terminal commands:
              </p>

              <div className="bg-black/5 p-2 rounded-md font-mono text-[11px] border border-black/10 flex flex-col gap-1.5">
                <div>
                  <code className="font-bold text-black">help</code>
                  <span className="block text-gray-600 pl-2">Display terminal commands.</span>
                </div>
                <div>
                  <code className="font-bold text-black">status</code>
                  <span className="block text-gray-600 pl-2">Print transfer logs and active peer identifiers.</span>
                </div>
                <div>
                  <code className="font-bold text-black">connect &lt;code&gt;</code>
                  <span className="block text-gray-600 pl-2">Join a specified room lobby directly.</span>
                </div>
                <div>
                  <code className="font-bold text-black">disconnect</code>
                  <span className="block text-gray-600 pl-2">Abort current transfer/connection.</span>
                </div>
                <div>
                  <code className="font-bold text-black">history</code>
                  <span className="block text-gray-600 pl-2">Display past transfer history logsheet.</span>
                </div>
                <div>
                  <code className="font-bold text-black">clear</code>
                  <span className="block text-gray-600 pl-2">Reset diagnostics log screen buffers.</span>
                </div>
              </div>

              <div className="flex items-start gap-2 border border-yellow-300 bg-yellow-500/10 p-2.5 rounded-lg text-yellow-950 text-[11px]">
                <AlertTriangle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
                <span>Aborting transfers midway deletes local RAM assembly buffers immediately.</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
