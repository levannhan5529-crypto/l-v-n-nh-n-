import React, { useState, useEffect, useRef } from "react";
import {
  Sun,
  Eye,
  Sliders,
  RotateCcw,
  PlusCircle,
  Trash2,
  HelpCircle,
  Sparkles,
  Maximize2,
  Compass,
  ArrowRight,
} from "lucide-react";
import { MathFormula } from "../../common/MathText";

type OpticsMode = "thin-lens" | "snell-refraction";

interface LensSample {
  id: string;
  d: number; // Khoảng cách vật (cm)
  dPrime: number; // Khoảng cách ảnh (cm)
  fCalc: number; // Tiêu cự tính toán (cm)
  k: number; // Hệ số phóng đại
  nature: string; // Thật / Ảo
}

export const OpticsLab: React.FC = () => {
  const [mode, setMode] = useState<OpticsMode>("thin-lens");

  // Lens State
  const [lensType, setLensType] = useState<"converging" | "diverging">("converging"); // Hội tụ vs Phân kì
  const [focalLength, setFocalLength] = useState<number>(12); // cm
  const [objectDistance, setObjectDistance] = useState<number>(24); // d (cm)
  const [objectHeight, setObjectHeight] = useState<number>(3); // h (cm)
  const [showRays, setShowRays] = useState<boolean>(true);
  const [showScreen, setShowScreen] = useState<boolean>(true);
  const [lensSamples, setLensSamples] = useState<LensSample[]>([]);

  // Refraction State
  const [incidentAngleDeg, setIncidentAngleDeg] = useState<number>(45); // i (deg)
  const [n1, setN1] = useState<number>(1.0); // Không khí
  const [n2, setN2] = useState<number>(1.5); // Thủy tinh
  const [medium1Name, setMedium1Name] = useState<string>("Không khí (n=1.00)");
  const [medium2Name, setMedium2Name] = useState<string>("Thủy tinh Crown (n=1.50)");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calculations for Lens
  const f = lensType === "converging" ? focalLength : -focalLength;
  const d = objectDistance;
  // Lens formula: 1/f = 1/d + 1/d' => d' = (d * f) / (d - f)
  let dPrime = 0;
  let isAtFocus = false;
  if (Math.abs(d - f) < 0.05) {
    isAtFocus = true;
    dPrime = Infinity;
  } else {
    dPrime = (d * f) / (d - f);
  }
  const k = isAtFocus ? 0 : -dPrime / d;
  const imageHeight = isAtFocus ? 0 : Math.abs(k) * objectHeight;
  const isReal = dPrime > 0;
  const isUpright = k > 0;

  // Calculations for Snell's Law
  const iRad = (incidentAngleDeg * Math.PI) / 180;
  const sinR = (n1 / n2) * Math.sin(iRad);
  const isTIR = sinR > 1.0; // Total Internal Reflection
  const rRad = isTIR ? 0 : Math.asin(sinR);
  const rDeg = isTIR ? 0 : (rRad * 180) / Math.PI;
  const criticalAngleDeg = n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : null;

  // Redraw canvas
  useEffect(() => {
    drawOptics();
  });

  const drawOptics = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, w, h);

    if (mode === "thin-lens") {
      drawThinLensCanvas(ctx, w, h);
    } else {
      drawRefractionCanvas(ctx, w, h);
    }
  };

  const drawThinLensCanvas = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const cx = w / 2;
    const cy = h / 2;
    const scale = 8.5; // px per cm

    // Optical Axis (Trục chính)
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, cy);
    ctx.lineTo(w - 20, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Principal Axis Arrowhead
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(w - 20, cy - 4);
    ctx.lineTo(w - 10, cy);
    ctx.lineTo(w - 20, cy + 4);
    ctx.fill();

    // Focal Points F and F'
    const fPx = Math.abs(f) * scale;
    const F_x = cx - fPx;
    const Fp_x = cx + fPx;

    // Draw F and F' dots and labels
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(F_x, cy, 4, 0, Math.PI * 2);
    ctx.arc(Fp_x, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "bold 11px monospace";
    ctx.fillText("O", cx - 4, cy + 16);
    ctx.fillText(lensType === "converging" ? "F" : "F'", F_x - 6, cy + 16);
    ctx.fillText(lensType === "converging" ? "F'" : "F", Fp_x - 6, cy + 16);

    // Draw Lens vertical line & symbols
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, 35);
    ctx.lineTo(cx, h - 35);
    ctx.stroke();

    // Converging vs Diverging Lens Arrows at ends
    if (lensType === "converging") {
      // Outward pointing arrows (mũi tên hướng ra ngoài)
      drawArrowHead(ctx, cx, 35, "up");
      drawArrowHead(ctx, cx, h - 35, "down");
    } else {
      // Inward pointing arrows (mũi tên hướng vào trong)
      drawArrowHead(ctx, cx, 35, "down");
      drawArrowHead(ctx, cx, h - 35, "up");
    }

    // Object AB
    const objX = cx - d * scale;
    const objH = objectHeight * scale;
    const objTopY = cy - objH;

    // Draw Object Arrow AB (Yellow)
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(objX, cy);
    ctx.lineTo(objX, objTopY);
    ctx.stroke();
    drawArrowHead(ctx, objX, objTopY, "up");

    ctx.fillStyle = "#fef08a";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("B", objX - 14, objTopY + 2);
    ctx.fillText("A", objX - 14, cy - 4);

    // Image A'B'
    if (!isAtFocus && Math.abs(dPrime) < 100) {
      const imgX = cx + dPrime * scale;
      const imgH = -k * objH; // k = -d'/d. If k < 0, inverted => imgH > 0 (downwards)
      const imgTopY = cy - imgH;

      ctx.strokeStyle = isReal ? "#10b981" : "#f43f5e";
      ctx.lineWidth = 3;
      if (!isReal) {
        ctx.setLineDash([4, 3]);
      }
      ctx.beginPath();
      ctx.moveTo(imgX, cy);
      ctx.lineTo(imgX, imgTopY);
      ctx.stroke();
      ctx.setLineDash([]);

      drawArrowHead(ctx, imgX, imgTopY, isUpright ? "up" : "down");

      ctx.fillStyle = isReal ? "#6ee7b7" : "#fda4af";
      ctx.fillText("B'", imgX + 6, imgTopY + (isUpright ? 2 : 12));
      ctx.fillText("A'", imgX + 6, cy - 4);

      // Screen at image plane if real image
      if (showScreen && isReal && imgX > cx + 10 && imgX < w - 10) {
        ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
        ctx.fillRect(imgX - 2, 40, 4, h - 80);
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "9px monospace";
        ctx.fillText("Màn chắn", imgX - 18, 30);
      }
    }

    // Light Rays from point B
    if (showRays) {
      // 1. Ray parallel to principal axis -> emerges through F'
      ctx.strokeStyle = "#ef4444"; // Red ray
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(objX, objTopY);
      ctx.lineTo(cx, objTopY);

      if (lensType === "converging") {
        // passes through F' (cx + fPx, cy)
        const slope = (cy - objTopY) / fPx;
        ctx.lineTo(w - 20, objTopY + slope * (w - 20 - cx));
        ctx.stroke();

        // If virtual image, trace back dotted line
        if (!isReal) {
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(cx, objTopY);
          ctx.lineTo(cx + dPrime * scale, cy - -k * objH);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        // Diverging lens: emerges as if from F' (cx - fPx, cy)
        const slope = (objTopY - cy) / fPx;
        ctx.lineTo(w - 20, objTopY + slope * (w - 20 - cx));
        ctx.stroke();

        // Virtual extension back to F
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, objTopY);
        ctx.lineTo(cx - fPx, cy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 2. Ray through optical center O -> continues straight
      ctx.strokeStyle = "#22c55e"; // Green ray
      ctx.lineWidth = 1.5;
      const slopeO = (cy - objTopY) / (cx - objX);
      ctx.beginPath();
      ctx.moveTo(objX, objTopY);
      ctx.lineTo(cx, cy);
      ctx.lineTo(w - 20, cy + slopeO * (w - 20 - cx));
      ctx.stroke();

      if (!isReal) {
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + dPrime * scale, cy - -k * objH);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };

  const drawRefractionCanvas = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const cx = w / 2;
    const cy = h / 2;

    // Interface (mặt phân cách 2 môi trường)
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(20, cy);
    ctx.lineTo(w - 20, cy);
    ctx.stroke();

    // Medium labels and tints
    ctx.fillStyle = "rgba(15, 23, 42, 0.5)";
    ctx.fillRect(20, 20, w - 40, cy - 20); // Medium 1
    ctx.fillStyle = "rgba(14, 165, 233, 0.12)";
    ctx.fillRect(20, cy, w - 40, h - cy - 20); // Medium 2

    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(`Môi trường 1 (Tới): ${medium1Name}`, 35, 45);
    ctx.fillStyle = "#0284c7";
    ctx.fillText(`Môi trường 2 (Khúc xạ): ${medium2Name}`, 35, cy + 25);

    // Normal Line (Pháp tuyến NN')
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, 30);
    ctx.lineTo(cx, h - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 10px monospace";
    ctx.fillText("N", cx + 6, 42);
    ctx.fillText("N'", cx + 6, h - 36);

    // Laser Incident Ray (Tia tới SI)
    const rayLen = 190;
    const startX = cx - rayLen * Math.sin(iRad);
    const startY = cy - rayLen * Math.cos(iRad);

    ctx.strokeStyle = "#ef4444"; // Red Laser
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    // Incident Angle Arc & Label (i)
    ctx.beginPath();
    ctx.arc(cx, cy, 35, -Math.PI / 2 - iRad, -Math.PI / 2);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`i = ${incidentAngleDeg}°`, cx - 55, cy - 35);

    // Reflected Ray (Tia phản xạ IS')
    const reflX = cx + rayLen * Math.sin(iRad);
    const reflY = cy - rayLen * Math.cos(iRad);

    ctx.strokeStyle = isTIR ? "#ef4444" : "rgba(239, 68, 68, 0.4)";
    ctx.lineWidth = isTIR ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(reflX, reflY);
    ctx.stroke();

    ctx.fillStyle = isTIR ? "#f87171" : "#94a3b8";
    ctx.fillText(`i' = ${incidentAngleDeg}°`, cx + 25, cy - 35);

    // Refracted Ray (Tia khúc xạ IR)
    if (!isTIR) {
      const refrX = cx + rayLen * Math.sin(rRad);
      const refrY = cy + rayLen * Math.cos(rRad);

      ctx.strokeStyle = "#22c55e"; // Green Refracted Ray
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(refrX, refrY);
      ctx.stroke();

      // Refraction Angle Arc (r)
      ctx.beginPath();
      ctx.arc(cx, cy, 40, Math.PI / 2 - rRad, Math.PI / 2);
      ctx.strokeStyle = "#4ade80";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#86efac";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`r = ${rDeg.toFixed(1)}°`, cx + 15, cy + 45);
    } else {
      // Total Internal Reflection Warning Overlay
      ctx.fillStyle = "rgba(225, 29, 72, 0.9)";
      ctx.beginPath();
      ctx.roundRect(cx - 160, cy + 40, 320, 50, 8);
      ctx.fill();
      ctx.strokeStyle = "#f43f5e";
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚡ HIỆN TƯỢNG PHẢN XẠ TOÀN PHẦN", cx, cy + 62);
      ctx.font = "11px monospace";
      ctx.fillStyle = "#fecdd3";
      ctx.fillText(
        `Góc tới i (${incidentAngleDeg}°) > Góc giới hạn i_gh (${criticalAngleDeg?.toFixed(1)}°)`,
        cx,
        cy + 78
      );
      ctx.textAlign = "left";
    }
  };

  const drawArrowHead = (ctx: CanvasRenderingContext2D, x: number, y: number, dir: "up" | "down") => {
    ctx.save();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    if (dir === "up") {
      ctx.moveTo(x - 5, y + 8);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 5, y + 8);
    } else {
      ctx.moveTo(x - 5, y - 8);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 5, y - 8);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const handleRecordLensSample = () => {
    if (isAtFocus) return;
    const newSample: LensSample = {
      id: Math.random().toString(),
      d: objectDistance,
      dPrime: Math.round(dPrime * 10) / 10,
      fCalc: Math.round(((objectDistance * dPrime) / (objectDistance + dPrime)) * 10) / 10,
      k: Math.round(k * 100) / 100,
      nature: isReal ? "Ảnh Thật (Ngược chiều)" : "Ảnh Ảo (Cùng chiều)",
    };
    setLensSamples((prev) => [...prev, newSample]);
  };

  return (
    <div className="space-y-5">
      {/* Sub-Discipline Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-md">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-300">Chuyên Đề Quang Học:</span>
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {[
              { id: "thin-lens", label: "1. Thấu Kính Mỏng (Hội tụ & Phân kì)" },
              { id: "snell-refraction", label: "2. Khúc Xạ & Phản Xạ Toàn Phần (Snell)" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setMode(item.id as OpticsMode)}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  mode === item.id ? "bg-amber-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "thin-lens" && (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setLensType("converging")}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                lensType === "converging"
                  ? "bg-cyan-500 text-slate-950 border-cyan-400 font-bold"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              Thấu Kính Hội Tụ (f &gt; 0)
            </button>
            <button
              onClick={() => setLensType("diverging")}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                lensType === "diverging"
                  ? "bg-cyan-500 text-slate-950 border-cyan-400 font-bold"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              Thấu Kính Phân Kì (f &lt; 0)
            </button>
          </div>
        )}
      </div>

      {/* Main Viewport & Parameters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
            <canvas ref={canvasRef} width={640} height={400} className="w-full h-full object-contain" />
          </div>

          {mode === "thin-lens" && (
            <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <div className="text-xs text-slate-300">
                Kéo thay đổi khoảng cách vật <span className="font-mono text-amber-400">d</span> và bấm &quot;Ghi điểm đo&quot; để kiểm chứng công thức 1/f = 1/d + 1/d&apos;.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRecordLensSample}
                  disabled={isAtFocus}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg transition disabled:opacity-40 shadow"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Ghi điểm đo ({lensSamples.length})</span>
                </button>
                {lensSamples.length > 0 && (
                  <button
                    onClick={() => setLensSamples([])}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls Sidebar (1 col) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-100 pb-2 border-b border-slate-800 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            {mode === "thin-lens" ? "Thông Số Quang Học Thấu Kính" : "Thông Số Môi Trường Khúc Xạ"}
          </h3>

          {mode === "thin-lens" ? (
            <>
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Tiêu cự |f|:</span>
                  <span className="font-mono text-cyan-400 font-bold">{focalLength} cm</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={20}
                  step={1}
                  value={focalLength}
                  onChange={(e) => setFocalLength(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Khoảng cách vật d = OA:</span>
                  <span className="font-mono text-amber-400 font-bold">{objectDistance} cm</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={45}
                  step={0.5}
                  value={objectDistance}
                  onChange={(e) => setObjectDistance(Number(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Chiều cao vật AB:</span>
                  <span className="font-mono text-yellow-400 font-bold">{objectHeight} cm</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={objectHeight}
                  onChange={(e) => setObjectHeight(Number(e.target.value))}
                  className="w-full accent-yellow-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Telemetry Result Box */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 font-mono text-[11px]">
                <div className="text-amber-400 font-bold flex items-center justify-between">
                  <span>KẾT QUẢ TẠO ẢNH:</span>
                  <MathFormula math="\frac{1}{f} = \frac{1}{d} + \frac{1}{d'}" className="text-cyan-400 text-xs" />
                </div>
                <div className="text-slate-300">
                  Vị trí ảnh <MathFormula math="d'" /> = OA&apos;:{" "}
                  <span className="text-emerald-300 font-bold">
                    {isAtFocus ? "Ở vô cực (∞)" : `${dPrime.toFixed(1)} cm`}
                  </span>
                </div>
                <div className="text-slate-300">
                  Độ phóng đại <MathFormula math="k = -\frac{d'}{d}" />:{" "}
                  <span className="text-purple-300 font-bold">{isAtFocus ? "—" : k.toFixed(2)}</span>
                </div>
                <div className="text-slate-300">
                  Chiều cao ảnh A&apos;B&apos;:{" "}
                  <span className="text-cyan-300 font-bold">{isAtFocus ? "—" : `${imageHeight.toFixed(1)} cm`}</span>
                </div>
                <div className="text-slate-300">
                  Tính chất:{" "}
                  <span
                    className={`font-bold ${isReal ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {isAtFocus ? "Chùm tia ló song song" : isReal ? "Ảnh thật, ngược chiều vật" : "Ảnh ảo, cùng chiều vật"}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Góc tới i:</span>
                  <span className="font-mono text-amber-400 font-bold">{incidentAngleDeg}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={85}
                  step={1}
                  value={incidentAngleDeg}
                  onChange={(e) => setIncidentAngleDeg(Number(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <span className="text-slate-300 block mb-1">Môi trường 1 (Tới):</span>
                <select
                  value={n1}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setN1(val);
                    if (val === 1.0) setMedium1Name("Không khí (n=1.00)");
                    else if (val === 1.33) setMedium1Name("Nước (n=1.33)");
                    else if (val === 1.5) setMedium1Name("Thủy tinh (n=1.50)");
                    else if (val === 2.42) setMedium1Name("Kim cương (n=2.42)");
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg text-xs"
                >
                  <option value={1.0}>Không khí (n = 1.00)</option>
                  <option value={1.33}>Nước (n = 1.33)</option>
                  <option value={1.5}>Thủy tinh (n = 1.50)</option>
                  <option value={2.42}>Kim cương (n = 2.42)</option>
                </select>
              </div>

              <div>
                <span className="text-slate-300 block mb-1">Môi trường 2 (Khúc xạ):</span>
                <select
                  value={n2}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setN2(val);
                    if (val === 1.0) setMedium2Name("Không khí (n=1.00)");
                    else if (val === 1.33) setMedium2Name("Nước (n=1.33)");
                    else if (val === 1.5) setMedium2Name("Thủy tinh (n=1.50)");
                    else if (val === 2.42) setMedium2Name("Kim cương (n=2.42)");
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg text-xs"
                >
                  <option value={1.5}>Thủy tinh (n = 1.50)</option>
                  <option value={1.33}>Nước (n = 1.33)</option>
                  <option value={1.0}>Không khí (n = 1.00)</option>
                  <option value={2.42}>Kim cương (n = 2.42)</option>
                </select>
              </div>

              {/* Snell's Law HUD */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 font-mono text-[11px]">
                <div className="text-amber-400 font-bold flex items-center justify-between">
                  <span>ĐỊNH LUẬT SNELL:</span>
                  <MathFormula math="n_1 \sin i = n_2 \sin r" className="text-cyan-400 text-xs" />
                </div>
                <div className="text-slate-300">
                  Góc khúc xạ <MathFormula math="r" />:{" "}
                  <span className="text-emerald-300 font-bold">
                    {isTIR ? "Không có (Phản xạ toàn phần)" : `${rDeg.toFixed(1)}°`}
                  </span>
                </div>
                {criticalAngleDeg !== null && (
                  <div className="text-slate-300">
                    Góc giới hạn <MathFormula math="i_{gh} = \arcsin\left(\frac{n_2}{n_1}\right)" />:{" "}
                    <span className="text-rose-400 font-bold">{criticalAngleDeg.toFixed(1)}°</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Measurement Table for Lens */}
      {mode === "thin-lens" && lensSamples.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <h4 className="font-bold text-sm text-slate-100">Bảng Số Liệu Thực Nghiệm Thấu Kính</h4>
            <span className="text-xs font-mono text-slate-400">{lensSamples.length} mẫu đo</span>
          </div>

          <div className="max-h-52 overflow-y-auto font-mono text-xs text-slate-300">
            <table className="w-full text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">d (cm)</th>
                  <th className="py-2 px-2">d&apos; (cm)</th>
                  <th className="py-2 px-2">f_đo (cm)</th>
                  <th className="py-2 px-2">k = -d&apos;/d</th>
                  <th className="py-2 px-2">Tính chất ảnh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {lensSamples.map((s, idx) => (
                  <tr key={s.id}>
                    <td className="py-1.5 px-2 text-slate-500">#{idx + 1}</td>
                    <td className="py-1.5 px-2 text-cyan-300">{s.d}</td>
                    <td className="py-1.5 px-2 text-emerald-300">{s.dPrime}</td>
                    <td className="py-1.5 px-2 text-amber-300">{s.fCalc}</td>
                    <td className="py-1.5 px-2 text-purple-300">{s.k}</td>
                    <td className="py-1.5 px-2 text-slate-400">{s.nature}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
