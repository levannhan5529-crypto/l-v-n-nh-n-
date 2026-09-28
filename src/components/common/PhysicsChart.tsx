import React, { useState, useMemo } from "react";
import { Download, Eye, Sparkles } from "lucide-react";

export interface ChartDataPoint {
  x: number; // e.g. time t (s)
  y: number; // measured y (m or m/s)
  yFiltered?: number;
  yFit?: number;
  label?: string;
  frameIndex?: number;
}

interface PhysicsChartProps {
  title: string;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  data: ChartDataPoint[];
  fitEquation?: string;
  rSquared?: number;
  showFitLine?: boolean;
  highlightIndex?: number;
  onPointHover?: (index: number | null) => void;
  color?: string;
  height?: number;
}

export const PhysicsChart: React.FC<PhysicsChartProps> = ({
  title,
  xLabel,
  yLabel,
  xUnit,
  yUnit,
  data,
  fitEquation,
  rSquared,
  showFitLine = true,
  highlightIndex,
  onPointHover,
  color = "#38bdf8",
  height = 320,
}) => {
  const [showRaw, setShowRaw] = useState(true);
  const [showFiltered, setShowFiltered] = useState(true);
  const [showFit, setShowFit] = useState(showFitLine);
  const [hoveredPoint, setHoveredPoint] = useState<{ point: ChartDataPoint; index: number; clientX: number; clientY: number } | null>(null);

  // Margins and dimensions
  const padding = { top: 32, right: 32, bottom: 44, left: 60 };
  const width = 640; // logical SVG units

  const { minX, maxX, minY, maxY } = useMemo(() => {
    if (data.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    const xs = data.map((d) => d.x);
    const ys = data.flatMap((d) => [d.y, d.yFiltered ?? d.y, d.yFit ?? d.y]);
    const minXVal = Math.min(...xs);
    const maxXVal = Math.max(...xs);
    const minYVal = Math.min(...ys);
    const maxYVal = Math.max(...ys);

    // Add 10% breathing room
    const spanY = Math.max(0.01, maxYVal - minYVal);
    return {
      minX: minXVal,
      maxX: maxXVal === minXVal ? minXVal + 1 : maxXVal,
      minY: Math.min(0, minYVal - spanY * 0.05),
      maxY: maxYVal + spanY * 0.1,
    };
  }, [data]);

  // Coordinate scales
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const scaleX = (val: number) => padding.left + ((val - minX) / (maxX - minX)) * innerWidth;
  const scaleY = (val: number) => padding.top + innerHeight - ((val - minY) / (maxY - minY)) * innerHeight;

  // Grid tick generators
  const xTicks = useMemo(() => {
    const count = 6;
    const ticks: number[] = [];
    const step = (maxX - minX) / count;
    for (let i = 0; i <= count; i++) {
      ticks.push(minX + i * step);
    }
    return ticks;
  }, [minX, maxX]);

  const yTicks = useMemo(() => {
    const count = 5;
    const ticks: number[] = [];
    const step = (maxY - minY) / count;
    for (let i = 0; i <= count; i++) {
      ticks.push(minY + i * step);
    }
    return ticks;
  }, [minY, maxY]);

  // Curve paths
  const filteredPath = useMemo(() => {
    if (data.length < 2) return "";
    return data.reduce((acc, pt, i) => {
      const yVal = pt.yFiltered !== undefined ? pt.yFiltered : pt.y;
      const x = scaleX(pt.x);
      const y = scaleY(yVal);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
  }, [data, minX, maxX, minY, maxY]);

  const fitPath = useMemo(() => {
    const fitPoints = data.filter((d) => d.yFit !== undefined);
    if (fitPoints.length < 2) return "";
    return fitPoints.reduce((acc, pt, i) => {
      const x = scaleX(pt.x);
      const y = scaleY(pt.yFit!);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
  }, [data, minX, maxX, minY, maxY]);

  // Export CSV
  const handleExportCSV = () => {
    if (data.length === 0) return;
    const headers = [`${xLabel}_(${xUnit})`, `${yLabel}_Thực_nghiệm_(${yUnit})`, `Lọc_nhiễu_(${yUnit})`, `Khớp_mô_hình_(${yUnit})`];
    const rows = data.map((d) => [
      d.x.toFixed(4),
      d.y.toFixed(4),
      (d.yFiltered ?? d.y).toFixed(4),
      (d.yFit ?? d.y).toFixed(4),
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PHY_AI_LAB_${title.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg flex flex-col justify-between">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {title}
          </h4>
          {fitEquation && (
            <p className="text-xs text-amber-400 font-mono mt-0.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Hồi quy: {fitEquation}</span>
              {rSquared !== undefined && (
                <span className="text-slate-400 font-sans text-[11px] bg-slate-800 px-1.5 py-0.5 rounded">
                  R² = {rSquared.toFixed(4)}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {/* Series toggles */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-1 text-[11px] font-medium border border-slate-700/60">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className={`px-2 py-0.5 rounded transition ${
                showRaw ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Điểm đo thực nghiệm"
            >
              Thực nghiệm
            </button>
            <button
              onClick={() => setShowFiltered(!showFiltered)}
              className={`px-2 py-0.5 rounded transition ${
                showFiltered ? "bg-blue-500/20 text-blue-300 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Dữ liệu sau lọc nhiễu"
            >
              Lọc nhiễu
            </button>
            {fitEquation && (
              <button
                onClick={() => setShowFit(!showFit)}
                className={`px-2 py-0.5 rounded transition ${
                  showFit ? "bg-amber-500/20 text-amber-300 font-semibold" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Đường hồi quy vật lí"
              >
                Hồi quy
              </button>
            )}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
            title="Xuất tệp CSV"
          >
            <Download className="w-3 h-3" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          style={{ minHeight: height }}
        >
          {/* Background Grid */}
          <g className="grid opacity-25">
            {xTicks.map((xVal, i) => {
              const xPos = scaleX(xVal);
              return (
                <line
                  key={`gx-${i}`}
                  x1={xPos}
                  y1={padding.top}
                  x2={xPos}
                  y2={height - padding.bottom}
                  stroke="#475569"
                  strokeDasharray="3,3"
                />
              );
            })}
            {yTicks.map((yVal, i) => {
              const yPos = scaleY(yVal);
              return (
                <line
                  key={`gy-${i}`}
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke="#475569"
                  strokeDasharray="3,3"
                />
              );
            })}
          </g>

          {/* Axes */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right + 10}
            y2={height - padding.bottom}
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={padding.left}
            y2={padding.top - 10}
            stroke="#94a3b8"
            strokeWidth="1.5"
          />

          {/* Axis Labels */}
          <text
            x={width - padding.right}
            y={height - padding.bottom + 26}
            textAnchor="end"
            fill="#94a3b8"
            fontSize="11"
            fontFamily="JetBrains Mono, monospace"
          >
            {xLabel} ({xUnit}) →
          </text>
          <text
            x={padding.left - 8}
            y={padding.top - 12}
            textAnchor="start"
            fill="#94a3b8"
            fontSize="11"
            fontFamily="JetBrains Mono, monospace"
          >
            ↑ {yLabel} ({yUnit})
          </text>

          {/* X Tick Labels */}
          {xTicks.map((xVal, i) => {
            const xPos = scaleX(xVal);
            return (
              <g key={`tx-${i}`}>
                <line x1={xPos} y1={height - padding.bottom} x2={xPos} y2={height - padding.bottom + 4} stroke="#94a3b8" />
                <text
                  x={xPos}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {xVal >= 10 ? xVal.toFixed(1) : xVal.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Y Tick Labels */}
          {yTicks.map((yVal, i) => {
            const yPos = scaleY(yVal);
            return (
              <g key={`ty-${i}`}>
                <line x1={padding.left - 4} y1={yPos} x2={padding.left} y2={yPos} stroke="#94a3b8" />
                <text
                  x={padding.left - 8}
                  y={yPos + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {Math.abs(yVal) >= 10 ? yVal.toFixed(1) : yVal.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Fitted Curve Line */}
          {showFit && fitPath && (
            <path
              d={fitPath}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeDasharray="4,2"
              className="drop-shadow"
            />
          )}

          {/* Filtered Line */}
          {showFiltered && filteredPath && (
            <path
              d={filteredPath}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-80"
            />
          )}

          {/* Raw Scatter Points */}
          {showRaw &&
            data.map((pt, i) => {
              const xPos = scaleX(pt.x);
              const yPos = scaleY(pt.y);
              const isSelected = highlightIndex === i || highlightIndex === pt.frameIndex;

              return (
                <g key={`pt-${i}`} className="cursor-pointer group">
                  {/* Outer pulse when highlighted */}
                  {isSelected && (
                    <circle cx={xPos} y={yPos} r="9" fill={color} opacity="0.3" className="animate-ping" />
                  )}
                  {/* Point circle */}
                  <circle
                    cx={xPos}
                    y={yPos}
                    r={isSelected ? "5.5" : "3.5"}
                    fill={isSelected ? "#f59e0b" : color}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    className="transition-all hover:r-6 hover:fill-amber-400"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredPoint({ point: pt, index: i, clientX: rect.left, clientY: rect.top });
                      if (onPointHover) onPointHover(i);
                    }}
                    onMouseLeave={() => {
                      setHoveredPoint(null);
                      if (onPointHover) onPointHover(null);
                    }}
                  />
                </g>
              );
            })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 bg-slate-950/95 border border-cyan-500/50 rounded-lg px-3 py-2 text-xs shadow-xl backdrop-blur pointer-events-none z-20 font-mono">
            <div className="text-cyan-400 font-semibold mb-0.5">
              Khung #{hoveredPoint.point.frameIndex ?? hoveredPoint.index + 1}
            </div>
            <div className="text-slate-300">
              {xLabel} (t): <span className="text-white font-bold">{hoveredPoint.point.x.toFixed(3)} {xUnit}</span>
            </div>
            <div className="text-slate-300">
              {yLabel} (đo): <span className="text-amber-400 font-bold">{hoveredPoint.point.y.toFixed(3)} {yUnit}</span>
            </div>
            {hoveredPoint.point.yFit !== undefined && (
              <div className="text-slate-300">
                {yLabel} (khớp): <span className="text-emerald-400 font-bold">{hoveredPoint.point.yFit.toFixed(3)} {yUnit}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Điểm thực nghiệm</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
            <span>Đường mượt (Lọc nhiễu)</span>
          </span>
          {fitEquation && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400 inline-block border-t border-dashed border-amber-400" />
              <span>Mô hình lý thuyết</span>
            </span>
          )}
        </div>
        <span className="text-slate-400 text-[10px]">
          {data.length} mẫu dữ liệu
        </span>
      </div>
    </div>
  );
};
