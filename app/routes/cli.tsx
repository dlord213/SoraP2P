import type { Route } from "./+types/cli";
import { useApp } from "../context/AppContext";
import { useState, useEffect, useRef } from "react";
import { Terminal, Shield, Network, RefreshCw } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sora - Simulated P2P Terminal" },
    { name: "description", content: "Execute commands in the interactive Sora P2P terminal." },
  ];
}

export default function CliPage() {
  const {
    connectionStatus,
    currentTransfer,
    transferHistory,
    roomId,
    encryptionKey,
    hasWeakKey,
    joinRoom,
    disconnectPeer,
  } = useApp();

  const [inputVal, setInputVal] = useState("");
  const [consoleBuffer, setConsoleBuffer] = useState<string[]>([
    "SORA SECURE P2P CORE ENGINE TERMINAL v1.0",
    "(C) 2026 SORA P2P NETWORK. ALL RIGHTS RESERVED.",
    "--------------------------------------------------",
    "Initializing Secure Cryptographic Handshake Layer...",
    "Status: ENGINE READY.",
    "Type 'help' to review available terminal actions.",
    ""
  ]);

  // Command History tracking
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto Scroll to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleBuffer]);

  // Keep input focused
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Process CLI Commands
  const handleCommand = async (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    // Add command to buffer
    const newBuffer = [...consoleBuffer, `sora@p2p:~$ ${trimmed}`];
    
    // Add to history
    const updatedHistory = [trimmed, ...cmdHistory];
    setCmdHistory(updatedHistory);
    setHistoryIndex(-1); // Reset index

    const args = trimmed.split(" ");
    const command = args[0].toLowerCase();

    switch (command) {
      case "help":
        newBuffer.push(
          "Available Commands:",
          "  help             Display this command reference sheet.",
          "  status           Output current WebRTC network parameters and node details.",
          "  history          Print local storage transaction logs in plain-text.",
          "  connect <code>   Trigger a peer connection handshake. Input code or full hash string.",
          "  disconnect       Abort current connections and reset peer parameters.",
          "  clear            Clear terminal buffer screens.",
          "  about            Read the Sora application philosophy.",
          ""
        );
        break;

      case "clear":
        setConsoleBuffer([]);
        setInputVal("");
        return;

      case "about":
        newBuffer.push(
          "SORA CORE PHILOSOPHY:",
          "Zero accounts, zero registration, zero cloud storage.",
          "Pure client-side WebRTC direct data channels. Files are read in-memory,",
          "encrypted on-the-fly via AES-256-GCM, and sent directly to peers.",
          "The signaling server only negotiates handshakes and never sees keys.",
          ""
        );
        break;

      case "disconnect":
        disconnectPeer();
        newBuffer.push("Aborted connections. State reset successfully.", "");
        break;

      case "status":
        newBuffer.push(
          "--- NODE STATUS ---",
          `Connection Status : ${connectionStatus.toUpperCase()}`,
          `Room Handshake ID : ${roomId ? `#${roomId}` : "UNASSIGNED"}`,
          `Decryption Key    : ${
            encryptionKey
              ? `${encryptionKey.substring(0, 16)}... [SECURE]`
              : hasWeakKey
              ? "WEAK DERIVED KEY"
              : "UNASSIGNED"
          }`,
          ""
        );
        if (currentTransfer) {
          newBuffer.push(
            "--- ACTIVE TRANSFER ---",
            `File Name         : ${currentTransfer.fileName}`,
            `File Size         : ${formatBytes(currentTransfer.fileSize)}`,
            `Transfer Type     : ${currentTransfer.type.toUpperCase()}`,
            `Progress          : ${Math.round(currentTransfer.progress)}%`,
            `Current Speed     : ${formatBytes(currentTransfer.speed)}/s`,
            ""
          );
        } else {
          newBuffer.push("Active Transfer   : NONE IN PROGRESS", "");
        }
        break;

      case "history":
        newBuffer.push("--- TRANSACTION HISTORY LOGS ---");
        if (transferHistory.length === 0) {
          newBuffer.push("No transaction records detected.", "");
        } else {
          transferHistory.forEach((log) => {
            const dateStr = new Date(log.timestamp).toISOString().replace("T", " ").substring(0, 19);
            newBuffer.push(
              `[${dateStr}] File: ${log.fileName} (${formatBytes(log.fileSize)}) | Peer: #${log.peerId} -> ${log.status.toUpperCase()}`
            );
          });
          newBuffer.push("");
        }
        break;

      case "connect":
        if (!args[1]) {
          newBuffer.push("Error: Please provide a room code. Usage: connect <code>", "");
        } else {
          const roomCode = args[1];
          newBuffer.push(`Initiating secure handshake connection to room: ${roomCode}...`, "");
          // Execute connect hook
          setTimeout(async () => {
            await joinRoom(roomCode);
          }, 0);
        }
        break;

      default:
        newBuffer.push(
          `bash: command not found: ${command}. Type 'help' to review actions.`,
          ""
        );
    }

    setConsoleBuffer(newBuffer);
    setInputVal("");
  };

  // Keyboard navigation for history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(inputVal);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex < cmdHistory.length) {
        setHistoryIndex(nextIndex);
        setInputVal(cmdHistory[nextIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = historyIndex - 1;
      if (nextIndex >= 0) {
        setHistoryIndex(nextIndex);
        setInputVal(cmdHistory[nextIndex]);
      } else {
        setHistoryIndex(-1);
        setInputVal("");
      }
    }
  };

  return (
    <div className="flex-1 p-6 flex flex-col items-center justify-center max-w-4xl w-full mx-auto">
      <div 
        onClick={focusInput}
        className="w-full flex-1 flex flex-col crt-screen border-pixel border-black p-4 md:p-6 shadow-pixel select-none cursor-text max-h-[70vh] md:max-h-[75vh]"
      >
        {/* CRT Scanline */}
        <div className="crt-scanline" />

        {/* Console Header Info */}
        <div className="flex items-center gap-3 border-b-2 border-primary/40 pb-3 mb-4 select-none font-pixel text-[10px] text-primary">
          <Terminal className="w-4 h-4 animate-pulse" />
          <span>SORA P2P DIAGNOSTICS SHELL</span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            ONLINE
          </span>
        </div>

        {/* Scrollable Buffer */}
        <div className="flex-1 overflow-y-auto font-mono text-sm leading-relaxed mb-4 pr-2 select-text space-y-1">
          {consoleBuffer.map((line, idx) => (
            <div key={idx} className={line.startsWith("sora@p2p:~$") ? "text-accent font-semibold" : ""}>
              {line}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Form Input Line */}
        <div className="flex items-center gap-2 font-mono text-sm border-t-2 border-primary/30 pt-3 relative z-20">
          <span className="text-primary font-bold select-none whitespace-nowrap">
            sora@p2p:~$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-primary caret-primary font-mono text-sm"
            maxLength={60}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>
      </div>
      
      {/* Help legend banner below */}
      <div className="w-full mt-4 flex flex-wrap gap-4 items-center justify-between font-mono text-xs text-neutral-content opacity-75 border-pixel border-dashed border-gray-600 bg-base-200 p-3 select-none">
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-primary" />
          <span>Encryption Mode: AES-GCM 256</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Commands: <code className="text-primary bg-black/45 px-1 py-0.5 border border-black">help</code>, <code className="text-primary bg-black/45 px-1 py-0.5 border border-black">status</code>, <code className="text-primary bg-black/45 px-1 py-0.5 border border-black">history</code></span>
        </div>
      </div>
    </div>
  );
}
