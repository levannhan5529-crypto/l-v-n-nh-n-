import React, { useState, useEffect, useRef } from "react";
import { Waves, Play, Pause, RotateCcw, Sliders, Info } from "lucide-react";
import { PhysicsChart } from "../../common/PhysicsChart";
import { MathFormula } from "../../common/MathText";

type WaveMode = "interference" | "standing-wave" | "transverse-wave";

export const WavesLab: React.FC = () => {
  const [mode, setMode] = useState<WaveMode>("interference");
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Parameters
  const [frequency, setFrequency] = useState<number>(2.0); // Hz
  const [amplitude, setAmplitude] = useState<number>(25); // px
  const [waveSpeed, setWaveSpeed] = useState<number>(80); // px/s
  const [sourceDistance, setSourceDistance] = useState<number>(180); // px
  const [harmonicN, setHarmonicN] = useState<number>(3); // harmonic mode for standing wave (k=1,2,3,4)

  const timeRef = useRef(0);

  useEffect(() => {
    let animId: number;
    let last = performance.now();

    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;

      if (isRunning) {
        timeRef.current += dt;
      }

      drawWaves();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isRunning, mode, frequency, amplitude, waveSpeed, sourceDistance, harmonicN]);

  const drawWaves = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const t = timeRef.current;

    // Clear background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, w, h);

    const lambda = waveSpeed / frequency; // wavelength in px
    const k = (2 * Math.PI) / lambda;
    const omega = 2 * Math.PI * frequency;

    if (mode === "interference") {
      // 2D Wave ripple interference simulation
      const s1X = w / 2 - sourceDistance / 2;
      const s1Y = h / 2;
      const s2X = w / 2 + sourceDistance / 2;
      const s2Y = h / 2;

      // Draw pixel grid or optical contour lines
      const step = 6;
      for (let x = 0; x < w; x += step) {
        for (let y = 0; y < h; y += step) {
          const d1 = Math.hypot(x - s1X, y - s1Y);
          const d2 = Math.hypot(x - s2X, y - s2Y);

          // Combined wave: u = A*cos(omega*t - k*d1) + A*cos(omega*t - k*d2)
          const u = Math.cos(omega * t - k * d1) + Math.cos(omega * t - k* d2); // -2 to 2

          if (Math.abs(u) > 0.2) {
            const intensity = Math.min(1, Math.abs(u) / 2);
            ctx.fillStyle = u > 0 ? `rgba(6, 182, 212, ${intensity * 0.75})` : `rgba(30, 58, 138, ${intensity * 0.75})`;
            ctx.fillRect(x, y, step, step);
          }
        }
      }

      // Draw Sources S1 and S2
      [
        { x: s1X, y: s1Y, label: "S1" },
        { x: s2X, y: s2Y, label: "S2" },
      ].forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0b";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(s.label, s.x - 7, s.y - 12);
      });

      // Overlay text
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(15, 15, 230, 60);
      ctx.strokeStyle = "#334155";
      ctx.strokeRect(15, 15, 230, 60);

      ctx.font = "11px JetBrains Mono, monospace";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`Bước sóng λ = ${(lambda / 10).toFixed(1)} cm`, 25, 34);
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(`Khoảng cách S1S2 = ${(sourceDistance / 10).toFixed(1)} cm`, 25, 52);
      ctx.fillText(`Số cực đại: k = ${Math.floor(sourceDistance / lambda) * 2 + 1} vân`, 25, 68);
    } else if (mode === "standing-wave") {
      // Standing wave on string (Sóng dừng)
      const startX = 60;
      const endX = w - 60;
      const midY = h / 2;
      const stringLen = endX - startX;

      // Fixed mounts
      ctx.fillStyle = "#64748b";
      ctx.fillRect(startX - 15, midY - 30, 15, 60);
      ctx.fillRect(endX, midY - 30, 15, 60);

      // Equilibrium dashed line
      ctx.beginPath();
      ctx.moveTo(startX, midY);
      ctx.lineTo(endX, midY);
      ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Standing wave formula: y(x,t) = 2A * sin(n*pi*x / L) * cos(omega*t)
      const n = harmonicN;
      const amp = amplitude;

      // Draw primary wave string
      ctx.beginPath();
      for (let px = startX; px <= endX; px += 2) {
        const xRel = px - startX;
        const waveY = midY - 2 * amp * Math.sin((n * Math.PI * xRel) / stringLen) * Math.cos(omega * t);
        if (px === startX) ctx.moveTo(px, waveY);
        else ctx.lineTo(px, waveY);
      }
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Draw envelope (ghost reflection)
      ctx.beginPath();
      for (let px = startX; px <= endX; px += 2) {
        const xRel = px - startX;
        const waveY = midY + 2 * amp * Math.sin((n * Math.PI * xRel) / stringLen);
        if (px === startX) ctx.moveTo(px, waveY);
        else ctx.lineTo(px, waveY);
      }
      ctx.strokeStyle = "rgba(6, 182, 212, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Nodes (Nút) and Antinodes (Bụng)
      for (let i = 0; i <= n; i++) {
        const nodeX = startX + (i * stringLen) / n;
        // Node dot
        ctx.beginPath();
        ctx.arc(nodeX, midY, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.fillStyle = "#fca5a5";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(`Nút ${i}`, nodeX - 12, midY + 20);
      }

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(15, 15, 250, 50);
      ctx.font = "11px JetBrains Mono, monospace";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`Số bó sóng k = ${n} | Số nút = ${n + 1} | Số bụng = ${n}`, 25, 34);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(`Điều kiện: L = k·(λ / 2)`, 25, 52);
    } else {
      // Traveling Transverse Wave
      const midY = h / 2;
      ctx.beginPath();
      for (let x = 40; x < w - 40; x += 3) {
        const waveY = midY - amplitude * Math.sin(omega * t - k * x);
        if (x === 40) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Particle dots moving up and down
      for (let x = 80; x < w - 40; x += 50) {
        const waveY = midY - amplitude * Math.sin(omega * t - k * x);
        ctx.beginPath();
        ctx.arc(x, waveY, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0b";
        ctx.fill();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-md">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-300">Chế Độ Sóng:</span>
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {[
              { id: "interference", label: "Giao thoa sóng 2 nguồn (2D Wave Interference)" },
              { id: "standing-wave", label: "Sóng dừng trên dây đàn hồi (Standing Wave)" },
              { id: "transverse-wave", label: "Sóng cơ truyền đi (Transverse Wave)" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setMode(item.id as WaveMode)}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  mode === item.id ? "bg-cyan-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setIsRunning(!isRunning)}
          className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition"
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRunning ? "Tạm dừng" : "Tiếp tục"}</span>
        </button>
      </div>

      {/* Main Viewport & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
            <canvas ref={canvasRef} width={640} height={400} className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Tham Số Sóng Cơ Học
          </h3>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Tần số f:</span>
              <span className="font-mono text-cyan-400 font-bold">{frequency} Hz</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.5}
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Biên độ sóng A:</span>
              <span className="font-mono text-cyan-400 font-bold">{amplitude} mm</span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              value={amplitude}
              onChange={(e) => setAmplitude(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {mode === "interference" && (
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Khoảng cách 2 nguồn S1S2:</span>
                <span className="font-mono text-amber-400 font-bold">{sourceDistance} px</span>
              </div>
              <input
                type="range"
                min={80}
                max={260}
                step={10}
                value={sourceDistance}
                onChange={(e) => setSourceDistance(Number(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {mode === "standing-wave" && (
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Số bó sóng (Họa âm k):</span>
                <span className="font-mono text-purple-400 font-bold">k = {harmonicN}</span>
              </div>
              <input
                type="range"
                min={1}
                max={6}
                step={1}
                value={harmonicN}
                onChange={(e) => setHarmonicN(Number(e.target.value))}
                className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          )}

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 font-mono text-[11px] text-slate-300">
            <div className="text-cyan-400 font-bold flex items-center justify-between">
              <span>Công thức bước sóng:</span>
              <MathFormula math="\lambda = \frac{v}{f}" className="text-cyan-300 text-xs" />
            </div>
            <div>Tốc độ truyền sóng: <MathFormula math="v" /> = {waveSpeed} px/s</div>
            <div>Chu kỳ sóng: <MathFormula math="T = \frac{1}{f}" /> = {(1 / frequency).toFixed(2)} s</div>
          </div>
        </div>
      </div>
    </div>
  );
};
