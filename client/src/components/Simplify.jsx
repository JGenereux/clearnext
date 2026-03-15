import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowLeft, Leaf, Zap, RotateCcw, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Simplify({ onBack }) {
  // 1. FIXED STATE: Ensure growth stays within a reasonable scale (1 to 2.5)
  const [growth, setGrowth] = useState(() => {
    const saved = localStorage.getItem('plant-growth');
    return saved ? Math.min(parseFloat(saved), 2.5) : 1; 
  });

  const [taskIndex, setTaskIndex] = useState(0);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [currentLevelName, setCurrentLevelName] = useState("");

  const smartTasks = [
    { id: 1, source: 'Slack', text: "Reply to Design Lead about header padding" },
    { id: 2, source: 'Meet', text: "Prepare 3 bullet points for 2pm Sync" },
    { id: 3, source: 'Email', text: "Confirm SAIT diploma application receipt" }
  ];

  useEffect(() => {
    localStorage.setItem('plant-growth', growth.toString());
    
    // Level Up Thresholds
    const checkLevel = (val) => {
      if (val >= 2.2 && localStorage.getItem('last-level') !== 'Forest') {
        triggerLevelUp("Forest Giant", "🌲");
      } else if (val >= 1.6 && localStorage.getItem('last-level') !== 'Tree') {
        triggerLevelUp("Sturdy Tree", "🌳");
      } else if (val >= 1.2 && localStorage.getItem('last-level') !== 'Sapling') {
        triggerLevelUp("Growing Sapling", "🌿");
      }
    };
    checkLevel(growth);
  }, [growth]);

  const triggerLevelUp = (name, emoji) => {
    setCurrentLevelName(name);
    setShowLevelModal(true);
    localStorage.setItem('last-level', name);
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#059669', '#34d399', '#fbbf24'] });
  };

  const handleComplete = () => {
    confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
    // Scale increment is smaller now so it doesn't get huge too fast
    if (growth < 2.5) setGrowth(prev => prev + 0.15); 
    setTaskIndex((prev) => (prev + 1) % smartTasks.length);
  };

  const resetGrowth = () => {
    if (window.confirm("Start over? Your plant will return to a sprout.")) {
      setGrowth(1);
      setTaskIndex(0);
      localStorage.setItem('plant-growth', '1');
      localStorage.removeItem('last-level');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf7] flex flex-col items-center p-8 font-sans overflow-hidden relative">
      
      {/* --- NEW SPLASH BACKGROUND ELEMENTS --- */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ x: [0, 30, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-emerald-100/40 blur-[100px] rounded-full" 
        />
        <motion.div 
          animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute bottom-[10%] left-[-5%] w-80 h-80 bg-orange-50/50 blur-[100px] rounded-full" 
        />
      </div>

      {/* LEVEL UP MODAL */}
      <AnimatePresence>
        {showLevelModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-950/20 backdrop-blur-sm" onClick={() => setShowLevelModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white p-12 rounded-[40px] shadow-2xl border border-emerald-100 max-w-sm w-full text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                <Sparkles className="text-emerald-600 absolute animate-ping opacity-20" />
                {growth < 1.6 ? '🌿' : growth < 2.2 ? '🌳' : '🌲'}
              </div>
              <h2 className="text-2xl font-bold text-emerald-950 mb-6">Evolved into a {currentLevelName}!</h2>
              <button onClick={() => setShowLevelModal(false)} className="w-full bg-emerald-900 text-white py-4 rounded-2xl font-bold hover:bg-emerald-800 transition-all">Keep Growing</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOP BAR */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-12 relative z-10">
        <button onClick={onBack} className="group flex items-center gap-2 text-emerald-800/40 hover:text-emerald-900 transition-all font-bold text-sm">
          <ArrowLeft size={18} /> Exit Focus
        </button>
        <div className="flex items-center gap-3">
          <button onClick={resetGrowth} className="p-2 rounded-full text-emerald-800/20 hover:text-red-400 hover:bg-red-50 transition-all"><RotateCcw size={16} /></button>
          <div className="bg-white px-4 py-2 rounded-full border border-emerald-100 shadow-sm flex items-center gap-2 text-emerald-700 font-bold">
            <Leaf size={16} className="animate-bounce" /> 
            <span className="text-sm">Vibe: {currentLevelName || "Sprout"}</span>
          </div>
        </div>
      </div>

      {/* PLANT AREA - FIXED SCALE LOGIC */}
      <div className="relative h-64 flex items-end justify-center mb-20 z-10">
        <motion.div 
          key={growth}
          initial={{ scale: growth - 0.2, y: 20 }}
          animate={{ scale: growth, y: 0 }}
          transition={{ type: 'spring', damping: 12 }}
          className="text-9xl select-none"
        >
          {growth < 1.2 ? '🌱' : growth < 1.6 ? '🌿' : growth < 2.2 ? '🌳' : '🌲'}
        </motion.div>
        <div className="absolute bottom-4 w-32 h-4 bg-emerald-900/10 blur-xl rounded-full" />
      </div>

      {/* TASK CARD */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={taskIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white/80 backdrop-blur-md p-10 rounded-[45px] shadow-2xl border border-white/50 max-w-lg w-full text-center relative z-10"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-6">
            <Zap size={10} fill="currentColor" /> {smartTasks[taskIndex].source}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-emerald-950 mb-10 leading-tight">"{smartTasks[taskIndex].text}"</h2>
          <button onClick={handleComplete} className="w-full bg-emerald-700 text-white py-5 rounded-3xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-emerald-800 active:scale-95 transition-all">
            <CheckCircle2 size={22} /> Mark as Resolved
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}