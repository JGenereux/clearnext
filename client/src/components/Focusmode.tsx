/**
 * @component FocusMode (Simplify.tsx)
 * @description Active deep-work session interface for Zeynep's Workspace Hub.
 * * @backend_integration_tasks
 * 1. SESSION START: Trigger POST /api/sessions/start on component mount to log start time.
 * 2. SLACK API: Backend should set user status to 🧘 (Focusing) upon session start.
 * 4. TASK SYNC: Replace `smartTasks` placeholder with GET /api/tasks/active.
 * 5. PERSISTENCE: Replace localStorage logic with a DB check to prevent timer reset on refresh.
 * * @contributors Zeynep Ozdemir (UX), Celine Surjanto, Khushdeep Kaur
*/

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowLeft, Zap, Wind, Coffee, X } from 'lucide-react';

interface FocusmodeProps {
  onBack: () => void;
}

interface SmartTask {
  id: number;
  source: string;
  text: string;
}

export default function Simplify({ onBack }: FocusmodeProps) {
  const FOCUS_TIME: number = 40 * 60; 
  const focusSplash: string = "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=1600";

  // --- STATE ---
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const savedTime = localStorage.getItem('focus-timer-left');
    const lastTimestamp = localStorage.getItem('focus-timer-timestamp');
    if (savedTime && lastTimestamp) {
      const elapsed = Math.floor((Date.now() - parseInt(lastTimestamp)) / 1000);
      return Math.max(parseInt(savedTime) - elapsed, 0);
    }
    return FOCUS_TIME;
  });
  
  const [growth, setGrowth] = useState<number>(() => {
    const saved = localStorage.getItem('plant-growth');
    return saved ? Math.min(parseFloat(saved), 2.5) : 1; 
  });

  const [taskIndex, setTaskIndex] = useState<number>(0);
  const [currentLevelName, setCurrentLevelName] = useState<string>("Sprout");
  const [userName] = useState<string>(() => localStorage.getItem('userName') || "Zeynep");

  const smartTasks: SmartTask[] = [
    { id: 1, source: 'Slack', text: "Reply to Design Lead about header padding" },
    { id: 2, source: 'Meet', text: "Prepare 3 bullet points for 2pm Sync" },
    { id: 3, source: 'Email', text: "Confirm SAIT diploma application receipt" }
  ];

  // --- TIMER LOGIC ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    localStorage.setItem('focus-timer-left', timeLeft.toString());
    localStorage.setItem('focus-timer-timestamp', Date.now().toString());
    return () => { if (interval) clearInterval(interval); };
  }, [timeLeft]);

  useEffect(() => {
    localStorage.setItem('plant-growth', growth.toString());
    const levels: string[] = ["Sprout", "Sapling", "Tree", "Giant"];
    setCurrentLevelName(levels[Math.floor(growth / 0.8)] || "Giant");
  }, [growth]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleComplete = () => {
    if (taskIndex < smartTasks.length - 1) {
      setTaskIndex(taskIndex + 1);
      setGrowth((prev) => Math.min(prev + 0.4, 2.5));
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f0] flex font-sans overflow-hidden relative">
      
      {/* --- EXIT CONFIRMATION MODAL --- */}
      <AnimatePresence>
        {isExitModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsExitModalOpen(false)} className="absolute inset-0 bg-emerald-950/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white p-12 rounded-[4rem] shadow-2xl border border-white max-w-sm w-full text-center" >
              <div className="text-7xl mb-6">🐨💧</div>
              <h2 className="text-3xl font-black text-emerald-950 tracking-tighter mb-2">Stop Synthesis?</h2>
              <p className="text-emerald-800/60 font-medium text-sm mb-10">Koda's garden needs your focus to produce O₂. If you leave now, the plant's growth will pause.</p>
              <div className="flex flex-col gap-3">
                <button onClick={onBack} className="w-full py-5 bg-red-50 text-red-600 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-red-100 transition-colors">Yes, Exit Focus</button>
                <button onClick={() => setIsExitModalOpen(false)} className="w-full py-5 bg-emerald-950 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-black transition-colors">Continue Focusing</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- BACKGROUND --- */}
      <div className="absolute inset-0 z-0">
        <img src={focusSplash} className="w-full h-full object-cover opacity-20 grayscale-[20%]" alt="Focus Background" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#f1f5f0]/90 via-transparent to-[#f1f5f0]/80 backdrop-blur-[2px]" />
      </div>

      {/* --- SIDEBAR --- */}
      <div className="w-1/3 h-screen relative z-10 flex flex-col items-center justify-between p-12 border-r border-emerald-900/5 bg-white/70 backdrop-blur-xl">
        <div className="w-full">
          <button onClick={() => setIsExitModalOpen(true)} className="group flex items-center gap-2 text-emerald-800/40 hover:text-emerald-900 transition-all font-black text-[10px] uppercase tracking-widest" >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Exit Focus
          </button>
        </div>

        <div className="flex flex-col items-center w-full">
          <motion.div key={growth} animate={{ y: [0, -15, 0], rotate: [0, 2, 0, -2, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="text-[12rem] drop-shadow-2xl mb-8 select-none" >
            {growth < 1.2 ? '🌱' : growth < 1.6 ? '🌿' : growth < 2.2 ? '🌳' : '🌲'}
          </motion.div>

          <div className="relative flex flex-col items-center">
            {timeLeft > 0 ? (
              <div className="text-center">
                <h3 className="text-6xl font-black text-emerald-950 tracking-tighter font-mono">{formatTime(timeLeft)}</h3>
                <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                   <Wind size={12} className="animate-pulse" />
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Oxygen Synthesis</p>
                </div>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-orange-50 p-6 rounded-[2.5rem] border border-orange-100 text-center shadow-xl shadow-orange-900/5" >
                <Coffee className="text-orange-500 mx-auto mb-2" size={24} />
                <h3 className="text-xl font-black text-orange-950 tracking-tight leading-none">Break Time</h3>
                <p className="text-[10px] font-bold text-orange-800/60 uppercase tracking-widest mt-2">Session Complete</p>
              </motion.div>
            )}
          </div>

          <div className="mt-10 text-center">
            <h3 className="text-emerald-950 font-black text-3xl tracking-tighter">{currentLevelName}</h3>
            <p className="text-emerald-800/40 text-[10px] font-bold uppercase tracking-[0.3em]">Growth Phase</p>
          </div>
        </div>

        <div className="w-full bg-white/50 p-6 rounded-[2.5rem] border border-emerald-100 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[9px] font-black text-emerald-900/40 uppercase tracking-widest">Growth Progress</span>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{Math.round((growth / 2.5) * 100)}%</span>
          </div>
          <div className="w-full h-3 bg-emerald-100/30 rounded-full overflow-hidden border border-emerald-50">
            <motion.div animate={{ width: `${(growth / 2.5) * 100}%` }} className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL --- */}
      <div className="flex-1 h-screen relative z-10 flex flex-col p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-3 bg-white/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-xs shadow-lg">{userName.charAt(0)}</div>
            <div>
              <h4 className="text-xs font-black text-emerald-950 leading-none">Hey, {userName}</h4>
              <p className="text-[9px] text-emerald-800/60 font-bold uppercase tracking-widest">In Focus</p>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
          <div className="mb-14 text-center">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase tracking-[0.25em] mb-6 shadow-2xl" >
              <Zap size={12} className="fill-emerald-400" /> Focus Mode Active
            </motion.div>
            <h1 className="text-6xl font-black text-emerald-950 tracking-tighter leading-[1.1]">
              One thing at a time. <br/> <span className="italic font-serif text-emerald-600 font-normal">Finish it.</span>
            </h1>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={taskIndex} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }} transition={{ type: "spring", damping: 20, stiffness: 100 }} className="bg-white/80 backdrop-blur-2xl p-14 rounded-[4rem] shadow-lg border border-white" >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-10 border border-emerald-100">
                <Wind size={10} /> {smartTasks[taskIndex].source}
              </div>
              <h2 className="text-4xl font-bold text-emerald-950 mb-14 leading-tight tracking-tight">"{smartTasks[taskIndex].text}"</h2>
              <motion.button whileHover={{ scale: 1.02, backgroundColor: "#065f46" }} whileTap={{ scale: 0.98 }} onClick={handleComplete} className="w-full bg-emerald-700 text-white py-7 rounded-[2rem] font-black text-2xl flex items-center justify-center gap-4 transition-all" >
                <CheckCircle2 size={28} /> DONE
              </motion.button>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}