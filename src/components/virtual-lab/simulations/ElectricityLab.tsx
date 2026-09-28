import React, { useState, useEffect, useRef } from "react";
import { Zap, Play, Pause, RotateCcw, PlusCircle, Trash2, HelpCircle, CheckCircle, Lightbulb, Wrench, BarChart2 } from "lucide-react";
import { PhysicsChart } from "../../common/PhysicsChart";
import { CircuitWorkbench } from "./circuit-builder/CircuitWorkbench";
import { MathFormula } from "../../common/MathText";

type LabSubTab = "builder" | "analysis";
type CircuitType = "ohm-simple" | "series" | "parallel";

interface OhmSample {
  id: string;
  voltageU: number;
  currentI: number;
  resistanceR: number;
}

export const ElectricityLab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<LabSubTab>("builder");
  const [circuitType, setCircuitType] = useState<CircuitType>("ohm-simple");
  const [switchClosed, setSwitchClosed] = useState<boolean>(true);
  const [voltage, setVoltage] = useState<number>(12); // V
  const [r1, setR1] = useState<number>(20); // Ohm
  const [r2, setR2] = useState<number>(30); // Ohm
  const [samples, setSamples] = useState<OhmSample[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Quiz state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizChecked, setQuizChecked] = useState<boolean>(false);

  // Calculations
  let totalResistance = r1;
  let totalCurrent = 0;
  let current1 = 0;
  let current2 = 0;
  let voltage1 = 0;
  let voltage2 = 0;

  if (switchClosed) {
    if (circuitType === "ohm-simple") {
      totalResistance = r1;
      totalCurrent = voltage / totalResistance;
      current1 = totalCurrent;
      voltage1 = voltage;
    } else if (circuitType === "series") {
      totalResistance = r1 + r2;
      totalCurrent = voltage / totalResistance;
      current1 = totalCurrent;
      current2 = totalCurrent;
      voltage1 = totalCurrent * r1;
      voltage2 = totalCurrent * r2;
    } else if (circuitType === "parallel") {
      totalResistance = (r1 * r2) / (r1 + r2);
      totalCurrent = voltage / totalResistance;
      current1 = voltage / r1;
      current2 = voltage / r2;
      voltage1 = voltage;
      voltage2 = voltage;
    }
  }

  // Animation for moving electrons
  const electronOffsetRef = useRef(0);
  useEffect(() => {
    let animId: number;
    const loop = () => {
      if (switchClosed && totalCurrent > 0) {
        electronOffsetRef.current = (electronOffsetRef.current + totalCurrent * 1.5) % 30;
      }
      drawCircuit();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [circuitType, switchClosed, voltage, r1, r2, totalCurrent]);

  const drawCircuit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, w, h);

    // Circuit Coordinates
    const x1 = 100;
    const y1 = 70;
    const x2 = 540;
    const y2 = 330;

    // Outer Wires
    ctx.strokeStyle = switchClosed ? "#38bdf8" : "#475569";
    ctx.lineWidth = 3.5;

    // Top wire: Battery -> Switch -> Load
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x1, y2);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // DC Power Source on left vertical wire (x1, midY)
    const midY = (y1 + y2) / 2;
    ctx.fillStyle = "#090d16";
    ctx.fillRect(x1 - 10, midY - 35, 20, 70);

    // Battery plates
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 4;
    // Long plate (+)
    ctx.beginPath();
    ctx.moveTo(x1 - 18, midY - 12);
    ctx.lineTo(x1 + 18, midY - 12);
    ctx.stroke();
    // Short plate (-)
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x1 - 10, midY + 12);
    ctx.lineTo(x1 + 10, midY + 12);
    ctx.stroke();

    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#f59e0b";
    ctx.fillText(`${voltage}V`, x1 - 58, midY + 4);
    ctx.fillStyle = "#ef4444";
    ctx.fillText("+", x1 + 24, midY - 10);
    ctx.fillStyle = "#38bdf8";
    ctx.fillText("−", x1 + 24, midY + 16);

    // Switch on top wire
    const swX = (x1 + x2) / 2 - 80;
    ctx.fillStyle = "#090d16";
    ctx.fillRect(swX - 10, y1 - 15, 60, 30);
    // Switch terminals
    ctx.beginPath();
    ctx.arc(swX, y1, 4, 0, Math.PI * 2);
    ctx.arc(swX + 40, y1, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();

    // Switch blade
    ctx.beginPath();
    ctx.moveTo(swX, y1);
    if (switchClosed) {
      ctx.lineTo(swX + 40, y1);
    } else {
      ctx.lineTo(swX + 35, y1 - 25);
    }
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.fillText(switchClosed ? "K (ĐÓNG)" : "K (NGẮT)", swX + 2, y1 - 16);

    // Resistors / Load on right
    if (circuitType === "ohm-simple") {
      drawResistor(ctx, x2, midY, r1, `R = ${r1}Ω`, current1);
    } else if (circuitType === "series") {
      drawResistor(ctx, x2, midY - 50, r1, `R1 = ${r1}Ω`, current1);
      drawResistor(ctx, x2, midY + 50, r2, `R2 = ${r2}Ω`, current2);
    } else {
      // Parallel branch
      const branchX = x2 - 120;
      ctx.strokeStyle = switchClosed ? "#38bdf8" : "#475569";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(branchX, y1);
      ctx.lineTo(branchX, y2);
      ctx.stroke();

      drawResistor(ctx, branchX, midY, r1, `R1 = ${r1}Ω`, current1);
      drawResistor(ctx, x2, midY, r2, `R2 = ${r2}Ω`, current2);
    }

    // Ammeter symbol on bottom wire
    const ammeterX = (x1 + x2) / 2;
    ctx.fillStyle = "#090d16";
    ctx.fillRect(ammeterX - 25, y2 - 25, 50, 50);
    ctx.beginPath();
    ctx.arc(ammeterX, y2, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#022c22";
    ctx.fill();
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#34d399";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("A", ammeterX, y2 + 5);
    ctx.textAlign = "left";

    // Animated Electrons (Blue glowing dots moving around circuit)
    if (switchClosed && totalCurrent > 0) {
      ctx.fillStyle = "#67e8f9";
      const count = 16;
      for (let i = 0; i < count; i++) {
        // Move clockwise: top right, down right, left bottom, up left
        const p = ((i * 35 + electronOffsetRef.current) % 400) / 400;
        let ex = x1;
        let ey = y1;
        if (p < 0.25) {
          ex = x1 + (p / 0.25) * (x2 - x1);
          ey = y1;
        } else if (p < 0.5) {
          ex = x2;
          ey = y1 + ((p - 0.25) / 0.25) * (y2 - y1);
        } else if (p < 0.75) {
          ex = x2 - ((p - 0.5) / 0.25) * (x2 - x1);
          ey = y2;
        } else {
          ex = x1;
          ey = y2 - ((p - 0.75) / 0.25) * (y2 - y1);
        }
        ctx.beginPath();
        ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Digital Multimeter HUD Readings (Top Right)
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.fillRect(w - 230, 15, 215, 95);
    ctx.strokeStyle = "#334155";
    ctx.strokeRect(w - 230, 15, 215, 95);

    ctx.font = "bold 11px JetBrains Mono, monospace";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText("ĐỒNG HỒ ĐO ĐA NĂNG (DMM)", w - 218, 34);

    ctx.fillStyle = "#f59e0b";
    ctx.fillText(`Hiệu điện thế U: ${switchClosed ? voltage.toFixed(2) : "0.00"} V`, w - 218, 54);
    ctx.fillStyle = "#34d399";
    ctx.fillText(`Dòng điện chính I: ${totalCurrent.toFixed(3)} A`, w - 218, 74);
    ctx.fillStyle = "#c084fc";
    ctx.fillText(`Điện trở tương đương: ${totalResistance.toFixed(1)} Ω`, w - 218, 94);
  };

  const drawResistor = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    label: string,
    current: number
  ) => {
    // Clear wire gap
    ctx.fillStyle = "#090d16";
    ctx.fillRect(x - 18, y - 30, 36, 60);

    // Zig zag resistor symbol
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 28);
    ctx.lineTo(x + 10, y - 20);
    ctx.lineTo(x - 10, y - 10);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x - 10, y + 10);
    ctx.lineTo(x + 10, y + 20);
    ctx.lineTo(x, y + 28);
    ctx.stroke();

    // Resistor Box & Label
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#fef08a";
    ctx.fillText(label, x + 16, y - 4);
    ctx.fillStyle = "#34d399";
    ctx.fillText(`I = ${current.toFixed(3)}A`, x + 16, y + 12);
  };

  const handleRecordSample = () => {
    if (!switchClosed) return;
    const newSample: OhmSample = {
      id: Math.random().toString(),
      voltageU: voltage,
      currentI: Math.round(totalCurrent * 1000) / 1000,
      resistanceR: totalResistance,
    };
    setSamples((prev) => [...prev, newSample]);
  };

  const chartData = samples.map((s) => ({
    x: s.voltageU,
    y: s.currentI,
    yFiltered: s.currentI,
  }));

  return (
    <div className="space-y-5">
      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-xl shadow-lg">
        <button
          onClick={() => setActiveSubTab("builder")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeSubTab === "builder"
              ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>🛠️ Lắp Ráp Mạch Tự Do</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950/40 font-mono">Được khuyến nghị</span>
        </button>

        <button
          onClick={() => setActiveSubTab("analysis")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeSubTab === "analysis"
              ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>📊 Đo Đạc Thực Nghiệm & Vẽ Đồ Thị Vôn-Ampe</span>
        </button>
      </div>

      {/* Render Circuit Workbench */}
      {activeSubTab === "builder" && <CircuitWorkbench />}

      {/* Render Quantitative Measurement & Graph Mode */}
      {activeSubTab === "analysis" && (
        <div className="space-y-6">
          {/* Circuit Mode Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-md">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-300">Cấu Hình Mạch Điện:</span>
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                {[
                  { id: "ohm-simple", label: "Định luật Ohm cơ bản (1 Điện trở)" },
                  { id: "series", label: "Mạch nối tiếp (R1 nt R2)" },
                  { id: "parallel", label: "Mạch song song (R1 // R2)" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCircuitType(item.id as CircuitType);
                      setSamples([]);
                    }}
                    className={`px-3 py-1.5 rounded-md font-medium transition ${
                      circuitType === item.id ? "bg-cyan-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Switch Toggle */}
            <button
              onClick={() => setSwitchClosed(!switchClosed)}
              className={`flex items-center gap-2 text-xs font-bold px-4 py-1.5 rounded-lg border transition ${
                switchClosed
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
                  : "bg-rose-900/80 hover:bg-rose-800 text-rose-200 border-rose-700"
              }`}
            >
              <span>Khóa K: {switchClosed ? "Đang ĐÓNG (Có dòng)" : "Đang NGẮT (Hở mạch)"}</span>
            </button>
          </div>

      {/* Simulation Viewport & Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
            <canvas ref={canvasRef} width={640} height={400} className="w-full h-full object-contain" />
          </div>

          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <div className="text-xs text-slate-300">
              Điều chỉnh hiệu điện thế U và nhấn &quot;Ghi điểm đo&quot; để dựng đặc tuyến Volt-Ampe (I theo U).
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRecordSample}
                disabled={!switchClosed}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition disabled:opacity-40 shadow"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Ghi điểm đo ({samples.length})</span>
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
          <h3 className="font-bold text-sm text-slate-100 pb-2 border-b border-slate-800">
            Thông Số Nguồn & Điện Trở
          </h3>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Hiệu điện thế nguồn U:</span>
              <span className="font-mono text-cyan-400 font-bold">{voltage} V</span>
            </div>
            <input
              type="range"
              min={2}
              max={24}
              step={1}
              value={voltage}
              onChange={(e) => setVoltage(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Điện trở R1:</span>
              <span className="font-mono text-cyan-400 font-bold">{r1} Ω</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={r1}
              onChange={(e) => setR1(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {(circuitType === "series" || circuitType === "parallel") && (
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Điện trở R2:</span>
                <span className="font-mono text-purple-400 font-bold">{r2} Ω</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={r2}
                onChange={(e) => setR2(Number(e.target.value))}
                className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          )}

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 font-mono text-[11px]">
            <div className="text-slate-300 flex items-center justify-between">
              <span>Công suất tỏa nhiệt (<MathFormula math="P = U \cdot I" />):</span>
              <span className="font-bold text-emerald-300">{(voltage * totalCurrent).toFixed(2)} W</span>
            </div>
          </div>
        </div>
      </div>

      {/* Volt-Amper Curve Graph & Data Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PhysicsChart
          title="Đặc Tuyến Vôn-Ampe I(U) - Xác Định Điện Trở Thực Nghiệm"
          xLabel="Hiệu điện thế U"
          yLabel="Cường độ dòng điện I"
          xUnit="V"
          yUnit="A"
          data={chartData}
          color="#38bdf8"
          height={260}
        />

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <h4 className="font-bold text-sm text-slate-100">Bảng Số Liệu Đo Điện</h4>
            <span className="text-xs font-mono text-slate-400">{samples.length} mẫu</span>
          </div>

          <div className="max-h-52 overflow-y-auto font-mono text-xs text-slate-300">
            <table className="w-full text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">U (V)</th>
                  <th className="py-2 px-2">I (A)</th>
                  <th className="py-2 px-2">R = U/I (Ω)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {samples.map((s, idx) => (
                  <tr key={s.id}>
                    <td className="py-1.5 px-2 text-slate-500">#{idx + 1}</td>
                    <td className="py-1.5 px-2 text-cyan-300">{s.voltageU}</td>
                    <td className="py-1.5 px-2 text-emerald-300">{s.currentI}</td>
                    <td className="py-1.5 px-2 text-amber-300">{(s.voltageU / s.currentI).toFixed(1)}</td>
                  </tr>
                ))}
                {samples.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      Chưa có điểm đo. Thay đổi U và nhấn &quot;Ghi điểm đo&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )}
</div>
);
};
