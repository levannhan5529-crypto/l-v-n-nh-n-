import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Flag, Timer, X } from "lucide-react";

interface StopwatchProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Stopwatch: React.FC<StopwatchProps> = ({ isOpen = true, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const startRef = useRef<number>(0);
  const prevElapsedRef = useRef<number>(0);

  useEffect(() => {
    let animId: number;
    if (isRunning) {
      startRef.current = performance.now();
      const tick = () => {
        const now = performance.now();
        const delta = now - startRef.current;
        setElapsedMs(prevElapsedRef.current + delta);
        animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animId);
  }, [isRunning]);

  const handleToggle = () => {
    if (isRunning) {
      prevElapsedRef.current = elapsedMs;
      setIsRunning(false);
    } else {
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    prevElapsedRef.current = 0;
    setElapsedMs(0);
    setLaps([]);
  };

  const handleLap = () => {
    if (elapsedMs > 0) {
      setLaps((prev) => [elapsedMs, ...prev]);
    }
  };

  if (!isOpen) return null;

  // Format mm:ss.ms
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor((elapsedMs % 1000) / 10);

  const formatPad = (n: number, len = 2) => n.toString().padStart(len, "0");

  return (
    <div className="bg-slate-900/95 border border-cyan-500/40 rounded-xl p-3.5 shadow-2xl backdrop-blur text-slate-100 w-64 select-none font-sans">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
          <Timer className="w-3.5 h-3.5" />
          <span>Đồng hồ bấm giây</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Digits Display */}
      <div className="bg-slate-950 rounded-lg p-2.5 text-center font-mono border border-slate-800/90 my-2">
        <div className="text-2xl font-bold tracking-wider text-cyan-300">
          {formatPad(minutes)}:{formatPad(seconds)}
          <span className="text-sm text-cyan-500">.{formatPad(millis)}</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">Phút : Giây : 1/100s</div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between gap-1.5 mt-3">
        <button
          onClick={handleToggle}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition shadow ${
            isRunning
              ? "bg-amber-600 hover:bg-amber-500 text-white"
              : "bg-cyan-600 hover:bg-cyan-500 text-white"
          }`}
        >
          {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          <span>{isRunning ? "Dừng" : "Bắt đầu"}</span>
        </button>

        <button
          onClick={handleLap}
          disabled={!isRunning && elapsedMs === 0}
          className="flex items-center justify-center p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition border border-slate-700"
          title="Ghi mốc vòng (Lap)"
        >
          <Flag className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleReset}
          className="flex items-center justify-center p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
          title="Đặt lại"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Laps List */}
      {laps.length > 0 && (
        <div className="mt-2.5 max-h-24 overflow-y-auto border-t border-slate-800/80 pt-1.5 text-[11px] font-mono text-slate-400 space-y-1">
          {laps.slice(0, 4).map((lap, i) => (
            <div key={i} className="flex justify-between px-1">
              <span>Mốc #{laps.length - i}:</span>
              <span className="text-cyan-300 font-semibold">{(lap / 1000).toFixed(3)}s</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
