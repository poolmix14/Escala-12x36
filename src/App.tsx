import React, { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  differenceInDays,
  startOfDay,
  addYears,
  subYears,
  startOfYear,
  endOfYear,
  eachMonthOfInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Music, 
  Play, 
  Loader2,
  Info,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Music Generator Component ---
const MusicGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Música ambiente relaxante para um dia de folga');
  const [error, setError] = useState<string | null>(null);

  const generateMusic = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContentStream({
        model: "lyria-3-clip-preview",
        contents: prompt,
      });

      let audioBase64 = "";
      let mimeType = "audio/wav";

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
        }
      }

      if (!audioBase64) throw new Error("Nenhum áudio gerado");

      const binary = atob(audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err) {
      console.error(err);
      setError("Erro ao gerar música. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Music className="w-5 h-5 text-purple-300" />
        </div>
        <h2 className="text-xl font-semibold text-white">Gerador de Ambiente</h2>
      </div>
      
      <div className="space-y-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex: Jazz suave para trabalhar..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
        />
        
        <button
          onClick={generateMusic}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Gerar Música
            </>
          )}
        </button>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {audioUrl && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-2"
          >
            <audio controls src={audioUrl} className="w-full h-10 rounded-lg" />
          </motion.div>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [view, setView] = useState<'year' | 'month'>('year');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const saved = localStorage.getItem('shift-start-date');
    return saved ? new Date(saved) : null;
  });

  useEffect(() => {
    if (startDate) {
      localStorage.setItem('shift-start-date', startDate.toISOString());
    }
  }, [startDate]);

  const isWorkDay = (date: Date) => {
    if (!startDate) return false;
    const diff = differenceInDays(startOfDay(date), startOfDay(startDate));
    // 12x36 means work one day, off one day (48h cycle)
    // If diff is even (0, 2, 4...), it's a work day
    return diff >= 0 && diff % 2 === 0;
  };

  const handleMonthClick = (month: Date) => {
    setCurrentMonth(month);
    setView('month');
  };

  const renderYearHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8 px-2">
        <h2 className="text-4xl font-bold text-white">
          {format(currentYear, 'yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentYear(subYears(currentYear, 1))}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentYear(addYears(currentYear, 1))}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const months = eachMonthOfInterval({
      start: startOfYear(currentYear),
      end: endOfYear(currentYear)
    });

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(monthStart);
          const startDateView = startOfWeek(monthStart);
          const endDateView = endOfWeek(monthEnd);
          const calendarDays = eachDayOfInterval({ start: startDateView, end: endDateView });

          return (
            <motion.div
              key={month.toString()}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleMonthClick(month)}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 cursor-pointer hover:border-red-500/30 transition-all shadow-xl group"
            >
              <h3 className="text-lg font-semibold text-white mb-3 capitalize group-hover:text-red-400 transition-colors">
                {format(month, 'MMMM', { locale: ptBR })}
              </h3>
              <div className="grid grid-cols-7 gap-1">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <div key={i} className="text-[10px] text-white/20 text-center font-bold">{d}</div>
                ))}
                {calendarDays.map((day, i) => {
                  const isWork = isWorkDay(day);
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  return (
                    <div key={i} className="relative aspect-square flex items-center justify-center">
                      {isWork && isCurrentMonth && (
                        <div className="absolute w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                      )}
                      <span className={cn(
                        "text-[10px] relative z-10",
                        isCurrentMonth ? "text-white/60" : "text-white/5"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderMonthHeader = () => {
    return (
      <div className="flex flex-col gap-4 mb-8">
        <button 
          onClick={() => setView('year')}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors w-fit group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar para o ano
        </button>
        <div className="flex items-center justify-between px-2">
          <h2 className="text-3xl font-bold text-white capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDateView = startOfWeek(monthStart);
    const endDateView = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
      start: startDateView,
      end: endDateView,
    });

    return (
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const isWork = isWorkDay(day);
          const isSelectedStart = startDate && isSameDay(day, startDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toString()}
              onClick={() => setStartDate(day)}
              className={cn(
                "relative aspect-square flex items-center justify-center cursor-pointer group transition-all duration-300",
                !isCurrentMonth && "opacity-20"
              )}
            >
              {/* Work Day Indicator (Red Circle) */}
              <AnimatePresence>
                {isWork && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className={cn(
                      "absolute inset-1 rounded-full border-2 border-red-500/50",
                      isSelectedStart ? "bg-red-500 shadow-lg shadow-red-500/40" : "bg-red-500/20"
                    )}
                  />
                )}
              </AnimatePresence>

              {/* Today Indicator */}
              {isToday && !isWork && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-400 rounded-full" />
              )}

              <span className={cn(
                "relative z-10 text-lg font-medium transition-colors",
                isWork ? "text-white" : "text-white/70 group-hover:text-white",
                isSelectedStart && "font-bold"
              )}>
                {format(day, 'd')}
              </span>

              {/* Hover Effect */}
              <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/5 transition-colors" />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-purple-500/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative max-w-7xl mx-auto px-4 py-12 md:py-20">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left Column: Calendar Views */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 text-red-400">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-widest">Escala 12x36</span>
            </div>
            
            <AnimatePresence mode="wait">
              {view === 'year' ? (
                <motion.div
                  key="year-view"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  {renderYearHeader()}
                  {renderYearView()}
                </motion.div>
              ) : (
                <motion.div
                  key="month-view"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="max-w-2xl mx-auto lg:mx-0"
                >
                  {renderMonthHeader()}
                  <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl">
                    <div className="grid grid-cols-7 mb-4">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                        <div key={day} className="text-center text-white/40 text-xs font-bold uppercase tracking-wider">
                          {day}
                        </div>
                      ))}
                    </div>
                    {renderMonthCells()}
                  </div>

                  <div className="mt-8 flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <Info className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
                    <p className="text-sm text-white/60 leading-relaxed">
                      Clique em qualquer dia para definir como seu <span className="text-red-400 font-semibold">primeiro dia de trabalho</span>. 
                      O calendário marcará automaticamente os dias subsequentes da sua escala.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Tools */}
          <div className="w-full lg:w-80 space-y-8">
            <MusicGenerator />
            
            <div className="bg-gradient-to-br from-red-500/10 to-transparent rounded-2xl p-6 border border-red-500/20">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Próximo Plantão
              </h3>
              {startDate ? (
                <p className="text-3xl font-bold text-red-400">
                  {isWorkDay(new Date()) ? "HOJE" : "AMANHÃ"}
                </p>
              ) : (
                <p className="text-white/40 italic">Selecione uma data inicial</p>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="relative py-12 text-center text-white/20 text-xs tracking-widest uppercase">
        Escala 12x36 &bull; 2026
      </footer>
    </div>
  );
}
