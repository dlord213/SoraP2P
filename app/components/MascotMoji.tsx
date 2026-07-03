import React from "react";

interface MascotMojiProps {
  status: "idle" | "connecting" | "transferring" | "failed";
  className?: string;
  size?: number;
}

export const MascotMoji: React.FC<MascotMojiProps> = ({ status, className = "", size = 96 }) => {
  return (
    <div 
      className={`relative flex items-center justify-center select-none ${className}`} 
      style={{ width: size, height: size }}
    >
      {/* 1. JETPACK EXHAUST FLAMES (Active when transferring) */}
      {status === "transferring" && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-6 pointer-events-none z-0">
          <div className="w-2.5 h-7 bg-red-600 rounded-full animate-bounce shadow-[0_0_8px_#dc2626] flex items-end justify-center">
            <div className="w-1 h-3 bg-yellow-400 rounded-full" />
          </div>
          <div className="w-2.5 h-7 bg-red-600 rounded-full animate-bounce delay-75 shadow-[0_0_8px_#dc2626] flex items-end justify-center">
            <div className="w-1 h-3 bg-yellow-400 rounded-full" />
          </div>
        </div>
      )}

      {/* 2. Zzz PARTICLES (Floating above head when idle) */}
      {status === "idle" && (
        <div className="absolute -top-3 right-0 pointer-events-none font-pixel text-[#5c3e0c] text-[8px] flex flex-col gap-1">
          <span className="animate-[fadeSlideUp_2s_infinite_0s] opacity-0 select-none">Z</span>
          <span className="animate-[fadeSlideUp_2s_infinite_0.6s] opacity-0 text-[10px] select-none pl-2">z</span>
          <span className="animate-[fadeSlideUp_2s_infinite_1.2s] opacity-0 text-[12px] select-none pl-4">Z</span>
        </div>
      )}

      {/* 3. DIZZY SPIRAL (Spinning above head when failed) */}
      {status === "failed" && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-none font-pixel text-orange-600 text-[11px] animate-[spin_3s_linear_infinite] select-none">
          💫
        </div>
      )}

      {/* 4. MAIN MASCOT CHARACTER */}
      <img
        src="/sora_mascot_transparent.png"
        alt="Sora Mascot"
        className={`w-full h-full object-contain z-10 ${
          status === "transferring"
            ? "animate-mascot-hover"
            : status === "connecting"
            ? "animate-pulse"
            : status === "failed"
            ? "rotate-12 saturate-50"
            : ""
        }`}
        style={{ imageRendering: "pixelated" }}
      />

      {/* 5. STATEFUL OVERLAYS */}
      {/* A. CONNECTING: RADAR SCANNING GOGGLES */}
      {status === "connecting" && (
        <div className="absolute top-[36%] left-[28%] right-[28%] h-2.5 bg-emerald-500/80 border border-emerald-400 rounded-sm shadow-[0_0_6px_#10b981] animate-pulse pointer-events-none z-20 flex items-center justify-center">
          <div className="w-full h-0.5 bg-white/70 animate-ping" />
        </div>
      )}

      {/* B. FLIGHT HELMET VISOR (When transferring) */}
      {status === "transferring" && (
        <div className="absolute top-[28%] left-[25%] right-[25%] h-5 bg-blue-900/60 border border-black rounded pointer-events-none z-20 overflow-hidden">
          <div className="w-2 h-full bg-white/40 rotate-12 -translate-y-1 translate-x-1" />
        </div>
      )}

      {/* C. DIZZY EYES OVERLAY (When failed) */}
      {status === "failed" && (
        <div className="absolute top-[37%] left-[34%] right-[34%] flex justify-between pointer-events-none font-mono text-black font-extrabold text-[11px] z-20 select-none">
          <span>x</span>
          <span>x</span>
        </div>
      )}
    </div>
  );
};
