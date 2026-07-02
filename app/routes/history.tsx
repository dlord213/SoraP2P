import { useApp } from "../context/AppContext";
import { History, Trash2, ShieldCheck, AlertCircle, Calendar } from "lucide-react";
import type { Route } from "./+types/history";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sora - Translogs" },
    { name: "description", content: "View local peer-to-peer transaction history logs." },
  ];
}

export default function HistoryPage() {
  const { transferHistory, clearHistory } = useApp();

  // Size Formatter
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Date Formatter
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="card-cream p-5 w-full">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-black/10 pb-3 mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white p-2 border-2 border-black rounded-lg shadow-[2px_2px_0px_#000]">
              <History className="w-4 h-4 text-black" />
            </div>
            <div>
              <h2 className="font-pixel text-[10px] text-blue-900 uppercase tracking-wider select-none">
                TRANSACTION HISTORY LOGS
              </h2>
              <span className="font-mono text-xs text-[#5c3e0c] opacity-80 select-none">
                Saved locally on your browser. No files are logged.
              </span>
            </div>
          </div>

          {transferHistory.length > 0 && (
            <button
              onClick={clearHistory}
              className="btn-retro btn-retro-neutral font-pixel text-[8px] flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              CLEAR LOGS
            </button>
          )}
        </div>

        {/* Safety Note */}
        <div className="bg-white/40 border border-black/15 rounded-lg p-3 mb-5 font-mono text-xs text-[#3c290c] flex items-center gap-3 select-none">
          <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <div>
            <strong>ZERO FILE STORAGE:</strong> These translogs save transaction coordinates locally. The actual file bytes are never saved on the server.
          </div>
        </div>

        {/* Logs Table / Empty view */}
        {transferHistory.length === 0 ? (
          <div className="border-2 border-dashed border-black/20 bg-white/20 py-16 px-4 text-center rounded-lg select-none">
            <AlertCircle className="w-12 h-12 text-blue-900 animate-pulse mx-auto mb-3" />
            <span className="font-pixel text-[8px] text-blue-950 uppercase tracking-wider block mb-1">
              NO TRANSACTION LOGS DETECTED
            </span>
            <span className="font-mono text-xs text-[#5c3e0c] opacity-75 max-w-sm mx-auto block">
              Successful or failed file transfers will be listed here.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto border-2 border-black bg-white rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
            <table className="table w-full font-mono text-xs border-collapse text-left">
              {/* head */}
              <thead>
                <tr className="border-b-2 border-black bg-[#fff8e7] font-pixel text-[8px] text-[#5c3e0c] select-none">
                  <th className="p-3">TIMESTAMP</th>
                  <th className="p-3">FILE NAME</th>
                  <th className="p-3">SIZE</th>
                  <th className="p-3">PEER ID</th>
                  <th className="p-3 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {transferHistory.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-black/10 hover:bg-gray-50 transition-colors text-black"
                  >
                    <td className="p-3 whitespace-nowrap text-[#5c3e0c] flex items-center gap-1.5 select-none">
                      <Calendar className="w-3.5 h-3.5 opacity-40" />
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="p-3 font-semibold text-blue-900 truncate max-w-xs">
                      {log.fileName}
                    </td>
                    <td className="p-3 whitespace-nowrap text-[#3c290c]">
                      {formatBytes(log.fileSize)}
                    </td>
                    <td className="p-3 whitespace-nowrap text-[#5c3e0c] select-all">
                      <span className="font-pixel text-[7px] bg-amber-200 border border-black/35 px-1.5 py-0.5 mr-1.5">
                        NODE
                      </span>
                      #{log.peerId}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap select-none">
                      {log.status === "Success" ? (
                        <span className="px-2 py-0.5 border border-black bg-emerald-600 text-white font-pixel text-[7px] shadow-[1px_1px_0px_#000] inline-block">
                          SUCCESS
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 border border-black bg-red-600 text-white font-pixel text-[7px] shadow-[1px_1px_0px_#000] inline-block">
                          FAILED
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
