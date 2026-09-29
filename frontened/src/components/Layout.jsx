import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Activity, Network, MessageSquareText, Layers, Bell, Users, PieChart, Settings, Radio, Circle } from 'lucide-react';
import { api } from '../api';
import AmbientBackground from './background/AmbientBackground';

const navItems = [
  { path: '/', label: 'Overview', icon: Radar },
  { path: '/narratives', label: 'Narratives', icon: Layers },
  { path: '/trends', label: 'Trends', icon: Activity },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/communities', label: 'Communities', icon: Users },
  { path: '/network', label: 'Network', icon: Network },
  { path: '/demographics', label: 'Demographics', icon: PieChart },
  { path: '/ask', label: 'Ask AI', icon: MessageSquareText },
  { path: '/ingestion', label: 'Live Ingestion', icon: Radio },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Layout() {
  const location = useLocation();
  const [status, setStatus] = useState('Checking...');
  const [lastUpdated, setLastUpdated] = useState('–');

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await api.getHealth();
        setStatus(res?.status === 'healthy' || res?.status === 'ok' ? 'Connected' : 'Offline');
        setLastUpdated('just now');
      } catch {
        setStatus('Offline');
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const pageLabel =
    location.pathname === '/'
      ? 'Overview'
      : location.pathname.split('/')[1].replace(/-/g, ' ');

  const isConnected = status === 'Connected';

  return (
    /* Root shell – sits above the fixed AmbientBackground */
    <div className="relative flex h-screen overflow-hidden text-ink font-sans" style={{ zIndex: 1 }}>
      {/* ══════════════ GLOBAL AMBIENT BACKGROUND ══════════════ */}
      <AmbientBackground />

      {/* ══════════════ SIDEBAR ══════════════ */}
      <nav className="sidebar-glass w-64 flex-shrink-0 flex flex-col relative z-20">
        {/* Brand */}
        <div className="px-6 py-7 flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            {/* Pulse-wave logo mark */}
            <div className="w-8 h-8 rounded-lg bg-violet/20 border border-violet/30 flex items-center justify-center flex-shrink-0">
              <Radio size={16} className="text-violet" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-ink">SCIOTRACE</span>
          </div>
          <p className="text-[10px] text-muted/70 tracking-wide pl-11">
            Understand what the internet is saying.
          </p>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-violet/20 to-transparent mb-3" />

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-violet/20 text-ink border border-violet/25 shadow-[0_0_12px_rgba(139,92,246,0.20)]'
                    : 'text-muted hover:bg-white/5 hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet rounded-full" />
                  )}
                  <item.icon size={16} className={isActive ? 'text-violet' : 'text-muted group-hover:text-ink transition-colors'} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Bottom – system status */}
        <div className="flex-shrink-0 mx-4 mb-5">
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent mb-4" />
          <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald animate-pulse' : 'bg-coral'}`} />
              <span className="text-xs font-semibold text-ink">
                {isConnected ? 'All Systems Operational' : 'Backend Offline'}
              </span>
            </div>
            <p className="text-[10px] text-muted/70 pl-4">
              {isConnected ? 'Backend Connected' : 'Check your API server'}
            </p>
          </div>
        </div>
      </nav>

      {/* ══════════════ MAIN CONTENT ══════════════ */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden">
        {/* Topbar */}
        <header className="topbar-glass h-16 flex-shrink-0 flex items-center justify-between px-8 relative z-10">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search narratives, topics, communities..."
              className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-ink placeholder-muted/50 focus:outline-none focus:border-violet/50 focus:bg-white/8 transition-all"
            />
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-4 ml-6">
            {/* LIVE badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald/10 border border-emerald/25">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald">Live</span>
            </div>

            {/* Backend status */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${
              isConnected
                ? 'border-emerald/20 bg-emerald/8 text-emerald'
                : 'border-coral/25 bg-coral/10 text-coral'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald animate-pulse' : 'bg-coral'}`} />
              Backend {isConnected ? 'Connected' : 'Offline'}
            </div>

            {/* Last updated */}
            <span className="text-xs text-muted hidden lg:block">
              Last updated: {lastUpdated}
            </span>

            {/* Bell */}
            <button className="w-8 h-8 rounded-full bg-white/6 border border-white/8 flex items-center justify-center hover:bg-white/10 hover:border-violet/30 transition-all" aria-label="Notifications">
              <Bell size={14} className="text-muted" />
            </button>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet to-cyan border border-violet/30 flex items-center justify-center text-xs font-bold text-ink cursor-pointer">
              SP
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="max-w-7xl mx-auto w-full px-8 py-8 pb-24"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
