import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch } from 'lucide-react';

export function MutationJourney({ data }) {
  const stages = Array.isArray(data) ? data : (data?.stages || []);

  if (!stages || stages.length === 0) return (
    <div className="bg-panel border border-border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-muted">
      <GitBranch size={24} className="mb-3 opacity-20" />
      <p>No mutation data available.</p>
    </div>
  );

  return (
    <div className="bg-panel border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <GitBranch className="text-cyan" size={18} />
        <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Mutation Journey</h3>
      </div>
      <div className="relative border-l border-border/50 ml-3 space-y-6">
        {stages.map((stage, idx) => {
          const commName = stage.community_label || stage.community || `Stage ${stage.stage || idx + 1}`;
          const timeStr = stage.timestamp ? stage.timestamp.replace('T', ' ').slice(0, 16) : (stage.activation_time || '');
          const reframeText = stage.reframe || stage.reframing || 'Community discussion.';
          const emotion = stage.dominant_emotion || 'neutral';

          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative pl-6"
            >
              <div className="absolute w-3 h-3 bg-cyan rounded-full -left-[6.5px] top-1.5 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-ink">{commName}</span>
                  {timeStr && <span className="text-[10px] text-muted font-mono">{timeStr}</span>}
                </div>
                <p className="text-sm text-ink/80 italic border-l-2 border-border pl-3 my-1">"{reframeText}"</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted">Dominant Emotion:</span>
                  <span className="text-xs font-semibold text-cyan bg-cyan/10 px-2 py-0.5 rounded capitalize">{emotion}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
