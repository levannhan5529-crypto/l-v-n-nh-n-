import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Battery,
  Lightbulb,
  Zap,
  ToggleLeft,
  Sliders,
  ShieldAlert,
  Flame,
  RotateCw,
  Trash2,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Info,
  CircleDot,
  Check,
  Eye,
  Activity,
  Layers,
  HelpCircle,
} from "lucide-react";
import {
  CircuitComponent,
  ComponentType,
  CircuitTerminal,
  VoltmeterState,
  AmmeterProbe,
  CircuitSolveResult,
} from "./types";
import { solveCircuit } from "./circuitSolver";
import { getPresetCircuits, CircuitPreset } from "./circuitPresets";

export const CircuitWorkbench: React.FC = () => {
  const [components, setComponents] = useState<CircuitComponent[]>(() => {
    const presets = getPresetCircuits();
    return presets[0].components;
  });
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"realistic" | "schematic">("realistic");
  const [electronFlow, setElectronFlow] = useState<boolean>(true); // Electron flow vs Conventional current
  const [solveResult, setSolveResult] = useState<CircuitSolveResult>({
    nodeVoltages: {},
    componentResults: {},
    isShortCircuit: false,
    totalPower: 0,
    activeElectronsCount: 0,
  });

  // Instruments
  const [showVoltmeter, setShowVoltmeter] = useState<boolean>(true);
  const [showAmmeter, setShowAmmeter] = useState<boolean>(true);
  const [voltmeter, setVoltmeter] = useState<VoltmeterState>({
    redProbe: { x: 480, y: 130, connectedNodeId: null },
    blackProbe: { x: 480, y: 270, connectedNodeId: null },
    voltageReading: 9.0,
  });
  const [ammeter, setAmmeter] = useState<AmmeterProbe>({
    x: 480,
    y: 200,
    currentReading: 0.6,
    activeComponentId: null,
  });

  // Dragging state
  const [draggingTarget, setDraggingTarget] = useState<{
    type: "component" | "terminal" | "redProbe" | "blackProbe" | "ammeter";
    id?: string;
    termIdx?: 0 | 1;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Wire drawing state
  const [wireStartTerminal, setWireStartTerminal] = useState<CircuitTerminal | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const electronOffsetRef = useRef<number>(0);

  // Recalculate circuit physics whenever components change
  const runSolver = useCallback(() => {
    const res = solveCircuit(components);
    setSolveResult(res);

    // Update Voltmeter reading based on probe positions
    if (showVoltmeter) {
      const redNode = findNearestNode(voltmeter.redProbe.x, voltmeter.redProbe.y, components);
      const blackNode = findNearestNode(voltmeter.blackProbe.x, voltmeter.blackProbe.y, components);
      if (redNode && blackNode) {
        const vRed = res.nodeVoltages[redNode] ?? 0;
        const vBlack = res.nodeVoltages[blackNode] ?? 0;
        setVoltmeter((prev) => ({ ...prev, voltageReading: vRed - vBlack }));
      } else {
        setVoltmeter((prev) => ({ ...prev, voltageReading: null }));
      }
    }

    // Update Ammeter reading based on probe position
    if (showAmmeter) {
      const hoveredComp = findComponentNear(ammeter.x, ammeter.y, components);
      if (hoveredComp && res.componentResults[hoveredComp.id]) {
        setAmmeter((prev) => ({
          ...prev,
          activeComponentId: hoveredComp.id,
          currentReading: res.componentResults[hoveredComp.id].current,
        }));
      } else {
        setAmmeter((prev) => ({ ...prev, activeComponentId: null, currentReading: null }));
      }
    }
  }, [components, showVoltmeter, showAmmeter, voltmeter.redProbe, voltmeter.blackProbe, ammeter.x, ammeter.y]);

  useEffect(() => {
    runSolver();
  }, [runSolver]);

  // Main Canvas Render Loop
  useEffect(() => {
    let animId: number;
    const renderLoop = () => {
      electronOffsetRef.current = (electronOffsetRef.current + 1.2) % 40;
      drawWorkbench();
      animId = requestAnimationFrame(renderLoop);
    };
    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  });

  // ==================== CANVAS RENDERING ====================
  const drawWorkbench = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Blueprint Worktable Background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, w, h);

    // Grid dots
    ctx.fillStyle = "rgba(51, 65, 85, 0.4)";
    const dotSpacing = 24;
    for (let x = 12; x < w; x += dotSpacing) {
      for (let y = 12; y < h; y += dotSpacing) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // 2. Draw Components and Connections
    components.forEach((c) => {
      const isSelected = selectedCompId === c.id;
      const cRes = solveResult.componentResults[c.id];
      const current = cRes ? cRes.current : 0;
      drawComponent(ctx, c, isSelected, current, viewMode, electronOffsetRef.current, electronFlow);
    });

    // 3. Draw In-Progress Wire being dragged
    if (wireStartTerminal) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(wireStartTerminal.x, wireStartTerminal.y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Start circle
      ctx.beginPath();
      ctx.arc(wireStartTerminal.x, wireStartTerminal.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8";
      ctx.fill();
    }

    // 4. Short Circuit Danger Fire / Spark Effect
    if (solveResult.isShortCircuit) {
      const bats = components.filter((c) => c.type === "battery");
      bats.forEach((bat) => {
        drawSparks(ctx, bat.x, bat.y);
      });
    }

    // 5. Draw Instruments on Top
    if (showVoltmeter) {
      drawVoltmeter(ctx, voltmeter);
    }
    if (showAmmeter) {
      drawAmmeter(ctx, ammeter);
    }
  };

  // ==================== INTERACTION HANDLERS ====================
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check Voltmeter Probes first
    if (showVoltmeter) {
      if (Math.hypot(x - voltmeter.redProbe.x, y - voltmeter.redProbe.y) < 22) {
        setDraggingTarget({ type: "redProbe", offsetX: x - voltmeter.redProbe.x, offsetY: y - voltmeter.redProbe.y });
        return;
      }
      if (Math.hypot(x - voltmeter.blackProbe.x, y - voltmeter.blackProbe.y) < 22) {
        setDraggingTarget({
          type: "blackProbe",
          offsetX: x - voltmeter.blackProbe.x,
          offsetY: y - voltmeter.blackProbe.y,
        });
        return;
      }
    }

    // Check Ammeter Probe
    if (showAmmeter && Math.hypot(x - ammeter.x, y - ammeter.y) < 28) {
      setDraggingTarget({ type: "ammeter", offsetX: x - ammeter.x, offsetY: y - ammeter.y });
      return;
    }

    // Check Terminals (for wire connection or re-orientation)
    for (const c of components) {
      for (const term of c.terminals) {
        if (Math.hypot(x - term.x, y - term.y) < 16) {
          if (e.shiftKey || wireStartTerminal) {
            // Finish wire
            if (wireStartTerminal && wireStartTerminal.id !== term.id) {
              createWireBetween(wireStartTerminal, term);
              setWireStartTerminal(null);
              return;
            }
          } else {
            // Start pulling a wire from this terminal
            setWireStartTerminal(term);
            return;
          }
        }
      }
    }

    // Check Component bodies
    for (const c of components) {
      const dist = Math.hypot(x - c.x, y - c.y);
      if (dist < 36) {
        setSelectedCompId(c.id);

        // Quick click on switch toggles it!
        if (c.type === "switch") {
          setComponents((prev) =>
            prev.map((item) => (item.id === c.id ? { ...item, state: !item.state } : item))
          );
          return;
        }

        // Quick click on blown fuse resets it!
        if (c.type === "fuse" && !c.state) {
          setComponents((prev) =>
            prev.map((item) => (item.id === c.id ? { ...item, state: true } : item))
          );
          return;
        }

        setDraggingTarget({ type: "component", id: c.id, offsetX: x - c.x, offsetY: y - c.y });
        return;
      }
    }

    // Clicked empty area
    setSelectedCompId(null);
    setWireStartTerminal(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setMousePos({ x, y });

    if (!draggingTarget) return;

    if (draggingTarget.type === "redProbe") {
      setVoltmeter((prev) => ({
        ...prev,
        redProbe: { ...prev.redProbe, x: Math.round(x), y: Math.round(y) },
      }));
    } else if (draggingTarget.type === "blackProbe") {
      setVoltmeter((prev) => ({
        ...prev,
        blackProbe: { ...prev.blackProbe, x: Math.round(x), y: Math.round(y) },
      }));
    } else if (draggingTarget.type === "ammeter") {
      setAmmeter((prev) => ({
        ...prev,
        x: Math.round(x),
        y: Math.round(y),
      }));
    } else if (draggingTarget.type === "component" && draggingTarget.id) {
      const newX = Math.round(x - draggingTarget.offsetX);
      const newY = Math.round(y - draggingTarget.offsetY);
      setComponents((prev) =>
        prev.map((c) => {
          if (c.id !== draggingTarget.id) return c;
          const dx = newX - c.x;
          const dy = newY - c.y;
          return {
            ...c,
            x: newX,
            y: newY,
            terminals: [
              { ...c.terminals[0], x: c.terminals[0].x + dx, y: c.terminals[0].y + dy },
              { ...c.terminals[1], x: c.terminals[1].x + dx, y: c.terminals[1].y + dy },
            ],
          };
        })
      );
    }
  };

  const handleMouseUp = () => {
    setDraggingTarget(null);
  };

  // Helper to connect 2 terminals with a wire
  const createWireBetween = (t1: CircuitTerminal, t2: CircuitTerminal) => {
    const wireId = `wire-${Date.now()}`;
    const midX = (t1.x + t2.x) / 2;
    const midY = (t1.y + t2.y) / 2;
    const newWire: CircuitComponent = {
      id: wireId,
      type: "wire",
      x: midX,
      y: midY,
      rotation: 0,
      terminals: [
        { id: `${wireId}-t0`, componentId: wireId, terminalIndex: 0, x: t1.x, y: t1.y, nodeId: t1.nodeId },
        { id: `${wireId}-t1`, componentId: wireId, terminalIndex: 1, x: t2.x, y: t2.y, nodeId: t2.nodeId },
      ],
      value: 0,
      label: "Dây nối",
      current: 0,
      voltageDrop: 0,
      power: 0,
    };
    setComponents((prev) => [...prev, newWire]);
  };

  // Add new component from palette onto workbench
  const addComponent = (type: ComponentType) => {
    const id = `${type}-${Date.now()}`;
    const cx = 320;
    const cy = 200;
    const span = 40;

    let value = 10;
    let label = "";
    let state = true;

    switch (type) {
      case "battery":
        value = 9;
        label = "Pin 9V";
        break;
      case "resistor":
        value = 20;
        label = "Điện trở 20Ω";
        break;
      case "bulb":
        value = 15;
        label = "Bóng đèn 15Ω";
        break;
      case "switch":
        value = 0;
        state = true;
        label = "Khóa K (Đóng)";
        break;
      case "potentiometer":
        value = 25;
        label = "Biến trở 25Ω";
        break;
      case "fuse":
        value = 2.0;
        state = true;
        label = "Cầu chì 2.0A";
        break;
      case "capacitor":
        value = 100;
        label = "Tụ điện 100μF";
        break;
      case "coin":
        value = 0.01;
        label = "Đồng xu dẫn điện";
        break;
      case "eraser":
        value = 1e8;
        label = "Cục tẩy cách điện";
        break;
      case "wire":
        value = 0;
        label = "Dây nối";
        break;
    }

    const newComp: CircuitComponent = {
      id,
      type,
      x: cx,
      y: cy,
      rotation: 0,
      terminals: [
        { id: `${id}-t0`, componentId: id, terminalIndex: 0, x: cx - span, y: cy, nodeId: `${id}-n0` },
        { id: `${id}-t1`, componentId: id, terminalIndex: 1, x: cx + span, y: cy, nodeId: `${id}-n1` },
      ],
      value,
      state,
      label,
      current: 0,
      voltageDrop: 0,
      power: 0,
    };

    setComponents((prev) => [...prev, newComp]);
    setSelectedCompId(id);
  };

  // Rotate selected component by 90 degrees
  const rotateSelectedComponent = () => {
    if (!selectedCompId) return;
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCompId) return c;
        const newRot = (c.rotation + 90) % 360;
        // recalculate terminals around center (c.x, c.y)
        const rad = (90 * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const t0_dx = c.terminals[0].x - c.x;
        const t0_dy = c.terminals[0].y - c.y;
        const t1_dx = c.terminals[1].x - c.x;
        const t1_dy = c.terminals[1].y - c.y;

        const newT0X = Math.round(c.x + (t0_dx * cos - t0_dy * sin));
        const newT0Y = Math.round(c.y + (t0_dx * sin + t0_dy * cos));
        const newT1X = Math.round(c.x + (t1_dx * cos - t1_dy * sin));
        const newT1Y = Math.round(c.y + (t1_dx * sin + t1_dy * cos));

        return {
          ...c,
          rotation: newRot,
          terminals: [
            { ...c.terminals[0], x: newT0X, y: newT0Y },
            { ...c.terminals[1], x: newT1X, y: newT1Y },
          ],
        };
      })
    );
  };

  // Delete selected component
  const deleteSelectedComponent = () => {
    if (!selectedCompId) return;
    setComponents((prev) => prev.filter((c) => c.id !== selectedCompId));
    setSelectedCompId(null);
  };

  // Clear all components
  const clearWorkbench = () => {
    if (window.confirm("Bạn có chắc muốn xóa toàn bộ mạch điện để lắp ráp lại từ đầu?")) {
      setComponents([]);
      setSelectedCompId(null);
    }
  };

  // Load a preset circuit
  const loadPreset = (preset: CircuitPreset) => {
    setComponents(preset.components);
    setSelectedCompId(null);
  };

  const selectedComponent = components.find((c) => c.id === selectedCompId);

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Ribbons */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-slate-100">
                Phòng Lắp Ráp Mạch Điện Tự Do
              </h3>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-800 font-mono">
                MNA Solver • Động lực học Electron
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Kéo thả linh kiện, nối dây giữa các cực, sử dụng Vôn-kế & Ampe-kế di động đo đạc chính xác theo định luật Ohm & Kirchhoff.
            </p>
          </div>
        </div>

        {/* View Mode & Instrument Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Realistic vs Schematic */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setViewMode("realistic")}
              className={`px-2.5 py-1 rounded transition ${
                viewMode === "realistic" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Hình ảnh thực tế
            </button>
            <button
              onClick={() => setViewMode("schematic")}
              className={`px-2.5 py-1 rounded transition ${
                viewMode === "schematic" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sơ đồ mạch chuẩn
            </button>
          </div>

          {/* Toggle Electron Flow */}
          <button
            onClick={() => setElectronFlow(!electronFlow)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              electronFlow
                ? "bg-indigo-950 text-indigo-300 border-indigo-700"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
            title="Hiển thị chiều chuyển động của electron hoặc chiều dòng điện quy ước"
          >
            {electronFlow ? "Hạt Electron (e⁻)" : "Dòng quy ước (+ → −)"}
          </button>

          {/* Instruments */}
          <button
            onClick={() => setShowVoltmeter(!showVoltmeter)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
              showVoltmeter
                ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
            }`}
          >
            <span>Vôn-kế que đo</span>
          </button>
          <button
            onClick={() => setShowAmmeter(!showAmmeter)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
              showAmmeter
                ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
            }`}
          >
            <span>Ampe-kế cảm biến</span>
          </button>
        </div>
      </div>

      {/* Preset Circuits Quick Picker */}
      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-4xl">
          <span className="text-xs font-bold text-slate-300 whitespace-nowrap">Mạch mẫu sẵn có:</span>
          {getPresetCircuits().map((p) => (
            <button
              key={p.id}
              onClick={() => loadPreset(p)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 whitespace-nowrap transition"
            >
              {p.name}
            </button>
          ))}
        </div>

        <button
          onClick={clearWorkbench}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-800 hover:bg-rose-900 transition flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Làm sạch bàn</span>
        </button>
      </div>

      {/* Main Workspace Layout: Left Toolbar + Canvas + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Component Toolbox Palette (Thu nhỏ gọn gàng) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-2 shadow-lg space-y-1.5">
          <h4 className="text-[11px] font-bold text-slate-300 border-b border-slate-800 pb-1 flex items-center gap-1.5">
            <Plus className="w-3 h-3 text-cyan-400" />
            Hộp Linh Kiện
          </h4>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1 text-[11px]">
            <button
              onClick={() => addComponent("battery")}
              className="flex items-center gap-1.5 py-1 px-1.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-amber-300 transition"
            >
              <Battery className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Nguồn Pin</span>
            </button>

            <button
              onClick={() => addComponent("bulb")}
              className="flex items-center gap-1.5 py-1 px-1.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-yellow-300 transition"
            >
              <Lightbulb className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span>Bóng đèn</span>
            </button>

            <button
              onClick={() => addComponent("resistor")}
              className="flex items-center gap-1.5 py-1 px-1.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-cyan-300 transition"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Điện trở</span>
            </button>

            <button
              onClick={() => addComponent("switch")}
              className="flex items-center gap-1.5 py-1 px-1.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-emerald-300 transition"
            >
              <ToggleLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Khóa K</span>
            </button>

            <button
              onClick={() => addComponent("potentiometer")}
              className="flex items-center gap-1.5 py-1 px-1.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-purple-300 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Biến trở</span>
            </button>

            <button
              onClick={() => addComponent("fuse")}
              className="flex items-center gap-1.5 py-1 px-1.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-rose-300 transition"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Cầu chì</span>
            </button>

            <button
              onClick={() => addComponent("capacitor")}
              className="flex items-center gap-1.5 py-1 px-1.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-blue-300 transition"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Tụ điện</span>
            </button>

            <button
              onClick={() => addComponent("coin")}
              className="flex items-center gap-1.5 py-1 px-1.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-amber-200 transition"
            >
              <CircleDot className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Đồng xu</span>
            </button>

            <button
              onClick={() => addComponent("eraser")}
              className="flex items-center gap-1.5 py-1 px-1.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-slate-400 transition"
            >
              <span className="w-3.5 h-3.5 rounded bg-rose-400/80 inline-block shrink-0" />
              <span>Cục tẩy</span>
            </button>

            <button
              onClick={() => addComponent("wire")}
              className="flex items-center gap-1.5 py-1 px-1.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-slate-300 transition"
            >
              <span className="w-3.5 h-1 bg-cyan-400 inline-block shrink-0" />
              <span>Dây nối</span>
            </button>
          </div>

          <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 leading-tight">
            <p>💡 Kéo chấm tròn để nối dây; nhấp Khóa K để bật/tắt.</p>
          </div>
        </div>

        {/* Central Interactive Workbench Canvas (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-2">
          {/* Warning Banner if Short Circuit */}
          {solveResult.isShortCircuit && (
            <div className="bg-rose-950/90 border-2 border-rose-500 text-rose-100 p-3 rounded-xl flex items-center justify-between gap-3 animate-pulse shadow-lg">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-400 animate-bounce" />
                <span className="font-bold text-xs">
                  CẢNH BÁO ĐOẢN MẠCH (Short Circuit)! Cực dương và cực âm của pin bị nối tắt không có điện trở cản. Dòng điện tăng vọt gây nguy hiểm!
                </span>
              </div>
            </div>
          )}

          <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={640}
              height={400}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="w-full h-full object-contain cursor-crosshair select-none"
            />

            {/* Quick Helper Overlay Bottom Right */}
            <div className="absolute bottom-2 right-2 bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1 text-[11px] text-slate-400 pointer-events-none backdrop-blur font-mono">
              Công suất toàn mạch: <span className="text-amber-400 font-bold">{solveResult.totalPower.toFixed(2)}W</span>
            </div>
          </div>

          {/* Component Parameter Inspector Banner */}
          {selectedComponent && (
            <div className="bg-slate-900/95 border border-cyan-500/40 rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-200">{selectedComponent.label}</span>

                {/* Adjustable Value Slider (Voltage or Resistance) */}
                {selectedComponent.type === "battery" && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Hiệu điện thế:</span>
                    <input
                      type="range"
                      min={1}
                      max={36}
                      step={0.5}
                      value={selectedComponent.value}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setComponents((prev) =>
                          prev.map((c) =>
                            c.id === selectedComponent.id
                              ? { ...c, value: val, label: `Pin ${val}V` }
                              : c
                          )
                        );
                      }}
                      className="accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer w-32"
                    />
                    <span className="font-mono text-amber-400 font-bold">{selectedComponent.value} V</span>
                  </div>
                )}

                {(selectedComponent.type === "resistor" ||
                  selectedComponent.type === "bulb" ||
                  selectedComponent.type === "potentiometer") && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Điện trở R:</span>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      step={1}
                      value={selectedComponent.value}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setComponents((prev) =>
                          prev.map((c) =>
                            c.id === selectedComponent.id
                              ? { ...c, value: val, label: `${c.label.split("(")[0].trim()} (${val}Ω)` }
                              : c
                          )
                        );
                      }}
                      className="accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer w-32"
                    />
                    <span className="font-mono text-cyan-400 font-bold">{selectedComponent.value} Ω</span>
                  </div>
                )}

                {selectedComponent.type === "fuse" && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Giới hạn dòng I_max:</span>
                    <input
                      type="range"
                      min={0.5}
                      max={5}
                      step={0.5}
                      value={selectedComponent.value}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setComponents((prev) =>
                          prev.map((c) =>
                            c.id === selectedComponent.id
                              ? { ...c, value: val, label: `Cầu chì (${val}A)` }
                              : c
                          )
                        );
                      }}
                      className="accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer w-28"
                    />
                    <span className="font-mono text-rose-400 font-bold">{selectedComponent.value} A</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={rotateSelectedComponent}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition"
                  title="Xoay 90 độ"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Xoay 90°</span>
                </button>

                <button
                  onClick={deleteSelectedComponent}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 flex items-center gap-1 transition"
                  title="Xóa linh kiện này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Info & Live Physics Telemetry (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl space-y-3 text-xs">
          <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Đo Đạc Thời Gian Thực
          </h4>

          {/* DMM HUD */}
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono space-y-1">
            <div className="text-amber-400 font-bold text-[11px]">VÔN-KẾ QUE ĐO:</div>
            <div className="text-sm font-black text-amber-300">
              {voltmeter.voltageReading !== null ? `${voltmeter.voltageReading.toFixed(2)} V` : "Hở que (O.L)"}
            </div>
            <p className="text-[10px] text-slate-500">Kéo que Đỏ (+) và que Đen (-) tới 2 điểm cần đo hiệu điện thế.</p>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono space-y-1">
            <div className="text-emerald-400 font-bold text-[11px]">AMPE-KẾ CẢM BIẾN:</div>
            <div className="text-sm font-black text-emerald-300">
              {ammeter.currentReading !== null ? `${ammeter.currentReading.toFixed(3)} A` : "Chưa kẹp nhánh"}
            </div>
            <p className="text-[10px] text-slate-500">Kéo vòng tròn ampe kế xanh lá đặt lên linh kiện hoặc dây dẫn.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== RENDERING SUB-FUNCTIONS ====================

