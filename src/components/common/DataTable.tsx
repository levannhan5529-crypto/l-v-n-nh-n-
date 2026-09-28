import React, { useState, useMemo } from "react";
import { Download, ChevronLeft, ChevronRight, Search, FileSpreadsheet } from "lucide-react";
import { TrackingPoint } from "../../types/physics";

interface DataTableProps {
  data: TrackingPoint[];
  activeFrameIndex?: number;
  onSelectFrame?: (frameIndex: number) => void;
  title?: string;
  className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  activeFrameIndex,
  onSelectFrame,
  title = "Bảng Dữ liệu Động học Thực nghiệm",
  className = "",
}) => {
  const [page, setPage] = useState(0);
  const pageSize = 8;
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof TrackingPoint>("frameIndex");
  const [sortAsc, setSortAsc] = useState(true);

  // Filter and sort
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.frameIndex.toString().includes(term) ||
        item.timeSeconds.toString().includes(term) ||
        item.posX.toString().includes(term) ||
        item.posY.toString().includes(term)
      );
    });
  }, [data, searchTerm]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const currentPageData = sortedData.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (field: keyof TrackingPoint) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const exportCSV = () => {
    if (data.length === 0) return;
    const headers = [
      "Khung_hinh",
      "Thoi_gian_t_(s)",
      "Pixel_X",
      "Pixel_Y",
      "Toa_do_X_(m)",
      "Toa_do_Y_(m)",
      "Van_toc_Vx_(m/s)",
      "Van_toc_Vy_(m/s)",
      "Van_toc_tong_V_(m/s)",
      "Gia_toc_a_(m/s2)",
      "Do_tin_cay_AI_(%)",
    ];

    const rows = data.map((d) => [
      d.frameIndex,
      d.timeSeconds.toFixed(3),
      d.filteredX.toFixed(1),
      d.filteredY.toFixed(1),
      d.posX.toFixed(4),
      d.posY.toFixed(4),
      d.velocityX?.toFixed(4) ?? 0,
      d.velocityY?.toFixed(4) ?? 0,
      d.velocityTotal?.toFixed(4) ?? 0,
      d.acceleration?.toFixed(4) ?? 0,
      (d.confidence * 100).toFixed(1),
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PHY_AI_LAB_Data_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden ${className}`}>
      {/* Table Header */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-100">{title}</h3>
          <span className="text-xs bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-800/60 font-mono">
            {data.length} mẫu
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              className="bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 w-36"
            />
          </div>

          {/* Export button */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg transition font-medium shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300 font-mono">
          <thead className="bg-slate-950/70 text-[11px] text-slate-400 border-b border-slate-800 select-none">
            <tr>
              <th
                onClick={() => handleSort("frameIndex")}
                className="py-2.5 px-3 cursor-pointer hover:text-cyan-400"
              >
                Khung # {sortField === "frameIndex" && (sortAsc ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("timeSeconds")}
                className="py-2.5 px-3 cursor-pointer hover:text-cyan-400"
              >
                Thời gian t (s) {sortField === "timeSeconds" && (sortAsc ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("posX")}
                className="py-2.5 px-3 cursor-pointer hover:text-cyan-400"
              >
                Tọa độ x (m) {sortField === "posX" && (sortAsc ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("posY")}
                className="py-2.5 px-3 cursor-pointer hover:text-cyan-400"
              >
                Tọa độ y (m) {sortField === "posY" && (sortAsc ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("velocityTotal")}
                className="py-2.5 px-3 cursor-pointer hover:text-cyan-400"
              >
                Vận tốc v (m/s) {sortField === "velocityTotal" && (sortAsc ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("acceleration")}
                className="py-2.5 px-3 cursor-pointer hover:text-cyan-400"
              >
                Gia tốc a (m/s²) {sortField === "acceleration" && (sortAsc ? "↑" : "↓")}
              </th>
              <th className="py-2.5 px-3">Độ tin cậy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {currentPageData.length > 0 ? (
              currentPageData.map((row) => {
                const isActive = activeFrameIndex === row.frameIndex;
                return (
                  <tr
                    key={row.frameIndex}
                    onClick={() => onSelectFrame && onSelectFrame(row.frameIndex)}
                    className={`cursor-pointer transition hover:bg-slate-800/70 ${
                      isActive ? "bg-cyan-950/60 text-cyan-200 font-semibold" : ""
                    }`}
                  >
                    <td className="py-2 px-3 flex items-center gap-1.5">
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />}
                      #{row.frameIndex}
                    </td>
                    <td className="py-2 px-3 text-slate-200">{row.timeSeconds.toFixed(3)}</td>
                    <td className="py-2 px-3">{row.posX.toFixed(3)}</td>
                    <td className="py-2 px-3 text-amber-300">{row.posY.toFixed(3)}</td>
                    <td className="py-2 px-3 text-emerald-300">
                      {row.velocityTotal !== undefined ? row.velocityTotal.toFixed(3) : "—"}
                    </td>
                    <td className="py-2 px-3 text-purple-300">
                      {row.acceleration !== undefined ? row.acceleration.toFixed(3) : "—"}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                        {(row.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  Không tìm thấy dữ liệu phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
        <div>
          Trang {totalPages > 0 ? page + 1 : 0} / {totalPages} ({sortedData.length} kết quả)
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
