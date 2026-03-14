import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowLeft, Leaf, Zap, RotateCcw, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Simplify({ onBack }) {
  // 1. STATE INITIALIZATION
  const [growth, setGrowth] = useState(() => {
    const saved = localStorage.getItem('plant-growth');
    return saved ? parseFloat(saved) : 1;
  });

  const [taskIndex, setTaskIndex] = useState(0);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [currentLevelName, setCurrentLevelName] = useState("");

  const smartTasks = [
    { id: 1, source: 'Slack', text: "Reply to Design Lead about header padding" },
    { id: 2, source: 'Meet', text: "Prepare 3 bullet points for 2pm Sync" },
    { id: 3, source: 'Email', text: "Confirm SAIT diploma application receipt" }
  ];

  // 2. WATCH GROWTH FOR LEVEL UP MOMENTS
  useEffect(() => {
    localStorage.setItem('plant-growth', growth.toString());

    // Check for "Level Up" thresholds
    const checkLevel = (val) => {
      if (val >= 5 && localStorage.getItem('last-level') !== 'Forest') {
        triggerLevelUp("Forest Giant", "🌲");
      } else if (val >= 3 && localStorage.getItem('last-level') !== 'Tree') {
        triggerLevelUp("Sturdy Tree", "🌳");
      } else if (val >= 1.5 && localStorage.getItem('last-level') !== 'Sapling') {
        triggerLevelUp("Growing Sapling", "🌿");
      }
    };

    checkLevel(growth);
  }, [growth]);

  const triggerLevelUp = (name, emoji) => {
    setCurrentLevelName(name);
    setShowLevelModal(true);
    localStorage.setItem('last-level', name.split(' ')[1] || name);
    
    // Extra celebration confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#059669', '#34d399', '#fbbf24']
    });
  };

  const handleComplete = () => {
    confetti({ 
      particleCount: 50, 
      spread: 40, 
      origin: { y: 0.8 }
    });
    
    if (growth < 6) setGrowth(prev => prev + 0.4); 
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
    <div className="min-h-screen bg-[#f8faf7] flex flex-col items-center p-8 font-sans overflow-hidden">
      
      {/* LEVEL UP MODAL */}
      <AnimatePresence>
        {showLevelModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-950/20 backdrop-blur-sm"
              onClick={() => setShowLevelModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative bg-white p-8 md:p-12 rounded-[40px] shadow-2xl border border-emerald-100 max-w-sm w-full text-center"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                <Sparkles className="text-emerald-600 absolute animate-ping opacity-20" />
                {growth < 3 ? '🌿' : growth < 5 ? '🌳' : '🌲'}
              </div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-600 mb-2">New Milestone!</h3>
              <h2 className="text-3xl font-bold text-emerald-950 mb-6">Your vibe evolved into a {currentLevelName}!</h2>
              <button 
                onClick={() => setShowLevelModal(false)}
                className="w-full bg-emerald-900 text-white py-4 rounded-2xl font-bold hover:bg-emerald-800 transition-all"
              >
                Keep Growing
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOP BAR */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-12 relative z-10">
        <button onClick={onBack} className="group flex items-center gap-2 text-emerald-800/40 hover:text-emerald-900 transition-all font-bold text-sm">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform"/> Exit Focus
        </button>
        
        <div className="flex items-center gap-3">
          <button onClick={resetGrowth} className="p-2 rounded-full text-emerald-800/20 hover:text-red-400 hover:bg-red-50 transition-all">
            <RotateCcw size={16} />
          </button>
          <div className="bg-white px-4 py-2 rounded-full border border-emerald-100 shadow-sm flex items-center gap-2 text-emerald-700 font-bold">
            <Leaf size={16} className="animate-bounce" /> 
            <span className="text-sm">Vibe Level: {Math.floor(growth)}</span>
          </div>
        </div>
      </div>

      {/* PLANT AREA */}
      <div className="relative h-64 flex items-end justify-center mb-20">
        <motion.div 
          animate={{ scale: growth, y: [0, -5, 0] }}
          transition={{ 
            scale: { type: 'spring', stiffness: 100 },
            y: { repeat: Infinity, duration: 3, ease: "easeInOut" }
          }}
          className="text-9xl relative z-10 select-none"
        >
          {growth < 1.5 ? '🌱' : growth < 3 ? '🌿' : growth < 5 ? '🌳' : '🌲'}
        </motion.div>
        <div className="absolute bottom-0 w-32 h-6 bg-emerald-900/5 blur-xl rounded-full" />
      </div>

      {/* TASK CARD */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={taskIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          className="bg-white p-10 rounded-[45px] shadow-2xl shadow-emerald-900/5 border border-emerald-100/50 max-w-lg w-full text-center relative overflow-hidden"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-6">
            <Zap size={10} fill="currentColor" /> {smartTasks[taskIndex].source} Integration
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-emerald-950 mb-10 leading-tight tracking-tight">
            "{smartTasks[taskIndex].text}"
          </h2>
          
          <button 
            onClick={handleComplete}
            className="w-full bg-emerald-700 text-white py-5 rounded-[24px] font-bold text-lg flex items-center justify-center gap-3 hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/20 transition-all active:scale-[0.98]"
          >
            <CheckCircle2 size={22} /> Mark as Resolved
          </button>
        </motion.div>
      </AnimatePresence>

      <div className="mt-12 flex items-center gap-4">
         <div className="h-[1px] w-12 bg-emerald-200" />
         <p className="text-emerald-800/30 text-[11px] font-bold uppercase tracking-[0.2em]">Deep Work Protocol Active</p>
         <div className="h-[1px] w-12 bg-emerald-200" />
      </div>
    </div>
  );
}