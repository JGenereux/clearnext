import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Slack, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ConnectionsProps {
  onBack: () => void;
}

export default function Connections({ onBack }: ConnectionsProps) {
  const { signInWithGoogle, signInWithSlack } = useAuth();

  const bgImageUrl: string = "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=2000";

  return (
    <div className="min-h-screen p-8 font-sans relative flex items-center justify-center overflow-hidden">

      <div
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[10s] scale-110"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(241, 245, 240, 0.8), rgba(241, 245, 240, 0.9)), url(${bgImageUrl})`,
        }}
      />

      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div
          animate={{ x: [0, 40, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 12, repeat: Infinity }}
          className="absolute top-[-10%] left-[-10%] w-125 h-125 bg-emerald-300/20 blur-[100px] rounded-full"
        />
      </div>

      <div className="max-w-md w-full relative z-10">
        <motion.div
          key="select"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
        >
          <button onClick={onBack} className="flex items-center gap-2 text-emerald-900/60 hover:text-emerald-900 mb-8 font-black uppercase text-[10px] tracking-widest transition-all">
            <ArrowLeft size={14} /> Back
          </button>

          <h1 className="text-5xl font-black text-emerald-950 mb-3 tracking-tighter leading-none">
            Choose your <br/><span className="italic font-serif text-emerald-600">source.</span>
          </h1>
          <p className="text-emerald-800/60 mb-10 text-sm font-medium">Step into your refreshed workspace.</p>

          <div className="flex flex-col gap-4">
            <button
              onClick={signInWithSlack}
              className="flex items-center justify-center gap-4 bg-[#4A154B] text-white p-6 rounded-[2.5rem] hover:opacity-95 transition-all font-bold shadow-xl shadow-purple-900/20 active:scale-95"
            >
              <Slack size={20} fill="white" />
              Continue with Slack
            </button>
            <button
              onClick={signInWithGoogle}
              className="flex items-center justify-center gap-4 bg-white text-gray-700 p-6 rounded-[2.5rem] hover:bg-gray-50 transition-all font-bold shadow-xl border border-gray-200 active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-3 text-emerald-900/40">
        <ShieldCheck size={18} />
        <span className="text-[11px] font-black uppercase tracking-[0.3em]">Secure Authentication</span>
      </div>
    </div>
  );
}
