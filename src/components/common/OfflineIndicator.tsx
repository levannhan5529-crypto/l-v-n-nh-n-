import React from "react";
import { WifiOff, CheckCircle } from "lucide-react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-indicator"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/90 text-slate-950 font-semibold px-3 py-2 text-xs shadow-2xl border border-amber-400 backdrop-blur-md animate-pulse"
    >
      <WifiOff className="w-4 h-4 text-slate-950" />
      <span>Đang chạy ngoại tuyến (Offline) — Dữ liệu thí nghiệm &amp; mô phỏng sẵn sàng</span>
    </div>
  );
};
