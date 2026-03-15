import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle, Plus, LogOut, Leaf, X } from 'lucide-react';

export default function Dashboard({ onEnterFocus, onLogout }) {
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);

  const tasks = [
    { id: 1, title: "Reply to Design Lead", source: "Slack", status: "pending", reward: "+0.15" },
    { id: 2, title: "Prepare 3 bullet points", source: "Meet", status: "pending", reward: "+0.10" },
    { id: 3, title: "Confirm SAIT application", source: "Email", status: "completed", reward: "+0.20" },
  ];

  /*
  INTEGRATION NOTES:
  1. Dashboard Page (Dashboard.jsx): Fetch all tasks when component mounts.
  2. State Setup: Replace static array with const [tasks, setTasks] = useState([]).
  3. Data Fetching: Use useEffect to call GET /api/tasks (filtered by user ID).
  4. Status Syncing: Checkmark triggers PATCH /api/tasks/:id to update DB.
  5. Slack Integration: Sync function for Slack Webhook events.
  6. Dynamic Context: Geolocation/Date API for "Calgary • Mar 2026".
  */

  const moodOptions = [
    { label: "Low Energy", emoji: "🌱", level: 25, desc: "Resting" },
    { label: "Good", emoji: "🌿", level: 50, desc: "Growing" },
    { label: "Great", emoji: "🌳", level: 75, desc: "Thriving" },
    { label: "Excellent", emoji: "🌸", level: 100, desc: "Blooming" },
  ];

  const foliage = {
    left: "https://images.unsplash.com/photo-1596199050105-6d5d32222916?auto=format&fit=crop&q=80&w=600",
    right: "https://images.unsplash.com/photo-1545147986-a9d6f210df77?auto=format&fit=crop&q=80&w=600"
  };

  return (
    <div className="min-h-screen bg-[#f1f5f0] flex font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-hidden relative">
      
      {/* --- MOOD POP-UP MODAL --- */}
      <AnimatePresence>
        {isMoodModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoodModalOpen(false)}
              className="absolute inset-0 bg-emerald-950/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white/90 backdrop-blur-2xl p-10 rounded-[4rem] shadow-2xl border border-white max-w-lg w-full text-center"
            >
              <button 
                onClick={() => setIsMoodModalOpen(false)}
                className="absolute top-8 right-8 text-emerald-900/20 hover:text-emerald-900 transition-colors"
              >
                <X size={24} />
              </button>

              <h2 className="text-3xl font-black text-emerald-950 tracking-tighter mb-2">How’s your garden?</h2>
              <p className="text-emerald-800/60 text-sm font-medium mb-10">Select the plant that matches your vibe today.</p>

              <div className="grid grid-cols-2 gap-4 mb-10">
                {moodOptions.map((mood) => (
                  <motion.button
                    key={mood.label}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedMood(mood.label)}
                    className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-2 ${
                      selectedMood === mood.label 
                      ? 'border-emerald-500 bg-emerald-50 shadow-inner' 
                      : 'border-transparent bg-white/50 hover:bg-white'
                    }`}
                  >
                    <span className="text-4xl">{mood.emoji}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900">{mood.label}</span>
                  </motion.button>
                ))}
              </div>

              <button 
                onClick={() => {
                  // BACKEND NOTE: Call POST /api/mood here with the level
                  setIsMoodModalOpen(false);
                }}
                className="w-full py-5 bg-emerald-950 text-white rounded-[2rem] font-black tracking-tight text-lg shadow-xl shadow-emerald-950/20 hover:bg-black transition-colors"
              >
                Save Today's Vibe
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DECORATIVE FOLIAGE --- */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
        <motion.img 
          src={foliage.left}
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: [-20, 0, -20], y: [0, 20, 0], opacity: 1 }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-20 top-1/4 w-64 h-auto rotate-12 mix-blend-multiply opacity-40 lg:opacity-80"
          alt=""
        />
        <motion.img 
          src={foliage.right}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: [20, 0, 20], y: [0, -30, 0], opacity: 1 }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-32 bottom-10 w-80 h-auto -rotate-12 mix-blend-multiply opacity-40 lg:opacity-80"
          alt=""
        />
      </div>

      <main className="flex-1 p-12 overflow-y-auto relative z-20" id="main-content">
        <header className="max-w-5xl mx-auto flex justify-between items-start mb-16 relative">
          <div>
            <h1 className="text-5xl font-black text-emerald-950 tracking-tighter leading-none mb-2">
              Workspace <span className="italic font-serif text-emerald-600 font-normal">Hub</span>
            </h1>
            <div className="flex items-center gap-2 text-emerald-800/60 font-bold uppercase text-[10px] tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              Calgary Studio • Mar 2026
            </div>
          </div>

          <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="p-5 rounded-[2rem] bg-white text-red-400 border border-red-50"
            >
              <LogOut size={22} />
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onEnterFocus}
              className="bg-emerald-950 text-white px-10 py-5 rounded-[2.5rem] font-black flex items-center gap-3"
            >
              <Play size={18} fill="currentColor" /> 
              <span className="tracking-tight text-lg">Focus Mode</span>
            </motion.button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          <section className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-black text-emerald-900/40 uppercase tracking-[0.3em]">Queue</h2>
            </div>

            <div role="list" className="grid gap-4">
              {tasks.map((task) => (
                <motion.div 
                  key={task.id}
                  whileHover={{ x: 10, backgroundColor: "rgba(255, 255, 255, 1)" }}
                  className="bg-white/70 backdrop-blur-md p-6 rounded-[2.5rem] border border-white flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-5">
                    <button className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center ${
                      task.status === 'completed' ? 'bg-emerald-50 text-emerald-500' : 'bg-white text-emerald-900/20 border border-emerald-50'
                    }`}>
                      {task.status === 'completed' ? <CheckCircle size={24} /> : <div className="w-6 h-6 border-2 border-current rounded-full" />}
                    </button>
                    <div>
                      <h3 className={`text-lg font-bold ${task.status === 'completed' ? 'text-emerald-900/30 line-through' : 'text-emerald-950'}`}>
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">{task.source}</span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 rounded-md">{task.reward} O₂</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          <aside className="space-y-8">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-emerald-950 p-8 rounded-[3.5rem] text-white relative overflow-hidden"
            >
              <div className="relative z-10">
                <Leaf className="text-emerald-400 mb-2" size={24} />
                <p className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest">Atmosphere</p>
                <p className="text-4xl font-black tracking-tighter">Fresh</p>
              </div>
              <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-emerald-500/20 blur-[60px] rounded-full" />
            </motion.div>

            <section className="bg-white/40 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white/50">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-bold text-emerald-900/40 uppercase tracking-[0.3em]">Daily Vibe</h3>
              </div>

              <div className="flex justify-between items-end h-32 gap-3 px-1">
                {[
                  { day: 'M', level: 45 },
                  { day: 'T', level: 75 },
                  { day: 'W', level: 95 },
                  { day: 'T', level: 60 },
                  { day: 'F', level: 85 },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-3 flex-1">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${item.level}%` }}
                      className={`w-full rounded-2xl ${item.level > 70 ? 'bg-emerald-500/30' : 'bg-emerald-950/10'}`}
                    />
                    <span className="text-[10px] font-black text-emerald-900/20">{item.day}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setIsMoodModalOpen(true)}
                className="w-full mt-8 py-4 bg-white/60 hover:bg-white rounded-2xl text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] transition-all border border-emerald-50"
              >
                Log Today's Mood
              </button>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}