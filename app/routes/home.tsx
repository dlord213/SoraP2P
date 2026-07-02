import type { Route } from "./+types/home";
import { useApp } from "../context/AppContext";
import { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  Copy,
  Check,
  HelpCircle,
  FileText,
  DownloadCloud,
  ArrowRight,
  Terminal as TerminalIcon,
  ShieldCheck,
  Zap,
  RefreshCw,
  X
} from "lucide-react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Sora - 2003 P2P File Transfer" },
    { name: "description", content: "Zero storage. Zero accounts. Pure peer-to-peer secure file sharing powered by WebRTC and Web Crypto E2E Encryption." },
  ];
}

export default function Home() {
  const {
    connectionStatus,
    currentTransfer,
    transferHistory,
    roomId,
    encryptionKey,
    hasWeakKey,
    startTransfer,
    joinRoom,
    disconnectPeer,
  } = useApp();

  const [dragActive, setDragActive] = useState(false);
  const [receiveInput, setReceiveInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lastSuccessId, setLastSuccessId] = useState<string | null>(null);
  const [showSuccessMascot, setShowSuccessMascot] = useState(false);
  const [successFileName, setSuccessFileName] = useState("");

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  useEffect(() => {
    if (transferHistory.length > 0) {
      const latest = transferHistory[0];
      if (latest.status === "Success" && latest.id !== lastSuccessId) {
        if (Date.now() - latest.timestamp < 10000) {
          setLastSuccessId(latest.id);
          setSuccessFileName(latest.fileName);
          setShowSuccessMascot(true);

          const timer = setTimeout(() => {
            setShowSuccessMascot(false);
          }, 6000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [transferHistory, lastSuccessId]);

  // Check URL hash on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.substring(1);
      if (hash) {
        console.log("Found room hash, joining:", hash);
        joinRoom(hash);
      }
    }
  }, []);

  // Format Helper
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const getShareLink = () => {
    if (typeof window === "undefined" || !roomId) return "";
    const base = window.location.origin + window.location.pathname;
    return `${base}#${roomId}!${encryptionKey || ""}`;
  };

  const getCliCommand = () => {
    return `npx sora-cli download ${roomId || "######"} --key ${encryptionKey || "SECRET_KEY"}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareLink());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(getCliCommand());
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  // Drag Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await startTransfer(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await startTransfer(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleReceiveConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveInput) return;
    await joinRoom(receiveInput);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 w-full">

      {/* Transfer Panel (Active or Idle) */}
      {!roomId && connectionStatus === "idle" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">

          {/* TRANSMIT BLOCK */}
          <div className="card-cream p-5 flex flex-col justify-between min-h-[340px]">
            <div>
              <h2 className="font-pixel text-[10px] text-red-600 mb-2 select-none uppercase tracking-wider">
                TRANSMIT FILE
              </h2>
              <p className="font-mono text-xs text-[#5c3e0c] leading-relaxed mb-4">
                Transmitted files never touch a server database. Transfer encryption keys are generated locally inside your browser.
              </p>

              {/* Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed cursor-pointer flex flex-col items-center justify-center p-6 rounded-lg transition-colors select-none ${dragActive
                  ? "border-black bg-white/40"
                  : "border-gray-500 hover:border-black bg-white/20"
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <UploadCloud className={`w-12 h-12 mb-3 text-red-600 ${dragActive ? "animate-bounce" : ""}`} />
                <span className="font-pixel text-[9px] text-[#3c290c] text-center mb-1 select-none">
                  DRAG & DROP FILE HERE
                </span>
                <span className="font-mono text-xs text-[#5c3e0c] opacity-80 text-center select-none">
                  OR CLICK TO UPLOAD
                </span>
              </div>
            </div>

            <div className="text-center font-mono text-[9px] text-[#5c3e0c] opacity-60 mt-4 border-t border-black/10 pt-2">
              Maximum file size limits: 1.0 GB
            </div>
          </div>

          {/* RECEIVE BLOCK */}
          <div className="card-cream p-5 flex flex-col justify-between min-h-[340px]">
            <div>
              <h2 className="font-pixel text-[10px] text-blue-800 mb-2 select-none uppercase tracking-wider">
                RECEIVE FILE
              </h2>
              <p className="font-mono text-xs text-[#5c3e0c] leading-relaxed mb-4">
                Enter the 6-digit handshake code or full encryption URL shared by the sender to connect the peer tunnels.
              </p>

              {/* Form Input */}
              <form onSubmit={handleReceiveConnect} className="flex flex-col gap-3">
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text font-pixel text-[8px] text-[#5c3e0c] uppercase">
                      CODE / LINK INPUT:
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 194820 or full URL"
                    value={receiveInput}
                    onChange={(e) => setReceiveInput(e.target.value)}
                    className="input w-full font-mono text-xs border-2 border-black bg-white text-black focus:outline-none focus:ring-0 rounded-lg p-2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!receiveInput}
                  className="btn-retro btn-retro-secondary w-full flex items-center justify-center gap-2"
                >
                  <span>CONNECT PEER</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            <div className="text-center font-mono text-[9px] text-[#5c3e0c] opacity-60 mt-4 border-t border-black/10 pt-2">
              Direct connection handshake established using signaling servers.
            </div>
          </div>

        </div>
      ) : (
        /* TRANSFER WORKSPACE (Sender / Receiver connected) */
        <div className="card-cream p-5 flex flex-col gap-5 w-full">
          {/* Header Workspace */}
          <div className="flex items-center justify-between border-b border-black/15 pb-3">
            <h2 className="font-pixel text-[10px] text-red-600 uppercase tracking-wider select-none">
              {currentTransfer ? "PEER-TO-PEER TRANSFERRING" : "WAITING FOR PEER HANDSHAKE..."}
            </h2>
            <button
              onClick={disconnectPeer}
              className="btn-retro btn-retro-error font-pixel text-[8px] px-3 py-1 flex items-center gap-1.5"
            >
              <X className="w-3 h-3" />
              ABORT
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Share details */}
            <div className="md:col-span-2 flex flex-col gap-4">

              <div className="border border-black/20 bg-white/30 rounded-lg p-4">
                <div className="font-pixel text-[8px] text-[#5c3e0c] mb-3 select-none">
                  HANDSHAKE DETAILS:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Code Card */}
                  <div className="bg-[#fffbeb] border border-black/20 p-3 text-center rounded-lg">
                    <span className="font-mono text-[9px] text-[#5c3e0c] opacity-60 block select-none mb-1">
                      ROOM HANDSHAKE CODE
                    </span>
                    <span className="font-pixel text-xl text-blue-900 select-all tracking-wider">
                      {roomId || "######"}
                    </span>
                  </div>

                  {/* Security Type Card */}
                  <div className="bg-[#fffbeb] border border-black/20 p-3 flex flex-col items-center justify-center text-center rounded-lg">
                    <span className="font-mono text-[9px] text-[#5c3e0c] opacity-60 block select-none mb-1">
                      ENCRYPTION STRENGTH
                    </span>
                    {hasWeakKey ? (
                      <span className="font-pixel text-[8px] text-orange-600 select-none">
                        AES-256 (WEAK FALLBACK)
                      </span>
                    ) : (
                      <span className="font-pixel text-[8px] text-emerald-700 flex items-center gap-1 select-none">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        AES-GCM (SECURE E2E)
                      </span>
                    )}
                  </div>
                </div>

                {/* Share Link */}
                <div className="mt-4 flex flex-col gap-1">
                  <div className="font-mono text-xs text-[#3c290c] select-none">
                    SHARE CRYPTOGRAPHIC HANDSHAKE LINK:
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      readOnly
                      value={getShareLink()}
                      className="input flex-1 font-mono text-xs border-2 border-r-0 border-black bg-white text-black rounded-l-lg rounded-r-none focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="btn-retro rounded-l-none font-pixel text-[8px] h-full"
                    >
                      {copiedLink ? <Check className="w-3 h-3 text-green-700" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedLink ? "COPIED" : "COPY"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Gauges */}
              <div className="border border-black/20 bg-white/30 rounded-lg p-4 flex flex-col justify-center min-h-[160px]">
                {showSuccessMascot ? (
                  <div className="flex flex-col items-center justify-center py-4 text-center select-none relative overflow-hidden">
                    <span className="font-pixel text-[8px] text-green-700 mb-1 animate-pulse">
                      DELIVERED!
                    </span>
                    <span className="font-mono text-xs text-[#5c3e0c] truncate max-w-xs">
                      {successFileName}
                    </span>
                  </div>
                ) : currentTransfer ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      {currentTransfer.type === "send" ? (
                        <UploadCloud className="w-6 h-6 text-red-600 animate-pulse" />
                      ) : (
                        <DownloadCloud className="w-6 h-6 text-blue-800 animate-pulse" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-pixel text-[9px] truncate text-black uppercase">
                          {currentTransfer.fileName}
                        </div>
                        <div className="font-mono text-xs text-[#5c3e0c]">
                          {formatBytes(currentTransfer.fileSize)} | {currentTransfer.type === "send" ? "SENDING FILE..." : "RECEIVING FILE..."}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full flex items-center gap-3">
                      <progress
                        className="progress progress-primary border border-black bg-white h-5 rounded-lg flex-1"
                        value={currentTransfer.progress}
                        max="100"
                      />
                      <span className="font-pixel text-[9px] w-10 text-right">
                        {Math.round(currentTransfer.progress)}%
                      </span>
                    </div>

                    {/* Transfer metrics */}
                    <div className="grid grid-cols-2 gap-4 border-t border-black/10 pt-3 font-mono text-xs text-[#5c3e0c]">
                      <div>
                        <span>SPEED: </span>
                        <strong className="text-black">{formatBytes(currentTransfer.speed)}/s</strong>
                      </div>
                      <div>
                        <span>EST. TIME: </span>
                        <strong className="text-black">
                          {currentTransfer.speed > 0
                            ? `${Math.ceil((currentTransfer.fileSize * (1 - currentTransfer.progress / 100)) / currentTransfer.speed)}s`
                            : "calculating..."}
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center select-none">
                    <RefreshCw className="w-10 h-10 text-blue-900 animate-spin mb-3" />
                    <span className="font-pixel text-[8px] text-blue-950 mb-1">
                      AWAITING REMOTE PEER
                    </span>
                    <span className="font-mono text-xs text-[#5c3e0c] opacity-80 max-w-sm">
                      Copy the room code or link and share it. The transfer will start instantly once the receiver joins.
                    </span>
                  </div>
                )}
              </div>

            </div>

            {/* CLI Instruction column */}
            <div className="border border-black/20 bg-white/30 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="font-pixel text-[8px] text-blue-900 mb-3 select-none flex items-center gap-1.5">
                  <TerminalIcon className="w-3.5 h-3.5" />
                  CLI DIAGNOSTICS:
                </div>
                <p className="font-mono text-xs text-[#5c3e0c] leading-relaxed mb-4">
                  Retrieve this package directly inside your local bash terminal using the decorative Sora node tool.
                </p>

                <div className="bg-black text-[#39ff14] border-2 border-black rounded-lg p-3 font-mono text-xs break-all shadow-[inset_0_0_8px_#000] select-all max-h-36 overflow-y-auto mb-4">
                  {getCliCommand()}
                </div>
              </div>

              <div>
                <button
                  onClick={handleCopyCmd}
                  className="btn-retro w-full flex items-center justify-center gap-2"
                >
                  {copiedCmd ? <Check className="w-3.5 h-3.5 text-green-700" /> : <TerminalIcon className="w-3.5 h-3.5" />}
                  <span>{copiedCmd ? "COPIED COMMAND" : "COPY COMMAND"}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ACCORDION FAQ SECTION */}
      <div className="card-cream p-5">
        <h2 className="font-pixel text-[10px] text-[#3c290c] mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-black/10 pb-2">
          <HelpCircle className="w-4 h-4 text-red-600" />
          FREQUENTLY ASKED QUESTIONS
        </h2>

        <div className="flex flex-col gap-2.5">
          {[
            {
              q: "What is WebRTC P2P Transfer?",
              a: "WebRTC (Web Real-Time Communication) is a browser protocol that lets two clients establish a direct, peer-to-peer data tunnel without server intermediaries. Once matched via signaling, data travels directly between your devices."
            },
            {
              q: "How is it secure? (E2E Hash Encryption)",
              a: "When a file is chosen, Sora generates a 256-bit AES key locally using the browser's Web Crypto API. This key is appended to the URL hash (following the #). Since URL hashes are strictly client-side variables, browsers never transmit them to our signaling server or internet routers."
            },
            {
              q: "Where are my files stored? (Zero Cloud Storage)",
              a: "Nowhere. Sora does not maintain databases or cloud block storage for files. Your file is read incrementally, encrypted on-the-fly, and streamed directly to the peer. Ephemeral memory buffers are wiped clean instantly on completion."
            }
          ].map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="bg-white/40 border border-black/20 rounded-lg overflow-hidden transition-all duration-200">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-4 font-mono text-xs text-left cursor-pointer hover:bg-black/5 active:bg-black/10 select-none focus:outline-none"
                >
                  <span className="font-pixel text-[8px] text-blue-900 uppercase">
                    {faq.q}
                  </span>
                  <span className="font-pixel text-[9px] text-[#5c3e0c] ml-2">
                    {isOpen ? "[-]" : "[+]"}
                  </span>
                </button>
                <div className={`faq-collapse ${isOpen ? "faq-expand" : ""}`}>
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 font-mono text-xs text-[#3c290c] leading-relaxed border-t border-black/5 pt-3">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
