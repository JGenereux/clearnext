import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowRight, Wind } from 'lucide-react';
import Simplify from './components/Focusmode'; 
import Connections from './components/Connection'; 
import Dashboard from './components/Dashboard'; 

// 1. Define the possible screens as a Type
type Screen = 'landing' | 'connections' | 'dashboard' | 'simplify';

export default function App() {
  // 2. Explicitly type the state
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');

  useEffect(() => {
    // Check if user is already logged in
    if (localStorage.getItem('isLoggedIn') === 'true') {
      setCurrentScreen('dashboard');
    }
  }, []);

  const handleLogout = (): void => {
    localStorage.clear();
    setCurrentScreen('landing');
  };

  const o2SplashImage: string = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=1200";

  return (
    <div className="relative min-h-screen bg-[#f1f5f0] overflow-hidden font-sans">
      
      {/* Global Background Animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute -top-20 -left-20 w-150 h-150 bg-emerald-200/40 blur-[150px] rounded-full"
        />
      </div>

      <AnimatePresence mode="wait">
        
        {/* 1. PUBLIC LANDING PAGE */}
        {currentScreen === 'landing' && (
          <motion.div 
            key="landing" 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10"
          >
            <nav className="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-50">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-600 p-1.5 rounded-lg shadow-lg">
                  <Zap className="text-white h-5 w-5 fill-current" />
                </div>
                <span className="text-xl font-black tracking-tighter text-emerald-900">clearnext</span>
              </div>
            </nav>

            <section className="min-h-screen flex flex-col md:flex-row items-center justify-center px-12 gap-16 max-w-7xl mx-auto">
              <div className="flex-1 text-left space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-[0.2em]">
                  <Wind size={12} /> Breathe In and Out
                </div>
                <h1 className="text-7xl md:text-[110px] font-black tracking-tighter text-emerald-950 leading-[0.85]">
                  Pure <br/> <span className="italic font-serif text-emerald-600">Focus.</span>
                </h1>
                <p className="text-emerald-800/60 max-w-sm text-lg font-medium leading-relaxed">
                  The digital world is loud. Clearnext is a breath of fresh air for your workflow—helping you resolve noise and grow calm.
                </p>
                <button 
                  onClick={() => setCurrentScreen('connections')}
                  className="bg-emerald-700 text-white px-12 py-6 rounded-3xl font-black text-xl flex items-center gap-3 hover:bg-emerald-800 transition-all shadow-2xl shadow-emerald-900/20 active:scale-95"
                >
                  Login <ArrowRight />
                </button>
              </div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex-1 relative"
              >
                <img 
                  src={o2SplashImage} 
                  className="relative w-full aspect-[4/5] object-cover rounded-[80px] shadow-2xl border-[16px] border-white/50 backdrop-blur-sm"
                  alt="Nature"
                />
              </motion.div>
            </section>
          </motion.div>
        )}

        {/* 2. LOGIN/CONNECTIONS FLOW */}
        {currentScreen === 'connections' && (
          <Connections onBack={() => setCurrentScreen('dashboard')} />
        )}

        {/* 3. TASK HUB (Dashboard) */}
        {currentScreen === 'dashboard' && (
          <Dashboard 
            onEnterFocus={() => setCurrentScreen('simplify')} 
            onLogout={handleLogout}
          />
        )}

        {/* 4. DEEP FOCUS (The Plant Mode) */}
        {currentScreen === 'simplify' && (
          <Simplify onBack={() => setCurrentScreen('dashboard')} />
        )}

      </AnimatePresence>
    </div>
  );
}