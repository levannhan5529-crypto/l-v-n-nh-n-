import React, { useState, useRef } from "react";
import { X, Upload, Link, Video, Check, Info, Sparkles, BookOpen } from "lucide-react";
import { GradeLevel } from "../../types/physics";
import { PresetExperimentMeta } from "../../utils/videoSamples";

interface AddCustomVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (experiment: PresetExperimentMeta, videoFileOrUrl: string | File) => void;
}

export const AddCustomVideoModal: React.FC<AddCustomVideoModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [sourceType, setSourceType] = useState<"file" | "url">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>("");
  const [grade, setGrade] = useState<GradeLevel>("Video của tôi");
  const [category, setCategory] = useState<string>("Cơ học Thực nghiệm");
  const [curriculumChapter, setCurriculumChapter] = useState<string>("Động học chất điểm");
  const [description, setDescription] = useState<string>("");
  const [realDistanceMeters, setRealDistanceMeters] = useState<number>(1.0);
  const [fps, setFps] = useState<number>(30);
  const [symbol, setSymbol] = useState<string>("g");
  const [quantityName, setQuantityName] = useState<string>("Gia tốc rơi tự do");
  const [theoreticalValue, setTheoreticalValue] = useState<number>(9.81);
  const [unit, setUnit] = useState<string>("m/s²");
  const [lawSummary, setLawSummary] = useState<string>(
    "Khảo sát chuyển động của vật và kiểm chứng định luật vật lí bằng phương pháp trích xuất dữ liệu thị giác máy tính."
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      if (!name) {
        setName(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
    }
  };

  const handleUrlBlur = () => {
    if (videoUrl.trim()) {
      setPreviewUrl(videoUrl.trim());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (sourceType === "file" && !selectedFile && !previewUrl) return;
    if (sourceType === "url" && !videoUrl.trim()) return;

    const customId = `custom-${Date.now()}`;
    const newExperiment: PresetExperimentMeta = {
      id: customId,
      name: name.trim(),
      grade: grade,
      curriculumChapter: curriculumChapter.trim() || `Chương trình ${grade}`,
      category: category.trim() || "Thực nghiệm người dùng",
      description: description.trim() || "Video thí nghiệm thực tế tải lên bởi người dùng.",
      setupSummary: `Video người dùng (${fps} FPS). Thước đo tỉ lệ chuẩn: ${realDistanceMeters}m.`,
      durationSeconds: 3.0,
      fps: fps || 30,
      totalFrames: Math.round((fps || 30) * 3),
      calibrationDefault: {
        x1: 150,
        y1: 100,
        x2: 150,
        y2: 350,
        realDistanceMeters: realDistanceMeters || 1.0,
      },
      objectColor: "#f59e0b",
      theoreticalValue: {
        name: quantityName.trim() || "Đại lượng lí thuyết",
        symbol: symbol.trim() || "X",
        value: Number(theoreticalValue) || 1.0,
        unit: unit.trim() || "",
      },
      lawSummary: lawSummary.trim(),
      videoUrl: previewUrl || undefined,
      isUserUploaded: true,
    };

    onSave(newExperiment, sourceType === "file" && selectedFile ? selectedFile : videoUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Thêm Video Thí Nghiệm Người Dùng
              </h2>
              <p className="text-xs text-slate-400">
                Nhập video quay từ điện thoại/camera để AI Vision Lab phân tích quỹ đạo & tính toán
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Source Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              1. Nguồn Video Thí Nghiệm
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSourceType("file")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  sourceType === "file"
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Tải file từ máy tính / điện thoại</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceType("url")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  sourceType === "url"
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Link className="w-4 h-4" />
                <span>Dán đường dẫn trực tiếp (Video URL)</span>
              </button>
            </div>
          </div>

          {/* File input / URL input */}
          {sourceType === "file" ? (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="video/mp4,video/webm,video/quicktime,video/ogg"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-6 text-center cursor-pointer transition bg-slate-950/40 hover:bg-slate-950/70"
              >
                {selectedFile ? (
                  <div className="space-y-1">
                    <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-200">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Nhấp để đổi file khác
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs sm:text-sm font-medium text-slate-300">
                      Nhấp vào đây hoặc kéo thả file video (MP4, WebM, MOV)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Khuyến nghị quay video rõ nét, cố định góc máy, có đặt kèm thước tỉ lệ trong cảnh quay
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Đường dẫn Video Trực tiếp:
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://example.com/physics-experiment.mp4"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* Video Preview if loaded */}
          {previewUrl && (
            <div className="rounded-lg overflow-hidden border border-slate-800 aspect-video max-h-44 bg-black flex items-center justify-center">
              <video
                src={previewUrl}
                controls
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Experiment Metadata */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              2. Thông Tin & Khung Chương Trình
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tên thí nghiệm *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Rơi tự do trong không khí"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Phân loại video *</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as GradeLevel)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Video của tôi">Video thực nghiệm của bạn</option>
                  <option value="Cơ học">Cơ học thực nghiệm</option>
                  <option value="Dao động & Sóng">Dao động & Sóng cơ</option>
                  <option value="Nhiệt & Quang">Vật lí nhiệt & Quang học</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Chương / Phân môn</label>
                <input
                  type="text"
                  value={curriculumChapter}
                  onChange={(e) => setCurriculumChapter(e.target.value)}
                  placeholder="VD: Động học, Dao động, Quang học..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Tốc độ khung hình (FPS)</label>
                <select
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value={30}>30 FPS (Chuẩn điện thoại thông thường)</option>
                  <option value={60}>60 FPS (Quay mượt 60 khung/giây)</option>
                  <option value={120}>120 FPS (Quay chậm Slow-Motion 120 FPS)</option>
                  <option value={240}>240 FPS (Quay siêu chậm Slow-Mo 240 FPS)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Physical Calibration & Theory */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              3. Thước Đo Tỉ Lệ & Đại Lượng Lí Thuyết
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Chiều dài thước mẫu (m)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={realDistanceMeters}
                  onChange={(e) => setRealDistanceMeters(Number(e.target.value))}
                  placeholder="1.0"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Kí hiệu đại lượng</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="VD: g, v, a, T"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Giá trị lí thuyết chuẩn</label>
                <input
                  type="number"
                  step="0.001"
                  value={theoreticalValue}
                  onChange={(e) => setTheoreticalValue(Number(e.target.value))}
                  placeholder="9.81"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Đơn vị đo</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="m/s², m/s, s..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={!name.trim() || (!selectedFile && !previewUrl && !videoUrl.trim())}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition shadow-lg flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Lưu & Bắt đầu Phân tích</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
