import React from 'react';
import { motion } from 'framer-motion';

export function NarrativeDNAPanel({ dna }) {
  if (!dna) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="bg-panel border border-border rounded-lg p-6 shadow-sm"
    >
      <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
        Narrative DNA
        <span className="text-xs bg-elevated text-violet px-2 py-1 rounded font-mono font-normal">
          {dna.confidence}% CONFIDENCE
        </span>
      </h3>
      
      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-cyan before:via-violet before:to-transparent">
        
        {/* Origin */}
        <motion.div variants={itemVariants} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-background bg-cyan shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
          <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-4 rounded bg-background/50 border border-border/50">
            <h4 className="text-sm font-bold uppercase text-muted mb-1">Origin</h4>
            {typeof dna.origin === 'object' && dna.origin !== null ? (
              <div className="text-sm text-ink space-y-0.5">
                <div className="font-semibold text-cyan capitalize">{dna.origin.platform}</div>
                <div className="text-xs text-muted">{dna.origin.community}</div>
                {dna.origin.timestamp && (
                  <div className="text-[10px] font-mono text-muted/60">{dna.origin.timestamp.replace('T', ' ').slice(0, 16)}</div>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink">{dna.origin || 'Unknown'}</p>
            )}
          </div>
        </motion.div>

        {/* Mutation */}
        <motion.div variants={itemVariants} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-background bg-violet shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
          <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-4 rounded bg-background/50 border border-border/50">
            <h4 className="text-sm font-bold uppercase text-muted mb-2">Mutation Reframes</h4>
            <ul className="space-y-2">
              {(dna.mutation || dna.mutations || []).map((mut, idx) => (
                <li key={idx} className="text-sm flex flex-col gap-0.5">
                  <span className="font-medium text-violet text-xs">{mut.community || mut.community_label}</span>
                  <span className="text-muted text-xs pl-3 border-l-2 border-border">&rarr; {mut.reframe || mut.reframing}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Why Now */}
        <motion.div variants={itemVariants} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-background bg-authority shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
          <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-4 rounded bg-background/50 border border-border/50">
            <h4 className="text-sm font-bold uppercase text-muted mb-2">Why Now</h4>
            <ul className="list-disc list-inside text-xs text-ink space-y-1">
              {(dna.why_now || []).map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Forecast */}
        {dna.forecast && (
          <motion.div variants={itemVariants} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-background bg-magenta shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
            <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-4 rounded bg-background/50 border border-border/50 border-l-2 border-l-magenta">
              <h4 className="text-sm font-bold uppercase text-muted mb-2">Forecast</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-ink">
                <div className="flex flex-col">
                  <span className="text-xs text-muted">Expected Reach</span>
                  <span className="font-bold text-sm">
                    {dna.forecast.expected_reach ? Number(dna.forecast.expected_reach).toLocaleString() : (dna.forecast.reach || 'N/A')}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted">Est. Duration</span>
                  <span className="font-bold text-sm">
                    {dna.forecast.expected_duration_hours ? `${dna.forecast.expected_duration_hours}h` : (dna.forecast.duration || 'N/A')}
                  </span>
                </div>
                <div className="flex flex-col col-span-2 mt-1">
                  <span className="text-xs text-muted">
                    Breakout Prob: {Math.round((dna.forecast.breakout_probability <= 1 ? dna.forecast.breakout_probability * 100 : dna.forecast.breakout_probability) || dna.forecast.breakout_prob || 0)}%
                  </span>
                  <div className="w-full bg-background rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-magenta h-1.5 rounded-full transition-all" 
                      style={{ width: `${Math.min(100, Math.round((dna.forecast.breakout_probability <= 1 ? dna.forecast.breakout_probability * 100 : dna.forecast.breakout_probability) || dna.forecast.breakout_prob || 0))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </motion.div>
  );
}
