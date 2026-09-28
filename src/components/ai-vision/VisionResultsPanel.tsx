import React, { useState } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  FileText,
  BookOpen,
  Check,
} from "lucide-react";
import { TrackingPoint, RegressionResult, ExperimentType } from "../../types/physics";
import { PhysicsChart } from "../common/PhysicsChart";
import { DataTable } from "../common/DataTable";
import { MathText } from "../common/MathText";
import { getExperimentMeta } from "../../utils/videoSamples";

interface VisionResultsPanelProps {
  experimentType: ExperimentType;
  trackingPoints: TrackingPoint[];
  regression: RegressionResult | null;
  activeFrameIndex: number;
  onSelectFrame: (frame: number) => void;
  aiReview: any;
  isLoadingAiReview: boolean;
  onRequestAiReview: () => void;
}

export const VisionResultsPanel: React.FC<VisionResultsPanelProps> = ({
  experimentType,
  trackingPoints,
  regression,
  activeFrameIndex,
  onSelectFrame,
  aiReview,
  isLoadingAiReview,
  onRequestAiReview,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "table" | "ai-report">("overview");
  const [selectedChartType, setSelectedChartType] = useState<"pos" | "vel" | "acc">("pos");

  const meta = getExperimentMeta(experimentType);
  const principle = meta.operatingPrinciple;

  if (!regression || trackingPoints.length === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <p className="font-semibold text-slate-200">Chưa có kết quả phân tích</p>
        <p className="text-xs mt-1">Vui lòng chọn video thí nghiệm và nhấn &quot;Chạy Phân Tích AI Vision&quot; để trích xuất dữ liệu</p>
      </div>
    );
  }

  // Datasets for charts
  const chartDataY = trackingPoints.map((pt) => {
    let fitVal: number | undefined = undefined;
    if (regression) {
      const t = pt.timeSeconds;
      if (regression.coefficients && regression.coefficients.length >= 3) {
        if (
          experimentType === "simple-pendulum" ||
          experimentType === "spring-oscillation" ||
          experimentType === "damped-oscillation"
        ) {
          fitVal = regression.coefficients[0] * Math.cos(regression.coefficients[1] * t);
        } else {
          fitVal =
            regression.coefficients[0] * t * t +
            regression.coefficients[1] * t +
            regression.coefficients[2];
        }
      } else if (regression.coefficients && regression.coefficients.length === 2) {
        fitVal = regression.coefficients[0] * t + regression.coefficients[1];
      } else if (regression.coefficients && regression.coefficients.length === 1) {
        fitVal = regression.coefficients[0] * t;
      }
    }
    return {
      x: pt.timeSeconds,
      y: pt.posY,
      yFiltered: pt.posY,
      yFit: fitVal,
      frameIndex: pt.frameIndex,
    };
  });

  const chartDataV = trackingPoints.map((pt) => ({
    x: pt.timeSeconds,
    y: pt.velocityTotal ?? 0,
    yFiltered: pt.velocityTotal ?? 0,
    frameIndex: pt.frameIndex,
  }));

  const chartDataA = trackingPoints.map((pt) => ({
    x: pt.timeSeconds,
    y: pt.acceleration ?? 0,
    yFiltered: pt.acceleration ?? 0,
    frameIndex: pt.frameIndex,
  }));

  const maxVel = Math.max(...trackingPoints.map((p) => p.velocityTotal ?? 0));

  return (
    <div className="bg-slate-900/95 border border-cyan-500/30 rounded-xl p-3.5 sm:p-4 shadow-md space-y-3">
      {/* Header bar: Thu nhỏ & xoá chữ Lớp 10 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-700/80 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-600/60 uppercase shadow-xs">
              {meta.category}
            </span>
            <span className="text-xs text-slate-300 font-mono font-medium">• {meta.curriculumChapter}</span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 mt-1">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            {meta.name}
          </h3>
        </div>

        {/* Streamlined View Switcher Tabs */}
        <div className="flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-700 text-xs shadow-inner">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm ring-1 ring-cyan-300/40"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Kết quả & Đồ thị
          </button>
          <button
            onClick={() => setActiveTab("table")}
            className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
              activeTab === "table"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm ring-1 ring-cyan-300/40"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Bảng số liệu ({trackingPoints.length})
          </button>
          <button
            onClick={() => setActiveTab("ai-report")}
            className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
              activeTab === "ai-report"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm ring-1 ring-cyan-300/40"
                : "text-cyan-300 hover:text-cyan-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Nhận xét AI
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: KẾT QUẢ & ĐỒ THỊ (GỌN GÀNG, ĐÚNG TRỌNG TÂM) ==================== */}
      {activeTab === "overview" && (
        <div className="space-y-3">
          {/* 4 Thẻ chỉ số đo đạc then chốt - Thu nhỏ gọn gàng */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-gradient-to-br from-cyan-950/80 via-slate-900 to-cyan-950/40 border border-cyan-400/60 rounded-lg p-2.5 shadow-sm">
              <span className="text-[10px] text-cyan-200 block font-bold">
                {regression.calculatedTheoreticalValue.name} (Đo đạc)
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-cyan-300 mt-0.5">
                {regression.calculatedTheoreticalValue.value}{" "}
                <span className="text-xs text-slate-300 font-sans">{regression.calculatedTheoreticalValue.unit}</span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono font-bold mt-0.5 block">
                R² = {regression.rSquared.toFixed(4)}
              </span>
            </div>

            <div className="bg-gradient-to-br from-amber-950/70 via-slate-900 to-amber-950/40 border border-amber-400/60 rounded-lg p-2.5 shadow-sm">
              <span className="text-[10px] text-amber-200 block font-bold">
                {regression.theoreticalValue.name} (Lý thuyết)
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-amber-300 mt-0.5">
                {regression.theoreticalValue.value}{" "}
                <span className="text-xs text-slate-300 font-sans">{regression.theoreticalValue.unit}</span>
              </div>
              <span className="text-[9px] text-amber-200/90 font-mono font-semibold mt-0.5 block">
                Chuẩn tham chiếu SGK
              </span>
            </div>

            <div className="bg-gradient-to-br from-emerald-950/70 via-slate-900 to-emerald-950/40 border border-emerald-400/60 rounded-lg p-2.5 shadow-sm">
              <span className="text-[10px] text-emerald-200 block font-bold">
                Sai số tương đối (δ)
              </span>
              <div
                className={`text-lg sm:text-xl font-bold font-mono mt-0.5 ${
                  regression.relativeErrorPercent < 5 ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                {regression.relativeErrorPercent.toFixed(2)}%
              </div>
              <span className="text-[9px] text-emerald-200/90 font-mono font-semibold mt-0.5 block">
                |Δ| = {regression.absoluteError} {regression.theoreticalValue.unit}
              </span>
            </div>

            <div className="bg-gradient-to-br from-purple-950/70 via-slate-900 to-purple-950/40 border border-purple-400/60 rounded-lg p-2.5 shadow-sm">
              <span className="text-[10px] text-purple-200 block font-bold">
                Vận tốc cực đại (v_max)
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-purple-300 mt-0.5">
                {maxVel.toFixed(2)} <span className="text-xs text-slate-300 font-sans">m/s</span>
              </div>
              <span className="text-[9px] text-purple-200/90 font-mono font-semibold mt-0.5 block truncate">
                Thời lượng: {trackingPoints[trackingPoints.length - 1].timeSeconds.toFixed(2)}s
              </span>
            </div>
          </div>

          {/* 2 Thẻ kết quả cốt lõi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="bg-gradient-to-br from-slate-900/95 to-cyan-950/60 border border-cyan-400/50 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mô hình thực nghiệm khớp dữ liệu</span>
              </div>
              <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-cyan-500/30 font-mono text-xs sm:text-sm text-amber-300 font-bold mb-1 shadow-inner">
                {regression.equationText}
              </div>
              <p className="text-xs text-slate-200 font-medium">
                Độ tin cậy tương quan: <strong className="text-cyan-300 font-mono font-bold">R² = {regression.rSquared}</strong>
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-900/95 to-emerald-950/60 border border-emerald-400/50 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quy luật vật lí xác lập</span>
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-white mb-1">
                {regression.physicsLaw}
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed font-normal">
                {regression.conclusion}
              </p>
            </div>
          </div>

          {/* Đồ thị động học tích hợp trực tiếp (Rút ngắn gọn gàng) */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 sm:p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">Đồ thị Khảo sát:</span>
                <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setSelectedChartType("pos")}
                    className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                      selectedChartType === "pos"
                        ? "bg-cyan-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    y(t) Vị trí
                  </button>
                  <button
                    onClick={() => setSelectedChartType("vel")}
                    className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                      selectedChartType === "vel"
                        ? "bg-emerald-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    v(t) Vận tốc
                  </button>
                  <button
                    onClick={() => setSelectedChartType("acc")}
                    className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                      selectedChartType === "acc"
                        ? "bg-purple-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    a(t) Gia tốc
                  </button>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                Rê chuột lên điểm để xem frame tương ứng
              </span>
            </div>

            {selectedChartType === "pos" && (
              <PhysicsChart
                title="Đồ thị Vị trí y(t) và Đường khớp Thực nghiệm"
                xLabel="Thời gian t"
                yLabel="Vị trí y"
                xUnit="s"
                yUnit="m"
                data={chartDataY}
                fitEquation={regression.equationText}
                rSquared={regression.rSquared}
                highlightIndex={activeFrameIndex}
                onPointHover={onSelectFrame}
                color="#38bdf8"
                height={180}
              />
            )}

            {selectedChartType === "vel" && (
              <PhysicsChart
                title="Đồ thị Vận tốc tức thời v(t)"
                xLabel="Thời gian t"
                yLabel="Vận tốc v"
                xUnit="s"
                yUnit="m/s"
                data={chartDataV}
                highlightIndex={activeFrameIndex}
                onPointHover={onSelectFrame}
                color="#34d399"
                height={180}
              />
            )}

            {selectedChartType === "acc" && (
              <PhysicsChart
                title="Đồ thị Gia tốc a(t)"
                xLabel="Thời gian t"
                yLabel="Gia tốc a"
                xUnit="s"
                yUnit="m/s²"
                data={chartDataA}
                highlightIndex={activeFrameIndex}
                onPointHover={onSelectFrame}
                color="#c084fc"
                height={180}
              />
            )}
          </div>

          {/* Rút ngắn: Phương pháp Thực nghiệm & Đánh giá Sai số */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 sm:p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-cyan-300 text-xs shrink-0 flex items-center gap-1">
                🔬 Phương pháp &amp; Sai số:
              </span>
              <span className="text-slate-300 text-[11px] line-clamp-1">
                {meta.setupSummary || principle?.apparatus}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] shrink-0 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400">Chuẩn ghi:</span>
              <span className="text-white font-bold">A = Ā ± ΔA</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-bold">δ = {regression.relativeErrorPercent.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: BẢNG SỐ LIỆU ==================== */}
      {activeTab === "table" && (
        <DataTable
          data={trackingPoints}
          activeFrameIndex={activeFrameIndex}
          onSelectFrame={onSelectFrame}
        />
      )}

      {/* ==================== TAB 3: NHẬN XÉT AI (NGẮN GỌN, ĐÚNG TRỌNG TÂM) ==================== */}
      {activeTab === "ai-report" && (
        <div className="space-y-3">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Nhận Xét Nhanh Của AI
              </h4>
              <p className="text-[11px] text-slate-400">
                Đánh giá trực diện độ chính xác và nguyên nhân sai số thực nghiệm
              </p>
            </div>

            <button
              onClick={onRequestAiReview}
              disabled={isLoadingAiReview}
              className="flex items-center gap-1.5 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition shadow disabled:opacity-50"
            >
              {isLoadingAiReview ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span>{isLoadingAiReview ? "Đang xử lý..." : "Cập nhật Nhận xét"}</span>
            </button>
          </div>

          {aiReview ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
              {/* 1. Đánh giá súc tích */}
              <div>
                <h5 className="font-bold text-cyan-400 uppercase tracking-wider text-[11px] mb-1">
                  1. Đánh Giá Khớp Quy Luật
                </h5>
                <div className="text-slate-200 leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <MathText text={aiReview.summary || aiReview.analysis || "Dữ liệu thực nghiệm khớp tốt với mô hình lý thuyết."} />
                </div>
              </div>

              {/* 2. Nguyên nhân sai số chính */}
              {(aiReview.errorCauses || aiReview.errorAnalysis) && (
                <div>
                  <h5 className="font-bold text-rose-400 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    2. Nguyên Nhân Sai Số Chính
                  </h5>
                  <ul className="space-y-1.5 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                    {(aiReview.errorCauses || aiReview.errorAnalysis).map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-[11px]">
                        <span className="text-rose-400 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3. Biện pháp cải thiện */}
              {aiReview.researchImprovementTips && (
                <div>
                  <h5 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    3. Biện Pháp Cải Thiện Độ Chính Xác
                  </h5>
                  <ul className="space-y-1.5 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                    {aiReview.researchImprovementTips.map((tip: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-[11px]">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-6 text-center space-y-2.5">
              <p className="text-xs text-slate-400">
                Nhấn nút bên dưới để nhận xét nhanh về độ chính xác và sai số từ AI Vật lí.
              </p>
              <button
                onClick={onRequestAiReview}
                className="inline-flex items-center gap-1.5 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg transition shadow"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Xem Nhận xét AI</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
