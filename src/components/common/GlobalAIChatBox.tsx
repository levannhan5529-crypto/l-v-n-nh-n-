import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Zap,
  Flame,
  RotateCcw,
  SlidersHorizontal,
  GraduationCap,
  Lightbulb,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { AIEngineType, TutorMessage } from "../../types/physics";
import { MathText } from "./MathText";

interface GlobalAIChatBoxProps {
  currentTab?: string;
}

export const GlobalAIChatBox: React.FC<GlobalAIChatBoxProps> = ({
  currentTab,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [modelEngine, setModelEngine] = useState<AIEngineType>("hybrid");
  const [gradeLevel, setGradeLevel] = useState<"THPT-Lop10" | "THPT-Lop11" | "THPT-Lop12" | "THCS">("THPT-Lop10");
  const [roleMode, setRoleMode] = useState<"student-socratic" | "teacher-stem">("student-socratic");
  const [detailLevel, setDetailLevel] = useState<"deep" | "fast">("deep");
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: "quick-intro",
      sender: "ai",
      content: `Chào bạn! Tôi là Cố vấn Vật lí AI. Hãy đặt câu hỏi hoặc gửi bài tập, tôi sẽ giải đáp **ngắn gọn, trực diện vào trọng tâm ý chính** kèm công thức chuẩn GDPT 2018.`,
      timestamp: Date.now(),
      modelEngine: "hybrid",
      modelName: "Trợ Lí Hợp Nhất Đa Luồng",
      accuracyScore: 99.9,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textCustom?: string) => {
    const text = (textCustom || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMsg: TutorMessage = {
      id: Math.random().toString(),
      sender: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.sender === "ai" ? "assistant" : "user",
        content: m.content,
      }));

      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          modelEngine,
          gradeLevel,
          roleMode,
          detailLevel,
        }),
      });

      const data = await res.json();
      if (data && data.reply) {
        const aiMsg: TutorMessage = {
          id: Math.random().toString(),
          sender: "ai",
          content: data.reply,
          timestamp: Date.now(),
          topic: data.topic,
          modelEngine: data.modelEngine || modelEngine,
          modelName: data.modelName || (modelEngine === "hybrid" ? "Trợ Lí Hợp Nhất Đa Luồng" : modelEngine === "chatgpt" ? "Trợ Lí Phân Tích Sâu" : "Trợ Lí Phản Hồi Nhanh"),
          accuracyScore: data.accuracyScore || 99.9,
          suggestedFollowUps: data.suggestedFollowUps,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || "Không nhận được phản hồi");
      }
    } catch (err: any) {
      const errMsg: TutorMessage = {
        id: Math.random().toString(),
        sender: "ai",
        content: `⚠️ Có lỗi kết nối: ${err.message}. Hãy thử lại hoặc chuyển kênh xử lý khác nhé!`,
        timestamp: Date.now(),
        modelEngine,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "intro-reset",
        sender: "ai",
        content: `Đã làm mới phiên hỏi đáp. Bạn có thể chọn chế độ **Phản Hồi Nhanh**, **Phân Tích Sâu** hoặc **Hợp Nhất Đa Luồng** và đặt câu hỏi vật lí bất kì nhé!`,
        timestamp: Date.now(),
        modelEngine,
        modelName: modelEngine === "hybrid" ? "Trợ Lí Hợp Nhất Đa Luồng" : modelEngine === "chatgpt" ? "Trợ Lí Phân Tích Sâu" : "Trợ Lí Phản Hồi Nhanh",
      },
    ]);
  };

  const promptSuggestions = [
    "Tại sao rơi tự do là nhanh dần đều?",
    "Ý nghĩa hệ số R² & nguyên nhân sai số g?",
    "Định luật Ohm & bản chất điện trở?",
    "Chu kì con lắc đơn & điều kiện góc nhỏ?",
    "Định luật II Newton & quán tính?",
    "Nguyên lí cổng quang điện MC-963?",
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans select-none">
      {/* Minimized Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 hover:from-slate-850 hover:to-slate-800 text-white px-4 py-3 rounded-full shadow-[0_4px_25px_rgba(6,182,212,0.35)] hover:shadow-[0_4px_30px_rgba(6,182,212,0.55)] hover:scale-105 transition-all duration-200 border-2 border-cyan-400/70 hover:border-cyan-300 ring-1 ring-cyan-300/40"
          title="Mở Cố Vấn AI (PHY-AI LAB)"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500/30 to-blue-500/40 flex items-center justify-center border border-cyan-400/60">
              <Bot className="w-4.5 h-4.5 text-cyan-300 group-hover:rotate-6 transition-transform" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <div className="text-left leading-tight hidden sm:block">
            <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
              <span>Cố Vấn AI</span>
              <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded-full border border-cyan-500/60 font-mono font-bold shadow-sm">
                Trực Tuyến
              </span>
            </div>
            <div className="text-[10px] text-slate-300 font-medium mt-0.5">Hỏi đáp Vật lí chuẩn 100%</div>
          </div>
        </button>
      )}

      {/* Expanded Floating Chat Box Window (Sleek, Compact, Powerful) */}
      {isOpen && (
        <div className="w-[94vw] sm:w-[460px] h-[580px] max-h-[85vh] bg-slate-950/95 border-2 border-cyan-400/60 rounded-2xl shadow-[0_12px_45px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden backdrop-blur-md ring-1 ring-cyan-400/30">
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border-b border-cyan-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/30 to-blue-600/30 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-sm">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <span>PHY-AI LAB</span>
                  <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-600/60 font-bold">
                    Cố Vấn Trực Tuyến
                  </span>
                </div>
                <div className="text-[10px] text-slate-300">Trợ lí Vật lí AI chuẩn GDPT 2018</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg border transition text-xs ${
                  showSettings
                    ? "bg-cyan-950 text-cyan-300 border-cyan-400"
                    : "text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700"
                }`}
                title="Tùy chỉnh khối lớp & vai trò sư phạm"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleResetChat}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-700 transition"
                title="Làm mới hội thoại"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-700 transition"
                title="Thu nhỏ box chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Engine Selector Bar */}
          <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
              Chế độ AI:
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setModelEngine("gemini")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  modelEngine === "gemini"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Chế độ phản hồi nhanh, tính toán tức thì"
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>Nhanh</span>
              </button>

              <button
                onClick={() => setModelEngine("chatgpt")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  modelEngine === "chatgpt"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Chế độ phân tích chi tiết, lập luận chặt chẽ"
              >
                <Flame className="w-2.5 h-2.5" />
                <span>Chuyên Sâu</span>
              </button>

              <button
                onClick={() => setModelEngine("hybrid")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  modelEngine === "hybrid"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Hợp nhất đa luồng kiểm chứng và đối chiếu kết quả"
              >
                <Zap className="w-2.5 h-2.5 text-cyan-200" />
                <span>Hợp Nhất</span>
              </button>
            </div>
          </div>

          {/* Collapsible Settings Drawer for Grade & Pedagogy */}
          {showSettings && (
            <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
              <div>
                <label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">
                  Khối Lớp GDPT 2018:
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="THPT-Lop10">Vật lí 10 (Cơ học)</option>
                  <option value="THPT-Lop11">Vật lí 11 (Điện &amp; Sóng)</option>
                  <option value="THPT-Lop12">Vật lí 12 (Nhiệt &amp; Hiện đại)</option>
                  <option value="THCS">KHTN THCS</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">
                  Định Dạng Sư Phạm:
                </label>
                <select
                  value={roleMode}
                  onChange={(e) => setRoleMode(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="student-socratic">Học Sinh (Gợi mở Socratic)</option>
                  <option value="teacher-stem">Giáo Viên (Bài dạy STEM)</option>
                </select>
              </div>
            </div>
          )}

          {/* Message List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs select-text scrollbar-thin">
            {messages.map((m) => {
              const isAI = m.sender === "ai";
              return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${isAI ? "justify-start" : "justify-end ml-auto"}`}
                >
                  {isAI && (
                    <div className="w-6 h-6 rounded-md bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`p-3 rounded-xl max-w-[88%] leading-relaxed ${
                      isAI
                        ? "bg-slate-900 border border-slate-800 text-slate-200 shadow-sm"
                        : "bg-cyan-600 text-white font-medium"
                    }`}
                  >
                    {isAI && (
                      <div className="flex items-center gap-1.5 text-[9px] text-cyan-400/90 mb-1.5 border-b border-slate-800 pb-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        <span className="font-semibold">{m.modelName || "Cố Vấn Vật Lí AI"}</span>
                        {m.accuracyScore && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400">Độ tin cậy {m.accuracyScore}%</span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="break-words">
                      <MathText text={m.content} />
                    </div>

                    {/* Suggested Follow-Ups */}
                    {isAI && m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1">
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                          <Lightbulb className="w-3 h-3 text-amber-400" />
                          <span>Gợi ý mở rộng:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {m.suggestedFollowUps.map((prompt, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSendMessage(prompt)}
                              className="text-[10px] text-left bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 px-2 py-1 rounded border border-slate-800 transition"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isAI && (
                    <div className="w-6 h-6 rounded-md bg-cyan-600 flex items-center justify-center text-slate-950 shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-md bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Đang tổng hợp và phân tích dữ liệu vật lí...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick High-Yield Topic Suggestions Bar */}
          <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800 flex gap-1.5 overflow-x-auto text-[10px] scrollbar-none">
            {promptSuggestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="whitespace-nowrap px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-900/95 border-t border-cyan-500/30 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Nhập bài tập, công thức hoặc hiện tượng vật lí..."
              disabled={isLoading}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold disabled:opacity-40 transition-all shadow-md shadow-cyan-500/25 ring-1 ring-cyan-300/40"
              title="Gửi câu hỏi"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

