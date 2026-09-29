import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AlertCard } from '../components/shared/AlertCard';
import { NarrativeCard } from '../components/shared/NarrativeCard';
import { Radar, Thermometer, Layers, AlertTriangle, Bell, Activity, ArrowRight, MessageSquareText, TrendingUp, ShieldAlert, BarChart2 } from 'lucide-react';
import { MomentumSparkline } from '../components/shared/MomentumSparkline';

export default function SocialRadar() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [narratives, setNarratives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        const [alertsData, narrativesData] = await Promise.all([
          api.getAlerts().catch(err => {
            console.error("Alerts fetch error:", err);
            return null;
          }),
          api.getNarratives().catch(err => {
            console.error("Narratives fetch error:", err);
            return null;
          })
        ]);
        
        if (!alertsData && !narrativesData) {
          setError("Unable to reach SCIOTRACE backend. Please verify the backend is running.");
        }

        const rawAlerts = alertsData?.alerts || (Array.isArray(alertsData) ? alertsData : []);
        const rawNarratives = narrativesData?.narratives || (Array.isArray(narrativesData) ? narrativesData : []);

        setAlerts(rawAlerts);
        setNarratives(rawNarratives);
      } catch (err) {
        console.error("Error fetching radar data:", err);
        setError("Unable to reach SCIOTRACE backend. Please verify the backend is running.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-96 bg-panel rounded-xl border border-border"></div>
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-40 bg-panel rounded-lg border border-border"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate KPIs
  const activeNarrativesCount = narratives.length;
  const earlySignalsCount = alerts.filter(a => a.early_signal || a.level?.toLowerCase() === 'emerging').length;

  const avgMomentum = narratives.length > 0 
    ? Math.round(narratives.reduce((acc, curr) => acc + (curr.momentum_score || curr.momentum || 0), 0) / narratives.length)
    : 0;
  
  const socialTemp = (narratives[0] && narratives[0].social_temperature) !== undefined 
    ? narratives[0].social_temperature 
    : avgMomentum;

  const getTempState = (temp) => {
    if (temp >= 80) return { label: 'CRITICAL', color: 'text-coral', bg: 'bg-coral/10' };
    if (temp >= 60) return { label: 'HEATED', color: 'text-amber', bg: 'bg-amber/10' };
    if (temp >= 40) return { label: 'WARMING', color: 'text-cyan', bg: 'bg-cyan/10' };
    return { label: 'CALM', color: 'text-emerald', bg: 'bg-emerald/10' };
  };

  const getMomentumState = (score) => {
    if (score >= 80) return { label: 'VIRAL', color: 'text-coral' };
    if (score >= 60) return { label: 'ACCELERATING', color: 'text-amber' };
    if (score >= 40) return { label: 'GROWING', color: 'text-violet' };
    if (score >= 20) return { label: 'EMERGING', color: 'text-cyan' };
    return { label: 'DORMANT', color: 'text-muted' };
  };

  const tempState = getTempState(socialTemp);
  const momState = getMomentumState(avgMomentum);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-12 pb-12">
      {error && (
        <div className="bg-coral/10 border border-coral/25 text-coral p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="text-xs font-bold uppercase tracking-wider bg-coral/20 hover:bg-coral/30 px-3 py-1.5 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      {/* HERO SECTION */}
      <section className="relative w-full rounded-2xl border border-violet/15 bg-transparent overflow-hidden flex flex-col lg:flex-row items-center justify-between p-10 lg:p-16 min-h-[500px]">
        {/* Animated Background Layers */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
           <motion.div 
             animate={{ 
               scale: [1, 1.2, 1],
               opacity: [0.1, 0.2, 0.1],
               rotate: [0, 90, 0]
             }}
             transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
             className="absolute -top-64 -left-64 w-[600px] h-[600px] bg-violet/20 rounded-full blur-[100px]"
           />
           <motion.div 
             animate={{ 
               scale: [1, 1.5, 1],
               opacity: [0.1, 0.15, 0.1],
               x: [0, 100, 0]
             }}
             transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
             className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan/10 rounded-full blur-[100px]"
           />
           <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMTQ4LCAxNjMsIDE4NCwgMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 lg:w-1/2 flex flex-col items-start gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan/30 bg-cyan/10"
          >
             <div className="w-2 h-2 rounded-full bg-cyan animate-pulse"></div>
             <span className="text-[10px] font-bold uppercase tracking-widest text-cyan">Real-Time Social Intelligence</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl lg:text-6xl font-black text-ink leading-[1.1] tracking-tight"
          >
            Know What the Internet Is <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet to-cyan">Talking About.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted max-w-lg leading-relaxed"
          >
            SCIOTRACE transforms social conversations into real-time narrative intelligence.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4 mt-4"
          >
            <button 
              onClick={() => navigate('/narratives')}
              className="group flex items-center gap-2 bg-ink text-background font-bold px-6 py-3 rounded-lg hover:bg-cyan hover:text-ink transition-all duration-300 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]"
            >
              Explore Intelligence
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => navigate('/ask')}
              className="flex items-center gap-2 bg-panel border border-border text-ink font-bold px-6 py-3 rounded-lg hover:bg-elevated hover:border-violet/50 transition-all duration-300"
            >
              <MessageSquareText size={18} className="text-violet" />
              Ask SCIOTRACE
            </button>
          </motion.div>
        </div>

        {/* Hero Visual Dashboard */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
          className="relative z-10 lg:w-[400px] mt-12 lg:mt-0 w-full dash-float"
        >
           <div className="glass-strong rounded-2xl p-6 shadow-2xl relative overflow-hidden group border-violet/20 glow-violet">
             <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/20 blur-3xl rounded-full group-hover:bg-cyan/30 transition-all duration-500"></div>
             
             <div className="flex items-center justify-between mb-8 relative z-10">
               <div>
                 <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">SCIOTRACE Index</h4>
                 <div className="flex items-end gap-3">
                   <span className="text-5xl font-black text-ink">{socialTemp}</span>
                   <span className="text-emerald text-sm font-bold flex items-center mb-1"><TrendingUp size={14} className="mr-1"/> +12%</span>
                 </div>
               </div>
               <div className="w-12 h-12 rounded-full border-4 border-elevated flex items-center justify-center relative">
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="20" cy="20" r="18" className="stroke-elevated stroke-[4]" fill="none" />
                    <circle cx="20" cy="20" r="18" className="stroke-cyan stroke-[4]" fill="none" strokeDasharray="113" strokeDashoffset={113 - (113 * socialTemp) / 100} />
                  </svg>
               </div>
             </div>

             <div className="space-y-4 relative z-10">
                <div className="bg-elevated/50 border border-border/50 rounded-lg p-3 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <Layers size={14} className="text-violet" />
                     <span className="text-xs font-medium text-ink">Trending Topics</span>
                   </div>
                   <span className="text-xs font-bold text-cyan">{activeNarrativesCount} Active</span>
                </div>
                <div className="bg-elevated/50 border border-border/50 rounded-lg p-3 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <Activity size={14} className="text-emerald" />
                     <span className="text-xs font-medium text-ink">Positive Sentiment</span>
                   </div>
                   <span className="text-xs font-bold text-emerald">Growing</span>
                </div>
                <div className="bg-elevated/50 border border-border/50 rounded-lg p-3 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <ShieldAlert size={14} className="text-coral" />
                     <span className="text-xs font-medium text-ink">Viral Alerts</span>
                   </div>
                   <span className="text-xs font-bold text-amber">Accelerating</span>
                </div>
             </div>
           </div>
        </motion.div>
      </section>

      {/* KPI SECTION */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
         {/* KPI 1: Social Temperature */}
         <motion.div variants={itemVariants} className="glass-card border-cyan/15 p-5 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded bg-cyan/10 flex items-center justify-center text-cyan group-hover:scale-110 transition-transform">
                <Thermometer size={16} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${tempState.bg} ${tempState.color}`}>
                {tempState.label}
              </span>
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Social Temperature</h4>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-ink">{socialTemp}</span>
              <div className="w-16 h-8 opacity-50"><MomentumSparkline data={[{value: 40}, {value: 50}, {value: socialTemp}]} state={tempState.label} /></div>
            </div>
         </motion.div>

         {/* KPI 2: Momentum */}
         <motion.div variants={itemVariants} className="glass-card border-violet/15 p-5 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded bg-violet/10 flex items-center justify-center text-violet group-hover:scale-110 transition-transform">
                <Activity size={16} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${momState.color}`}>
                {momState.label}
              </span>
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Avg Momentum</h4>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-ink">{avgMomentum}</span>
              <div className="w-16 h-8 opacity-50"><MomentumSparkline data={[{value: 30}, {value: 45}, {value: avgMomentum}]} state={momState.label} /></div>
            </div>
         </motion.div>

         {/* KPI 3: Active Narratives */}
         <motion.div variants={itemVariants} className="glass-card border-emerald/15 p-5 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded bg-emerald/10 flex items-center justify-center text-emerald group-hover:scale-110 transition-transform">
                <Layers size={16} />
              </div>
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Active Narratives</h4>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-ink">{activeNarrativesCount}</span>
            </div>
         </motion.div>

         {/* KPI 4: Early Signals */}
         <motion.div variants={itemVariants} className="glass-card border-amber/15 p-5 group relative overflow-hidden">
            {earlySignalsCount > 0 && <div className="absolute inset-0 bg-amber/5 animate-pulse pointer-events-none"></div>}
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="w-8 h-8 rounded bg-amber/10 flex items-center justify-center text-amber group-hover:scale-110 transition-transform">
                <Radar size={16} />
              </div>
              {earlySignalsCount > 0 && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber/20 text-amber animate-pulse">DETECTED</span>}
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-1 relative z-10">Early Signals</h4>
            <div className="flex items-end justify-between relative z-10">
              <span className="text-3xl font-black text-ink">{earlySignalsCount}</span>
            </div>
         </motion.div>
      </motion.section>

      {/* Narrative Intelligence */}
      <section>
        <div className="mb-6 flex flex-col gap-1">
          <h3 className="text-lg font-bold uppercase tracking-wider text-ink flex items-center gap-2">
            <Layers size={20} className="text-violet" /> Narrative Intelligence
          </h3>
          <p className="text-sm text-muted">Key narratives shaping the conversation across social platforms.</p>
        </div>
        
        {narratives.length === 0 ? (
           <div className="bg-panel border border-border border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-muted">
             <Layers size={32} className="mb-3 opacity-20" />
             <p>No active narratives detected.</p>
           </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-4"
          >
            {narratives.slice(0, 5).map(narrative => (
              <motion.div key={narrative.id} variants={itemVariants}>
                <NarrativeCard narrative={narrative} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Early Signal & Alerts */}
      <section>
        <div className="mb-6 flex flex-col gap-1">
          <h3 className="text-lg font-bold uppercase tracking-wider text-ink flex items-center gap-2">
            <Bell size={20} className="text-amber" /> Social Signal & Alerts
          </h3>
          <p className="text-sm text-muted">Real-time alerts and early warnings for rapid narrative shifts.</p>
        </div>
        
        {alerts.length === 0 ? (
           <div className="bg-panel border border-border border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-muted">
             <AlertTriangle size={32} className="mb-3 opacity-20" />
             <p>No active alerts at this time.</p>
           </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {alerts.slice(0,3).map((alert, idx) => (
              <motion.div key={alert.narrative_id || alert.id || idx} variants={itemVariants}>
                <AlertCard alert={alert} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}
