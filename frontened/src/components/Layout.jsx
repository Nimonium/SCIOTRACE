import React, { useEffect, useState, useRef, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, Activity, Network, MessageSquareText, Layers, Bell, 
  Users, PieChart, Settings, Radio, Search, X, CornerDownLeft, 
  ExternalLink, ArrowRight, TrendingUp, ShieldAlert, Sparkles 
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

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [narrativesList, setNarrativesList] = useState([]);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

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

  // Fetch narratives for instant search indexing
  useEffect(() => {
    async function loadNarratives() {
      try {
        const res = await api.getNarratives();
        setNarrativesList(res?.narratives || []);
      } catch (e) {
        console.warn('Could not load narratives for search:', e);
      }
    }
    loadNarratives();
  }, []);

  // Global Ctrl+K / Cmd+K shortcut to focus search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close notifications and search on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered search results
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return narrativesList.filter(n => 
      n.topic?.toLowerCase().includes(q) ||
      n.id?.toLowerCase().includes(q) ||
      n.sentiment?.toLowerCase().includes(q) ||
      n.momentum_state?.toLowerCase().includes(q) ||
      n.spread_path?.some(p => p.toLowerCase().includes(q))
    );
  }, [searchQuery, narrativesList]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    if (filteredResults.length > 0) {
      // Navigate to top matched narrative
      navigate(`/narratives/${filteredResults[0].id}`);
    } else {
      // Forward query to Ask AI copilot
      navigate(`/ask?q=${encodeURIComponent(searchQuery.trim())}`);
    }
    setSearchOpen(false);
    setSearchQuery('');
  };

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
          {/* Interactive Search Bar */}
          <div className="relative flex-1 max-w-md" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                size={14}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search narratives, topics, claims... (Ctrl + K)"
                className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-20 py-2 text-sm text-ink placeholder-muted/50 focus:outline-none focus:border-violet/50 focus:bg-white/8 transition-all"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 rounded-md text-muted hover:text-ink hover:bg-white/8 transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted/60 bg-white/6 rounded border border-white/8">
                  Ctrl K
                </kbd>
              </div>
            </form>

            {/* Instant Search Dropdown Results */}
            <AnimatePresence>
              {searchOpen && searchQuery.trim().length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 mt-2 rounded-2xl bg-panel/95 backdrop-blur-2xl border border-white/12 shadow-2xl shadow-black/70 z-50 overflow-hidden"
                >
                  {/* Results Section */}
                  {filteredResults.length > 0 ? (
                    <div className="p-2 space-y-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-muted uppercase tracking-wider flex items-center justify-between">
                        <span>Matched Narratives</span>
                        <span>{filteredResults.length} found</span>
                      </div>
                      {filteredResults.map((n) => {
                        const isViral = n.momentum_state === 'viral' || n.momentum >= 80;
                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              navigate(`/narratives/${n.id}`);
                              setSearchOpen(false);
                              setSearchQuery('');
                            }}
                            className="p-3 rounded-xl hover:bg-white/8 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  isViral ? 'bg-coral/15 text-coral border border-coral/30' : 'bg-cyan/15 text-cyan border border-cyan/30'
                                }`}>
                                  {n.momentum_state || 'active'}
                                </span>
                                <span className="text-[10px] text-muted font-mono">
                                  Score: {n.momentum}/100
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-ink truncate group-hover:text-cyan transition-colors">
                                {n.topic}
                              </p>
                              {n.spread_path && (
                                <p className="text-[10px] text-muted/70 mt-0.5 capitalize">
                                  Spread: {n.spread_path.join(' → ')}
                                </p>
                              )}
                            </div>
                            <ArrowRight size={14} className="text-muted group-hover:text-cyan group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-muted">
                      No narrative title strictly matching <span className="text-ink font-semibold">"{searchQuery}"</span>
                    </div>
                  )}

                  {/* Ask AI Action Footer */}
                  <div className="p-2 border-t border-white/8 bg-white/3">
                    <button
                      type="button"
                      onClick={() => handleSearchSubmit()}
                      className="w-full p-2.5 rounded-xl bg-violet/15 hover:bg-violet/25 text-lavender hover:text-white border border-violet/30 text-xs font-semibold flex items-center justify-between gap-2 transition-all group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Sparkles size={14} className="text-violet flex-shrink-0" />
                        <span className="truncate">Ask AI Copilot: <span className="text-ink font-normal italic">"{searchQuery}"</span></span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted bg-white/6 px-1.5 py-0.5 rounded border border-white/8">
                        <span>Enter</span>
                        <CornerDownLeft size={10} />
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-3 ml-6">
            {/* Notification Bell with Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(prev => !prev)}
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
                                navigate(alert.narrative_id ? `/narratives/${alert.narrative_id}` : '/alerts');
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
