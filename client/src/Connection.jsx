import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Slack, Calendar, Mail, Check, ShieldCheck } from 'lucide-react';

const IntegrationCard = ({ icon: Icon, name, desc, active, onToggle }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className={`p-6 rounded-[32px] border transition-all ${
      active 
        ? 'bg-white border-emerald-200 shadow-lg shadow-emerald-900/5' 
        : 'bg-emerald-50/50 border-transparent opacity-70'
    }`}
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${active ? 'bg-emerald-600 text-white' : 'bg-emerald-200 text-emerald-700'}`}>
        <Icon size={24} />
      </div>
      <button 
        onClick={onToggle}
        className={`w-12 h-6 rounded-full transition-colors relative ${active ? 'bg-emerald-600' : 'bg-emerald-300'}`}
      >
        <motion.div 
          animate={{ x: active ? 26 : 2 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
    <h3 className="font-bold text-emerald-900 mb-1">{name}</h3>
    <p className="text-xs text-emerald-800/50 leading-relaxed">{desc}</p>
  </motion.div>
);

export default function Connections({ onBack }) {
  const [services, setServices] = useState({
    slack: true,
    calendar: false,
    mail: true
  });

  const toggle = (service) => {
    setServices(prev => ({ ...prev, [service]: !prev[service] }));
  };

  return (
    <div className="min-h-screen bg-[#f8faf7] p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        {/* Navigation */}
        <button onClick={onBack} className="flex items-center gap-2 text-emerald-800/40 hover:text-emerald-900 mb-12 transition-colors">
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        <header className="mb-12">
          <h1 className="text-4xl font-black text-emerald-950 tracking-tighter mb-4">
            Connect your <span className="italic font-serif text-emerald-600">signals</span>.
          </h1>
          <p className="text-emerald-800/60 font-medium">
            Select which apps Clearnext should monitor. Gemini will only summarize data from active connections.
          </p>
        </header>

        <div className="grid gap-6">
          <IntegrationCard 
            icon={Slack} 
            name="Slack" 
            desc="Filters DMs and mentions from your workspaces."
            active={services.slack}
            onToggle={() => toggle('slack')}
          />
          <IntegrationCard 
            icon={Calendar} 
            name="Google Calendar" 
            desc="Detects upcoming meetings and prepares brief summaries."
            active={services.calendar}
            onToggle={() => toggle('calendar')}
          />
          
        </div>

        {/* Security Note */}
        <div className="mt-12 p-6 rounded-[24px] bg-emerald-900 text-emerald-50 flex items-start gap-4">
          <ShieldCheck className="shrink-0 text-emerald-400" size={24} />
          <div>
            <h4 className="font-bold text-sm mb-1">Privacy Protocol</h4>
            <p className="text-[11px] text-emerald-200/70 leading-relaxed">
              We use 256-bit encryption. Your raw messages are never stored; they are processed by the AI in real-time and immediately discarded.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}