import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Thermometer, Activity, Users, Cpu } from 'lucide-react';
import { MomentumBadge } from './MomentumBadge';

const stateStyles = {
  dormant:      { dot: 'bg-muted',      border: 'border-white/10',   glow: '' },
  emerging:     { dot: 'bg-cyan',       border: 'border-cyan/20',    glow: 'hover:shadow-[0_0_20px_rgba(34,211,238,0.10)]' },
  growing:      { dot: 'bg-violet',     border: 'border-violet/20',  glow: 'hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]' },
  accelerating: { dot: 'bg-amber',      border: 'border-amber/20',   glow: 'hover:shadow-[0_0_20px_rgba(251,191,36,0.10)]' },
  viral:        { dot: 'bg-coral',      border: 'border-coral/20',   glow: 'hover:shadow-[0_0_20px_rgba(248,113,113,0.12)]' },
};

const sentimentColors = {
  positive: 'text-emerald',
  neutral:  'text-muted',
  negative: 'text-coral',
};

export function NarrativeCard({ narrative }) {
  const navigate = useNavigate();
  const narrativeId = narrative.narrative_id || narrative.id;
  const state = (narrative.momentum_state || 'dormant').toLowerCase();
  const style = stateStyles[state] || stateStyles.dormant;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={() => navigate(`/narratives/${narrativeId}`)}
      className={`group glass-card cursor-pointer px-5 py-4 flex items-center justify-between gap-6 border ${style.border} ${style.glow} transition-all duration-250`}
    >
      {/* State dot + main info */}
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${style.dot} ${state !== 'dormant' ? 'animate-pulse' : ''}`} />
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-ink truncate">{narrative.title || narrative.topic}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-mono text-muted/60">{narrativeId}</span>
            <span className="text-muted/40">·</span>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${sentimentColors[narrative.sentiment?.toLowerCase()] || 'text-muted'}`}>
              {narrative.sentiment}
            </span>
            <span className="text-muted/40">·</span>
            {narrative.sample_data === false || narrative.data_source === 'live_telegram' ? (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan/15 text-cyan border border-cyan/30 tracking-wider">
                LIVE TELEGRAM
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white/5 text-muted/80 border border-white/10 tracking-wider">
                SAMPLE DATA (X)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-6 flex-shrink-0">
        {/* Momentum */}
        <div className="text-right hidden sm:block">
          <p className="text-[10px] uppercase tracking-wider text-muted/60 mb-0.5">Momentum</p>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-base font-bold text-ink">{narrative.momentum ?? narrative.momentum_score ?? '–'}</span>
            <MomentumBadge state={narrative.momentum_state} />
          </div>
        </div>

        {/* Social Temp */}
        {narrative.social_temperature != null && (
          <div className="text-right hidden md:block">
            <p className="text-[10px] uppercase tracking-wider text-muted/60 mb-0.5">Soc. Temp</p>
            <div className="flex items-center gap-1 text-amber">
              <Thermometer size={12} />
              <span className="font-mono text-sm font-bold">{narrative.social_temperature}</span>
            </div>
          </div>
        )}

        {/* Communities */}
        {narrative.community_count != null && (
          <div className="text-right hidden lg:block">
            <p className="text-[10px] uppercase tracking-wider text-muted/60 mb-0.5">Communities</p>
            <div className="flex items-center gap-1 text-violet">
              <Users size={12} />
              <span className="font-mono text-sm font-bold">{narrative.community_count}</span>
            </div>
          </div>
        )}

        <ChevronRight size={16} className="text-muted/40 group-hover:text-violet group-hover:translate-x-0.5 transition-all" />
      </div>
    </motion.div>
  );
}
