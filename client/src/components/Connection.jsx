import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Slack, ShieldCheck, Loader2, Lock, Mail, Wind } from 'lucide-react';

export default function Connections({ onBack }) {
  const [loginMethod, setLoginMethod] = useState(null); 
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [step, setStep] = useState('select'); 

  const handleAuth = () => {
    // Save state so App.jsx useEffect triggers the Dashboard view
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', username || email.split('@')[0]);
    /*
    Connections / Auth Page
    authentication flow for Slack/gmail/google This is the "Gateway" where you establish the user's identity.
This is the "Gateway" where you establish the user's identity.

Token Storage: After a successful Google/Slack login, the backend will send a JWT (JSON Web Token). Store this in localStorage or a secure cookie. Every subsequent request to the backend must include this token in the header.

Integration Checks: The "Connect" buttons should check the backend for existing tokens. If a token exists, show "Connected" (Emerald style); if not, show the "Connect" action.

Loading States: Since connecting to Slack involves a redirect, ensure you have a "Callback" route on your frontend to handle the code Slack sends back, which you then pass to your backend to exchange for a real access token.*/
    
    // This now sends the user to the 'dashboard' screen in App.jsx
    onBack(); 
  };

  // REFRESHING GREEN API IMAGE
  const bgImageUrl = "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=2000";

  return (
    <div className="min-h-screen p-8 font-sans relative flex items-center justify-center overflow-hidden">
      
      {/* --- FULL SCREEN API BACKGROUND --- */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[10s] scale-110"
        style={{ 
          backgroundImage: `linear-gradient(to bottom, rgba(241, 245, 240, 0.8), rgba(241, 245, 240, 0.9)), url(${bgImageUrl})`,
        }}
      />

      {/* --- FLOATING O2 BLUR ELEMENTS --- */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div 
          animate={{ x: [0, 40, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 12, repeat: Infinity }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-300/20 blur-[100px] rounded-full"
        />
      </div>

      <div className="max-w-md w-full relative z-10">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: CHOOSE SERVICE */}
          {step === 'select' && (
            <motion.div 
              key="select" 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.1 }}
            >
              <button onClick={onBack} className="flex items-center gap-2 text-emerald-900/60 hover:text-emerald-900 mb-8 font-black uppercase text-[10px] tracking-widest transition-all">
                <ArrowLeft size={14} /> Return to Home 
              </button>

              <h1 className="text-5xl font-black text-emerald-950 mb-3 tracking-tighter leading-none">
                Choose your <br/><span className="italic font-serif text-emerald-600">source.</span>
              </h1>
              <p className="text-emerald-800/60 mb-10 text-sm font-medium">Step into your refreshed workspace.</p>
              
              <div className="flex flex-col gap-4">
               
                <button 
                  onClick={() => { setLoginMethod('slack'); setStep('credentials'); }}
                  className="flex items-center justify-center gap-4 bg-[#4A154B] text-white p-6 rounded-[2.5rem] hover:opacity-95 transition-all font-bold shadow-xl shadow-purple-900/20 active:scale-95"
                >
                  <Slack size={20} fill="white" />
                  Continue with Slack
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: CREDENTIALS */}
          {step === 'credentials' && (
            <motion.div 
              key="creds" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-white/80 backdrop-blur-2xl p-10 rounded-[48px] shadow-2xl border border-white/50"
            >
              <div className="flex justify-center mb-8">
                <div className="p-4 bg-emerald-50 rounded-3xl text-[#4A154B]">
                  {loginMethod === 'google' ? <img src="https://www.google.com/favicon.ico" className="w-10 h-10" /> : <Slack size={40} />}
                </div>
              </div>
              <h2 className="text-2xl font-black text-emerald-950 text-center mb-10 capitalize">Sign in to {loginMethod}</h2>
              
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-6 top-5 text-emerald-400" size={20} />
                  <input 
                    type="email" 
                    placeholder="Email address"
                    className="w-full pl-14 pr-6 py-5 bg-white/50 border border-emerald-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-6 top-5 text-emerald-400" size={20} />
                  <input type="password" placeholder="••••••••" disabled className="w-full pl-14 pr-6 py-5 bg-emerald-100/30 border border-emerald-100/50 rounded-2xl opacity-50 cursor-not-allowed" value="password" />
                </div>
                <button 
                  onClick={() => setStep('username')}
                  disabled={!email}
                  className="w-full bg-emerald-700 text-white py-5 rounded-3xl font-black text-xl hover:bg-emerald-800 shadow-lg mt-4 disabled:opacity-20 transition-all"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: USERNAME */}
          {step === 'username' && (
            <motion.div key="user" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
               <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-md text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-6">
                <Wind size={14} /> Refreshing Workspace
              </div>
              <h2 className="text-5xl font-black text-emerald-950 mb-10 tracking-tighter">Who are you?</h2>
              
              <input 
                autoFocus
                type="text"
                placeholder="Your Name"
                className="w-full p-8 rounded-[3rem] border-4 border-white bg-white/40 backdrop-blur-xl text-center text-3xl font-black text-emerald-900 placeholder-emerald-900/20 focus:border-emerald-500 outline-none shadow-2xl transition-all mb-8"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              
              <button 
                onClick={() => setStep('loading')} 
                disabled={!username}
                className="bg-emerald-950 text-white px-16 py-6 rounded-4xl font-black text-2xl hover:bg-black transition-all shadow-2xl disabled:opacity-20"
              >
                Let's Start
              </button>
            </motion.div>
          )}

          {/* STEP 4: LOADING */}
          {step === 'loading' && (
            <motion.div key="loading" className="flex flex-col items-center text-center">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="mb-8"
              >
                <Loader2 size={80} className="text-emerald-600" />
              </motion.div>
              <h2 className="text-4xl font-black text-emerald-950 mb-4 tracking-tighter">Launching</h2>
              <button 
                onClick={handleAuth} 
                className="bg-emerald-700 text-white px-12 py-5 rounded-2xl font-black text-lg hover:bg-emerald-800 shadow-2xl mt-10 transition-all active:scale-95"
              >
                Launch Dashboard
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-3 text-emerald-900/40">
        <ShieldCheck size={18} />
        <span className="text-[11px] font-black uppercase tracking-[0.3em]">O2 Encryption Protocol</span>
      </div>
    </div>
  );
}