function drawComponent(
  ctx: CanvasRenderingContext2D,
  c: CircuitComponent,
  isSelected: boolean,
  current: number,
  viewMode: "realistic" | "schematic",
  animOffset: number,
  electronFlow: boolean
) {
  const { x, y, rotation, terminals, type, value, state, isBlown } = c;
  const t0 = terminals[0];
  const t1 = terminals[1];

  ctx.save();

  // Selection highlight box
  if (isSelected) {
    ctx.strokeStyle = "rgba(6, 182, 212, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    const boxW = Math.abs(t1.x - t0.x) + 30;
    const boxH = Math.abs(t1.y - t0.y) + 30;
    ctx.strokeRect(x - boxW / 2, y - boxH / 2, boxW, boxH);
    ctx.setLineDash([]);
  }

  // Draw wire or component body
  if (type === "wire") {
    // Draw copper / insulated wire
    ctx.strokeStyle = viewMode === "realistic" ? "#38bdf8" : "#94a3b8";
    ctx.lineWidth = viewMode === "realistic" ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.stroke();
  } else {
    // Leads connecting terminals to body
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(x, y);
    ctx.lineTo(t1.x, t1.y);
    ctx.stroke();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rotation * Math.PI) / 180);

    if (viewMode === "realistic") {
      drawRealisticComponent(ctx, type, value, state, isBlown, current);
    } else {
      drawSchematicComponent(ctx, type, value, state, isBlown);
    }

    ctx.restore();
  }

  // Draw Animated Electrons flowing through the component if current > 0.005A
  if (current > 0.005) {
    ctx.fillStyle = electronFlow ? "#38bdf8" : "#f59e0b";
    const dx = t1.x - t0.x;
    const dy = t1.y - t0.y;
    const len = Math.hypot(dx, dy);
    const count = Math.max(2, Math.floor(len / 22));

    for (let i = 0; i < count; i++) {
      const p = ((i * (len / count) + animOffset * (current * 2 + 0.5)) % len) / len;
      const ex = t0.x + p * dx;
      const ey = t0.y + p * dy;

      ctx.beginPath();
      ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw Terminals (Connection nodes at ends)
  drawTerminal(ctx, t0.x, t0.y);
  drawTerminal(ctx, t1.x, t1.y);

  ctx.restore();
}

function drawTerminal(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#f59e0b";
  ctx.fill();
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawRealisticComponent(
  ctx: CanvasRenderingContext2D,
  type: ComponentType,
  value: number,
  state?: boolean,
  isBlown?: boolean,
  current: number = 0
) {
  if (type === "battery") {
    // Realistic AA or D-Cell Battery Cylinder
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-28, -14, 56, 28);
    // Positive terminal cap (+)
    ctx.fillStyle = "#d97706";
    ctx.fillRect(28, -6, 6, 12);
    // Negative flat (-)
    ctx.fillStyle = "#475569";
    ctx.fillRect(-30, -10, 3, 20);

    // Battery label
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#fef08a";
    ctx.fillText(`${value}V`, -12, 3);
  } else if (type === "resistor") {
    // Resistor ceramic body with color bands
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.roundRect(-24, -10, 48, 20, 4);
    ctx.fill();
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Color bands (Brown, Black, Red, Gold for approx)
    const bandColors = ["#78350f", "#000000", "#dc2626", "#eab308"];
    bandColors.forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.fillRect(-16 + idx * 8, -10, 4, 20);
    });
  } else if (type === "bulb") {
    // Light bulb base
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(-8, -6, 16, 12);

    // Glass bulb dome
    const power = current * current * value;
    const brightness = Math.min(1, power / 15);

    // Glowing halo if powered
    if (current > 0.05 && !isBlown) {
      const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, 40 * brightness + 15);
      grad.addColorStop(0, `rgba(254, 240, 138, ${0.8 * brightness + 0.2})`);
      grad.addColorStop(1, "rgba(250, 204, 21, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 40 * brightness + 15, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fillStyle = current > 0.05 && !isBlown ? "#fef08a" : "rgba(255, 255, 255, 0.2)";
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tungsten Filament
    ctx.strokeStyle = current > 0.05 && !isBlown ? "#ea580c" : "#64748b";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(0, -6);
    ctx.lineTo(5, 0);
    ctx.stroke();
  } else if (type === "switch") {
    // Switch terminals
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(-18, 0, 4, 0, Math.PI * 2);
    ctx.arc(18, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Knife blade
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    if (state) {
      ctx.lineTo(18, 0); // Closed
    } else {
      ctx.lineTo(14, -18); // Open
    }
    ctx.stroke();
  } else if (type === "potentiometer") {
    // Rheostat cylinder with sliding contact
    ctx.fillStyle = "#334155";
    ctx.fillRect(-22, -8, 44, 16);
    ctx.fillStyle = "#a855f7";
    ctx.fillRect(-4, -12, 8, 24); // Slider
  } else if (type === "fuse") {
    // Glass cylinder fuse
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(-20, -7, 40, 14);
    ctx.strokeStyle = "#94a3b8";
    ctx.strokeRect(-20, -7, 40, 14);

    // Internal wire
    if (state && !isBlown) {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();
    } else {
      // Blown melted gap
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === "capacitor") {
    // Two parallel plates
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, -14);
    ctx.lineTo(-6, 14);
    ctx.moveTo(6, -14);
    ctx.lineTo(6, 14);
    ctx.stroke();
  } else if (type === "coin") {
    // Copper coin
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#b45309";
    ctx.fill();
    ctx.strokeStyle = "#78350f";
    ctx.stroke();
  } else if (type === "eraser") {
    // Pink rubber eraser
    ctx.fillStyle = "#fb7185";
    ctx.fillRect(-18, -10, 36, 20);
    ctx.strokeStyle = "#e11d48";
    ctx.strokeRect(-18, -10, 36, 20);
  }
}

function drawSchematicComponent(
  ctx: CanvasRenderingContext2D,
  type: ComponentType,
  value: number,
  state?: boolean,
  isBlown?: boolean
) {
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;

  if (type === "battery") {
    // Standard IEC Battery: Long thin plate (+), short thick plate (-)
    ctx.beginPath();
    ctx.moveTo(-6, -12);
    ctx.lineTo(-6, 12);
    ctx.moveTo(6, -6);
    ctx.lineTo(6, 6);
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(6, -6);
    ctx.lineTo(6, 6);
    ctx.stroke();
  } else if (type === "resistor") {
    // IEC rectangle
    ctx.strokeRect(-18, -8, 36, 16);
  } else if (type === "bulb") {
    // Circle with X inside
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(8, 8);
    ctx.moveTo(8, -8);
    ctx.lineTo(-8, 8);
    ctx.stroke();
  } else if (type === "switch") {
    ctx.beginPath();
    ctx.arc(-14, 0, 3, 0, Math.PI * 2);
    ctx.arc(14, 0, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(state ? 14 : 10, state ? 0 : -14);
    ctx.stroke();
  } else if (type === "fuse") {
    ctx.strokeRect(-16, -6, 32, 12);
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
  } else if (type === "capacitor") {
    ctx.beginPath();
    ctx.moveTo(-5, -12);
    ctx.lineTo(-5, 12);
    ctx.moveTo(5, -12);
    ctx.lineTo(5, 12);
    ctx.stroke();
  } else {
    ctx.strokeRect(-14, -8, 28, 16);
  }
}

function drawVoltmeter(ctx: CanvasRenderingContext2D, vm: VoltmeterState) {
  // Multimeter Display Unit placed at top center (fixed)
  const bodyX = 40;
  const bodyY = 30;
  const bodyW = 140;
  const bodyH = 75;

  ctx.fillStyle = "#eab308";
  ctx.beginPath();
  ctx.roundRect(bodyX, bodyY, bodyW, bodyH, 8);
  ctx.fill();
  ctx.strokeStyle = "#ca8a04";
  ctx.lineWidth = 2;
  ctx.stroke();

  // LCD Screen
  ctx.fillStyle = "#022c22";
  ctx.fillRect(bodyX + 12, bodyY + 14, bodyW - 24, 30);
  ctx.strokeStyle = "#047857";
  ctx.strokeRect(bodyX + 12, bodyY + 14, bodyW - 24, 30);

  ctx.font = "bold 15px JetBrains Mono, monospace";
  ctx.fillStyle = "#34d399";
  ctx.textAlign = "right";
  ctx.fillText(
    vm.voltageReading !== null ? `${vm.voltageReading >= 0 ? "+" : ""}${vm.voltageReading.toFixed(2)} V` : "O.L  V",
    bodyX + bodyW - 18,
    bodyY + 35
  );
  ctx.textAlign = "left";

  // Voltmeter Label
  ctx.font = "bold 9px sans-serif";
  ctx.fillStyle = "#713f12";
  ctx.fillText("VÔN-KẾ ĐIỆN TỬ DC", bodyX + 14, bodyY + 60);

  // Flexible Leads from Voltmeter body to Probes
  // Red Lead (+)
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bodyX + 40, bodyY + bodyH);
  ctx.bezierCurveTo(bodyX + 40, bodyY + bodyH + 40, vm.redProbe.x - 20, vm.redProbe.y - 40, vm.redProbe.x, vm.redProbe.y);
  ctx.stroke();

  // Black Lead (-)
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bodyX + bodyW - 40, bodyY + bodyH);
  ctx.bezierCurveTo(
    bodyX + bodyW - 40,
    bodyY + bodyH + 40,
    vm.blackProbe.x - 20,
    vm.blackProbe.y - 40,
    vm.blackProbe.x,
    vm.blackProbe.y
  );
  ctx.stroke();

  // Draw Red Probe Needle
  drawProbeNeedle(ctx, vm.redProbe.x, vm.redProbe.y, "#ef4444", "+");

  // Draw Black Probe Needle
  drawProbeNeedle(ctx, vm.blackProbe.x, vm.blackProbe.y, "#1e293b", "−");
}

