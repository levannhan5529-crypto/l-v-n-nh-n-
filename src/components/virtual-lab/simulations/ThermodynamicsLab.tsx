import React, { useState, useEffect, useRef } from "react";
import { Flame, Snowflake, Play, Pause, RotateCcw, PlusCircle, Trash2, Sliders, TrendingUp } from "lucide-react";
import { PhysicsChart } from "../../common/PhysicsChart";
import { MathFormula } from "../../common/MathText";

interface GasSample {
  id: string;
  temperatureK: number;
  volumeL: number;
  pressureAtm: number;
}

export const ThermodynamicsLab: React.FC = () => {
  const [temperatureK, setTemperatureK] = useState<number>(300); // Kelvin (room temp)
  const [pistonWidthPercent, setPistonWidthPercent] = useState<number>(60); // 30% to 90% (volume)
  const [particleCount, setParticleCount] = useState<number>(60);
  const [samples, setSamples] = useState<GasSample[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Ideal Gas Law: P = (N * k_B * T) / V
  // Normalized for educational display
  const volumeL = (pistonWidthPercent / 10).toFixed(1);
  const pressureAtm = ((particleCount * 0.008 * temperatureK) / Number(volumeL)).toFixed(2);

  // Particle positions & velocities ref
  const particlesRef = useRef<
    { x: number; y: number; vx: number; vy: number; radius: number; color: string }[]
  >([]);

  useEffect(() => {
    // Initialize particles
    const pts = [];
    for (let i = 0; i < particleCount; i++) {
      const speed = Math.sqrt(temperatureK / 300) * (Math.random() * 2 + 1);
      const angle = Math.random() * Math.PI * 2;
      pts.push({
        x: 60 + Math.random() * 250,
        y: 60 + Math.random() * 260,
        vx: speed * Math.cos(angle),
        vy: speed * Math.sin(angle),
        radius: 4,
        color: Math.random() > 0.5 ? "#38bdf8" : "#f43f5e",
      });
    }
    particlesRef.current = pts;
  }, [particleCount]);

  // Adjust particle speed when temperature changes
  useEffect(() => {
    const factor = Math.sqrt(temperatureK / 300);
    particlesRef.current.forEach((p) => {
      const currentSpeed = Math.hypot(p.vx, p.vy);
      if (currentSpeed > 0) {
        const baseSpeed = (currentSpeed / (p as any).prevFactor || 2) * factor;
        const angle = Math.atan2(p.vy, p.vx);
        p.vx = baseSpeed * Math.cos(angle);
        p.vy = baseSpeed * Math.sin(angle);
        (p as any).prevFactor = factor;
      }
    });
  }, [temperatureK]);

  // Animation loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Clear
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, w, h);

      // Gas Chamber Coordinates
      const chamberLeft = 60;
      const chamberTop = 50;
      const chamberHeight = 280;
      const maxChamberWidth = 420;
      const chamberWidth = (pistonWidthPercent / 100) * maxChamberWidth;
      const chamberRight = chamberLeft + chamberWidth;
      const chamberBottom = chamberTop + chamberHeight;

      // Outer Chamber walls
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(chamberRight + 30, chamberTop);
      ctx.lineTo(chamberLeft, chamberTop);
      ctx.lineTo(chamberLeft, chamberBottom);
      ctx.lineTo(chamberRight + 30, chamberBottom);
      ctx.stroke();

      // Piston (Piston movable wall on right)
      ctx.fillStyle = "#64748b";
      ctx.fillRect(chamberRight - 10, chamberTop + 2, 20, chamberHeight - 4);
      // Piston shaft
      ctx.fillStyle = "#475569";
      ctx.fillRect(chamberRight + 10, chamberTop + chamberHeight / 2 - 8, 110, 16);

      // Burner / Heater flame under chamber
      if (temperatureK > 350) {
        const flameX = chamberLeft + chamberWidth / 2;
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(flameX - 20, chamberBottom + 18, 12, 0, Math.PI * 2);
        ctx.arc(flameX, chamberBottom + 14, 16, 0, Math.PI * 2);
        ctx.arc(flameX + 20, chamberBottom + 18, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update & Render Particles
      particlesRef.current.forEach((p) => {
        p.x += p.vx * 1.5;
        p.y += p.vy * 1.5;

        // Bounce on left
        if (p.x - p.radius <= chamberLeft + 4) {
          p.x = chamberLeft + 4 + p.radius;
          p.vx = Math.abs(p.vx);
        }
        // Bounce on right (piston)
        if (p.x + p.radius >= chamberRight - 10) {
          p.x = chamberRight - 10 - p.radius;
          p.vx = -Math.abs(p.vx);
        }
        // Bounce top
        if (p.y - p.radius <= chamberTop + 4) {
          p.y = chamberTop + 4 + p.radius;
          p.vy = Math.abs(p.vy);
        }
        // Bounce bottom
        if (p.y + p.radius >= chamberBottom - 4) {
          p.y = chamberBottom - 4 - p.radius;
          p.vy = -Math.abs(p.vy);
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = temperatureK > 400 ? "#ef4444" : temperatureK < 200 ? "#38bdf8" : "#fbbf24";
        ctx.fill();
      });

      // Pressure Gauge on top of chamber
      const gaugeX = chamberLeft + 80;
      const gaugeY = chamberTop - 25;
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY, 22, 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Gauge needle based on pressure
      const pVal = Number(pressureAtm);
      const angle = -Math.PI * 0.75 + Math.min(Math.PI * 1.5, (pVal / 10) * Math.PI * 1.5);
      ctx.beginPath();
      ctx.moveTo(gaugeX, gaugeY);
      ctx.lineTo(gaugeX + 16 * Math.cos(angle), gaugeY + 16 * Math.sin(angle));
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // HUD in bottom-right corner
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fillRect(w - 220, 15, 205, 90);
      ctx.strokeStyle = "#334155";
      ctx.strokeRect(w - 220, 15, 205, 90);

      ctx.font = "bold 11px JetBrains Mono, monospace";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText("ĐỒNG HỒ ĐO KHÍ LÝ TƯỞNG", w - 210, 34);
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(`Nhiệt độ T: ${temperatureK} K (${temperatureK - 273}°C)`, w - 210, 52);
      ctx.fillStyle = "#10b981";
      ctx.fillText(`Thể tích V: ${volumeL} Lít`, w - 210, 70);
      ctx.fillStyle = "#ef4444";
      ctx.fillText(`Áp suất P: ${pressureAtm} atm`, w - 210, 88);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [temperatureK, pistonWidthPercent, particleCount, volumeL, pressureAtm]);

  const handleRecordSample = () => {
    const s: GasSample = {
      id: Math.random().toString(),
      temperatureK,
      volumeL: Number(volumeL),
      pressureAtm: Number(pressureAtm),
    };
    setSamples((prev) => [...prev, s]);
  };

  const chartData = samples.map((s) => ({
    x: s.volumeL,
    y: s.pressureAtm,
    yFiltered: s.pressureAtm,
  }));

  return (
    <div className="space-y-6">
      {/* Simulation Viewport & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
            <canvas ref={canvasRef} width={640} height={400} className="w-full h-full object-contain" />
          </div>

          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <div className="text-xs text-slate-300">
              Kéo piston thay đổi thể tích V hoặc chỉnh nhiệt độ T để kiểm chứng phương trình $P \cdot V = nRT$.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRecordSample}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Ghi mốc P-V ({samples.length})</span>
              </button>
              {samples.length > 0 && (
                <button
                  onClick={() => setSamples([])}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Parameters */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-100 pb-2 border-b border-slate-800 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Điều Khiển Trạng Thái Khí
          </h3>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Nhiệt độ T (Kelvin):</span>
              <span className="font-mono text-amber-400 font-bold">{temperatureK} K</span>
            </div>
            <input
              type="range"
              min={100}
              max={600}
              step={10}
              value={temperatureK}
              onChange={(e) => setTemperatureK(Number(e.target.value))}
              className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Vị trí Piston (Thể tích V):</span>
              <span className="font-mono text-emerald-400 font-bold">{volumeL} L</span>
            </div>
            <input
              type="range"
              min={30}
              max={95}
              value={pistonWidthPercent}
              onChange={(e) => setPistonWidthPercent(Number(e.target.value))}
              className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Số phân tử khí N:</span>
              <span className="font-mono text-cyan-400 font-bold">{particleCount}</span>
            </div>
            <input
              type="range"
              min={20}
              max={120}
              step={10}
              value={particleCount}
              onChange={(e) => setParticleCount(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 font-mono text-[11px] text-slate-300">
            <div className="text-cyan-400 font-bold flex items-center justify-between">
              <span>Định luật Boyle - Mariotte:</span>
              <MathFormula math="P \cdot V = \text{const}" className="text-cyan-300 text-xs" />
            </div>
            <div>Tích số: <MathFormula math="P \cdot V" /> = {(Number(pressureAtm) * Number(volumeL)).toFixed(1)} atm·L</div>
            <div className="text-slate-400 text-[10px]">Khi nén đẳng nhiệt thể tích giảm một nửa thì áp suất tăng gấp đôi.</div>
          </div>
        </div>
      </div>

      {/* P-V Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PhysicsChart
          title="Đường Đẳng Nhiệt P(V) - Định Luật Boyle-Mariotte"
          xLabel="Thể tích V"
          yLabel="Áp suất P"
          xUnit="L"
          yUnit="atm"
          data={chartData}
          color="#f43f5e"
          height={260}
        />

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <h4 className="font-bold text-sm text-slate-100">Bảng Dữ Liệu Khí Lý Tưởng</h4>
            <span className="text-xs font-mono text-slate-400">{samples.length} điểm</span>
          </div>

          <div className="max-h-52 overflow-y-auto font-mono text-xs text-slate-300">
            <table className="w-full text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">T (K)</th>
                  <th className="py-2 px-2">V (L)</th>
                  <th className="py-2 px-2">P (atm)</th>
                  <th className="py-2 px-2">P × V</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {samples.map((s, idx) => (
                  <tr key={s.id}>
                    <td className="py-1.5 px-2 text-slate-500">#{idx + 1}</td>
                    <td className="py-1.5 px-2 text-amber-300">{s.temperatureK}</td>
                    <td className="py-1.5 px-2 text-emerald-300">{s.volumeL}</td>
                    <td className="py-1.5 px-2 text-rose-300">{s.pressureAtm}</td>
                    <td className="py-1.5 px-2 text-cyan-300">{(s.pressureAtm * s.volumeL).toFixed(1)}</td>
                  </tr>
                ))}
                {samples.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Chưa có điểm đo. Hãy thay đổi V và nhấn &quot;Ghi mốc P-V&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
