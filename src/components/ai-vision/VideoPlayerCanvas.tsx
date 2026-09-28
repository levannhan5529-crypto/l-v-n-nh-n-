import React, { useRef, useEffect, useState, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Upload, Crosshair, Scale, MousePointer, Trash2, Video } from "lucide-react";
import { ExperimentType, TrackingPoint, CalibrationScale } from "../../types/physics";
import { getExperimentMeta } from "../../utils/videoSamples";

interface VideoPlayerCanvasProps {
  experimentType: ExperimentType;
  trackingPoints: TrackingPoint[];
  currentFrame: number;
  onFrameChange: (frame: number | ((prev: number) => number)) => void;
  calibration: CalibrationScale;
  onCalibrationChange: (calib: CalibrationScale) => void;
  onPointSelect?: (x: number, y: number) => void;
  trackingColor: string;
  onColorChange: (color: string) => void;
  trackingMode: "color-centroid" | "template" | "optical-flow";
  showOverlayTrajectory?: boolean;
  showVectors?: boolean;
  showCalibrationPins?: boolean;
  userVideoUrl?: string | null;
  onUserVideoUpload?: (file: File) => void;
  isManualTracking?: boolean;
  onToggleManualTracking?: () => void;
  onAddManualPoint?: (point: { rawX: number; rawY: number; frameIndex: number }) => void;
  onResetManualPoints?: () => void;
  manualPointsCount?: number;
}

// Virtual coordinate system for physics computation & interactive scale
const VIRTUAL_WIDTH = 640;
const VIRTUAL_HEIGHT = 400;

// High Definition supersampling scale: 2x = 1280x800 HD rendering
const RESOLUTION_SCALE = 2;
const CANVAS_WIDTH = VIRTUAL_WIDTH * RESOLUTION_SCALE;
const CANVAS_HEIGHT = VIRTUAL_HEIGHT * RESOLUTION_SCALE;

