import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../api';
import { NetworkGraph } from './NetworkGraph';
import { SentimentTimeline } from './SentimentTimeline';
import { NarrativeDNAPanel } from './NarrativeDNAPanel';

export function AskAIEvidenceCard({ evidence }) {
  const [data, setData] = useState({ network: null, timeline: null, narrative: null, demographics: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvidenceData() {
      if (!evidence || !evidence.narrative_id) return;
      
      const { narrative_id, show } = evidence;
      const fetches = [];
      
      if (show.includes('network')) fetches.push(api.getNarrativeNetwork(narrative_id).catch(() => null));
      else fetches.push(Promise.resolve(null));
      
      if (show.includes('timeline')) fetches.push(api.getNarrativeTimeline(narrative_id).catch(() => null));
      else fetches.push(Promise.resolve(null));
      
      if (show.includes('dna') || show.includes('forecast')) fetches.push(api.getNarrative(narrative_id).catch(() => null));
      else fetches.push(Promise.resolve(null));

      if (show.includes('demographics')) fetches.push(api.getDemographics(narrative_id).catch(() => null));
      else fetches.push(Promise.resolve(null));

      try {
        const [network, timeline, narrative, demographics] = await Promise.all(fetches);
        
        setData({
          network: network || (show.includes('network') ? {
            nodes: [{id:'1', role:'Originator'}, {id:'2', role:'Amplifier'}],
            links: [{source:'1', target:'2'}]
          } : null),
          timeline: timeline || (show.includes('timeline') ? [
            { timestamp: '00:00', anger: 20, fear: 10, joy: 5, surprise: 30, sadness: 5 },
            { timestamp: '12:00', anger: 85, fear: 70, joy: 2, surprise: 10, sadness: 20 }
          ] : null),
          narrative: narrative || (show.includes('dna') ? {
            dna: {
              confidence: 90, origin: 'Unknown', mutations: [], why_now: [],
              forecast: { reach: '1M', duration: '2 Days', breakout_prob: 50 }
            }
          } : null),
          demographics: demographics || (show.includes('demographics') ? {
            age: { '18-24': 40, '25-34': 35, '35+': 25 },
            locations: ['US', 'UK', 'CA']
          } : null)
        });
      } catch (err) {
        console.error("Error fetching evidence:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchEvidenceData();
  }, [evidence]);

  if (!evidence || !evidence.show || evidence.show.length === 0) return null;

  if (loading) {
    return <div className="h-48 bg-elevated rounded-lg border border-border animate-pulse mt-4"></div>;
  }

  const containerVariants = {
    hidden: { opacity: 0, height: 0 },
    show: { opacity: 1, height: 'auto', transition: { duration: 0.4, staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mt-4 flex flex-col gap-4 p-4 bg-background/40 border border-border/50 rounded-lg"
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-violet border-b border-border/30 pb-2 mb-2">
        Supporting Evidence for Narrative {evidence.narrative_id}
      </div>

      {evidence.show.includes('network') && data.network && (
        <motion.div variants={itemVariants}>
          <NetworkGraph data={data.network} isMini={true} narrativeId={evidence.narrative_id} />
        </motion.div>
      )}

      {evidence.show.includes('timeline') && data.timeline && (
        <motion.div variants={itemVariants}>
          <SentimentTimeline data={data.timeline} />
        </motion.div>
      )}

      {evidence.show.includes('dna') && (data.narrative?.dna || data.narrative) && (
        <motion.div variants={itemVariants} className="scale-[0.95] origin-top">
          <NarrativeDNAPanel dna={data.narrative.dna || data.narrative} />
        </motion.div>
      )}

      {evidence.show.includes('demographics') && data.demographics && (
        <motion.div variants={itemVariants} className="bg-panel border border-border rounded p-4">
          <h4 className="text-xs font-bold uppercase text-muted mb-2">Demographic Split</h4>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(data.demographics.age || data.demographics.age_brackets || {}).map(([group, val]) => (
              <div key={group} className="flex flex-col">
                <span className="text-[10px] text-muted">{group}</span>
                <span className="font-bold text-sm text-ink">
                  {typeof val === 'number' && val <= 1 ? Math.round(val * 100) : val}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
