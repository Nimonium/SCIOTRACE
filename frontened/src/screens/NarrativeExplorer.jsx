import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { api } from '../api';
import { NarrativeDNAPanel } from '../components/shared/NarrativeDNAPanel';
import { SentimentTimeline } from '../components/shared/SentimentTimeline';
import { NetworkGraph } from '../components/shared/NetworkGraph';
import { MomentumBadge } from '../components/shared/MomentumBadge';
import { MutationJourney } from '../components/shared/MutationJourney';

export default function NarrativeExplorer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ narrative: null, timeline: null, network: null, mutation: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [narrative, timeline, network, mutation, narrativesList] = await Promise.all([
          api.getNarrative(id).catch(() => null),
          api.getNarrativeTimeline(id).catch(() => null),
          api.getNarrativeNetwork(id).catch(() => null),
          api.getNarrativeMutationJourney(id).catch(() => null),
          api.getNarratives().catch(() => null)
        ]);

        if (!narrative) {
          setError(true);
          return;
        }

        const summary = (narrativesList?.narratives || narrativesList || []).find(n => (n.id || n.narrative_id) === id) || {};
        const mergedNarrative = { ...summary, ...narrative };

        setData({
          narrative: mergedNarrative,
          timeline: timeline || [],
          network: network || { nodes: [], links: [] },
          mutation: mutation || []
        });
      } catch (error) {
        console.error("Error fetching narrative details:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-panel rounded mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 h-96 bg-panel border border-border rounded-lg"></div>
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-panel border border-border rounded-lg"></div>
            <div className="h-48 bg-panel border border-border rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data.narrative) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle size={48} className="text-coral mb-4 opacity-80" />
        <h2 className="text-xl font-bold text-ink mb-2">Narrative Not Found</h2>
        <p className="text-muted mb-6">We couldn't load intelligence for this narrative.</p>
        <button 
          onClick={() => navigate('/narratives')}
          className="bg-panel border border-border text-ink px-4 py-2 rounded hover:bg-elevated transition-colors"
        >
          Return to Narratives
        </button>
      </div>
    );
  }

  const { narrative, timeline, network, mutation } = data;

  return (
    <div className="space-y-6 pb-12">
      <header className="flex items-center gap-4 border-b border-border/50 pb-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-panel rounded-full transition-colors text-muted hover:text-ink"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-ink">{narrative.title || narrative.topic || narrative.name || 'Unknown Narrative'}</h2>
              <MomentumBadge state={narrative.momentum_state || 'Unknown'} />
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted font-mono uppercase tracking-wider">
              <span>ID: {narrative.narrative_id || narrative.id}</span>
              {narrative.social_temperature && <span>Temp: {narrative.social_temperature}</span>}
              {narrative.confidence && <span>Confidence: {typeof narrative.confidence === 'number' && narrative.confidence <= 1 ? Math.round(narrative.confidence * 100) : narrative.confidence}%</span>}
              {narrative.sample_data === false || narrative.data_source === 'live_telegram' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan/15 text-cyan border border-cyan/30">
                  LIVE TELEGRAM
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-muted border border-white/10">
                  SAMPLE DATA (X)
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
             <div className="text-xs uppercase tracking-wider text-muted">Momentum</div>
             <div className="text-2xl font-black text-ink">{narrative.momentum_score || narrative.momentum || 0}</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <NarrativeDNAPanel dna={{ ...(narrative.dna || {}), forecast: narrative.forecast || narrative.dna?.forecast, confidence: typeof narrative.confidence === 'number' && narrative.confidence <= 1 ? Math.round(narrative.confidence * 100) : (narrative.confidence || 90) }} />
          <MutationJourney data={mutation} />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-6">
          <SentimentTimeline data={timeline} />
          <NetworkGraph data={network} isMini={true} narrativeId={id} />
        </div>
      </div>
    </div>
  );
}
