import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, PlusCircle, Trash2, HelpCircle, CheckCircle, TrendingUp, Sliders } from "lucide-react";
import { PhysicsChart } from "../../common/PhysicsChart";
import { Stopwatch } from "../../common/Stopwatch";
import { RulerOverlay } from "../../common/RulerOverlay";
import { MathFormula } from "../../common/MathText";

type MechMode = "incline-plane" | "pendulum" | "spring-mass" | "collision";

interface LabSample {
  id: string;
  t: number;
  val1: number;
  val2: number;
  val3?: number;
}

export const MechanicsLab: React.FC = () => {
  const [mode, setMode] = useState<MechMode>("incline-plane");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tools
  const [showStopwatch, setShowStopwatch] = useState<boolean>(false);
  const [showRuler, setShowRuler] = useState<boolean>(false);

  // Incline plane parameters
  const [angleDeg, setAngleDeg] = useState<number>(25);
  const [frictionCoeff, setFrictionCoeff] = useState<number>(0.1);
  const [mass, setMass] = useState<number>(1.0); // kg
  const [gravity, setGravity] = useState<number>(9.8); // m/s^2

  // Pendulum parameters
  const [pendulumLength, setPendulumLength] = useState<number>(1.0); // m
  const [pendulumAngle, setPendulumAngle] = useState<number>(20); // deg
  const [airDrag, setAirDrag] = useState<number>(0.02);

  // Spring parameters
  const [springK, setSpringK] = useState<number>(25); // N/m
  const [springMass, setSpringMass] = useState<number>(0.5); // kg

  // Collision parameters
  const [m1, setM1] = useState<number>(1.0);
  const [v1, setV1] = useState<number>(2.0);
  const [m2, setM2] = useState<number>(1.0);
  const [v2, setV2] = useState<number>(0.0);
  const [elasticity, setElasticity] = useState<number>(1.0); // 1 = elastic, 0 = inelastic

  // Simulation physics state
  const stateRef = useRef({
    t: 0,
    s: 0,
    v: 0,
    a: 0,
    theta: 0,
    omega: 0,
    springY: 0,
    springV: 0,
    pos1: 100,
    pos2: 380,
    vel1: 2.0,
    vel2: 0.0,
  });

  // Recorded experimental data points
  const [samples, setSamples] = useState<LabSample[]>([]);

  // Practice question quiz state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizChecked, setQuizChecked] = useState<boolean>(false);

  // Reset simulation state
  const handleReset = () => {
    setIsRunning(false);
    stateRef.current = {
      t: 0,
      s: 0,
      v: 0,
      a: 0,
      theta: (pendulumAngle * Math.PI) / 180,
      omega: 0,
      springY: 0.08,
      springV: 0,
      pos1: 100,
      pos2: 380,
      vel1: v1,
      vel2: v2,
    };
  };

  useEffect(() => {
    handleReset();
    setSamples([]);
  }, [mode, angleDeg, frictionCoeff, mass, gravity, pendulumLength, pendulumAngle, airDrag, springK, springMass, m1, v1, m2, v2, elasticity]);

  // Main animation loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;

      if (isRunning) {
        stateRef.current.t += dt;

        if (mode === "incline-plane") {
          const alpha = (angleDeg * Math.PI) / 180;
          const a_net = gravity * (Math.sin(alpha) - frictionCoeff * Math.cos(alpha));
          if (a_net > 0) {
            stateRef.current.a = a_net;
            stateRef.current.v += a_net * dt;
            stateRef.current.s += stateRef.current.v * dt;
            if (stateRef.current.s > 2.0) {
              setIsRunning(false);
            }
          }
        } else if (mode === "pendulum") {
          // Pendulum diff equation: theta'' = - (g/L) * sin(theta) - drag * theta'
          const alphaAcc = -(gravity / pendulumLength) * Math.sin(stateRef.current.theta) - airDrag * stateRef.current.omega;
          stateRef.current.omega += alphaAcc * dt;
          stateRef.current.theta += stateRef.current.omega * dt;
        } else if (mode === "spring-mass") {
          // Spring diff equation: y'' = - (k/m) * y - damping * y'
          const accY = -(springK / springMass) * stateRef.current.springY - 0.1 * stateRef.current.springV;
          stateRef.current.springV += accY * dt;
          stateRef.current.springY += stateRef.current.springV * dt;
        } else if (mode === "collision") {
          // 1D Collision
          stateRef.current.pos1 += stateRef.current.vel1 * dt * 80;
          stateRef.current.pos2 += stateRef.current.vel2 * dt * 80;

          // Check contact between carts
          if (stateRef.current.pos1 + 40 >= stateRef.current.pos2) {
            // Collision resolution
            const u1 = stateRef.current.vel1;
            const u2 = stateRef.current.vel2;
            const e = elasticity;
            const newV1 = ((m1 - e * m2) * u1 + (1 + e) * m2 * u2) / (m1 + m2);
            const newV2 = ((1 + e) * m1 * u1 + (m2 - e * m1) * u2) / (m1 + m2);
            stateRef.current.vel1 = newV1;
            stateRef.current.vel2 = newV2;
            stateRef.current.pos1 = stateRef.current.pos2 - 40;
          }

          if (stateRef.current.pos1 > 580 || stateRef.current.pos2 > 580 || stateRef.current.pos1 < 20) {
            setIsRunning(false);
          }
        }
      }

      // Draw canvas
      drawCanvas();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isRunning, mode, angleDeg, frictionCoeff, gravity, pendulumLength, airDrag, springK, springMass, m1, m2, elasticity]);

  // Canvas drawing
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (mode === "incline-plane") {
      drawInclineScene(ctx, w, h, angleDeg, frictionCoeff, stateRef.current);
    } else if (mode === "pendulum") {
      drawPendulumScene(ctx, w, h, pendulumLength, stateRef.current, gravity, mass);
    } else if (mode === "spring-mass") {
      drawSpringScene(ctx, w, h, springK, springMass, stateRef.current);
    } else if (mode === "collision") {
      drawCollisionScene(ctx, w, h, m1, m2, stateRef.current);
    }
  };

  // Record point into sample table
  const handleRecordSample = () => {
    const s = stateRef.current;
    let newSample: LabSample;
    if (mode === "incline-plane") {
      newSample = {
        id: Math.random().toString(),
        t: Math.round(s.t * 100) / 100,
        val1: Math.round(s.s * 1000) / 1000,
        val2: Math.round(s.v * 1000) / 1000,
        val3: Math.round(s.a * 1000) / 1000,
      };
    } else if (mode === "pendulum") {
      const deg = (s.theta * 180) / Math.PI;
      newSample = {
        id: Math.random().toString(),
        t: Math.round(s.t * 100) / 100,
        val1: Math.round(deg * 10) / 10,
        val2: Math.round(s.omega * 100) / 100,
      };
    } else if (mode === "spring-mass") {
      newSample = {
        id: Math.random().toString(),
        t: Math.round(s.t * 100) / 100,
        val1: Math.round(s.springY * 1000) / 1000,
        val2: Math.round(s.springV * 1000) / 1000,
      };
    } else {
      newSample = {
        id: Math.random().toString(),
        t: Math.round(s.t * 100) / 100,
        val1: Math.round(s.vel1 * 100) / 100,
        val2: Math.round(s.vel2 * 100) / 100,
      };
    }
    setSamples((prev) => [...prev, newSample]);
  };

  // Prepare chart data from recorded samples
  const chartPoints = samples.map((sample) => ({
    x: sample.t,
    y: sample.val1,
    yFiltered: sample.val1,
  }));

  return (
    <div className="space-y-6">
      {/* Sub-modes selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Chọn Thí Nghiệm Cơ Học:</span>
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
            {[
              { id: "incline-plane", label: "Mặt phẳng nghiêng & Ma sát" },
              { id: "pendulum", label: "Con lắc đơn (Bảo toàn cơ năng)" },
              { id: "spring-mass", label: "Con lắc lò xo" },
              { id: "collision", label: "Va chạm 1D & Bảo toàn động lượng" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setMode(item.id as MechMode)}
                className={`px-3 py-1.5 rounded-md transition ${
                  mode === item.id ? "bg-cyan-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Measuring tools toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStopwatch(!showStopwatch)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              showStopwatch ? "bg-cyan-500 text-slate-950 font-bold border-cyan-400" : "bg-slate-800 text-slate-300 border-slate-700"
            }`}
          >
            Đồng hồ
          </button>
          <button
            onClick={() => setShowRuler(!showRuler)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              showRuler ? "bg-amber-500 text-slate-950 font-bold border-amber-400" : "bg-slate-800 text-slate-300 border-slate-700"
            }`}
          >
            Thước đo
          </button>
        </div>
      </div>

      {/* Main Simulation Viewport & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Simulation Canvas (2 Cols) */}
        <div className="lg:col-span-2 relative">
          <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
            <canvas ref={canvasRef} width={640} height={400} className="w-full h-full object-contain" />

            {/* Overlaid Floating Tools */}
            {showStopwatch && (
              <div className="absolute top-4 right-4 z-30">
                <Stopwatch isOpen={showStopwatch} onClose={() => setShowStopwatch(false)} />
              </div>
            )}
            {showRuler && <RulerOverlay isOpen={showRuler} onClose={() => setShowRuler(false)} />}
          </div>

          {/* Canvas Bottom Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-md"
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isRunning ? "Tạm dừng" : "Bắt đầu thí nghiệm"}</span>
              </button>
              <button
                onClick={handleReset}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Đặt lại"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Record data button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRecordSample}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Ghi mốc số liệu ({samples.length})</span>
              </button>
              {samples.length > 0 && (
                <button
                  onClick={() => setSamples([])}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition"
                  title="Xóa bảng số liệu"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Parameter Sliders Panel (1 Col) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Bảng Điều Khiển Thông Số Vật Lí
          </h3>

          {mode === "incline-plane" && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Góc nghiêng α:</span>
                  <span className="font-mono text-cyan-400 font-bold">{angleDeg}°</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={60}
                  value={angleDeg}
                  onChange={(e) => setAngleDeg(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Hệ số ma sát trượt μ:</span>
                  <span className="font-mono text-cyan-400 font-bold">{frictionCoeff}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.5}
                  step={0.02}
                  value={frictionCoeff}
                  onChange={(e) => setFrictionCoeff(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Khối lượng vật m:</span>
                  <span className="font-mono text-cyan-400 font-bold">{mass} kg</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={5}
                  step={0.1}
                  value={mass}
                  onChange={(e) => setMass(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Trọng trường g:</span>
                  <span className="font-mono text-cyan-400 font-bold">{gravity} m/s²</span>
                </div>
                <select
                  value={gravity}
                  onChange={(e) => setGravity(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value={9.8}>Trái Đất (g = 9.8 m/s²)</option>
                  <option value={1.62}>Mặt Trăng (g = 1.62 m/s²)</option>
                  <option value={3.72}>Sao Hỏa (g = 3.72 m/s²)</option>
                </select>
              </div>
            </div>
          )}

          {mode === "pendulum" && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Chiều dài dây L:</span>
                  <span className="font-mono text-cyan-400 font-bold">{pendulumLength} m</span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.0}
                  step={0.1}
                  value={pendulumLength}
                  onChange={(e) => setPendulumLength(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Góc lệch ban đầu α₀:</span>
                  <span className="font-mono text-cyan-400 font-bold">{pendulumAngle}°</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={45}
                  value={pendulumAngle}
                  onChange={(e) => setPendulumAngle(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Lực cản không khí:</span>
                  <span className="font-mono text-cyan-400 font-bold">{airDrag}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.1}
                  step={0.01}
                  value={airDrag}
                  onChange={(e) => setAirDrag(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-300 flex items-center justify-between">
                <span>Chu kỳ lí thuyết: <MathFormula math="T = 2\pi\sqrt{\frac{l}{g}}" /></span>
                <span className="font-bold text-amber-300">≈ {(2 * Math.PI * Math.sqrt(pendulumLength / gravity)).toFixed(3)} s</span>
              </div>
            </div>
          )}

          {mode === "spring-mass" && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Độ cứng lò xo k:</span>
                  <span className="font-mono text-cyan-400 font-bold">{springK} N/m</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={springK}
                  onChange={(e) => setSpringK(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Khối lượng vật nặng m:</span>
                  <span className="font-mono text-cyan-400 font-bold">{springMass} kg</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  value={springMass}
                  onChange={(e) => setSpringMass(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-300 flex items-center justify-between">
                <span>Chu kỳ dao động: <MathFormula math="T = 2\pi\sqrt{\frac{m}{k}}" /></span>
                <span className="font-bold text-amber-300">≈ {(2 * Math.PI * Math.sqrt(springMass / springK)).toFixed(3)} s</span>
              </div>
            </div>
          )}

          {mode === "collision" && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Hệ số đàn hồi e:</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {elasticity === 1 ? "1.0 (Đàn hồi tuyệt đối)" : elasticity === 0 ? "0.0 (Va chạm mềm)" : elasticity}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={elasticity}
                  onChange={(e) => setElasticity(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-0.5">Xe 1 (m1):</label>
                  <input
                    type="number"
                    value={m1}
                    onChange={(e) => setM1(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-0.5">Vận tốc v1:</label>
                  <input
                    type="number"
                    value={v1}
                    onChange={(e) => setV1(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-0.5">Xe 2 (m2):</label>
                  <input
                    type="number"
                    value={m2}
                    onChange={(e) => setM2(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-purple-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-0.5">Vận tốc v2:</label>
                  <input
                    type="number"
                    value={v2}
                    onChange={(e) => setV2(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-purple-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recorded Data & Interactive Graph Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Recorded Graph */}
        <div>
          <PhysicsChart
            title={`Đồ thị Thực nghiệm (${mode === "incline-plane" ? "Quãng đường s - t" : mode === "pendulum" ? "Góc lệch α - t" : "Li độ y - t"})`}
            xLabel="Thời gian t"
            yLabel={mode === "incline-plane" ? "Quãng đường s" : mode === "pendulum" ? "Góc lệch α" : "Vị trí"}
            xUnit="s"
            yUnit={mode === "incline-plane" ? "m" : mode === "pendulum" ? "°" : "m"}
            data={chartPoints}
            color="#06b6d4"
            height={260}
          />
        </div>

        {/* Live Data Logger Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Nhật Ký Dữ Liệu Thực Nghiệm (Data Logger)
              </h4>
              <span className="text-xs font-mono text-slate-400">{samples.length} điểm ghi</span>
            </div>

            <div className="max-h-52 overflow-y-auto font-mono text-xs text-slate-300">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Thời gian t (s)</th>
                    <th className="py-2 px-2">{mode === "incline-plane" ? "Quãng đường s (m)" : "Đại lượng 1"}</th>
                    <th className="py-2 px-2">{mode === "incline-plane" ? "Vận tốc v (m/s)" : "Đại lượng 2"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {samples.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="py-1.5 px-2 text-slate-500">#{idx + 1}</td>
                      <td className="py-1.5 px-2 text-cyan-300">{s.t.toFixed(2)}</td>
                      <td className="py-1.5 px-2 text-amber-300">{s.val1.toFixed(3)}</td>
                      <td className="py-1.5 px-2 text-emerald-300">{s.val2.toFixed(3)}</td>
                    </tr>
                  ))}
                  {samples.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        Nhấn nút &quot;Ghi mốc số liệu&quot; trong khi mô phỏng chạy để thu thập điểm đo
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-800/80">
            Chu trình: Thay đổi thông số → Quan sát → Thu thập số liệu → Rút ra quy luật bảo toàn.
          </div>
        </div>
      </div>

      {/* Guided Lab Worksheet & Practice Question */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
        <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          Câu Hỏi Thực Hành & Tư Duy Khoa Học
        </h4>
        <p className="text-xs text-slate-300">
          <strong>Câu hỏi:</strong> Trong thí nghiệm mặt phẳng nghiêng, nếu tăng góc nghiêng α mà giữ nguyên hệ số ma sát μ, gia tốc của vật sẽ thay đổi như thế nào?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            { id: 0, text: "A. Giảm vì phản lực N giảm làm tăng độ trượt" },
            { id: 1, text: "B. Tăng vì thành phần trọng lực kéo xuống P·sinα tăng và lực ma sát giảm", correct: true },
            { id: 2, text: "C. Không đổi vì khối lượng vật không đổi" },
            { id: 3, text: "D. Giảm dần về 0 khi góc vượt quá 45°" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setSelectedAnswer(opt.id);
                setQuizChecked(true);
              }}
              className={`p-3 rounded-lg text-left transition border ${
                selectedAnswer === opt.id
                  ? opt.correct
                    ? "bg-emerald-950/60 border-emerald-500 text-emerald-200"
                    : "bg-rose-950/60 border-rose-500 text-rose-200"
                  : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              {opt.text}
            </button>
          ))}
        </div>

        {quizChecked && (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-emerald-300">Giải thích chuẩn khoa học:</strong> Khi tăng góc α, sin(α) tăng (thành phần kéo trượt tăng) và cos(α) giảm (phản lực N = mg·cos(α) giảm kéo theo lực ma sát Fms = μ·N giảm). Do đó gia tốc a = g·(sin(α) - μ·cos(α)) sẽ tăng lên rõ rệt!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Canvas drawing helpers
function drawInclineScene(ctx: CanvasRenderingContext2D, w: number, h: number, angleDeg: number, mu: number, state: any) {
  const alpha = (angleDeg * Math.PI) / 180;
  const startX = 60;
  const startY = 80;
  const lengthPx = 480;

  const endX = startX + lengthPx * Math.cos(alpha);
  const endY = startY + lengthPx * Math.sin(alpha);

  // Wedge shape
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.lineTo(startX, endY);
  ctx.closePath();
  ctx.fillStyle = "rgba(30, 41, 59, 0.4)";
  ctx.fill();

  // Incline ramp
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 6;
  ctx.stroke();

  // Angle arc
  ctx.beginPath();
  ctx.arc(startX, endY, 40, -alpha, 0);
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(`${angleDeg}°`, startX + 46, endY - 10);

  // Cart position along ramp
  const sRatio = Math.min(1.0, state.s / 2.0);
  const cartDist = sRatio * (lengthPx - 40);
  const cartX = startX + cartDist * Math.cos(alpha);
  const cartY = startY + cartDist * Math.sin(alpha);

  ctx.save();
  ctx.translate(cartX, cartY);
  ctx.rotate(alpha);

  // Draw Block
  ctx.fillStyle = "#0284c7";
  ctx.fillRect(0, -22, 38, 22);

  // Force Vectors Overlay
  // Gravity P straight down
  ctx.restore();
  ctx.save();
  ctx.translate(cartX + 18, cartY - 10);

  // Vector P (Gravity)
  drawVector(ctx, 0, 0, 0, 50, "#ef4444", "P=mg");
  // Vector N (Normal)
  const nLen = 42;
  drawVector(ctx, 0, 0, -nLen * Math.sin(alpha), -nLen * Math.cos(alpha), "#10b981", "N");
  // Vector F_ms (Friction)
  const fLen = 22;
  drawVector(ctx, 0, 0, -fLen * Math.cos(alpha), -fLen * Math.sin(alpha), "#f59e0b", "Fms");

  ctx.restore();
}

function drawPendulumScene(ctx: CanvasRenderingContext2D, w: number, h: number, L_m: number, state: any, g: number, m: number) {
  const pivotX = w / 2;
  const pivotY = 50;
  const lenPx = L_m * 200;

  const bobX = pivotX + lenPx * Math.sin(state.theta);
  const bobY = pivotY + lenPx * Math.cos(state.theta);

  // Pivot mount
  ctx.fillStyle = "#64748b";
  ctx.fillRect(pivotX - 30, pivotY - 10, 60, 10);

  // String
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(bobX, bobY);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Bob
  ctx.beginPath();
  ctx.arc(bobX, bobY, 14, 0, Math.PI * 2);
  ctx.fillStyle = "#ef4444";
  ctx.fill();
  ctx.strokeStyle = "#7f1d1d";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Live Energy Bar Indicator
  const h_m = L_m * (1 - Math.cos(state.theta));
  const v_ms = Math.abs(state.omega * L_m);
  const W_t = m * g * h_m;
  const W_d = 0.5 * m * v_ms * v_ms;
  const W_tot = W_t + W_d;

  // Energy Box in corner
  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.fillRect(20, 20, 180, 80);
  ctx.strokeStyle = "#334155";
  ctx.strokeRect(20, 20, 180, 80);

  ctx.font = "bold 10px sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("BẢO TOÀN CƠ NĂNG (Joule)", 28, 36);

  // Bars
  const maxW = Math.max(0.1, W_tot * 1.2);
  drawBar(ctx, 28, 48, 120, 8, (W_d / maxW) * 120, "#10b981", `Động năng Wđ: ${W_d.toFixed(2)}J`);
  drawBar(ctx, 28, 70, 120, 8, (W_t / maxW) * 120, "#f59e0b", `Thế năng Wt: ${W_t.toFixed(2)}J`);
}

function drawSpringScene(ctx: CanvasRenderingContext2D, w: number, h: number, k: number, m: number, state: any) {
  const pivotX = w / 2;
  const pivotY = 40;
  const eqY = 180;
  const bobY = eqY + state.springY * 400;

  // Top ceiling
  ctx.fillStyle = "#64748b";
  ctx.fillRect(pivotX - 35, pivotY - 10, 70, 10);

  // Coils
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  const coils = 16;
  const len = bobY - 20 - pivotY;
  const dy = len / coils;
  for (let i = 0; i < coils; i++) {
    const cx = i % 2 === 0 ? pivotX + 12 : pivotX - 12;
    ctx.lineTo(cx, pivotY + i * dy);
  }
  ctx.lineTo(pivotX, bobY - 16);
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Mass block
  ctx.fillStyle = "#8b5cf6";
  ctx.fillRect(pivotX - 20, bobY - 16, 40, 32);
  ctx.strokeStyle = "#5b21b6";
  ctx.strokeRect(pivotX - 20, bobY - 16, 40, 32);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${m}kg`, pivotX, bobY + 4);
  ctx.textAlign = "left";
}