function drawProbeNeedle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, sign: string) {
  ctx.save();
  // Probe handle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - 6, y - 24, 12, 24, 3);
  ctx.fill();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Metal tip
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(x - 2, y);
  ctx.lineTo(x, y + 6);
  ctx.lineTo(x + 2, y);
  ctx.closePath();
  ctx.fill();

  // Sign (+ / -)
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(sign, x, y - 10);
  ctx.restore();
}

function drawAmmeter(ctx: CanvasRenderingContext2D, am: AmmeterProbe) {
  const { x, y, currentReading } = am;

  // Sensor clamp / crosshair circle
  ctx.save();
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([4, 2]);
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Crosshair center
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x + 8, y);
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x, y + 8);
  ctx.strokeStyle = "#34d399";
  ctx.stroke();

  // Digital Badge
  ctx.fillStyle = "rgba(6, 78, 59, 0.95)";
  ctx.beginPath();
  ctx.roundRect(x + 14, y - 18, 72, 26, 4);
  ctx.fill();
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "bold 11px JetBrains Mono, monospace";
  ctx.fillStyle = "#6ee7b7";
  ctx.fillText(currentReading !== null ? `${currentReading.toFixed(3)}A` : "0.000A", x + 18, y - 1);
  ctx.restore();
}

function drawSparks(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const len = Math.random() * 25 + 5;
    ctx.strokeStyle = Math.random() > 0.5 ? "#f97316" : "#facc15";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.restore();
}

// Helper: find nearest node within snap radius
function findNearestNode(x: number, y: number, components: CircuitComponent[]): string | null {
  for (const c of components) {
    for (const term of c.terminals) {
      if (Math.hypot(x - term.x, y - term.y) < 28) {
        return term.nodeId;
      }
    }
  }
  return null;
}

// Helper: find component near point
function findComponentNear(x: number, y: number, components: CircuitComponent[]): CircuitComponent | null {
  for (const c of components) {
    if (Math.hypot(x - c.x, y - c.y) < 32) {
      return c;
    }
  }
  return null;
}
