import React, { useState } from "react";
import { Compass, Zap, Waves, Flame, Sun, ArrowRight, BookOpen } from "lucide-react";
import { MechanicsLab } from "./simulations/MechanicsLab";
import { ElectricityLab } from "./simulations/ElectricityLab";
import { OpticsLab } from "./simulations/OpticsLab";
import { WavesLab } from "./simulations/WavesLab";
import { ThermodynamicsLab } from "./simulations/ThermodynamicsLab";

type Discipline = "electricity" | "mechanics" | "optics" | "waves" | "thermodynamics";

export const VirtualPhysicsLab: React.FC = () => {
  const [activeDiscipline, setActiveDiscipline] = useState<Discipline>("electricity");

  const disciplines = [
    {
      id: "electricity",
      title: "Điện học",
      icon: Zap,
    },
    {
      id: "mechanics",
      title: "Cơ học",
      icon: Compass,
    },
    {
      id: "optics",
      title: "Quang học",
      icon: Sun,
    },
    {
      id: "waves",
      title: "Dao động và sóng",
      icon: Waves,
    },
    {
      id: "thermodynamics",
      title: "Nhiệt học",
      icon: Flame,
    },
  ];

  const disciplineStyles: Record<Discipline, { activeClass: string; iconColor: string }> = {
    electricity: {
      activeClass: "bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm shadow-amber-500/20 font-bold",
      iconColor: "text-amber-400",
    },
    mechanics: {
      activeClass: "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/20 font-bold",
      iconColor: "text-cyan-400",
    },
    optics: {
      activeClass: "bg-orange-500/20 border-orange-400 text-orange-200 shadow-sm shadow-orange-500/20 font-bold",
      iconColor: "text-orange-400",
    },
    waves: {
      activeClass: "bg-blue-500/20 border-blue-400 text-blue-200 shadow-sm shadow-blue-500/20 font-bold",
      iconColor: "text-blue-400",
    },
    thermodynamics: {
      activeClass: "bg-rose-500/20 border-rose-400 text-rose-200 shadow-sm shadow-rose-500/20 font-bold",
      iconColor: "text-rose-400",
    },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner: Thu nhỏ & rút ngắn gọn gàng */}
      <div className="bg-gradient-to-br from-slate-900/95 via-emerald-950/25 to-slate-900/90 border border-emerald-500/40 p-3 sm:p-4 rounded-xl shadow-md backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 shadow-xs">
              Phân Hệ 2 • Mô Phỏng Tương Tác
            </span>
            <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
              Phòng Thí Nghiệm Vật Lí Ảo
            </h1>
          </div>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">Mô phỏng số học &amp; Đồ thị tương tác</span>
        </div>
      </div>

      {/* Discipline Tabs: Thu nhỏ, chỉ giữ lại tên gọi */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {disciplines.map((d) => {
          const Icon = d.icon;
          const isActive = activeDiscipline === d.id;
          const style = disciplineStyles[d.id as Discipline];
          return (
            <button
              key={d.id}
              onClick={() => setActiveDiscipline(d.id as Discipline)}
              className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all border flex items-center justify-center gap-2 ${
                isActive
                  ? style.activeClass
                  : "bg-slate-900/85 border-slate-700/80 text-slate-300 hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? style.iconColor : "text-slate-400"}`} />
              <span>{d.title}</span>
            </button>
          );
        })}
      </div>

      {/* Render Active Simulation Component */}
      <div className="mt-4">
        {activeDiscipline === "electricity" && <ElectricityLab />}
        {activeDiscipline === "mechanics" && <MechanicsLab />}
        {activeDiscipline === "optics" && <OpticsLab />}
        {activeDiscipline === "waves" && <WavesLab />}
        {activeDiscipline === "thermodynamics" && <ThermodynamicsLab />}
      </div>
    </div>
  );
};
