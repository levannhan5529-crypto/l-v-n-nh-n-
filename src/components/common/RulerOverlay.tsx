import React, { useState } from "react";
import { Move, X, RotateCw } from "lucide-react";

interface RulerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  pixelsPerMeter?: number;
}

export const RulerOverlay: React.FC<RulerOverlayProps> = ({
  isOpen,
  onClose,
  pixelsPerMeter = 350,
}) => {
  const [pos, setPos] = useState({ x: 80, y: 140 });
  const [rotation, setRotation] = useState(0); // 0 or 90
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  if (!isOpen) return null;

  const rulerLengthPx = 350; // default 1 meter or 50cm
  const cmCount = 20; // 20 cm marks
  const mmStep = rulerLengthPx / (cmCount * 10);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPos({
        x: Math.max(10, e.clientX - dragOffset.x),
        y: Math.max(10, e.clientY - dragOffset.y),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "top left",
      }}
      className="absolute z-30 cursor-move select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="bg-amber-100/90 border border-amber-600/70 rounded shadow-2xl backdrop-blur flex flex-col w-[360px] h-[58px] overflow-hidden relative text-amber-950 font-mono">
        {/* Top bar controls */}
        <div
          onMouseDown={handleMouseDown}
          className="bg-amber-200/80 px-2 py-0.5 flex items-center justify-between border-b border-amber-400 text-[10px] cursor-grab active:cursor-grabbing font-sans text-amber-900 font-semibold"
        >
          <span className="flex items-center gap-1">
            <Move className="w-2.5 h-2.5" />
            Thước milimét (Kéo để đo)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRotation((r) => (r === 0 ? 90 : 0))}
              className="p-0.5 rounded hover:bg-amber-300 text-amber-800"
              title="Xoay thước 90°"
            >
              <RotateCw className="w-2.5 h-2.5" />
            </button>
            <button onClick={onClose} className="p-0.5 rounded hover:bg-amber-300 text-amber-800">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* Graduations */}
        <div className="flex-1 relative flex items-end">
          {Array.from({ length: cmCount * 10 + 1 }).map((_, i) => {
            const isCm = i % 10 === 0;
            const isHalfCm = i % 5 === 0 && !isCm;
            const heightPx = isCm ? 20 : isHalfCm ? 12 : 7;
            const leftPx = i * mmStep;

            return (
              <div
                key={i}
                style={{ left: `${leftPx}px`, height: `${heightPx}px` }}
                className={`absolute bottom-0 border-l ${
                  isCm ? "border-amber-950 w-0" : isHalfCm ? "border-amber-800" : "border-amber-700/60"
                }`}
              >
                {isCm && (
                  <span className="absolute -top-4 -left-1 text-[9px] font-bold text-amber-950">
                    {i / 10}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