export const VideoPlayerCanvas: React.FC<VideoPlayerCanvasProps> = ({
  experimentType,
  trackingPoints,
  currentFrame,
  onFrameChange,
  calibration,
  onCalibrationChange,
  onPointSelect,
  trackingColor,
  onColorChange,
  trackingMode,
  showOverlayTrajectory = true,
  showVectors = true,
  showCalibrationPins = true,
  userVideoUrl,
  onUserVideoUpload,
  isManualTracking = false,
  onToggleManualTracking,
  onAddManualPoint,
  onResetManualPoints,
  manualPointsCount = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activePin, setActivePin] = useState<"p1" | "p2" | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const meta = getExperimentMeta(experimentType);
  const totalFrames = trackingPoints.length > 0 ? trackingPoints.length : meta.totalFrames;

  // Auto playback animation loop
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      const intervalMs = (1000 / meta.fps) / playbackSpeed;
      timer = setInterval(() => {
        onFrameChange((prev) => {
          if (prev >= totalFrames - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, meta.fps, totalFrames, onFrameChange]);

  // Sync user uploaded video time if available
  useEffect(() => {
    if (videoRef.current && userVideoUrl && !isNaN(videoRef.current.duration)) {
      const time = currentFrame / meta.fps;
      videoRef.current.currentTime = Math.min(videoRef.current.duration, time);
    }
  }, [currentFrame, userVideoUrl, meta.fps]);

  // Main canvas render function
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Enable High Definition 1280x800 anti-aliased rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.scale(RESOLUTION_SCALE, RESOLUTION_SCALE);

    const w = VIRTUAL_WIDTH;
    const h = VIRTUAL_HEIGHT;

    // 1. Draw Background: Real uploaded video frame OR Synthetic Lab Scene
    if (userVideoUrl && videoRef.current && videoRef.current.readyState >= 2) {
      // Draw actual uploaded video frame
      ctx.drawImage(videoRef.current, 0, 0, w, h);
    } else {
      // Draw realistic synthetic laboratory scene
      drawLaboratoryScene(ctx, w, h, experimentType, currentFrame, meta);
    }

    // 2. Draw Trajectory Trail (Historical Points up to current frame)
    if (showOverlayTrajectory && trackingPoints.length > 0) {
      const historical = trackingPoints.slice(0, currentFrame + 1);
      if (historical.length > 1) {
        ctx.beginPath();
        for (let i = 0; i < historical.length; i++) {
          const pt = historical[i];
          if (i === 0) {
            ctx.moveTo(pt.filteredX, pt.filteredY);
          } else {
            ctx.lineTo(pt.filteredX, pt.filteredY);
          }
        }
        ctx.strokeStyle = "rgba(6, 182, 212, 0.75)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw dot at each past frame
        historical.forEach((pt, idx) => {
          ctx.beginPath();
          ctx.arc(pt.filteredX, pt.filteredY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = idx === currentFrame ? "#f59e0b" : "rgba(56, 189, 248, 0.7)";
          ctx.fill();
        });
      }
    }

    // 3. Draw Active Tracked Object Marker & HUD
    const currentPt = trackingPoints[currentFrame];
    if (currentPt) {
      const px = currentPt.filteredX;
      const py = currentPt.filteredY;

      // Crosshair / Bounding box
      const boxSize = 28;
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.8;
      ctx.strokeRect(px - boxSize / 2, py - boxSize / 2, boxSize, boxSize);

      // Corner notches
      const notch = 6;
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      // Top left
      ctx.beginPath();
      ctx.moveTo(px - boxSize / 2, py - boxSize / 2 + notch);
      ctx.lineTo(px - boxSize / 2, py - boxSize / 2);
      ctx.lineTo(px - boxSize / 2 + notch, py - boxSize / 2);
      ctx.stroke();
      // Bottom right
      ctx.beginPath();
      ctx.moveTo(px + boxSize / 2, py + boxSize / 2 - notch);
      ctx.lineTo(px + boxSize / 2, py + boxSize / 2);
      ctx.lineTo(px + boxSize / 2 - notch, py + boxSize / 2);
      ctx.stroke();

      // Center cross
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px - 4, py);
      ctx.lineTo(px + 4, py);
      ctx.moveTo(px, py - 4);
      ctx.lineTo(px, py + 4);
      ctx.stroke();

      // Velocity Vector Arrow
      if (showVectors && currentPt.velocityX !== undefined && currentPt.velocityY !== undefined) {
        const arrowScale = 18; // scale m/s to pixels
        const vxPx = currentPt.velocityX * arrowScale;
        const vyPx = currentPt.velocityY * arrowScale;
        drawArrow(ctx, px, py, px + vxPx, py + vyPx, "#10b981", "v");
      }

      // HUD Label
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(px + boxSize / 2 + 6, py - 20, 115, 44);
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + boxSize / 2 + 6, py - 20, 115, 44);

      ctx.font = "bold 10px JetBrains Mono, monospace";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`P(${currentPt.posX.toFixed(2)}m, ${currentPt.posY.toFixed(2)}m)`, px + boxSize / 2 + 10, py - 6);
      ctx.fillStyle = "#34d399";
      ctx.fillText(`v=${(currentPt.velocityTotal ?? 0).toFixed(2)} m/s`, px + boxSize / 2 + 10, py + 8);
      ctx.fillStyle = "#a78bfa";
      ctx.fillText(`t=${currentPt.timeSeconds.toFixed(2)}s (#${currentPt.frameIndex})`, px + boxSize / 2 + 10, py + 20);
    }

    // 4. Draw Draggable Calibration Scale Pins
    if (showCalibrationPins) {
      const { x1, y1, x2, y2, realDistanceMeters } = calibration;

      // Calibration Line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pin 1
      drawPin(ctx, x1, y1, "A (0m)", activePin === "p1");
      // Pin 2
      drawPin(ctx, x2, y2, `B (${realDistanceMeters}m)`, activePin === "p2");

      // Midpoint distance badge
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      ctx.fillStyle = "rgba(234, 179, 8, 0.95)";
      ctx.beginPath();
      ctx.roundRect(midX - 40, midY - 10, 80, 20, 4);
      ctx.fill();
      ctx.fillStyle = "#022c22";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Thước: ${realDistanceMeters}m`, midX, midY + 4);
      ctx.textAlign = "left";
    }

    // 5. Video Info HUD in top corner
    ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
    ctx.fillRect(10, 10, 225, 58);
    ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
    ctx.strokeRect(10, 10, 225, 58);

    ctx.font = "11px JetBrains Mono, monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`FPS: ${meta.fps} | Khung: ${currentFrame + 1}/${totalFrames}`, 18, 28);
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(`Tỉ lệ: ${calibration.pixelsPerMeter.toFixed(1)} px/m`, 18, 44);
    ctx.fillStyle = isManualTracking ? "#f59e0b" : "#e2e8f0";
    ctx.fillText(
      isManualTracking
        ? `Chế độ: Chấm điểm thủ công (${manualPointsCount} đ)`
        : `Chế độ: ${trackingMode}`,
      18,
      60
    );

    ctx.restore();
  }, [
    userVideoUrl,
    experimentType,
    currentFrame,
    meta,
    showOverlayTrajectory,
    trackingPoints,
    showVectors,
    showCalibrationPins,
    calibration,
    activePin,
    totalFrames,
    trackingMode,
    isManualTracking,
    manualPointsCount,
  ]);

  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  // Handle Canvas Mouse Interactivity
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = VIRTUAL_WIDTH / rect.width;
    const scaleY = VIRTUAL_HEIGHT / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // 1. If in Manual Tracking mode, record current frame's position and advance frame
    if (isManualTracking && onAddManualPoint) {
      onAddManualPoint({
        rawX: Math.round(clickX * 10) / 10,
        rawY: Math.round(clickY * 10) / 10,
        frameIndex: currentFrame,
      });
      // Auto-advance to next frame for fast annotation
      if (currentFrame < totalFrames - 1) {
        onFrameChange(currentFrame + 1);
      }
      return;
    }

    // 2. Check if clicking calibration pins
    const distP1 = Math.hypot(clickX - calibration.x1, clickY - calibration.y1);
    const distP2 = Math.hypot(clickX - calibration.x2, clickY - calibration.y2);

    if (distP1 < 20) {
      setActivePin("p1");
    } else if (distP2 < 20) {
      setActivePin("p2");
    } else {
      // Otherwise notify parent of clicked point (ROI or target position)
      if (onPointSelect) {
        onPointSelect(clickX, clickY);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activePin) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = VIRTUAL_WIDTH / rect.width;
    const scaleY = VIRTUAL_HEIGHT / rect.height;
    const curX = (e.clientX - rect.left) * scaleX;
    const curY = (e.clientY - rect.top) * scaleY;

    const newCalib = { ...calibration };
    if (activePin === "p1") {
      newCalib.x1 = Math.round(curX);
      newCalib.y1 = Math.round(curY);
    } else {
      newCalib.x2 = Math.round(curX);
      newCalib.y2 = Math.round(curY);
    }

    const pxDist = Math.hypot(newCalib.x2 - newCalib.x1, newCalib.y2 - newCalib.y1);
    newCalib.pixelDistance = pxDist;
    newCalib.pixelsPerMeter = pxDist / newCalib.realDistanceMeters;
    onCalibrationChange(newCalib);
  };

  const handleCanvasMouseUp = () => {
    setActivePin(null);
  };

  // Cross-Platform Touch Interactivity for Mobile & Tablet (iOS / iPadOS / Android)
  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = VIRTUAL_WIDTH / rect.width;
    const scaleY = VIRTUAL_HEIGHT / rect.height;
    const clickX = (touch.clientX - rect.left) * scaleX;
    const clickY = (touch.clientY - rect.top) * scaleY;

    if (isManualTracking && onAddManualPoint) {
      onAddManualPoint({
        rawX: Math.round(clickX * 10) / 10,
        rawY: Math.round(clickY * 10) / 10,
        frameIndex: currentFrame,
      });
      if (currentFrame < totalFrames - 1) {
        onFrameChange(currentFrame + 1);
      }
      return;
    }

    const distP1 = Math.hypot(clickX - calibration.x1, clickY - calibration.y1);
    const distP2 = Math.hypot(clickX - calibration.x2, clickY - calibration.y2);

    if (distP1 < 26) {
      setActivePin("p1");
    } else if (distP2 < 26) {
      setActivePin("p2");
    } else {
      if (onPointSelect) {
        onPointSelect(clickX, clickY);
      }
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!activePin || e.touches.length === 0) return;
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = VIRTUAL_WIDTH / rect.width;
    const scaleY = VIRTUAL_HEIGHT / rect.height;
    const curX = (touch.clientX - rect.left) * scaleX;
    const curY = (touch.clientY - rect.top) * scaleY;

    const newCalib = { ...calibration };
    if (activePin === "p1") {
      newCalib.x1 = Math.round(curX);
      newCalib.y1 = Math.round(curY);
    } else {
      newCalib.x2 = Math.round(curX);
      newCalib.y2 = Math.round(curY);
    }

    const pxDist = Math.hypot(newCalib.x2 - newCalib.x1, newCalib.y2 - newCalib.y1);
    newCalib.pixelDistance = pxDist;
    newCalib.pixelsPerMeter = pxDist / newCalib.realDistanceMeters;
    onCalibrationChange(newCalib);
  };

  const handleCanvasTouchEnd = () => {
    setActivePin(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUserVideoUpload) {
      onUserVideoUpload(file);
    }
  };

  return (
    <div className="bg-slate-900/95 border border-cyan-500/30 rounded-2xl p-2.5 sm:p-3 shadow-[0_8px_30px_rgba(6,182,212,0.12)] flex flex-col gap-2">
      {/* Hidden elements */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      {userVideoUrl && (
        <video
          ref={videoRef}
          src={userVideoUrl}
          playsInline
          muted
          className="hidden"
          onLoadedData={renderFrame}
        />
      )}

      {/* Top Header / Mode Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <h3 className="font-extrabold text-sm text-white">{meta.name}</h3>
          <span className="text-[11px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-600/70 font-bold shadow-sm">
            {meta.grade}
          </span>
          <span className="text-[11px] bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700 hidden sm:inline-block font-medium">
            {meta.category}
          </span>
          <span className="text-[10px] bg-emerald-950/90 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/70 font-mono font-extrabold flex items-center gap-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            HD 1280×800
          </span>
          {userVideoUrl && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/60 font-bold">
              Video người dùng
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Manual Tagging Mode Toggle */}
          {onToggleManualTracking && (
            <button
              onClick={onToggleManualTracking}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                isManualTracking
                  ? "bg-amber-500 text-slate-950 font-bold border-amber-300 shadow-md shadow-amber-500/30"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
              }`}
              title="Nhấp trên video để chấm điểm vật thể từng khung hình"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>{isManualTracking ? "Đang chấm thủ công" : "Chấm điểm thủ công"}</span>
            </button>
          )}

          {/* Reset manual points if any */}
          {isManualTracking && manualPointsCount > 0 && onResetManualPoints && (
            <button
              onClick={onResetManualPoints}
              className="p-1 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700 transition shadow-sm cursor-pointer"
              title="Xóa các điểm đã chấm thủ công"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick upload file button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 px-2.5 py-1 rounded-lg border border-slate-700 hover:border-cyan-400 transition shadow-sm font-medium cursor-pointer"
            title="Tải video thí nghiệm tự quay từ máy tính/điện thoại"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tải video</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport (Thu nhỏ gọn gàng) */}
      <div className="relative w-full aspect-[16/9] max-h-[250px] sm:max-h-[270px] bg-slate-950 rounded-xl overflow-hidden border border-cyan-500/30 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onTouchStart={handleCanvasTouchStart}
          onTouchMove={handleCanvasTouchMove}
          onTouchEnd={handleCanvasTouchEnd}
          className={`w-full h-full object-contain select-none touch-none ${
            isManualTracking ? "cursor-crosshair ring-2 ring-amber-500/60" : "cursor-crosshair"
          }`}
        />

        {/* Hover Hint */}
        <div className="absolute bottom-2 left-2 pointer-events-none bg-slate-950/90 border border-cyan-500/40 rounded px-2 py-0.5 text-[10px] text-cyan-200 backdrop-blur shadow-md">
          {isManualTracking
            ? `Chế độ chấm thủ công: Nhấp vào vật thể ở khung ${currentFrame + 1} (Tự động chuyển khung)`
            : "Kéo chốt vàng A, B để hiệu chuẩn thước • Nhấp vào vật để chọn lại ROI"}
        </div>
      </div>

      {/* Bottom Playback & Scrubber Controls */}
      <div className="space-y-1.5 pt-0.5">
        {/* Timeline Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 min-w-[42px]">
            {((currentFrame / meta.fps)).toFixed(2)}s
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, totalFrames - 1)}
            value={currentFrame}
            onChange={(e) => {
              setIsPlaying(false);
              onFrameChange(Number(e.target.value));
            }}
            className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-mono text-slate-400 min-w-[52px] text-right">
            Khung {currentFrame + 1}/{totalFrames}
          </span>
        </div>

        {/* Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Main Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setIsPlaying(false);
                onFrameChange(0);
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Về khung đầu"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                onFrameChange((prev) => Math.max(0, prev - 1));
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Lùi 1 khung hình"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition shadow-md"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? "Tạm dừng" : "Phát video"}</span>
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                onFrameChange((prev) => Math.min(totalFrames - 1, prev + 1));
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Tiến 1 khung hình"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Speed Selector */}
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 ml-2 border border-slate-700/60 text-[11px] font-mono">
              {[0.25, 0.5, 1].map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-1.5 py-0.5 rounded transition ${
                    playbackSpeed === s ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Color & Target Marker Details */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>Màu nhận diện:</span>
              <input
                type="color"
                value={trackingColor}
                onChange={(e) => onColorChange(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border border-slate-700 bg-transparent"
                title="Thay đổi màu vật thể theo dõi"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== REALISTIC SYNTHETIC PHYSICS SCENE RENDERER ====================
function drawLaboratoryScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  type: ExperimentType,
  frame: number,
  meta: any
) {
  // 1. Lab Wall & Workstation Background
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#090d16");
  grad.addColorStop(0.75, "#0d1527");
  grad.addColorStop(1, "#080c14");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Optical grid on the wall for scientific recording
  ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
  ctx.lineWidth = 1;
  const gridStep = 40;
  for (let x = 0; x < w; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h - 35);
    ctx.stroke();
  }
  for (let y = 0; y < h - 35; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Lab Table / Floor
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, h - 35, w, 35);
  ctx.fillStyle = "#334155";
  ctx.fillRect(0, h - 35, w, 3);

  // 2. Physics Apparatus per Experiment Type
  const dt = 1 / meta.fps;
  const t = frame * dt;

  if (type === "free-fall") {
    // Electromagnetic release stand
    ctx.fillStyle = "#475569";
    ctx.fillRect(310, 20, 20, 40);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(305, 55, 30, 8);

    // Vertical Stand
    ctx.fillStyle = "#334155";
    ctx.fillRect(360, 20, 8, h - 55);

    // Photogates
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(352, 140, 24, 10);
    ctx.fillRect(352, 280, 24, 10);

    // Falling steel ball
    const g_eff = 9.78;
    const y_m = 0.5 * g_eff * t * t;
    const ppm = 350;
    const ballX = 320;
    const ballY = 80 + y_m * ppm;

    // Ball with realistic metal reflection
    const r = 10;
    const ballGrad = ctx.createRadialGradient(ballX - 3, ballY - 3, 2, ballX, ballY, r);
    ballGrad.addColorStop(0, "#fef08a");
    ballGrad.addColorStop(0.3, "#f59e0b");
    ballGrad.addColorStop(1, "#78350f");
    ctx.beginPath();
    ctx.arc(ballX, ballY, r, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (type === "simple-pendulum") {
    // Ceiling mount
    ctx.fillStyle = "#475569";
    ctx.fillRect(300, 30, 40, 10);
    ctx.beginPath();
    ctx.arc(320, 40, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#cbd5e1";
    ctx.fill();

    // Pendulum kinematics
    const L_m = 0.8;
    const ppm = 350;
    const L_px = L_m * ppm * 0.75;
    const theta0 = (8 * Math.PI) / 180;
    const omega = Math.sqrt(9.806 / L_m);
    const damping = Math.exp(-0.06 * t);
    const theta = theta0 * damping * Math.cos(omega * t);

    const bobX = 320 + L_px * Math.sin(theta);
    const bobY = 40 + L_px * Math.cos(theta);

    // String
    ctx.beginPath();
    ctx.moveTo(320, 40);
    ctx.lineTo(bobX, bobY);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Bob
    const bobGrad = ctx.createRadialGradient(bobX - 3, bobY - 3, 2, bobX, bobY, 12);
    bobGrad.addColorStop(0, "#fca5a5");
    bobGrad.addColorStop(0.3, "#ef4444");
    bobGrad.addColorStop(1, "#7f1d1d");
    ctx.beginPath();
    ctx.arc(bobX, bobY, 12, 0, Math.PI * 2);
    ctx.fillStyle = bobGrad;
    ctx.fill();
  } else if (type === "incline-plane") {
    // Wedge / Incline track
    ctx.beginPath();
    ctx.moveTo(70, 70);
    ctx.lineTo(550, 245);
    ctx.lineTo(550, 70);
    ctx.closePath();
    ctx.fillStyle = "rgba(51, 65, 85, 0.4)";
    ctx.fill();

    // Track surface
    ctx.beginPath();
    ctx.moveTo(70, 70);
    ctx.lineTo(550, 245);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 6;
    ctx.stroke();

    // Glider / Cart on incline
    const a = 2.85;
    const alpha = (20 * Math.PI) / 180;
    const s_m = 0.5 * a * t * t;
    const ppm = 350;
    const s_px = Math.min(460, s_m * ppm * 0.9);

    const cartX = 90 + s_px * Math.cos(alpha);
    const cartY = 70 + s_px * Math.sin(alpha) - 8;

    ctx.save();
    ctx.translate(cartX, cartY);
    ctx.rotate(alpha);
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(-16, -12, 32, 16);
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.arc(-10, 6, 4, 0, Math.PI * 2);
    ctx.arc(10, 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (type === "horizontal-projectile") {
    // Launch ramp on table
    ctx.fillStyle = "#475569";
    ctx.fillRect(40, 70, 60, 10);
    ctx.fillRect(80, 80, 20, h - 115);

    // Parabolic projectile
    const v0 = 2.38;
    const g = 9.79;
    const ppm = 350;
    const x_px = 100 + v0 * t * ppm * 0.4;
    const y_px = 80 + 0.5 * g * t * t * ppm * 0.4;

    ctx.beginPath();
    ctx.arc(Math.min(w - 20, x_px), Math.min(h - 45, y_px), 8, 0, Math.PI * 2);
    ctx.fillStyle = "#10b981";
    ctx.fill();
    ctx.strokeStyle = "#064e3b";
    ctx.stroke();
  } else if (type === "hooke-elastic") {
    // Hooke's law: Spring stretching under load
    ctx.fillStyle = "#475569";
    ctx.fillRect(240, 30, 80, 10);
    ctx.fillRect(250, 40, 8, h - 75);

    // Ruler next to spring
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(295, 50, 12, 280);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    for (let y = 60; y <= 320; y += 15) {
      ctx.beginPath();
      ctx.moveTo(295, y);
      ctx.lineTo(303, y);
      ctx.stroke();
    }

    const maxDeltaL = 0.15;
    const progress = Math.min(1, t / meta.durationSeconds);
    const ext = progress * 120;
    const bobY = 120 + ext;

    // Spring coils
    ctx.beginPath();
    ctx.moveTo(270, 40);
    const coils = 16;
    const dy = (bobY - 40) / coils;
    for (let i = 0; i < coils; i++) {
      const sx = i % 2 === 0 ? 278 : 262;
      ctx.lineTo(sx, 40 + i * dy);
    }
    ctx.lineTo(270, bobY);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hanging weights
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(260, bobY, 20, 26);
    ctx.fillStyle = "#d97706";
    ctx.fillRect(258, bobY + 26, 24, 10);
  } else if (type === "lever-balance") {
    // Fulcrum
    ctx.beginPath();
    ctx.moveTo(320, 240);
    ctx.lineTo(305, 290);
    ctx.lineTo(335, 290);
    ctx.closePath();
    ctx.fillStyle = "#64748b";
    ctx.fill();

    // Tilting beam
    const tilt = 0.15 * Math.cos(2.5 * t) * Math.exp(-0.8 * t);
    ctx.save();
    ctx.translate(320, 240);
    ctx.rotate(tilt);

    ctx.fillStyle = "#0284c7";
    ctx.fillRect(-180, -6, 360, 12);

    // Weights on left and right
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(-120, -22, 20, 16);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(50, -26, 28, 20);
    ctx.restore();
  } else if (type === "uniform-speed") {
    // Horizontal track with ruler
    ctx.fillStyle = "#334155";
    ctx.fillRect(50, 240, 540, 8);
    for (let x = 60; x <= 580; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 248);
      ctx.lineTo(x, 256);
      ctx.strokeStyle = "#94a3b8";
      ctx.stroke();
    }

    // Moving toy car
    const carX = 80 + (t / meta.durationSeconds) * 440;
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(carX - 25, 218, 50, 22);
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(carX - 14, 240, 5, 0, Math.PI * 2);
    ctx.arc(carX + 14, 240, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "light-reflection") {
    // Protractor circle
    ctx.beginPath();
    ctx.arc(320, 250, 140, Math.PI, 0);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Mirror on bottom
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(160, 250, 320, 6);

    // Normal line
    ctx.beginPath();
    ctx.moveTo(320, 110);
    ctx.lineTo(320, 250);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Laser beam incident & reflected
    const ang = (45 * Math.PI) / 180;
    const inX = 320 - 130 * Math.sin(ang);
    const inY = 250 - 130 * Math.cos(ang);
    const refX = 320 + 130 * Math.sin(ang);
    const refY = 250 - 130 * Math.cos(ang);

    // Incident ray
    ctx.beginPath();
    ctx.moveTo(inX, inY);
    ctx.lineTo(320, 250);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Reflected ray
    ctx.beginPath();
    ctx.moveTo(320, 250);
    ctx.lineTo(refX, refY);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else if (type === "archimedes-force") {
    // Stand & Spring balance
    ctx.fillStyle = "#475569";
    ctx.fillRect(280, 20, 80, 8);
    ctx.fillRect(350, 20, 8, 300);

    // Beaker with water
    ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
    ctx.fillRect(260, 200, 80, 100);
    ctx.strokeStyle = "#0891b2";
    ctx.lineWidth = 2;
    ctx.strokeRect(260, 200, 80, 100);

    // Immersion depth
    const depth = Math.min(60, (t / meta.durationSeconds) * 60);
    const blockY = 160 + depth;

    // Submerged cylinder
    ctx.fillStyle = "#06b6d4";
    ctx.fillRect(285, blockY, 30, 45);
    ctx.strokeStyle = "#0e7490";
    ctx.strokeRect(285, blockY, 30, 45);
  } else if (type === "standing-wave") {
    // String with 4 antinodes
    ctx.fillStyle = "#475569";
    ctx.fillRect(60, 190, 15, 20);
    ctx.fillRect(565, 190, 15, 20);

    ctx.beginPath();
    ctx.moveTo(75, 200);
    const amp = 30 * Math.sin(2 * Math.PI * 5 * t);
    for (let x = 75; x <= 565; x += 4) {
      const normX = (x - 75) / (565 - 75);
      const y = 200 + amp * Math.sin(normX * 4 * Math.PI);
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else if (type === "young-interference") {
    // Double slit screen and interference fringes
    ctx.fillStyle = "#334155";
    ctx.fillRect(100, 80, 8, 240); // Slit barrier
    ctx.fillRect(520, 60, 10, 280); // Observation screen

    // Draw interference fringes on the screen
    for (let y = 80; y <= 320; y += 18) {
      const centerDist = Math.abs(y - 200);
      const intensity = Math.max(0.1, 1 - centerDist / 120);
      ctx.fillStyle = `rgba(244, 63, 94, ${intensity})`;
      ctx.fillRect(516, y - 4, 18, 8);
    }
  } else if (type === "boyle-mariotte") {
    // Gas cylinder
    ctx.fillStyle = "rgba(30, 41, 59, 0.7)";
    ctx.fillRect(200, 150, 240, 80);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3;
    ctx.strokeRect(200, 150, 240, 80);

    // Piston compressing
    const comp = 60 * (1 - 0.5 * (t / meta.durationSeconds));
    const pistonX = 200 + comp;
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(pistonX, 152, 14, 76);
    ctx.fillRect(pistonX - 80, 185, 80, 10); // Piston rod

    // Pressure Gauge
    ctx.beginPath();
    ctx.arc(380, 110, 24, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.stroke();
  } else if (type === "density-measuring") {
    // Graduated cylinder with water and descending metal cylinder
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(280, 100, 80, 240);
    // Water level
    const progress = Math.min(1, t / meta.durationSeconds);
    const waterY = 220 - progress * 20;
    ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
    ctx.fillRect(282, waterY, 76, 340 - waterY);
    // Scale ticks
    ctx.fillStyle = "#94a3b8";
    for (let y = 120; y <= 320; y += 20) {
      ctx.fillRect(280, y, 12, 2);
    }
    // Suspended cylinder
    const cylY = 80 + progress * 140;
    ctx.beginPath();
    ctx.moveTo(320, 40);
    ctx.lineTo(320, cylY);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(306, cylY, 28, 44);
    ctx.strokeStyle = "#b45309";
    ctx.strokeRect(306, cylY, 28, 44);
  } else if (type === "sound-frequency-tuning-fork") {
    // Tuning fork on wooden resonator box
    ctx.fillStyle = "#78350f";
    ctx.fillRect(240, 260, 160, 60); // Resonator box
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(320, 290, 16, 0, Math.PI * 2); // Sound hole
    ctx.fill();
    // Metal stem and tines
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(315, 200, 10, 60); // stem
    ctx.fillRect(285, 190, 70, 12); // U-base
    // Vibrating tines
    const forkVib = 4 * Math.sin(2 * Math.PI * 20 * t);
    ctx.fillRect(285 + forkVib, 80, 10, 110);
    ctx.fillRect(345 - forkVib, 80, 10, 110);
    // Acoustic wave ripples
    ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
    ctx.lineWidth = 1.5;
    for (let r = 20; r <= 80; r += 20) {
      ctx.beginPath();
      ctx.arc(320, 120, r + ((t * 80) % 20), 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (type === "speed-trolley") {
    // Inclined ramp with trolley car
    ctx.beginPath();
    ctx.moveTo(60, 160);
    ctx.lineTo(580, 280);
    ctx.lineTo(580, 310);
    ctx.lineTo(60, 310);
    ctx.closePath();
    ctx.fillStyle = "rgba(51, 65, 85, 0.4)";
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 160);
    ctx.lineTo(580, 280);
    ctx.stroke();
  } else if (type === "joule-lenz") {
    // Calorimeter vessel with heating coil and thermometer
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3;
    ctx.strokeRect(260, 140, 120, 160);
    ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
    ctx.fillRect(262, 180, 116, 118);
    // Heating coil
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let y = 200; y <= 270; y += 8) {
      ctx.lineTo(y % 16 === 0 ? 300 : 340, y);
    }
    ctx.stroke();
    // Thermometer
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(280, 80, 10, 160);
    const mercHeight = 30 + Math.min(1, t / meta.durationSeconds) * 40;
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(280, 240 - mercHeight, 10, mercHeight);
  } else if (type === "communicating-vessels") {
    // U-tube / Multi-stem communicating vessels
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3;
    // Bottom connecting manifold
    ctx.strokeRect(180, 270, 280, 30);
    ctx.strokeRect(200, 100, 40, 170); // Tube 1
    ctx.strokeRect(300, 100, 40, 170); // Tube 2
    ctx.strokeRect(400, 100, 40, 170); // Tube 3
    // Liquid level settling across all 3
    const liqY = 170 + 8 * Math.sin(4 * t) * Math.exp(-1.5 * t);
    ctx.fillStyle = "rgba(56, 189, 248, 0.5)";
    ctx.fillRect(182, 272, 276, 26);
    ctx.fillRect(202, liqY, 36, 270 - liqY);
    ctx.fillRect(302, liqY, 36, 270 - liqY);
    ctx.fillRect(402, liqY, 36, 270 - liqY);
  } else if (type === "total-internal-reflection") {
    // Semicircular glass block
    ctx.beginPath();
    ctx.arc(320, 220, 110, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Laser beam
    const progress = Math.min(1, t / meta.durationSeconds);
    const laserAngle = (25 + progress * 25) * (Math.PI / 180);
    const srcX = 320 - 110 * Math.sin(laserAngle);
    const srcY = 220 - 110 * Math.cos(laserAngle);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(srcX, srcY);
    ctx.lineTo(320, 220);
    if (laserAngle >= (41.8 * Math.PI) / 180) {
      // Total internal reflection
      const reflX = 320 + 110 * Math.sin(laserAngle);
      const reflY = 220 - 110 * Math.cos(laserAngle);
      ctx.lineTo(reflX, reflY);
    } else {
      // Refraction out
      const refrAngle = Math.asin(1.5 * Math.sin(laserAngle));
      const outX = 320 + 140 * Math.sin(refrAngle);
      const outY = 220 + 140 * Math.cos(refrAngle);
      ctx.lineTo(outX, outY);
    }
    ctx.stroke();
  } else if (type === "lorentz-magnetic-field") {
    // Horseshoe magnet and suspended wire
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(240, 160, 40, 120); // North pole (Red)
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(360, 160, 40, 120); // South pole (Blue)
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(240, 280, 160, 24); // Yoke connecting poles
    // Wire deflecting
    const defl = 28 * (1 - Math.exp(-3 * t));
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(320, 60);
    ctx.lineTo(320 + defl, 220);
    ctx.stroke();
  } else if (type === "vertical-projectile") {
    // Vertical stand and launch tube
    ctx.fillStyle = "#475569";
    ctx.fillRect(316, 40, 8, 320); // vertical guide rail
    ctx.fillRect(280, 350, 80, 15); // base stand
    // Metre rule markings
    ctx.fillStyle = "#94a3b8";
    for (let y = 60; y <= 340; y += 25) {
      ctx.fillRect(310, y, 6, 2);
    }
  } else if (type === "friction-coefficient") {
    // Horizontal table with sliding block
    ctx.fillStyle = "#334155";
    ctx.fillRect(60, 250, 520, 16);
    // Motion track marks
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1;
    for (let x = 80; x <= 560; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 266);
      ctx.lineTo(x, 276);
      ctx.stroke();
    }
  } else if (type === "centripetal-turntable") {
    // Elliptical rotating platter
    ctx.beginPath();
    ctx.ellipse(320, 240, 160, 60, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(51, 65, 85, 0.5)";
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3;
    ctx.stroke();
    // Turntable center spindle
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.arc(320, 240, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "inelastic-collision" || type === "elastic-collision") {
    // Air track guide rail with mm ruler ticks
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(50, 235, 540, 16);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(50, 235, 540, 16);
    // Air holes on track
    ctx.fillStyle = "#94a3b8";
    for (let x = 60; x <= 580; x += 15) {
      ctx.beginPath();
      ctx.arc(x, 243, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Photogates A & B with infrared indicators
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(180, 175, 12, 60); // Gate A
    ctx.fillRect(440, 175, 12, 60); // Gate B
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(186, 205, 3, 0, Math.PI * 2); // IR sensor A
    ctx.arc(446, 205, 3, 0, Math.PI * 2); // IR sensor B
    ctx.fill();

    // Glider positions: Glider 1 moving right, collides with Glider 2 at center (x = 310) around t = 0.8s
    let g1x = 100;
    let g2x = 310;
    const tCol = 0.8;
    if (t < tCol) {
      g1x = 100 + (t / tCol) * 170; // moves from 100 to 270
      g2x = 310; // at rest
    } else {
      const dtPost = t - tCol;
      g1x = 270 + dtPost * 15; // rebounds or slows
      g2x = 310 + dtPost * 190; // shoots forward
    }

    // Glider 1 (Red / Orange)
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(g1x - 25, 212, 50, 22);
    ctx.fillStyle = "#f87171";
    ctx.fillRect(g1x - 2, 192, 4, 20); // Photogate flag
    // Spring bumper on right of Glider 1
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g1x + 27, 223, 4, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Glider 2 (Cyan / Blue)
    ctx.fillStyle = "#06b6d4";
    ctx.fillRect(g2x - 25, 212, 50, 22);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(g2x - 2, 192, 4, 20); // Photogate flag
    // Spring bumper on left of Glider 2
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g2x - 27, 223, 4, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.stroke();
  } else if (type === "newton-second-law") {
    // Track, pulley, and hanging mass
    ctx.fillStyle = "#334155";
    ctx.fillRect(70, 210, 450, 12);
    // Pulley wheel
    ctx.beginPath();
    ctx.arc(520, 210, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#94a3b8";
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.stroke();
    // Hanging cord and weight
    const fallDist = Math.min(100, 30 * t * t);
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(520, 210);
    ctx.lineTo(534, 210);
    ctx.lineTo(534, 230 + fallDist);
    ctx.stroke();
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(526, 230 + fallDist, 16, 20);
  } else if (type === "resonance-acoustic") {
    // Acoustic water tube with resonance nodes
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3;
    ctx.strokeRect(280, 80, 80, 260);
    // Water level
    const waterY = 240 - ((t / meta.durationSeconds) * 80);
    ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
    ctx.fillRect(282, waterY, 76, 340 - waterY);
    // Sound waves inside air column
    ctx.strokeStyle = "rgba(244, 63, 94, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 80; y <= waterY; y += 4) {
      const envelope = Math.sin(((y - 80) / (waterY - 80)) * Math.PI);
      const waveX = 320 + envelope * 30 * Math.sin(2 * Math.PI * 8 * t);
      if (y === 80) ctx.moveTo(waveX, y);
      else ctx.lineTo(waveX, y);
    }
    ctx.stroke();
    // Mini loudspeaker at mouth
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(300, 50, 40, 26);
  } else if (type === "water-wave-interference") {
    // Circular wave ripples from two sources
    const s1x = 260, s2x = 380, sy = 220;
    ctx.fillStyle = "#06b6d4";
    ctx.fillRect(s1x - 4, sy - 4, 8, 8);
    ctx.fillRect(s2x - 4, sy - 4, 8, 8);
    ctx.strokeStyle = "rgba(6, 182, 212, 0.35)";
    ctx.lineWidth = 1.5;
    for (let r = 15; r <= 140; r += 20) {
      ctx.beginPath();
      ctx.arc(s1x, sy, r + ((t * 50) % 20), 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s2x, sy, r + ((t * 50) % 20), 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (type === "capacitance-discharge") {
    // Capacitor and digital meter
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(180, 160, 90, 120); // Large capacitor
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.strokeRect(180, 160, 90, 120);
    // Resistor
    ctx.fillStyle = "#d97706";
    ctx.fillRect(350, 200, 80, 30);
    // Digital Voltmeter display
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(250, 80, 140, 55);
    ctx.strokeStyle = "#475569";
    ctx.strokeRect(250, 80, 140, 55);
    const volt = (10 * Math.exp(-t / 10)).toFixed(2);
    ctx.font = "bold 20px 'Times New Roman', serif";
    ctx.fillStyle = "#22c55e";
    ctx.fillText(`${volt} V`, 290, 115);
  } else if (type === "ampere-force") {
    // Digital balance and magnet
    ctx.fillStyle = "#334155";
    ctx.fillRect(240, 260, 160, 35); // Balance base
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(280, 200, 30, 60); // Magnet N
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(330, 200, 30, 60); // Magnet S
    // Wire suspended in gap
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(250, 220);
    ctx.lineTo(390, 220);
    ctx.stroke();
  } else if (type === "thin-lens-focus") {
    // Optical bench with object F, lens and screen
    ctx.fillStyle = "#475569";
    ctx.fillRect(80, 240, 480, 10);
    // Object F
    ctx.font = "bold 32px 'Times New Roman', serif";
    ctx.fillStyle = "#ef4444";
    ctx.fillText("F", 120, 230);
    // Lens
    ctx.beginPath();
    ctx.ellipse(300, 200, 14, 45, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.stroke();
    // Screen
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(480, 150, 8, 90);
  } else if (type === "charles-isobaric") {
    // Capillary tube and warming water bath
    ctx.fillStyle = "rgba(245, 158, 11, 0.3)";
    ctx.fillRect(180, 170, 280, 90);
    ctx.strokeStyle = "#94a3b8";
    ctx.strokeRect(180, 170, 280, 90);
    // Capillary tube with mercury bead
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(160, 215);
    ctx.lineTo(440, 215);
    ctx.stroke();
    // Mercury drop moving right
    const mercX = 240 + Math.min(140, (t / meta.durationSeconds) * 120);
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    ctx.arc(mercX, 215, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "ideal-gas-equation") {
    // PVT multi-parameter chamber
    ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
    ctx.fillRect(220, 140, 200, 120);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.strokeRect(220, 140, 200, 120);
    // Pressure & Temp meters
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(260, 100, 22, 0, Math.PI * 2);
    ctx.arc(380, 100, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.stroke();
  } else if (type === "sound-doppler") {
    // Moving sound source cart with compressed wavefronts
    const cartX = 140 + ((t / meta.durationSeconds) * 360);
    ctx.fillStyle = "#06b6d4";
    ctx.fillRect(cartX - 25, 205, 50, 30);
    // Concentric Doppler rings (bunched on right, stretched on left)
    ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
    ctx.lineWidth = 1.5;
    for (let k = 1; k <= 4; k++) {
      ctx.beginPath();
      ctx.arc(cartX - k * 18, 220, k * 28, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (type === "photoelectric-effect") {
    // Vacuum phototube and light beam
    ctx.beginPath();
    ctx.arc(320, 200, 70, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
    ctx.fill();
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Curved cathode
    ctx.beginPath();
    ctx.arc(320, 200, 50, Math.PI * 0.7, Math.PI * 1.3);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 4;
    ctx.stroke();
    // Light beam
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(180, 140);
    ctx.lineTo(280, 185);
    ctx.stroke();
  } else if (type === "emf-internal-resistance") {
    // Complete DC Circuit apparatus for E & r determination
    // 1. Battery Holder (Pin 1.5V)
    ctx.fillStyle = "#334155";
    ctx.fillRect(80, 180, 100, 44);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(72, 194, 8, 16); // (+) positive cap
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("PIN 1.5V (E, r)", 90, 207);

    // 2. Sliding Rheostat (Biến trở con chạy)
    ctx.fillStyle = "#475569";
    ctx.fillRect(230, 200, 180, 24); // Ceramic tube
    // Wire windings
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 1;
    for (let x = 236; x <= 404; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x, 200);
      ctx.lineTo(x, 224);
      ctx.stroke();
    }
    // Metal guide rod
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(225, 186, 190, 5);
    // Sliding contact wiper
    const prog = Math.min(1, t / meta.durationSeconds);
    const wiperX = 240 + prog * 150;
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(wiperX - 6, 182, 12, 28);
    ctx.strokeStyle = "#78350f";
    ctx.strokeRect(wiperX - 6, 182, 12, 28);

    // 3. Digital Multimeter 1: Voltmeter (V)
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(220, 65, 95, 55);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(220, 65, 95, 55);
    const currI = 0.15 + prog * 0.65;
    const voltU = Math.max(0.8, 1.50 - currI * 0.52);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "9px sans-serif";
    ctx.fillText("VÔN KẾ (DCV)", 230, 80);
    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.fillText(`${voltU.toFixed(2)} V`, 232, 104);

    // 4. Digital Multimeter 2: Ammeter (A)
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(340, 65, 95, 55);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(340, 65, 95, 55);
    ctx.fillStyle = "#f59e0b";
    ctx.font = "9px sans-serif";
    ctx.fillText("AMPE KẾ (DCA)", 348, 80);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.fillText(`${currI.toFixed(2)} A`, 352, 104);

    // 5. Knife Switch (Khóa K)
    ctx.fillStyle = "#64748b";
    ctx.fillRect(470, 190, 60, 20);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(480, 190);
    ctx.lineTo(520, 190); // Closed switch blade
    ctx.stroke();
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("Khóa K", 482, 180);

    // Circuit wires connecting everything
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Battery (+) to Voltmeter and Switch
    ctx.moveTo(72, 202);
    ctx.lineTo(50, 202);
    ctx.lineTo(50, 95);
    ctx.lineTo(220, 95);
    // Switch to Battery (-)
    ctx.moveTo(530, 200);
    ctx.lineTo(570, 200);
    ctx.lineTo(570, 260);
    ctx.lineTo(180, 260);
    ctx.lineTo(180, 210);
    ctx.stroke();
  } else if (type === "heat-capacity") {
    // Calorimeter apparatus for measuring water specific heat capacity
    // Outer insulated calorimeter vessel
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(250, 130, 140, 170);
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(250, 130, 140, 170);
    // Inner cup with water
    ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
    ctx.fillRect(265, 170, 110, 120);
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(265, 170, 110, 120);

    // Immersion heating resistor coil
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let y = 200; y <= 270; y += 8) {
      ctx.lineTo(y % 16 === 0 ? 305 : 335, y);
    }
    ctx.stroke();

    // Stirrer (Que khuấy)
    const stirAngle = Math.sin(10 * t) * 0.1;
    ctx.save();
    ctx.translate(285, 120);
    ctx.rotate(stirAngle);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(0, 150);
    ctx.stroke();
    // Stirrer ring at bottom
    ctx.beginPath();
    ctx.arc(0, 150, 12, 0, Math.PI);
    ctx.stroke();
    ctx.restore();

    // Digital temperature probe & display
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(355, 90);
    ctx.lineTo(355, 250);
    ctx.stroke();

    // Digital readout unit
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(320, 45, 110, 45);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(320, 45, 110, 45);
    const progress = Math.min(1, t / meta.durationSeconds);
    const curTemp = 25.0 + progress * 7.4;
    ctx.fillStyle = "#38bdf8";
    ctx.font = "8px sans-serif";
    ctx.fillText("NHIỆT KẾ ĐIỆN TỬ", 328, 57);
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.fillText(`${curTemp.toFixed(1)}°C`, 336, 78);

    // Power label
    ctx.fillStyle = "#f8fafc";
    ctx.font = "10px sans-serif";
    ctx.fillText("P = 15.0 W | m = 200g", 258, 320);
  } else if (type === "latent-heat-fusion") {
    // Calorimeter with ice cubes
    ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
    ctx.fillRect(260, 160, 120, 140);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3;
    ctx.strokeRect(260, 160, 120, 140);
    // Floating melting ice cubes
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillRect(285, 175, 24, 24);
    ctx.fillRect(325, 180, 20, 20);
  } else {
    // Spring oscillation default
    ctx.fillStyle = "#475569";
    ctx.fillRect(300, 30, 40, 8);

    const A = 0.08;
    const omega = 10;
    const damping = Math.exp(-0.12 * t);
    const y_m = A * damping * Math.cos(omega * t);
    const ppm = 350;
    const eqY = 160;
    const bobY = eqY + y_m * ppm;

    // Draw zig-zag spring coils
    ctx.beginPath();
    ctx.moveTo(320, 38);
    const coils = 14;
    const springLen = bobY - 45 - 38;
    const dy = springLen / coils;
    for (let i = 0; i < coils; i++) {
      const sx = i % 2 === 0 ? 328 : 312;
      const sy = 38 + i * dy;
      ctx.lineTo(sx, sy);
    }
    ctx.lineTo(320, bobY - 14);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Mass cylinder
    ctx.fillStyle = "#8b5cf6";
    ctx.beginPath();
    ctx.roundRect(306, bobY - 14, 28, 28, 4);
    ctx.fill();
    ctx.strokeStyle = "#4c1d95";
    ctx.stroke();
  }
}

// Helper: Draw Calibration Pin
function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, isActive: boolean) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, isActive ? 9 : 7, 0, Math.PI * 2);
  ctx.fillStyle = isActive ? "#facc15" : "#eab308";
  ctx.fill();
  ctx.strokeStyle = "#713f12";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Label badge
  ctx.font = "bold 9px sans-serif";
  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.fillRect(x + 10, y - 10, 48, 16);
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(x + 10, y - 10, 48, 16);
  ctx.fillStyle = "#fef08a";
  ctx.fillText(label, x + 13, y + 2);
  ctx.restore();
}

// Helper: Vector Arrow
function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  label: string
) {
  const headlen = 8;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);
  if (len < 3) return;
  const angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  ctx.font = "italic bold 11px sans-serif";
  ctx.fillText(label, toX + 6, toY - 2);
  ctx.restore();
}
