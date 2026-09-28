import React from "react";
import { Sparkles, Film, Compass, ArrowRight } from "lucide-react";
import { ActiveTab } from "../../App";
import { ExperimentType } from "../../types/physics";

interface HomePageProps {
  onNavigate: (tab: ActiveTab, experimentId?: ExperimentType) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-14 font-sans">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-md border border-teal-200/90 p-8 sm:p-14 shadow-[0_12px_40px_rgba(20,184,166,0.12)] text-left">
        {/* Ambient subtle pastel glows */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 rounded-full bg-gradient-to-br from-teal-200/35 to-cyan-200/25 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-72 h-72 rounded-full bg-gradient-to-tr from-emerald-200/30 to-teal-200/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-300 text-teal-800 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
            <span>VẬT LÍ THỰC NGHIỆM SỐ • KHUNG GDPT 2018 THPT</span>
          </div>

          {/* Tên chủ đề (Topic Name) */}
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Khám Phá Vật Lí Thực Nghiệm Bằng{" "}
            <span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Thị Giác AI
            </span>{" "}
            &amp; Mô Phỏng Tương Tác
          </h1>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed font-normal">
            <strong className="text-teal-700 font-semibold">PHY-AI LAB</strong> hỗ trợ học sinh THPT số hóa dữ liệu video thực nghiệm qua Thị giác Máy tính (AI Computer Vision), tiến hành thí nghiệm ảo tương tác bám sát đề thi tốt nghiệp THPT Quốc gia.
          </p>

          {/* Quick Action Navigation Buttons: ai vision lab và virtual */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onNavigate("vision-lab")}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-teal-600/25 hover:shadow-teal-600/35 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Film className="w-5 h-5" />
              <span>AI Vision Lab</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>

            <button
              onClick={() => onNavigate("virtual-lab")}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Compass className="w-5 h-5" />
              <span>Virtual</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
