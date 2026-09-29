import React, { useEffect, useState, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, Activity, Network, MessageSquareText, Layers, Bell, 
  Users, PieChart, Settings, Radio, Circle, ExternalLink, AlertTriangle 
} from 'lucide-react';
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
  const navigate = useNavigate();
  const [status, setStatus] = useState('Checking...');
  
  // Notification center state
  const [notifOpen, setNotifOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await api.getHealth();
        setStatus(res?.status === 'healthy' || res?.status === 'ok' ? 'Connected' : 'Offline');
      } catch {
        setStatus('Offline');
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch live alerts for the notification bell
  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await api.getAlerts();
        const list = res?.alerts || [];
        setAlerts(list);
        setUnreadCount(list.length);
      } catch (e) {
        console.warn('Could not fetch alerts for bell:', e);
      }
    }
    fetchAlerts();
    const timer = setInterval(fetchAlerts, 20000);
    return () => clearInterval(timer);
  }, []);

  // Close notifications dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [notifOpen]);

  const pageLabel =
    location.pathname === '/'
      ? 'Overview'
      : location.pathname.split('/')[1].replace(/-/g, ' ');

  const isConnected = status === 'Connected';

  return (
    <div className="relative flex h-screen overflow-hidden text-ink font-sans" style={{ zIndex: 1 }}>
      <AmbientBackground />

      {/* ── Left Sidebar ── */}
      <nav
        className="sidebar-glass w-60 flex-shrink-0 flex flex-col justify-between relative z-20"
        aria-label="Main Navigation"
      >
        {/* Logo & branding */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet via-cyan to-indigo flex items-center justify-center shadow-lg shadow-violet/25">
              <Radar className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-ink block leading-none">
                SCIOTRACE
              </span>
              <span className="text-[10px] text-muted tracking-wider uppercase font-mono">
                Situational Awareness
              </span>
            </div>
          </div>
          <div className="mt-5 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `nav-link-modern group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all relative ${
                  isActive
                    ? 'active bg-white/10 text-ink shadow-sm shadow-violet/10 font-semibold'
                    : 'text-muted hover:text-ink hover:bg-white/5'
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

        {/* Bottom system status */}
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

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Top bar */}
        <header className="topbar-glass h-16 flex-shrink-0 flex items-center justify-between px-8 relative z-30">
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
          <div className="flex items-center gap-3 ml-6">
            {/* Notification Bell with Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen(prev => !prev);
                }}
                className={`relative w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                  notifOpen
                    ? 'bg-violet/20 border-violet/50 text-violet shadow-lg shadow-violet/20'
                    : 'bg-white/6 border-white/8 hover:bg-white/10 hover:border-violet/30 text-muted hover:text-ink'
                }`}
                aria-label="Notifications"
                title="View Live Alerts"
              >
                <Bell size={14} className={unreadCount > 0 ? "text-violet" : "text-muted"} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral text-[9px] font-bold text-white shadow-sm ring-2 ring-panel animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Panel */}
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-panel/95 backdrop-blur-2xl border border-white/12 shadow-2xl shadow-black/60 z-50 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-white/3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink uppercase tracking-wider">Live Alerts</span>
                        {alerts.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet/20 text-lavender border border-violet/30">
                            {alerts.length} active
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => setUnreadCount(0)}
                          className="text-[11px] text-muted hover:text-cyan transition-colors"
                        >
                          Mark read
                        </button>
                      )}
                    </div>

                    {/* List of alerts */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-white/5 p-1">
                      {alerts.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted">
                          No active situational alerts right now.
                        </div>
                      ) : (
                        alerts.map((alert, idx) => {
                          const isCrit = alert.level === 'critical';
                          const isAcc = alert.level === 'accelerating';
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setNotifOpen(false);
                                navigate('/alerts');
                              }}
                              className="p-3 rounded-xl hover:bg-white/6 cursor-pointer transition-all flex flex-col gap-1.5 group"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                                  isCrit ? 'bg-coral/15 text-coral border border-coral/30' :
                                  isAcc ? 'bg-amber/15 text-amber border border-amber/30' :
                                  'bg-cyan/15 text-cyan border border-cyan/30'
                                }`}>
                                  {alert.level}
                                </span>
                                <span className="text-[10px] text-muted/60">
                                  {alert.time ? new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recent'}
                                </span>
                              </div>
                              <p className="text-xs text-ink/90 font-medium line-clamp-2 leading-relaxed group-hover:text-ink">
                                {alert.headline}
                              </p>
                              {alert.early_signal && (
                                <div className="flex items-center gap-2 text-[10px] text-cyan font-mono">
                                  <span>+{alert.early_signal.mention_growth_pct}% velocity</span>
                                  <span>•</span>
                                  <span>{alert.early_signal.cross_platform_movement}</span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-2 border-t border-white/8 bg-white/2">
                      <button
                        onClick={() => {
                          setNotifOpen(false);
                          navigate('/alerts');
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-violet/15 hover:bg-violet/25 text-lavender hover:text-white border border-violet/30 text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>View All Alerts & Signals</span>
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet to-cyan border border-violet/30 flex items-center justify-center text-xs font-bold text-ink cursor-pointer">
              ST
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
              className="p-8 max-w-7xl mx-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
