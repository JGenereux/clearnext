import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowRight, Wind } from 'lucide-react';
import Simplify from './components/Focusmode'; 
import Connections from './components/Connection'; 
import Dashboard from './components/Dashboard'; // Create this file next
/*
To get your frontend and backend talking, you need to turn those static "hardcoded" lists into dynamic States that sync with a database. main landing page, connections page, dashboard page, focus mode page

Since you're working with React, Node.js, and likely Azure, here are the specific integration comments for your main pages.

1. Dashboard Page (Dashboard.jsx)
This is your "Read/Update" hub. It needs to fetch all tasks when the component mounts.

State Setup: Replace the static tasks array with const [tasks, setTasks] = useState([]).

Data Fetching: Use a useEffect hook to call GET /api/tasks. This should pull tasks filtered by the logged-in user's ID.

Status Syncing: The "Checkmark" button shouldn't just change the UI color; it needs to trigger a PATCH /api/tasks/:id request to update the status to "completed" in the database.

Slack Integration: Add a "Sync" function that pings your backend to check for new Slack Webhook events, ensuring the "Reply to Design Lead" task is actually current.

Dynamic Context: The "Calgary • March 2026" text can be made dynamic by using a Geolocation API and a standard JavaScript Date object, though it can also be served from a "User Preferences" backend endpoint.

2. Focus Mode Page (FocusMode.jsx)
This is your "Active Session" page. It’s all about timing and "writing" progress back to the server.

Session Start: When the user clicks "Enter Focus Mode," send a POST /api/sessions/start to the backend. This logs when you started and which task you are focused on.

Plant Growth Logic: The "growth" of your plant shouldn't just be a CSS animation. Every few minutes, the frontend should send a "heartbeat" to the backend. If the session is finished, the backend calculates the final "O₂ reward" based on the total time.

Slack Automation: This is where you trigger the Slack Status Change. Upon entering, the backend calls the Slack API to set your status to 🧘 (Focusing).

Reset Prevention: Use the backend to store the "Active Session" state so that if Zeynep refreshes the page, the timer doesn't reset to zero—it resumes from the database timestamp.

3. Connections / Auth Page
This is the "Gateway" where you establish the user's identity.

Token Storage: After a successful Google/Slack login, the backend will send a JWT (JSON Web Token). Store this in localStorage or a secure cookie. Every subsequent request to the backend must include this token in the header.

Integration Checks: The "Connect" buttons should check the backend for existing tokens. If a token exists, show "Connected" (Emerald style); if not, show the "Connect" action.

Loading States: Since connecting to Slack involves a redirect, ensure you have a "Callback" route on your frontend to handle the code Slack sends back, which you then pass to your backend to exchange for a real access token.

Summary of Backend Endpoints Needed:
Method	Endpoint	Description
GET	/api/tasks	Fetches the user's task list (Slack, Email, Manual).
PATCH	/api/tasks/:id	Marks a task as complete and triggers the O₂ reward.
POST	/api/sessions	Starts/Stops a deep work session and logs time.
POST	/api/slack/status	Toggles the user's Slack status between "Focus" and "Active".
GET	/api/user/profile	Fetches Zeynep's profile data (Streak count, total O₂).*/

export default function App() {
  // Screens: 'landing', 'connections', 'dashboard', 'simplify'
  const [currentScreen, setCurrentScreen] = useState('landing');

  useEffect(() => {
    // If user is already logged in, skip landing and go to the Task Hub (Dashboard)
    if (localStorage.getItem('isLoggedIn') === 'true') {
      setCurrentScreen('dashboard');
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setCurrentScreen('landing');
  };

  const o2SplashImage = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=1200";

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
                  className="relative w-full aspect-4/5 object-cover rounded-[80px] shadow-2xl border-16 border-white/50 backdrop-blur-sm"
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

        {/* 3. TASK HUB (New Landing Page) */}
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