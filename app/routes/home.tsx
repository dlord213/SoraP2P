import type { Route } from "./+types/home";
import { useApp } from "../context/AppContext";
import { useState, useEffect, useRef } from "react";
import { sfx } from "../utils/audio";
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
  Maximize2,
  Minimize2,
  X
} from "lucide-react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Sora - 2003 P2P File Transfer" },
    { name: "description", content: "Zero storage. Zero accounts. Pure peer-to-peer secure file sharing powered by WebRTC and Web Crypto E2E Encryption." },
  ];
}

interface AvatarState {
  gridX: number;
  gridY: number;
  screenX: number;
  screenY: number;
  targetX: number;
  targetY: number;
  chatBubble: { text: string; expires: number } | null;
  color: string;
  label: string;
  sprite?: string;
}

interface SoraRoomLobbyProps {
  roomId: string;
  sendAvatarMove: (x: number, y: number) => void;
  sendAvatarChat: (text: string) => void;
  registerAvatarCallbacks: (onMove: (x: number, y: number) => void, onChat: (text: string) => void) => () => void;
}

const NPC_NAMES = [
  "BobbaKing", "LoungeLizard", "P2P_Pixel", "SoraGuide", "DiscoFrank", 
  "GoldBevel", "HabboGuest_77", "RoomHacker", "DecentralizedGuy", "RetroNerd"
];

const NPC_TIPS = [
  "Tip: Keys stay on the URL hash!",
  "AES-256-GCM encryption verified local!",
  "Sora P2P uses WebRTC Data Channels.",
  "Move using WASD or Arrow Keys!",
  "Press Enter to chat with the room.",
  "No central storage is used here!",
  "Fling files into the portal to transmit!",
  "Press ESC to exit Fullscreen Lounge.",
  "Habbo Hotel vibes inside Sora!",
  "Your files never touch a cloud database."
];

