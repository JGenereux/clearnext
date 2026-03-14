import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowRight, Wind, Leaf, Sparkles, Settings } from 'lucide-react';
import Simplify from './Simplify'; 
import Connections from './Connection'; 

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: [0.19, 1, 0.22, 1] }
};

const Header = ({ onOpenConnections }) => (
  <nav className="fixed top-0 left-0 right-0 bg-white/40 backdrop-blur-xl z-50 px-8 py-6 flex items-center justify-between border-b border-emerald-900/5">
    <div className="flex items-center gap-2">
      <div className="bg-emerald-600 p-1.5 rounded-lg shadow-sm">
        <Zap className="text-white h-5 w-5 fill-current" />
      </div>
      <span className="text-xl font-black tracking-tighter text-emerald-900">clearnext</span>
    </div>
    <div className="hidden md:flex items-center gap-6 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800/60">
      <button 
        onClick={onOpenConnections}
        className="hover:text-emerald-900 transition-colors flex items-center gap-2"
      >
        <Settings size={14} /> Connections
      </button>
      <button className="bg-emerald-900 text-white px-6 py-2 rounded-full hover:bg-emerald-800 transition-all active:scale-95">
        Get Started
      </button>
    </div>
  </nav>
);

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');

  return (
    <div className="relative min-h-screen bg-[#f8faf7]">
      <AnimatePresence mode="wait">
        {/* LANDING SCREEN */}
        {currentScreen === 'landing' && (
          <motion.div 
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-emerald-900 selection:bg-emerald-200 selection:text-emerald-900 overflow-x-hidden font-sans"
          >
            <Header onOpenConnections={() => setCurrentScreen('connections')} />

            {/* RELAXING VISUAL ELEMENTS */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-100/50 blur-[120px] rounded-full" />
              <div className="absolute bottom-[20%] right-[-5%] w-[500px] h-[500px] bg-orange-50/50 blur-[100px] rounded-full" />
            </div>

            {/* HERO SECTION */}
            <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20">
              <motion.div variants={fadeInUp} initial="initial" whileInView="whileInView" className="mb-6">
                <span className="px-4 py-1.5 rounded-full border border-emerald-200 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700 bg-white/50 backdrop-blur-md">
                  Breathe in. Work on.
                </span>
              </motion.div>

              <motion.h1 variants={fadeInUp} initial="initial" whileInView="whileInView" className="text-6xl md:text-[100px] font-black tracking-tighter text-emerald-950 mb-8 leading-[0.9]">
                Focus with <br/>
                <span className="italic font-serif text-emerald-600">gentle</span> clarity.
              </motion.h1>

              <motion.p variants={fadeInUp} initial="initial" whileInView="whileInView" className="text-emerald-800/70 max-w-2xl text-lg md:text-xl font-medium mb-12 leading-relaxed">
                Overwhelmed is a feeling, not a fact. Clearnext filters your digital noise to give you one calm, clear step at a time.
              </motion.p>

              <motion.div variants={fadeInUp} initial="initial" whileInView="whileInView" className="flex flex-col sm:flex-row gap-6">
                <button 
                  onClick={() => setCurrentScreen('simplify')}
                  className="bg-emerald-700 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-emerald-800 shadow-xl shadow-emerald-900/10 transition-all flex items-center gap-3"
                >
                  Simplify My Day <ArrowRight size={20} />
                </button>
                <button 
                  onClick={() => setCurrentScreen('connections')}
                  className="bg-white border border-emerald-100 text-emerald-800 px-10 py-5 rounded-2xl font-black text-lg hover:bg-emerald-50 transition-all"
                >
                  Setup Environment
                </button>
              </motion.div>
            </section>

            {/* TILES */}
            <section className="py-32 px-8 relative bg-emerald-50/30">
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                <Tile icon={<Wind />} title="Quiet Filters" desc="We silently analyze your tools so you don't have to." />
                <Tile icon={<Leaf />} title="One at a Time" desc="We only show you what matters now." />
                <Tile icon={<Sparkles />} title="Energy Flow" desc="Smart scheduling that matches your vibes." />
              </div>
            </section>
          </motion.div>
        )}

        {/* SIMPLIFY SCREEN */}
        {currentScreen === 'simplify' && (
          <motion.div 
            key="simplify"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
          >
            <Simplify onBack={() => setCurrentScreen('landing')} />
          </motion.div>
        )}

        {/* CONNECTIONS SCREEN */}
        {currentScreen === 'connections' && (
          <motion.div 
            key="connections"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Connections onBack={() => setCurrentScreen('landing')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper component for the tiles
const Tile = ({ icon, title, desc }) => (
  <motion.div variants={fadeInUp} initial="initial" whileInView="whileInView" className="bg-white p-10 rounded-[40px] shadow-sm border border-emerald-100/50">
    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-emerald-950 mb-4 tracking-tight">{title}</h3>
    <p className="text-emerald-800/60 text-sm leading-relaxed">{desc}</p>
  </motion.div>
);