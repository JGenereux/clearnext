import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowLeft, Zap, User, Wind, Coffee } from 'lucide-react';


// 1. Define the props interface
interface FocusmodeProps {
  onBack: () => void;
}

// 2. Define the shape of a Task object
interface SmartTask {
  id: number;
  source: string;
  text: string;
}

export default function Simplify({ onBack }: FocusmodeProps) {
  const FOCUS_TIME: number = 40 * 60; // 40 minutes in seconds

  // --- TIMER STATE ---
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const savedTime = localStorage.getItem('focus-timer-left');
    const lastTimestamp = localStorage.getItem('focus-timer-timestamp');
    
    if (savedTime && lastTimestamp) {
      const elapsed = Math.floor((Date.now() - parseInt(lastTimestamp)) / 1000);
      return Math.max(parseInt(savedTime) - elapsed, 0);
    }
    return FOCUS_TIME;
  });
  
  const [isActive] = useState<boolean>(true);

  // --- GROWTH STATE ---
  const [growth, setGrowth] = useState<number>(() => {
    const saved = localStorage.getItem('plant-growth');
    return saved ? Math.min(parseFloat(saved), 2.5) : 1; 
  });

  const [taskIndex, setTaskIndex] = useState<number>(0);
  const [currentLevelName, setCurrentLevelName] = useState<string>("Sprout");
  const [userName] = useState<string>(() => localStorage.getItem('userName') || "User");

  const smartTasks: SmartTask[] = [
    { id: 1, source: 'Slack', text: "Reply to Design Lead about header padding" },
    { id: 2, source: 'Meet', text: "Prepare 3 bullet points for 2pm Sync" },
    { id: 3, source: 'Email', text: "Confirm SAIT diploma application receipt" }
  ];

  // --- TIMER LOGIC ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    
    localStorage.setItem('focus-timer-left', timeLeft.toString());
    localStorage.setItem('focus-timer-timestamp', Date.now().toString());

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

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

  // Handle task completion
  const handleComplete = () => {
    if (taskIndex < smartTasks.length - 1) {
      setTaskIndex(taskIndex + 1);
      setGrowth((prev) => Math.min(prev + 0.4, 2.5));
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f0] flex font-sans overflow-hidden">
      
      {/* --- LEFT SIDEBAR: PLANT & FUNCTIONAL TIMER --- */}
      <div className="w-1/3 h-screen relative flex flex-col items-center justify-between p-12 border-r border-emerald-900/5 bg-white">
        <div className="relative z-10 w-full">
           <button onClick={onBack} className="flex items-center gap-2 text-emerald-800/40 hover:text-emerald-900 transition-all font-black text-[10px] uppercase tracking-widest">
            <ArrowLeft size={16} /> Exit Focus
          </button>
        </div>

        <div className="relative z-10 flex flex-col items-center w-full">
          <motion.div 
            key={growth}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="text-[10rem] drop-shadow-2xl mb-4"
          >
            {growth < 1.2 ? '🌱' : growth < 1.6 ? '🌿' : growth < 2.2 ? '🌳' : '🌲'}
          </motion.div>

          <div className="relative flex flex-col items-center">
            {timeLeft > 0 ? (
              <div className="text-center">
                <h3 className="text-5xl font-black text-emerald-950 tracking-tighter font-mono">
                  {formatTime(timeLeft)}
                </h3>
                <p className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] mt-1">
                  Oxygen Synthesis Active
                </p>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-orange-50 p-6 rounded-[2.5rem] border border-orange-100 text-center"
              >
                <Coffee className="text-orange-500 mx-auto mb-2" size={24} />
                <h3 className="text-lg font-black text-orange-950 tracking-tight leading-none">
                  Let's have a break
                </h3>
                <p className="text-[10px] font-bold text-orange-800/60 uppercase tracking-widest mt-2">
                  40m Focus Complete
                </p>
              </motion.div>
            )}
          </div>

          <div className="mt-8 text-center">
            <h3 className="text-emerald-950 font-black text-2xl tracking-tighter">{currentLevelName}</h3>
            <p className="text-emerald-800/40 text-xs font-bold uppercase tracking-widest">Growth Phase</p>
          </div>
        </div>

        <div className="relative z-10 w-full bg-emerald-50 p-6 rounded-3xl border border-emerald-100/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest">Oxygen Level</span>
            <span className="text-xs font-black text-emerald-600">{Math.round((growth / 2.5) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-white rounded-full overflow-hidden">
            <motion.div 
              animate={{ width: `${(growth / 2.5) * 100}%` }}
              className="h-full bg-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDE: FOCUS STATION --- */}
      <div className="flex-1 h-screen relative flex flex-col p-12 overflow-y-auto">
        <div className="flex justify-between items-center mb-20">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200">
               <User size={20} />
             </div>
             <div>
               <h4 className="text-sm font-black text-emerald-950">Hey, {userName}</h4>
               <p className="text-[10px] text-emerald-800/40 font-bold uppercase tracking-widest">Calgary Studio</p>
             </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              <Wind size={12} /> Focus in progress
            </div>
            <h1 className="text-5xl font-black text-emerald-950 tracking-tighter leading-tight">
              One thing at a time. <br/>
              <span className="italic font-serif text-emerald-600">Finish it.</span>
            </h1>
          </div>

          <AnimatePresence mode="wait">
            <motion.div 
              key={taskIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-12 rounded-[48px] shadow-2xl shadow-emerald-900/5 border border-white"
            >
               <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-8">
                <Zap size={10} fill="currentColor" /> {smartTasks[taskIndex].source}
              </div>
              <h2 className="text-3xl font-bold text-emerald-950 mb-12 leading-snug">"{smartTasks[taskIndex].text}"</h2>
              <button 
                onClick={handleComplete} 
                className="w-full bg-emerald-700 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 hover:bg-emerald-800 shadow-xl shadow-emerald-900/10 active:scale-95 transition-all"
              >
                <CheckCircle2 size={24} /> DONE
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}