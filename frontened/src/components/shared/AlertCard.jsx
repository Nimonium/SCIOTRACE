import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Activity, Dna, Zap, AlertTriangle } from 'lucide-react';

const levelConfig = {
  critical:     { bg: 'bg-coral/15',  text: 'text-coral',  border: 'border-coral/25',  dot: 'bg-coral',  glow: 'hover:shadow-[0_0_24px_rgba(248,113,113,0.15)]' },
  accelerating: { bg: 'bg-amber/15',  text: 'text-amber',  border: 'border-amber/25',  dot: 'bg-amber',  glow: 'hover:shadow-[0_0_24px_rgba(251,191,36,0.12)]' },
  emerging:     { bg: 'bg-cyan/15',   text: 'text-cyan',   border: 'border-cyan/25',   dot: 'bg-cyan',   glow: 'hover:shadow-[0_0_24px_rgba(34,211,238,0.12)]' },
};

export function AlertCard({ alert }) {
  const navigate = useNavigate();
  const level = (alert.level || 'emerging').toLowerCase();
  const cfg = levelConfig[level] || levelConfig.emerging;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`glass-card border ${cfg.border} ${cfg.glow} p-5 flex flex-col justify-between transition-all duration-250`}
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className={`flex items-center gap-1.5 ${cfg.bg} ${cfg.text} px-2.5 py-1 rounded-full`}>
            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${level !== 'emerging' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{alert.level}</span>
          </div>
          <span className="text-[10px] font-mono text-muted/60 ml-auto">
            {alert.time ? alert.time.replace('T', ' ').slice(0, 16) : (alert.timestamp || 'JUST NOW')}
          </span>
        </div>

        <h3 className="text-sm font-bold text-ink leading-snug line-clamp-2 mb-2">
          {alert.headline}
        </h3>

        {alert.early_signal && (
          <div className="mt-2 p-2.5 rounded-lg bg-amber/10 border border-amber/20 flex items-start gap-2">
            <Zap size={14} className="text-amber flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-[10px] font-bold text-amber uppercase tracking-wider">Early Signal</p>
                {alert.early_signal.status && (
                  <span className="text-[9px] font-bold bg-amber/20 text-amber px-1.5 py-0.5 rounded font-mono">
                    {alert.early_signal.status}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink/90 font-medium">
                +{alert.early_signal.mention_growth_pct}% growth
                {alert.early_signal.cross_platform_movement && ` • ${alert.early_signal.cross_platform_movement}`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-white/6">
        <button
          onClick={() => navigate(`/narratives/${alert.narrative_id}`)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-violet/15 border border-violet/25 text-violet text-xs font-semibold py-2 px-3 rounded-lg hover:bg-violet/25 transition-all"
        >
          <Dna size={12} />
          View DNA
        </button>
        <button
          onClick={() => navigate(`/narratives/${alert.narrative_id}`)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 border border-white/8 text-muted text-xs font-semibold py-2 px-3 rounded-lg hover:bg-white/10 hover:text-ink transition-all"
        >
          <Activity size={12} />
          Forecast
        </button>
      </div>
    </motion.div>
  );
}
