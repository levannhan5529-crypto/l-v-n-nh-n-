import React, { useState } from "react";
import { Film, Compass, HelpCircle, ShieldCheck, BookOpen, X, Home } from "lucide-react";
import { HomePage } from "./components/home/HomePage";
import { AIVisionLab } from "./components/ai-vision/AIVisionLab";
import { VirtualPhysicsLab } from "./components/virtual-lab/VirtualPhysicsLab";
import { GlobalAIChatBox } from "./components/common/GlobalAIChatBox";
import { OfflineIndicator } from "./components/common/OfflineIndicator";
import { ExperimentType } from "./types/physics";

export type ActiveTab = "home" | "vision-lab" | "virtual-lab";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [selectedExpForVision, setSelectedExpForVision] = useState<ExperimentType>("free-fall");
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  const handleNavigate = (tab: ActiveTab, experimentId?: ExperimentType) => {
    if (experimentId) {
      setSelectedExpForVision(experimentId);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans selection:bg-teal-500/25 selection:text-teal-900 antialiased">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-teal-200/80 shadow-md shadow-teal-950/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
          {/* Brand Logo - Click to go Home */}
          <button
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
            title="Trang chủ PHY-AI LAB"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-cyan-600 border border-teal-400 flex items-center justify-center text-white group-hover:scale-105 transition-all shadow-md shadow-teal-500/20">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-teal-700 via-cyan-700 to-blue-700 bg-clip-text text-transparent group-hover:text-teal-600 transition-colors">
                  PHY-AI LAB
                </span>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-mono font-bold px-1.5 py-0.5 rounded border border-teal-300 shadow-xs">
                  GDPT 2018
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block">
                Phòng Thí Nghiệm Số &amp; Trí Tuệ Nhân Tạo
              </p>
            </div>
          </button>

          {/* Minimalist Segmented Navigation Tabs */}
          <nav className="flex items-center bg-teal-100/70 p-1 rounded-xl border border-teal-200/90 text-xs shadow-inner">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                activeTab === "home"
                  ? "bg-white text-teal-950 font-bold shadow-xs"
                  : "text-teal-900 hover:text-teal-950 hover:bg-white/50"
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang Chủ</span>
            </button>

            <button
              onClick={() => setActiveTab("vision-lab")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                activeTab === "vision-lab"
                  ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold shadow-md shadow-teal-600/25"
                  : "text-teal-900 hover:text-teal-950 hover:bg-white/50"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>AI Vision Lab</span>
            </button>

            <button
              onClick={() => setActiveTab("virtual-lab")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                activeTab === "virtual-lab"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-md shadow-emerald-600/25"
                  : "text-teal-900 hover:text-teal-950 hover:bg-white/50"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Virtual Lab</span>
            </button>
          </nav>

          {/* Right Action: Help Modal Only (Theme Switcher Removed) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuideModal(true)}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-teal-50 text-teal-900 hover:text-teal-950 border border-teal-200 transition text-xs flex items-center gap-1.5 shadow-xs font-semibold cursor-pointer"
              title="Hướng dẫn sử dụng & Quy trình khoa học"
            >
              <HelpCircle className="w-4 h-4 text-teal-600" />
              <span className="hidden md:inline font-semibold">Hướng Dẫn</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === "home" && <HomePage onNavigate={handleNavigate} />}
        {activeTab === "vision-lab" && <AIVisionLab initialExperiment={selectedExpForVision} />}
        {activeTab === "virtual-lab" && <VirtualPhysicsLab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-teal-200/80 bg-white/70 backdrop-blur-sm text-slate-600 py-5 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Minh bạch số liệu:</strong> Dữ liệu trích xuất từ video thực nghiệm, hiển thị sai số khoa học và kiểm chứng phương trình.
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
            <span>GDPT 2018 THPT</span>
            <span>•</span>
            <span>PHY-AI LAB</span>
          </div>
        </div>
      </footer>

      {/* Scientific Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-teal-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-teal-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Hướng Dẫn Khám Phá Khoa Học Trên PHY-AI LAB
                </h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed max-h-96 overflow-y-auto pr-1">
              <div className="bg-teal-50/80 p-4 rounded-xl border border-teal-200 space-y-1">
                <h4 className="font-bold text-teal-800 text-sm flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-teal-600" />
                  1. AI Vision Lab (Thực Nghiệm Video Số Hóa)
                </h4>
                <p className="text-slate-700">
                  Chọn 1 trong 10 thí nghiệm mẫu hoặc tải video của bạn lên. Kéo 2 đầu thước đo màu vàng (A, B) trên khung hình để chuẩn hóa tỉ lệ pixel sang mét. Hệ thống tự động theo dõi quỹ đạo, vẽ đồ thị $y(t)$, $v(t)$, hồi quy bình phương tối thiểu và tính sai số phần trăm.
                </p>
              </div>

              <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 space-y-1">
                <h4 className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  2. Virtual Physics Lab (Phòng Thí Nghiệm Ảo)
                </h4>
                <p className="text-slate-700">
                  5 phòng mô phỏng tương tác gồm: Mạch điện (thuật toán MNA), Cơ học, Quang hình học, Sóng cơ &amp; giao thoa, Nhiệt học chất khí. Tự do thay đổi thông số và ghi nhận bảng số liệu.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-teal-100 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition cursor-pointer shadow-sm"
              >
                Đã hiểu &amp; Bắt đầu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Floating PHY-AI LAB Chat Box Widget at Bottom Right */}
      <GlobalAIChatBox currentTab={activeTab} />
    </div>
  );
}