const SoraRoomLobby: React.FC<SoraRoomLobbyProps> = ({
  roomId,
  sendAvatarMove,
  sendAvatarChat,
  registerAvatarCallbacks
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [chatText, setChatText] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const characterImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});

  // Preload pixel character sprite assets
  useEffect(() => {
    const urls = {
      yellow: "/guest_yellow.png",
      blue: "/guest_blue.png",
      pink: "/guest_pink.png",
      sora: "/sora_mascot_transparent.png",
      tobas: "/tobas_mascot.png"
    };

    Object.entries(urls).forEach(([key, url]) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        characterImagesRef.current[key] = img;
      };
    });
  }, []);

  const localAvatarRef = useRef<AvatarState>({
    gridX: 1,
    gridY: 1,
    screenX: 0,
    screenY: 0,
    targetX: 1,
    targetY: 1,
    chatBubble: null,
    color: "#ffca28",
    label: "ME",
    sprite: "yellow"
  });

  const remoteAvatarRef = useRef<AvatarState>({
    gridX: 4,
    gridY: 4,
    screenX: 0,
    screenY: 0,
    targetX: 4,
    targetY: 4,
    chatBubble: null,
    color: "#3b82f6",
    label: "PEER",
    sprite: "blue"
  });

  const npcsRef = useRef<AvatarState[]>([]);

  // Generate NPC Guest avatars on mount
  useEffect(() => {
    if (npcsRef.current.length === 0) {
      const colors = ["#ec4899", "#8b5cf6", "#10b981", "#06b6d4", "#f43f5e", "#14b8a6"];
      const sprites = ["yellow", "blue", "pink", "sora", "tobas"];
      const list: AvatarState[] = [];
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const name = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)] + "_" + Math.floor(Math.random() * 90 + 10);
        const color = colors[Math.floor(Math.random() * colors.length)];
        const sprite = sprites[Math.floor(Math.random() * sprites.length)];
        const gx = Math.floor(Math.random() * 6);
        const gy = Math.floor(Math.random() * 6);
        list.push({
          gridX: gx,
          gridY: gy,
          screenX: 0,
          screenY: 0,
          targetX: gx,
          targetY: gy,
          chatBubble: null,
          color,
          label: name,
          sprite
        });
      }
      npcsRef.current = list;
    }
  }, []);

  const toIso = (x: number, y: number, gridCols = 6, gridRows = 6) => {
    const width = canvasRef.current?.width || 300;
    const height = canvasRef.current?.height || 160;
    const centerX = width / 2;
    const centerY = height / 2 - (gridCols + gridRows) * (20 / 4) + 10;
    const isoX = (x - y) * (40 / 2) + centerX;
    const isoY = (x + y) * (20 / 2) + centerY;
    return { x: isoX, y: isoY };
  };

  const fromIso = (screenX: number, screenY: number, gridCols = 6, gridRows = 6) => {
    const width = canvasRef.current?.width || 300;
    const height = canvasRef.current?.height || 160;
    const centerX = width / 2;
    const centerY = height / 2 - (gridCols + gridRows) * (20 / 4) + 10;
    const dx = screenX - centerX;
    const dy = screenY - centerY;
    const x = (dx / (40 / 2) + dy / (20 / 2)) / 2;
    const y = (dy / (20 / 2) - dx / (40 / 2)) / 2;
    return { x: Math.round(x), y: Math.round(y) };
  };

  // Clamp targets on fullscreen toggle
  useEffect(() => {
    const limit = isFullscreen ? 12 : 6;
    [localAvatarRef.current, remoteAvatarRef.current, ...npcsRef.current].forEach(avatar => {
      avatar.targetX = Math.max(0, Math.min(limit - 1, avatar.targetX));
      avatar.targetY = Math.max(0, Math.min(limit - 1, avatar.targetY));
      avatar.gridX = Math.max(0, Math.min(limit - 1, avatar.gridX));
      avatar.gridY = Math.max(0, Math.min(limit - 1, avatar.gridY));
    });
  }, [isFullscreen]);

  // NPCs wander timer
  useEffect(() => {
    const interval = setInterval(() => {
      const gridLimit = isFullscreen ? 12 : 6;
      npcsRef.current.forEach(npc => {
        if (Math.random() < 0.35) {
          const dx = Math.floor(Math.random() * 3) - 1;
          const dy = Math.floor(Math.random() * 3) - 1;
          const newX = Math.max(0, Math.min(gridLimit - 1, npc.targetX + dx));
          const newY = Math.max(0, Math.min(gridLimit - 1, npc.targetY + dy));
          npc.targetX = newX;
          npc.targetY = newY;
        }
        if (Math.random() < 0.15 && (!npc.chatBubble || Date.now() > npc.chatBubble.expires)) {
          const tip = NPC_TIPS[Math.floor(Math.random() * NPC_TIPS.length)];
          npc.chatBubble = {
            text: tip,
            expires: Date.now() + 4500
          };
        }
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isFullscreen]);

  // Resize canvas handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        if (isFullscreen) {
          canvasRef.current.width = window.innerWidth;
          canvasRef.current.height = window.innerHeight - 140;
        } else if (containerRef.current) {
          canvasRef.current.width = containerRef.current.clientWidth;
          canvasRef.current.height = 160;
        }
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFullscreen]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const gridLimit = isFullscreen ? 12 : 6;
      const isInputFocused = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";

      if (e.key === "Escape" && isFullscreen) {
        e.preventDefault();
        sfx.playClick();
        setIsFullscreen(false);
        return;
      }

      if (isInputFocused) {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        chatInputRef.current?.focus();
        return;
      }

      let dx = 0;
      let dy = 0;

      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        dy = -1;
      } else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        dy = 1;
      } else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
        dx = -1;
      } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
        dx = 1;
      }

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        const currentTargetX = localAvatarRef.current.targetX;
        const currentTargetY = localAvatarRef.current.targetY;
        const newX = Math.max(0, Math.min(gridLimit - 1, currentTargetX + dx));
        const newY = Math.max(0, Math.min(gridLimit - 1, currentTargetY + dy));
        if (newX !== currentTargetX || newY !== currentTargetY) {
          sfx.playClick();
          localAvatarRef.current.targetX = newX;
          localAvatarRef.current.targetY = newY;
          sendAvatarMove(newX, newY);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, sendAvatarMove]);

  // Sync callbacks
  useEffect(() => {
    const cleanup = registerAvatarCallbacks(
      (x, y) => {
        remoteAvatarRef.current.targetX = x;
        remoteAvatarRef.current.targetY = y;
      },
      (text) => {
        remoteAvatarRef.current.chatBubble = {
          text,
          expires: Date.now() + 4000
        };
      }
    );
    return cleanup;
  }, [registerAvatarCallbacks]);

  // Main canvas animation loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tileWidth = 40;
    const tileHeight = 20;

    const drawAvatar = (ctx: CanvasRenderingContext2D, avatar: AvatarState, screenPos: { x: number, y: number }) => {
      const x = screenPos.x;
      const y = screenPos.y - 12;

      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.ellipse(x, y + 12, 7, 3, 0, 0, 2 * Math.PI);
      ctx.fill();

      // Check if image is loaded, otherwise fallback to blocky body
      const spriteKey = avatar.sprite || "yellow";
      const img = characterImagesRef.current[spriteKey];

      if (img && img.complete) {
        const imgWidth = 28;
        const imgHeight = 28;
        ctx.drawImage(img, x - imgWidth / 2, y - imgHeight + 10, imgWidth, imgHeight);
      } else {
        const size = 10;
        ctx.fillStyle = avatar.color;
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 1.2, y - size * 0.5);
        ctx.lineTo(x, y);
        ctx.lineTo(x - size * 1.2, y - size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = adjustBrightness(avatar.color, -20);
        ctx.beginPath();
        ctx.moveTo(x - size * 1.2, y - size * 0.5);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size * 1.2, y + size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = adjustBrightness(avatar.color, -40);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + size * 1.2, y - size * 0.5);
        ctx.lineTo(x + size * 1.2, y + size * 0.5);
        ctx.lineTo(x, y + size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "#000000";
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x, y - size - 5);
        ctx.stroke();
        
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(x, y - size - 5, 1.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      const labelW = ctx.measureText(avatar.label).width + 6;
      ctx.roundRect(x - labelW / 2, y + 14, labelW, 9, 3);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "6px monospace";
      ctx.textAlign = "center";
      ctx.fillText(avatar.label, x, y + 21);

      if (avatar.chatBubble && Date.now() < avatar.chatBubble.expires) {
        const bubbleY = y - 22;
        const bubbleW = Math.max(50, ctx.measureText(avatar.chatBubble.text).width + 10);
        const bubbleH = 16;

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.roundRect(x - bubbleW / 2, bubbleY - bubbleH, bubbleW, bubbleH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(x - 4, bubbleY);
        ctx.lineTo(x, bubbleY + 3);
        ctx.lineTo(x + 4, bubbleY);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - 4, bubbleY);
        ctx.lineTo(x, bubbleY + 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 4, bubbleY);
        ctx.lineTo(x, bubbleY + 3);
        ctx.stroke();

        ctx.fillStyle = "#000000";
        ctx.font = "bold 8px monospace";
        ctx.fillText(avatar.chatBubble.text, x, bubbleY - 6);
      }
    };

    const updateLobby = () => {
      const gridCols = isFullscreen ? 12 : 6;
      const gridRows = isFullscreen ? 12 : 6;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render Floor Tiles
      for (let c = 0; c < gridCols; c++) {
        for (let r = 0; r < gridRows; r++) {
          const pos = toIso(c, r, gridCols, gridRows);

          // Checkerboard pattern
          if ((c + r) % 2 === 0) {
            ctx.fillStyle = "#fffbeb";
          } else {
            ctx.fillStyle = "#fef3c7";
          }

          ctx.strokeStyle = "rgba(100, 70, 30, 0.15)";
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - tileHeight / 2);
          ctx.lineTo(pos.x + tileWidth / 2, pos.y);
          ctx.lineTo(pos.x, pos.y + tileHeight / 2);
          ctx.lineTo(pos.x - tileWidth / 2, pos.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // Draw Avatars (Local, Remote, and NPCs)
      const step = 0.08;
      const players = [localAvatarRef.current, remoteAvatarRef.current, ...npcsRef.current];

      players.forEach(avatar => {
        avatar.gridX += (avatar.targetX - avatar.gridX) * step;
        avatar.gridY += (avatar.targetY - avatar.gridY) * step;

        const screenPos = toIso(avatar.gridX, avatar.gridY, gridCols, gridRows);
        avatar.screenX = screenPos.x;
        avatar.screenY = screenPos.y;

        drawAvatar(ctx, avatar, screenPos);
      });

      animId = requestAnimationFrame(updateLobby);
    };

    const adjustBrightness = (hex: string, percent: number) => {
      let num = parseInt(hex.replace("#",""), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) + amt,
      G = (num >> 8 & 0x00FF) + amt,
      B = (num & 0x0000FF) + amt;
      return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
    };

    updateLobby();
    return () => cancelAnimationFrame(animId);
  }, [isFullscreen]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const gridCols = isFullscreen ? 12 : 6;
    const gridRows = isFullscreen ? 12 : 6;
    const gridPos = fromIso(clickX, clickY, gridCols, gridRows);

    if (gridPos.x >= 0 && gridPos.x < gridCols && gridPos.y >= 0 && gridPos.y < gridRows) {
      sfx.playClick();
      localAvatarRef.current.targetX = gridPos.x;
      localAvatarRef.current.targetY = gridPos.y;
      sendAvatarMove(gridPos.x, gridPos.y);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;

    sfx.playClick();
    localAvatarRef.current.chatBubble = {
      text: chatText.trim(),
      expires: Date.now() + 4000
    };
    sendAvatarChat(chatText.trim());
    setChatText("");
  };

  const lobbyUI = (
    <>
      <div className="flex items-center justify-between border-b border-black/10 pb-1.5 select-none">
        <span className="font-pixel text-[8px] text-blue-950 uppercase flex items-center gap-1.5">
          🏢 SORA ISOMETRIC LOUNGE LOBBY
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[8px] text-[#5c3e0c] opacity-70">
            {isFullscreen ? "WASD/Arrow Keys to walk | Enter to chat | ESC to exit" : "Click grid to walk"}
          </span>
          <button
            onClick={() => { sfx.playClick(); setIsFullscreen(!isFullscreen); }}
            className="text-blue-950 hover:text-black focus:outline-none cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`block border border-black/10 rounded-lg cursor-pointer bg-amber-50/10 w-full ${
          isFullscreen ? "flex-1" : "h-[160px]"
        }`}
      />

      <form onSubmit={handleSendChat} className="flex gap-2 mt-1">
        <input
          ref={chatInputRef}
          type="text"
          placeholder="Type hotel chat message..."
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          className="input flex-1 font-mono text-[10px] border border-black bg-white text-black focus:outline-none rounded-lg px-2 py-1"
        />
        <button type="submit" className="btn-retro font-pixel text-[8px] px-3.5 py-1">
          SAY
        </button>
      </form>
    </>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#4a748c] flex flex-col p-4 select-none">
        {/* Isometric Grid background overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#3d637a_1.5px,transparent_1.5px)] [background-size:16px_16px] opacity-35 pointer-events-none" />
        
        {/* Fullscreen Double-beveled Retro dialog card wrapper */}
        <div className="flex-1 flex flex-col relative z-10 bg-[#faf8eb] border-4 border-double border-black rounded-xl p-4 shadow-[12px_12px_0px_#000]">
          {lobbyUI}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="border border-black/20 bg-white/40 rounded-lg p-3 flex flex-col gap-2">
      {lobbyUI}
    </div>
  );
};

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
  const [isCompressing, setIsCompressing] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const [lastSuccessId, setLastSuccessId] = useState<string | null>(null);
  const [showSuccessMascot, setShowSuccessMascot] = useState(false);
  const [successFileName, setSuccessFileName] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState<any>(null);

  const toggleFaq = (index: number) => {
    sfx.playClick();
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

          setReceiptDetails({
            id: latest.id,
            fileName: latest.fileName,
            fileSize: latest.fileSize,
            timestamp: latest.timestamp,
            roomId: roomId || "######",
            hash: latest.fileName.includes("(Verified)") ? "SHA-256 Checksum Verified" : "Transfer Completed"
          });

          const timer = setTimeout(() => {
            setShowSuccessMascot(false);
          }, 6000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [transferHistory, lastSuccessId, roomId]);

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
    sfx.playClick();
    navigator.clipboard.writeText(getShareLink());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCmd = () => {
    sfx.playClick();
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

  const zipAndSendFiles = async (files: File[], archiveName: string) => {
    setIsCompressing(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      
      const filePaths: string[] = [];
      files.forEach((file) => {
        const path = file.webkitRelativePath || file.name;
        zip.file(path, file);
        filePaths.push(path);
      });
      
      const content = await zip.generateAsync({ type: "blob" });
      const zippedFile = new File([content], archiveName, {
        type: "application/zip",
      });
      
      await startTransfer(zippedFile, filePaths);
    } catch (err) {
      console.error("Folder compression failure:", err);
      sfx.playError();
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 1) {
        await startTransfer(files[0]);
      } else {
        await zipAndSendFiles(files, "archive.zip");
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await startTransfer(e.target.files[0]);
    }
  };

  const handleMultiFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (files.length === 1) {
        await startTransfer(files[0]);
      } else {
        await zipAndSendFiles(files, "archive.zip");
      }
    }
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      let folderName = "folder-archive";
      if (files[0].webkitRelativePath) {
        folderName = files[0].webkitRelativePath.split('/')[0];
      }
      await zipAndSendFiles(files, `${folderName}.zip`);
    }
  };

  const triggerFileInput = () => {
    sfx.playClick();
    fileInputRef.current?.click();
  };

  const handleReceiveConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveInput) return;
    await joinRoom(receiveInput);
  };

  const handleAbort = () => {
    sfx.playClick();
    disconnectPeer();
  };

  // QR Code Draw Effect
  useEffect(() => {
    if (showQrModal && qrCanvasRef.current && roomId) {
      const canvas = qrCanvasRef.current;
      const url = getShareLink();

      const drawQR = async () => {
        try {
          const QRCode = (await import("qrcode")).default;
          await QRCode.toCanvas(canvas, url, {
            errorCorrectionLevel: "H",
            width: 250,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          });

          // Embed Sora mascot logo in the center of the canvas
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const logoImg = new Image();
            logoImg.src = "/sora_mascot_transparent.png";
            logoImg.onload = () => {
              const logoSize = 56;
              const x = (canvas.width - logoSize) / 2;
              const y = (canvas.height - logoSize) / 2;

              // Background white disk
              ctx.fillStyle = "#ffffff";
              ctx.beginPath();
              ctx.arc(canvas.width / 2, canvas.height / 2, logoSize / 2 + 4, 0, 2 * Math.PI);
              ctx.fill();

              // Draw logo image
              ctx.drawImage(logoImg, x, y, logoSize, logoSize);
            };
          }
        } catch (err) {
          console.error("Failed to render QR Code:", err);
        }
      };

      drawQR();
    }
  }, [showQrModal, roomId, encryptionKey]);

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
                <input
                  ref={multiFileInputRef}
                  type="file"
                  multiple
                  onChange={handleMultiFileSelect}
                  className="hidden"
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  onChange={handleFolderSelect}
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                />

                {isCompressing ? (
                  <div className="flex flex-col items-center py-4">
                    <RefreshCw className="w-12 h-12 mb-3 text-amber-600 animate-spin" />
                    <span className="font-pixel text-[8px] text-amber-700 animate-pulse text-center">
                      PACKING FOLDER TO ZIP...
                    </span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className={`w-12 h-12 mb-3 text-red-600 ${dragActive ? "animate-bounce" : ""}`} />
                    <span className="font-pixel text-[9px] text-[#3c290c] text-center mb-1 select-none">
                      DRAG & DROP FILE HERE
                    </span>
                    <span className="font-mono text-xs text-[#5c3e0c] opacity-80 text-center select-none">
                      OR CLICK TO UPLOAD
                    </span>
                  </>
                )}
              </div>

              {!isCompressing && (
                <div className="flex justify-center gap-4 mt-3 font-mono text-[9px] text-[#5c3e0c] select-none">
                  <button 
                    onClick={(e) => { e.stopPropagation(); sfx.playClick(); multiFileInputRef.current?.click(); }}
                    className="underline hover:text-black cursor-pointer uppercase"
                  >
                    Select Multiple Files
                  </button>
                  <span>|</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); sfx.playClick(); folderInputRef.current?.click(); }}
                    className="underline hover:text-black cursor-pointer uppercase"
                  >
                    Select Folder
                  </button>
                </div>
              )}
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
              onClick={handleAbort}
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

                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => { sfx.playClick(); setShowQrModal(true); }}
                    className="btn-retro font-pixel text-[8px] py-1 px-3 flex items-center gap-1 cursor-pointer"
                  >
                    <span>VIEW QR HANDSHAKE</span>
                  </button>
                </div>
              </div>

              {/* Progress Gauges */}
              <div className="border border-black/20 bg-white/30 rounded-lg p-4 flex flex-col justify-center min-h-[160px]">
                {showSuccessMascot ? (
                  <div className="flex flex-col items-center justify-center py-4 text-center select-none relative overflow-hidden">
                    <span className="font-pixel text-[8px] text-green-700 mb-1 animate-pulse">
                      DELIVERED!
                    </span>
                    <span className="font-mono text-xs text-[#5c3e0c] truncate max-w-xs mb-2">
                      {successFileName}
                    </span>
                    <button
                      onClick={() => { sfx.playClick(); setShowReceiptModal(true); }}
                      className="btn-retro font-pixel text-[8px] py-1 px-3 cursor-pointer"
                    >
                      PRINT RECEIPT
                    </button>
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

                    {/* ZIP Contents Tree List */}
                    {currentTransfer.zipContents && currentTransfer.zipContents.length > 0 && (
                      <div className="mt-3 border border-black/20 bg-black/5 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-[10px] text-[#5c3e0c]">
                        <div className="font-pixel text-[8px] text-[#3c290c] mb-2 uppercase tracking-wide select-none">
                          📁 Archive File List ({currentTransfer.zipContents.length}):
                        </div>
                        <div className="flex flex-col gap-1">
                          {currentTransfer.zipContents.map((path, idx) => {
                            const parts = path.split('/');
                            const name = parts[parts.length - 1];
                            const indent = parts.length - 1;
                            
                            return (
                              <div key={idx} className="flex items-center gap-1.5" style={{ paddingLeft: `${indent * 12}px` }}>
                                {indent > 0 && <span className="opacity-55 font-mono select-none">└─</span>}
                                <span className="select-none text-xs">
                                  {path.endsWith('/') || indent < parts.length - 1 && parts.length > 1 && idx < currentTransfer.zipContents!.length - 1 && currentTransfer.zipContents![idx+1].startsWith(parts.slice(0, -1).join('/') + '/') ? "📁" : "📄"}
                                </span>
                                <span className="truncate select-all text-black/85" title={path}>
                                  {name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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

      {/* QR HANDSHAKE MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <div className="max-w-xs w-full panel-blue flex flex-col shadow-[10px_10px_0px_#000]">
            {/* Modal Title Bar */}
            <div className="flex items-center justify-between bg-black/25 px-4 py-2 border-b-2 border-black/20">
              <span className="font-pixel text-[9px] text-[#fff580] tracking-wider uppercase">
                HANDSHAKE QR CODE
              </span>
              <button
                onClick={() => { sfx.playClick(); setShowQrModal(false); }}
                className="font-pixel text-[9px] text-white hover:text-red-300 cursor-pointer focus:outline-none"
              >
                [X]
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col items-center justify-center bg-white border-b-2 border-black/10">
              <canvas ref={qrCanvasRef} className="border-2 border-black bg-white rounded-lg shadow-sm" />
              <div className="mt-4 font-mono text-[9px] text-center text-black/80 leading-normal uppercase">
                Scan with mobile camera to establish secure peer key-exchange tunnel.
              </div>
            </div>

            {/* Close Button Footer */}
            <div className="p-3 bg-black/10 flex justify-end">
              <button
                onClick={() => { sfx.playClick(); setShowQrModal(false); }}
                className="btn-retro font-pixel text-[8px] py-1 px-3 cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
      {/* THERMAL RECEIPT MODAL */}
      {showReceiptModal && receiptDetails && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs receipt-modal-overlay">
          <div className="max-w-sm w-full bg-white border-2 border-black flex flex-col p-4 font-mono text-black shadow-[10px_10px_0px_#000] relative receipt-print-container">
            {/* Dashed Cut Line at top */}
            <div className="border-b border-dashed border-black/40 pb-2 mb-3 text-center text-[10px] select-none uppercase tracking-widest text-black/50">
              - - - - - - - - - - - - - - - - - - - - - - - -
            </div>

            {/* Header */}
            <div className="flex flex-col items-center text-center gap-1">
              <span className="font-pixel text-[12px] uppercase font-bold tracking-wider">
                SORA HOTEL NET
              </span>
              <span className="text-[9px] text-black/70">
                DECENTRALIZED P2P TRANSMISSION
              </span>
              <span className="text-[8px] text-black/50">
                {new Date(receiptDetails.timestamp).toLocaleString()}
              </span>
            </div>

            {/* Divider */}
            <div className="border-b border-dashed border-black my-3"></div>

            {/* Transaction Data */}
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span>TX ID:</span>
                <span className="font-bold">{receiptDetails.id.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between">
                <span>ROOM CODE:</span>
                <span className="font-bold">#{receiptDetails.roomId}</span>
              </div>
              <div className="border-b border-dashed border-black/10 my-1"></div>
              <div className="flex flex-col">
                <span>FILE NAME:</span>
                <span className="font-bold break-all">{receiptDetails.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span>FILE SIZE:</span>
                <span className="font-bold">{formatBytes(receiptDetails.fileSize)}</span>
              </div>
              <div className="border-b border-dashed border-black/10 my-1"></div>
              <div className="flex justify-between">
                <span>ENCRYPTION:</span>
                <span className="font-bold">AES-GCM-256</span>
              </div>
              <div className="flex justify-between">
                <span>STATUS:</span>
                <span className="font-bold text-green-700">{receiptDetails.hash}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-dashed border-black my-3"></div>

            {/* ASCII Mascot representation or logo */}
            <pre className="text-[7px] leading-[7px] text-center select-none font-bold bg-black/5 p-2 rounded-sm border border-black/10">
              {"   _____  ____  _____\n"}
              {"  / ____|/ __ \\|  __ \\   /\\\n"}
              {" | (___ | |  | | |__) | /  \\\n"}
              {"  \\___ \\| |  | |  _  / / /\\ \\\n"}
              {"  ____) | |__| | | \\ \\/ ____ \\\n"}
              {" |_____/ \\____/|_|  \\_/_/    \\_\\"}
            </pre>

            {/* Footer message */}
            <div className="mt-3 text-center text-[9px] leading-normal uppercase">
              Thank you for using Sora.<br />
              No copy is stored on any server.
            </div>

            {/* Dashed Cut Line at bottom */}
            <div className="border-b border-dashed border-black/40 pt-2 mt-3 text-center text-[10px] select-none uppercase tracking-widest text-black/50">
              - - - - - - - - - - - - - - - - - - - - - - - -
            </div>

            {/* Control buttons - hidden during print via print-specific media query */}
            <div className="mt-4 flex gap-2 w-full no-print">
              <button
                onClick={() => { sfx.playClick(); window.print(); }}
                className="btn-retro flex-1 font-pixel text-[8px] py-1.5 cursor-pointer"
              >
                PRINT
              </button>
              <button
                onClick={() => { sfx.playClick(); setShowReceiptModal(false); }}
                className="btn-retro flex-1 font-pixel text-[8px] py-1.5 bg-gray-200 text-black border-black cursor-pointer"
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
