import React, { JSX, useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Play, CheckCircle, LogOut, Leaf, X, Wind } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { FocusTask } from './Focusmode';

// --- Types ---
interface Task {
  id: number;
  title: string;
  source: string;
  status: 'pending' | 'completed';
  reward: number;
}

interface MoodOption {
  label: string;
  emoji: string;
  level: number;
  desc: string;
}

interface DashboardProps {
  onEnterFocus: () => void;
  onLogout: () => void;
  onTasksLoaded: (tasks: FocusTask[]) => void;
}

export default function Dashboard({ onEnterFocus, onLogout, onTasksLoaded }: DashboardProps): JSX.Element {
  const { user } = useAuth();

  // --- State ---
  const [isMoodModalOpen, setIsMoodModalOpen] = useState<boolean>(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodHistory, setMoodHistory] = useState<{ label: string; emoji: string; level: number; timestamp: string }[]>([]);
  const [oxygen, setOxygen] = useState<number>(1.20);
  const [kodaMessage, setKodaMessage] = useState<string>("Let's get focused! 🌿");
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(true);

  const [petStats, setPetStats] = useState({ hunger: 70, happiness: 85, energy: 100 });
  const [petAction, setPetAction] = useState<string | null>(null);

  // --- Configuration ---
  const workHubSplash: string = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1200";

  const moodOptions: MoodOption[] = [
    { label: "Blooming", emoji: "🌸", level: 100, desc: "Feeling amazing and productive!" },
    { label: "Sprouting", emoji: "🌱", level: 75, desc: "Pretty good, ready to grow." },
    { label: "Rooting", emoji: "🌿", level: 50, desc: "Calm, steady, and grounded." },
    { label: "Wilting", emoji: "🍂", level: 25, desc: "A bit tired, need some rest." }
  ];

  const motivations = [
    "You're doing great, Zeynep! ✨",
    "Pure focus looks good on you.",
    "Small steps lead to big gardens.",
    "O₂ levels are looking fresh!",
    "Ready for a deep work session?"
  ];

  const fetchQueue = () => {
    setLoadingQueue(true);
    apiFetch('/api/now', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        const now = data.now;
        const upNext = data.up_next || [];
        const all = [now, ...upNext].filter(Boolean);
        const mapped = all.map((t: any, i: number) => ({
          id: i + 1,
          title: t.title,
          source: t.source,
          status: t.status || 'pending',
          reward: t.reward ?? 0,
        }));
        setTasks(mapped);
        onTasksLoaded(mapped.map(t => ({ id: t.id, title: t.title, source: t.source })));
      })
      .catch(() => {})
      .finally(() => setLoadingQueue(false));
  };

  useEffect(() => {
    apiFetch('/api/mood')
      .then(res => res.json())
      .then(data => {
        if (data.moods) setMoodHistory(data.moods);
        if (data.current) setSelectedMood(data.current.label);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchQueue();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!petAction && petStats.energy > 30) {
        setKodaMessage(motivations[Math.floor(Math.random() * motivations.length)]);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [petAction, petStats.energy]);

  // --- Variants ---
  const petVariants: Variants = {
    run: {
      x: [-15, 15, -15],
      transition: { duration: 4, repeat: Infinity, ease: "linear" }
    },
    eat: {
      scale: [1, 1.1, 1],
      transition: { duration: 0.4, repeat: 5 }
    },
    sleep: {
      opacity: [0.6, 1, 0.6],
      transition: { duration: 3, repeat: Infinity }
    }
  };

  // --- Handlers ---
  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(task => {
      if (task.id === id && task.status === 'pending') {
        setOxygen(curr => curr + task.reward);
        setKodaMessage("Yum! More oxygen for the garden! 💨");
        return { ...task, status: 'completed' };
      }
      return task;
    }));
  };

  const saveMood = () => {
    const mood = moodOptions.find(m => m.label === selectedMood);
    if (!mood) return;
    apiFetch('/api/mood', {
      method: 'POST',
      body: JSON.stringify({ label: mood.label, emoji: mood.emoji, level: mood.level }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.moods) setMoodHistory(data.moods);
        fetchQueue();
      })
      .catch(() => {});
    setIsMoodModalOpen(false);
  };

  const feedPet = () => {
    if (oxygen >= 0.20) {
      setPetAction("eating");
      setKodaMessage("Nom nom... Delicious! 🌿✨");
      setOxygen(prev => prev - 0.20);
      setPetStats(prev => ({ 
        ...prev, 
        hunger: Math.min(100, prev.hunger + 15),
        happiness: Math.min(100, prev.happiness + 5)
      }));
      setTimeout(() => {
        setPetAction(null);
        setKodaMessage("I'm energized and ready to work! 💪");
      }, 3000);
    } else {
      setKodaMessage("I'm hungry... but we need more O₂ first! ☹️");
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f0] flex font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden relative w-full">
      
      {/* --- MOOD MODAL --- */}
      <AnimatePresence>
        {isMoodModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMoodModalOpen(false)} className="absolute inset-0 bg-emerald-950/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white/90 backdrop-blur-2xl p-10 rounded-[4rem] shadow-2xl border border-white max-w-lg w-full text-center" >
              <button onClick={() => setIsMoodModalOpen(false)} className="absolute top-8 right-8 text-emerald-900/20 hover:text-emerald-900"><X size={24} /></button>
              <h2 className="text-3xl font-black text-emerald-950 tracking-tighter mb-2">How's your garden?</h2>
              <div className="grid grid-cols-2 gap-4 mb-10 mt-8">
                {moodOptions.map((mood) => (
                  <motion.button key={mood.label} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedMood(mood.label)} className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-2 ${selectedMood === mood.label ? 'border-emerald-500 bg-emerald-50' : 'border-transparent bg-white/50 hover:bg-white'}`} >
                    <span className="text-4xl">{mood.emoji}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900">{mood.label}</span>
                  </motion.button>
                ))}
              </div>
              <button onClick={saveMood} className="w-full py-5 bg-emerald-950 text-white rounded-4xl font-black text-lg">Save Today's Vibe</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- LOGOUT CONFIRMATION MODAL --- */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLogoutModalOpen(false)} className="absolute inset-0 bg-emerald-950/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white p-12 rounded-[4rem] shadow-2xl border border-white max-w-sm w-full text-center" >
              <div className="text-7xl mb-6">🐨💧</div>
              <h2 className="text-3xl font-black text-emerald-950 tracking-tighter mb-2">Leaving so soon?</h2>
              <p className="text-emerald-800/60 font-medium text-sm mb-10">Koda will miss you! Your garden will keep growing while you're away.</p>
              <div className="flex flex-col gap-3">
                <button onClick={onLogout} className="w-full py-5 bg-red-50 text-red-600 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-red-100 transition-colors">Yes, Logout</button>
                <button onClick={() => setIsLogoutModalOpen(false)} className="w-full py-5 bg-emerald-950 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-black transition-colors">Wait, Stay!</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 p-12 overflow-y-auto relative z-20">
        <header className="max-w-5xl mx-auto flex justify-between items-start mb-12 relative">
          <div>
            <h1 className="text-5xl font-black text-emerald-950 tracking-tighter leading-none mb-2">Workspace <span className="italic font-serif text-emerald-600 font-normal">Hub</span></h1>
            <div className="flex items-center gap-2 text-emerald-800/60 font-bold uppercase text-[10px] tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> ZOO Hackathon• Mar 2026
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={onEnterFocus} className="flex items-center gap-2 bg-emerald-700 text-white px-5 py-3 rounded-3xl font-black text-sm hover:bg-emerald-800 transition-all shadow-lg"><Play size={16} /> Focus Mode</button>
            <button onClick={() => setIsLogoutModalOpen(true)} className="flex items-center gap-2 bg-white/60 hover:bg-white rounded-3xl text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] transition-all border border-emerald-50 px-4 py-3"><LogOut size={14} /> Logout</button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
          <section className="lg:col-span-2 space-y-8">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="relative h-64 w-full rounded-[3.5rem] overflow-hidden shadow-2xl border-8 border-white group"
            >
              <img 
                src={workHubSplash} 
                alt="Forest Splash" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 to-transparent flex items-end p-10">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest mb-2">
                    <Wind size={10} /> Air Quality: Optimal
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tighter italic font-serif">Deep Roots, High Focus.</h2>
                </div>
              </div>
            </motion.div>

            <div className="space-y-6">
              <h2 className="text-xs font-black text-emerald-900/40 uppercase tracking-[0.3em] px-2">Queue</h2>
              <div className="grid gap-4">
                {loadingQueue ? (
                  [0, 1, 2].map(i => (
                    <div key={i} className="bg-white/70 backdrop-blur-md p-6 rounded-[2.5rem] border border-white flex items-center gap-5 animate-pulse">
                      <div className="w-14 h-14 rounded-3xl bg-emerald-100/60 shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-emerald-100/60 rounded-2xl" style={{ width: `${65 - i * 12}%` }} />
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-12 bg-emerald-100/40 rounded-lg" />
                          <div className="h-2.5 w-16 bg-emerald-50 rounded-md" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  tasks.map((task) => (
                    <motion.div key={task.id} whileHover={{ x: 10, backgroundColor: "rgba(255, 255, 255, 1)" }} className="bg-white/70 backdrop-blur-md p-6 rounded-[2.5rem] border border-white flex items-center justify-between transition-all" >
                      <div className="flex items-center gap-5">
                        <button onClick={() => toggleTask(task.id)} className={`w-14 h-14 rounded-3xl flex items-center justify-center transition-all ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-500' : 'bg-white text-emerald-900/20 border border-emerald-50 hover:border-emerald-200'}`} >
                          {task.status === 'completed' ? <CheckCircle size={24} /> : <div className="w-6 h-6 border-2 border-current rounded-full" />}
                        </button>
                        <div>
                          <h3 className={`text-lg font-bold ${task.status === 'completed' ? 'text-emerald-900/30 line-through' : 'text-emerald-950'}`}>{task.title}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">{task.source}</span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 rounded-md">+{task.reward.toFixed(2)} O₂</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/40 backdrop-blur-xl p-8 rounded-[4rem] border border-white/50 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden" >
              <div className="relative group w-full md:w-64 h-48 flex items-center justify-center bg-emerald-50/50 rounded-[3rem] border-4 border-white shadow-inner overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={kodaMessage}
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.8 }}
                    className="absolute top-4 bg-white px-4 py-2 rounded-2xl shadow-sm border border-emerald-100 text-[11px] font-bold text-emerald-800 text-center z-20"
                  >
                    {kodaMessage}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b border-r border-emerald-100 rotate-45" />
                  </motion.div>
                </AnimatePresence>

                <motion.div variants={petVariants} animate={petAction === "eating" ? "eat" : petStats.energy < 30 ? "sleep" : "run"} className="text-7xl z-10 select-none cursor-pointer mt-6" >
                  {petStats.energy < 30 ? '🐨💤' : petAction === "eating" ? '🐨🌿' : '🐨'}
                </motion.div>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-emerald-900/5 blur-md rounded-full" />
              </div>

              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-emerald-950 tracking-tighter">Koda the Koala</h3>
                  <p className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest">Your Productivity Companion</p>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  {Object.entries(petStats).map(([stat, value]) => (
                    <div key={stat} className="space-y-2">
                      <div className="flex justify-between text-[9px] font-black uppercase text-emerald-900/40 tracking-tighter">
                        <span>{stat}</span>
                        <span>{value}%</span>
                      </div>
                      <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                        <motion.div animate={{ width: `${value}%` }} className={`h-full ${value < 30 ? 'bg-orange-400' : 'bg-emerald-500'}`} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={feedPet} className="px-6 py-3 bg-emerald-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-black transition-colors" >
                    <Leaf size={14} /> Feed (0.20 O₂)
                  </motion.button>
                </div>
              </div>
            </motion.section>
          </section>

          <aside className="space-y-8">

            <section className="bg-white/40 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white/50">
              <h3 className="text-[10px] font-bold text-emerald-900/40 uppercase tracking-[0.3em] mb-8">Daily Vibe</h3>
              <div className="flex justify-between items-end gap-3 px-1" style={{ height: 128 }}>
                {(() => {
                  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                  const last5 = moodHistory.slice(0, 5);
                  const bars = last5.length > 0
                    ? last5.map(m => ({ level: m.level, day: dayLabels[new Date(m.timestamp).getDay() === 0 ? 6 : new Date(m.timestamp).getDay() - 1] })).reverse()
                    : [45, 75, 95, 60, 85].map((l, i) => ({ level: l, day: ['M', 'T', 'W', 'T', 'F'][i] }));
                  return bars.map((bar, i) => (
                    <div key={i} className="flex flex-col items-center justify-end flex-1" style={{ height: '100%' }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${bar.level}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`w-full rounded-2xl ${bar.level > 70 ? 'bg-emerald-500/30' : 'bg-emerald-950/10'}`}
                      />
                      <span className="text-[10px] font-black text-emerald-900/20 mt-3 shrink-0">{bar.day}</span>
                    </div>
                  ));
                })()}
              </div>
              <button onClick={() => setIsMoodModalOpen(true)} className="w-full mt-8 py-4 bg-white/60 hover:bg-white rounded-2xl text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] transition-all border border-emerald-50" >
                Log Today's Mood
              </button>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}