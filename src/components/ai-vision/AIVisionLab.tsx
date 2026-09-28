import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, Plus, BookOpen, Trash2
} from "lucide-react";
import { ExperimentType, TrackingPoint, CalibrationScale, RegressionResult } from "../../types/physics";
import { 
  getExperimentMeta, 
  getAllAvailableExperiments, 
  saveUserCustomExperiment, 
  deleteUserCustomExperiment, 
  generateExperimentData,
  PresetExperimentMeta
} from "../../utils/videoSamples";
import { VideoPlayerCanvas } from "./VideoPlayerCanvas";
import { VisionResultsPanel } from "./VisionResultsPanel";
import { Stopwatch } from "../common/Stopwatch";
import { RulerOverlay } from "../common/RulerOverlay";
import { AddCustomVideoModal } from "./AddCustomVideoModal";

export interface AIVisionLabProps {
  initialExperiment?: ExperimentType;
}

export const AIVisionLab: React.FC<AIVisionLabProps> = ({ initialExperiment }) => {
  const [currentExperiment, setCurrentExperiment] = useState<ExperimentType>(initialExperiment || "free-fall");
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [filterType, setFilterType] = useState<"none" | "moving-average" | "savitzky-golay">("moving-average");
  const [trackingMode, setTrackingMode] = useState<"color-centroid" | "template" | "optical-flow">("color-centroid");
  const [trackingColor, setTrackingColor] = useState<string>("#f59e0b");
  const [userVideoUrl, setUserVideoUrl] = useState<string | null>(null);

  // Category Filter & Search
  const [selectedCategory, setSelectedCategory] = useState<string>("Tất cả");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [availableExperiments, setAvailableExperiments] = useState<PresetExperimentMeta[]>(() => getAllAvailableExperiments());

  // Custom Video Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Manual Tracking Mode
  const [isManualTracking, setIsManualTracking] = useState<boolean>(false);
  const [manualPoints, setManualPoints] = useState<TrackingPoint[]>([]);

  // Tools toggle
  const [showStopwatch, setShowStopwatch] = useState<boolean>(false);
  const [showRuler, setShowRuler] = useState<boolean>(false);

  // Calibration state
  const [calibration, setCalibration] = useState<CalibrationScale>(() => {
    const meta = getExperimentMeta("free-fall");
    const def = meta.calibrationDefault;
    const pxDist = Math.hypot(def.x2 - def.x1, def.y2 - def.y1);
    return {
      ...def,
      pixelDistance: pxDist,
      pixelsPerMeter: pxDist / def.realDistanceMeters,
      isCalibrated: true,
    };
  });

  // Tracking points and regression results
  const [trackingPoints, setTrackingPoints] = useState<TrackingPoint[]>([]);
  const [regression, setRegression] = useState<RegressionResult | null>(null);

  // AI Review state
  const [aiReview, setAiReview] = useState<any>(null);
  const [isLoadingAiReview, setIsLoadingAiReview] = useState<boolean>(false);

  // Reload experiments list from localStorage / presets
  const refreshExperimentsList = () => {
    setAvailableExperiments(getAllAvailableExperiments());
  };

  // Run computation when experiment, calibration, filterType, or manualPoints change
  useEffect(() => {
    const pointsToUse = manualPoints.length > 0 ? manualPoints : undefined;
    const { points, regression: reg } = generateExperimentData(
      currentExperiment, 
      calibration, 
      filterType, 
      pointsToUse
    );
    setTrackingPoints(points);
    setRegression(reg);
  }, [currentExperiment, calibration.pixelsPerMeter, filterType, manualPoints]);

  // Handle change experiment preset
  const handleSelectExperiment = (type: ExperimentType) => {
    setCurrentExperiment(type);
    setManualPoints([]); // Reset manual points on experiment change
    setIsManualTracking(false);
    
    const meta = getExperimentMeta(type);
    if (meta.videoUrl) {
      setUserVideoUrl(meta.videoUrl);
    } else {
      setUserVideoUrl(null);
    }

    const def = meta.calibrationDefault;
    const pxDist = Math.hypot(def.x2 - def.x1, def.y2 - def.y1);
    setCalibration({
      ...def,
      pixelDistance: pxDist,
      pixelsPerMeter: pxDist / def.realDistanceMeters,
      isCalibrated: true,
    });
    setTrackingColor(meta.objectColor || "#f59e0b");
    setAiReview(null);
    setCurrentFrame(0);
  };

  useEffect(() => {
    if (initialExperiment && initialExperiment !== currentExperiment) {
      handleSelectExperiment(initialExperiment);
    }
  }, [initialExperiment]);

  // Handle Manual Tracking Point Click
  const handleAddManualPoint = (pt: { rawX: number; rawY: number; frameIndex: number }) => {
    const meta = getExperimentMeta(currentExperiment);
    const dt = 1 / meta.fps;
    const t = pt.frameIndex * dt;

    setManualPoints((prev) => {
      // Replace existing point for this frame or add new
      const filtered = prev.filter((p) => p.frameIndex !== pt.frameIndex);
      const newPt: TrackingPoint = {
        frameIndex: pt.frameIndex,
        timeSeconds: Math.round(t * 1000) / 1000,
        rawX: pt.rawX,
        rawY: pt.rawY,
        filteredX: pt.rawX,
        filteredY: pt.rawY,
        posX: 0,
        posY: 0,
        confidence: 1.0,
      };
      const updated = [...filtered, newPt].sort((a, b) => a.frameIndex - b.frameIndex);
      return updated;
    });
  };

  const handleResetManualPoints = () => {
    setManualPoints([]);
  };

  // Request AI Review from server
  const handleRequestAiReview = async () => {
    if (!regression) return;
    setIsLoadingAiReview(true);
    const currentMeta = getExperimentMeta(currentExperiment);
    try {
      const res = await fetch("/api/vision/analyze-experiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentType: currentMeta.name,
          sampleCount: trackingPoints.length,
          measuredValues: regression.calculatedTheoreticalValue,
          theoreticalValues: regression.theoreticalValue,
          errorPercentage: regression.relativeErrorPercent,
          fittedEquation: regression.equationText,
          rSquared: regression.rSquared,
          notes: currentMeta.setupSummary,
        }),
      });
      const data = await res.json();
      setAiReview(data);
    } catch (err) {
      console.error("AI Review error:", err);
    } finally {
      setIsLoadingAiReview(false);
    }
  };

  // Quick User video upload handler
  const handleUserVideoUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setUserVideoUrl(url);

    // Prompt user to save as a full experiment or analyze directly
    const customId = `custom-${Date.now()}`;
    const newExp: PresetExperimentMeta = {
      id: customId,
      name: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
      grade: "Video của tôi",
      curriculumChapter: "Thực nghiệm tự quay",
      category: "Video người dùng",
      description: `Video tải lên từ thiết bị: ${file.name}`,
      setupSummary: "Video người dùng quay thực tế, trích xuất dữ liệu thị giác máy tính.",
      durationSeconds: 3.0,
      fps: 30,
      totalFrames: 90,
      calibrationDefault: {
        x1: 150,
        y1: 100,
        x2: 150,
        y2: 350,
        realDistanceMeters: 1.0,
      },
      objectColor: "#f59e0b",
      theoreticalValue: {
        name: "Đại lượng đo",
        symbol: "X",
        value: 1.0,
        unit: "",
      },
      lawSummary: "Khảo sát và kiểm chứng định luật chuyển động từ dữ liệu video thực tế.",
      videoUrl: url,
      isUserUploaded: true,
    };

    saveUserCustomExperiment(newExp);
    refreshExperimentsList();
    handleSelectExperiment(customId);
  };

  // Handle saving new custom video from modal
  const handleSaveCustomExperiment = (experiment: PresetExperimentMeta, videoSource: string | File) => {
    let url = "";
    if (typeof videoSource === "string") {
      url = videoSource;
    } else {
      url = URL.createObjectURL(videoSource);
    }
    const expWithUrl = { ...experiment, videoUrl: url };
    saveUserCustomExperiment(expWithUrl);
    refreshExperimentsList();
    handleSelectExperiment(expWithUrl.id);
  };

  // Handle deleting custom experiment
  const handleDeleteCustomExperiment = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn xóa video thí nghiệm này khỏi danh sách?")) {
      deleteUserCustomExperiment(id);
      refreshExperimentsList();
      if (currentExperiment === id) {
        handleSelectExperiment("free-fall");
      }
    }
  };

  // Filtered experiments based on Category tab and Search
  const filteredExperiments = useMemo(() => {
    return availableExperiments.filter((exp) => {
      // Category filter
      if (selectedCategory !== "Tất cả") {
        if (selectedCategory === "Video của tôi") {
          if (!exp.isUserUploaded && exp.grade !== "Video của tôi") return false;
        } else if (selectedCategory === "Cơ học") {
          const cat = exp.category.toLowerCase();
          if (!cat.includes("cơ") || cat.includes("sóng")) return false;
        } else if (selectedCategory === "Dao động & Sóng") {
          const cat = exp.category.toLowerCase();
          if (!cat.includes("dao động") && !cat.includes("sóng")) return false;
        } else if (selectedCategory === "Nhiệt & Quang") {
          const cat = exp.category.toLowerCase();
          if (!cat.includes("quang") && !cat.includes("nhiệt") && !cat.includes("giao thoa")) return false;
        }
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = exp.name.toLowerCase().includes(q);
        const matchCat = exp.category.toLowerCase().includes(q);
        const matchChapter = exp.curriculumChapter.toLowerCase().includes(q);
        const matchSymbol = exp.theoreticalValue.symbol.toLowerCase().includes(q);
        const matchLaw = exp.lawSummary ? exp.lawSummary.toLowerCase().includes(q) : false;
        if (!matchName && !matchCat && !matchChapter && !matchSymbol && !matchLaw) return false;
      }
      return true;
    });
  }, [availableExperiments, selectedCategory, searchQuery]);

  const currentMeta = getExperimentMeta(currentExperiment);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Phân Hệ 1 • Trọng Tâm Nghiên Cứu
            </span>
            <span className="text-xs text-slate-400 font-mono">OpenCV & Kinetic Modeling</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
            AI Vision Lab: Phân Tích Video Thí Nghiệm
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
            Thư viện 10 video thí nghiệm chuẩn chương trình Vật lí THPT. Trích xuất tọa độ chuyển động, tự động khớp phương trình thực nghiệm và đánh giá sai số khoa học đúng trọng tâm.
          </p>
        </div>

        {/* Action Buttons: Add Custom Video + Measurement Tools */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md transition flex items-center gap-1.5 border border-cyan-400/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm video của bạn</span>
          </button>

          <button
            onClick={() => setShowStopwatch(!showStopwatch)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
              showStopwatch
                ? "bg-cyan-500 text-slate-950 border-cyan-400 font-bold"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            <span>Đồng hồ</span>
          </button>
          <button
            onClick={() => setShowRuler(!showRuler)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
              showRuler
                ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            <span>Thước đo</span>
          </button>
        </div>
      </div>

      {/* Thư Viện 10 Video Thí Nghiệm (Thiết kế thu nhỏ, tinh gọn) */}
      <div className="bg-slate-900/95 border border-cyan-500/30 rounded-xl p-2.5 shadow-md space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-700/60">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="font-extrabold text-xs sm:text-sm text-white">
              Thư Viện 10 Video Thí Nghiệm
            </h3>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded-full border border-cyan-700/60 font-mono font-bold shadow-xs">
              {filteredExperiments.length} video
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {["Tất cả", "Cơ học", "Dao động & Sóng", "Nhiệt & Quang", "Video của tôi"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all border ${
                    selectedCategory === cat
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-300 font-bold shadow-sm shadow-cyan-500/20"
                      : "bg-slate-950/70 border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Compact Search bar */}
            <div className="relative min-w-[170px]">
              <Search className="w-3 h-3 absolute left-2 top-2 text-cyan-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm video..."
                className="w-full bg-slate-950 border border-slate-700 rounded-md pl-7 pr-2 py-0.5 text-[11px] text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition"
              />
            </div>
          </div>
        </div>

        {/* Experiment Cards Grid (Thu nhỏ các mục video gọn gàng) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
          {filteredExperiments.map((exp) => {
            const isSelected = currentExperiment === exp.id;
            return (
              <div
                key={exp.id}
                onClick={() => handleSelectExperiment(exp.id)}
                className={`p-2 rounded-lg cursor-pointer transition-all border flex flex-col justify-between relative group ${
                  isSelected
                    ? "bg-gradient-to-br from-cyan-950/95 via-slate-900 to-blue-950/90 border-cyan-400 text-white shadow-sm ring-1 ring-cyan-400/60"
                    : "bg-slate-950/60 border-slate-700/60 text-slate-200 hover:border-cyan-400/60 hover:bg-slate-800/80"
                }`}
                title={exp.name}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 truncate max-w-[95px]">
                      {exp.category}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {exp.isUserUploaded && (
                        <button
                          onClick={(e) => handleDeleteCustomExperiment(e, exp.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-950 text-red-400 transition"
                          title="Xóa video này"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      )}
                    </div>
                  </div>
                  <h4 className="text-[11px] font-bold text-white line-clamp-1 leading-tight group-hover:text-cyan-200 transition-colors">
                    {exp.name}
                  </h4>
                </div>

                <div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono leading-none">
                  <span className="text-amber-300 font-bold truncate">
                    {exp.theoreticalValue.symbol} = {exp.theoreticalValue.value} {exp.theoreticalValue.unit}
                  </span>
                  <span className="text-cyan-400/80 text-[8px] shrink-0 ml-1">
                    {exp.fps} FPS
                  </span>
                </div>
              </div>
            );
          })}
          {filteredExperiments.length === 0 && (
            <div className="col-span-full py-4 text-center text-slate-400 text-xs">
              Không tìm thấy thí nghiệm nào phù hợp với bộ lọc &quot;{selectedCategory}&quot;
            </div>
          )}
        </div>
      </div>

      {/* Bảng Định Luật Vật Lí Tương Ứng Với Video (Thu gọn ngắn lại) */}
      <div className="bg-gradient-to-r from-cyan-950/90 via-slate-900 to-indigo-950/80 border border-cyan-400/50 rounded-xl px-3.5 py-2.5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-200 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/60 shrink-0">
              Định luật khảo sát
            </span>
            <span className="text-xs sm:text-sm font-bold text-white">
              {currentMeta.lawSummary}
            </span>
            <span className="text-[11px] text-slate-300 hidden md:inline">
              ({currentMeta.curriculumChapter})
            </span>
          </div>
        </div>

        {/* Giá trị chuẩn rút gọn */}
        <div className="flex items-center gap-2 text-xs font-mono shrink-0 bg-slate-950/90 px-3 py-1.5 rounded-lg border border-cyan-500/30">
          <span className="text-slate-400 text-[11px]">{currentMeta.theoreticalValue.name} ({currentMeta.theoreticalValue.symbol}):</span>
          <span className="text-amber-300 font-bold">{currentMeta.theoreticalValue.value} {currentMeta.theoreticalValue.unit}</span>
        </div>
      </div>

      {/* Main Video Viewport (Thu nhỏ gọn gàng) */}
      <div className="relative w-full max-w-3xl mx-auto">
        <VideoPlayerCanvas
          experimentType={currentExperiment}
          trackingPoints={trackingPoints}
          currentFrame={currentFrame}
          onFrameChange={setCurrentFrame}
          calibration={calibration}
          onCalibrationChange={setCalibration}
          trackingColor={trackingColor}
          onColorChange={setTrackingColor}
          trackingMode={trackingMode}
          userVideoUrl={userVideoUrl}
          onUserVideoUpload={handleUserVideoUpload}
          isManualTracking={isManualTracking}
          onToggleManualTracking={() => setIsManualTracking(!isManualTracking)}
          onAddManualPoint={handleAddManualPoint}
          onResetManualPoints={handleResetManualPoints}
          manualPointsCount={manualPoints.length}
        />

        {/* Floating measurement tools if toggled */}
        {showStopwatch && (
          <div className="absolute top-16 right-4 z-40">
            <Stopwatch isOpen={showStopwatch} onClose={() => setShowStopwatch(false)} />
          </div>
        )}
        {showRuler && (
          <RulerOverlay isOpen={showRuler} onClose={() => setShowRuler(false)} />
        )}
      </div>

      {/* 10 Scientific Results Section */}
      <VisionResultsPanel
        experimentType={currentExperiment}
        trackingPoints={trackingPoints}
        regression={regression}
        activeFrameIndex={currentFrame}
        onSelectFrame={setCurrentFrame}
        aiReview={aiReview}
        isLoadingAiReview={isLoadingAiReview}
        onRequestAiReview={handleRequestAiReview}
      />

      {/* Add Custom Video Modal */}
      <AddCustomVideoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveCustomExperiment}
      />
    </div>
  );
};