function drawCollisionScene(ctx: CanvasRenderingContext2D, w: number, h: number, m1: number, m2: number, state: any) {
  const trackY = 240;

  // Track
  ctx.fillStyle = "#334155";
  ctx.fillRect(20, trackY, w - 40, 8);

  // Cart 1
  ctx.fillStyle = "#0284c7";
  ctx.fillRect(state.pos1, trackY - 28, 40, 28);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 10px sans-serif";
  ctx.fillText(`m1`, state.pos1 + 12, trackY - 10);

  // Cart 2
  ctx.fillStyle = "#7c3aed";
  ctx.fillRect(state.pos2, trackY - 28, 40, 28);
  ctx.fillStyle = "#fff";
  ctx.fillText(`m2`, state.pos2 + 12, trackY - 10);

  // Live momentum HUD
  const p1 = m1 * state.vel1;
  const p2 = m2 * state.vel2;
  const p_tot = p1 + p2;

  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.fillRect(20, 20, 240, 60);
  ctx.font = "11px JetBrains Mono, monospace";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`Tổng động lượng P: ${p_tot.toFixed(2)} kg·m/s`, 28, 40);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(`p1=${p1.toFixed(2)} | p2=${p2.toFixed(2)}`, 28, 60);
}

function drawVector(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, label: string) {
  const headlen = 6;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  ctx.font = "bold 9px sans-serif";
  ctx.fillText(label, x2 + 4, y2);
}

function drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fillW: number, color: string, label: string) {
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(w, fillW)), h);
  ctx.font = "9px sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(label, x, y - 3);
}
