import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import { Users, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/styles';

const emotionColors = {
  anger: 'text-coral bg-coral/10 border-coral/20',
  fear: 'text-amber bg-amber/10 border-amber/20',
  joy: 'text-emerald bg-emerald/10 border-emerald/20',
  curiosity: 'text-cyan bg-cyan/10 border-cyan/20',
  excitement: 'text-violet bg-violet/10 border-violet/20',
  anxiety: 'text-amber bg-amber/10 border-amber/20',
  mobilization: 'text-emerald bg-emerald/10 border-emerald/20',
};

export default function CommunitiesView() {
  const [narratives, setNarratives] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    api.getNarratives()
      .then(data => {
        const list = data?.narratives || (Array.isArray(data) ? data : []);
        setNarratives(list);
        if (list.length > 0) {
          setSelectedId(list[0].id || list[0].narrative_id);
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Error fetching narratives in communities view:", err);
        setError("Unable to reach SCIOTRACE backend. Please check connection.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedId) {
      setLoading(true);
      setError(null);
      api.getNarrativeCommunities(selectedId)
        .then(data => {
          const list = data?.communities || (Array.isArray(data) ? data : []);
          setCommunities(list);
        })
        .catch(err => {
          console.error("Error fetching narrative communities:", err);
          setError("Unable to load community DNA for this narrative.");
          setCommunities([]);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedId]);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Users className="text-cyan" size={28} />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Community DNA</h2>
            <p className="text-xs uppercase tracking-wider text-muted mt-1">Cross-community analysis</p>
          </div>
        </div>
        {narratives.length > 0 && (
          <select 
            value={selectedId || ''} 
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-panel border border-border text-ink rounded-lg px-4 py-2 outline-none focus:border-cyan text-sm"
          >
            {narratives.map(n => {
              const nid = n.id || n.narrative_id;
              return <option key={nid} value={nid}>{n.topic || n.title || n.name || nid}</option>;
            })}
          </select>
        )}
      </header>

      {error && (
        <div className="bg-coral/10 border border-coral/25 text-coral p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="text-xs font-bold uppercase tracking-wider bg-coral/20 hover:bg-coral/30 px-3 py-1.5 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-panel rounded-lg"></div>)}
        </div>
      ) : communities.length === 0 ? (
        <div className="bg-panel border border-border border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-muted">
          <AlertTriangle size={40} className="mb-4 opacity-20" />
          <p className="text-lg font-medium text-ink mb-1">No Communities Found</p>
          <p>No community data available for this narrative.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((comm, idx) => {
            const emotionStyle = emotionColors[comm.dominant_emotion?.toLowerCase()] || 'text-muted bg-elevated border-border';
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-panel border border-border rounded-lg p-5 flex flex-col justify-between hover:border-cyan/50 transition-colors"
              >
                <div>
                  <h3 className="text-lg font-bold text-ink mb-1">{comm.label || comm.name || 'Unknown Community'}</h3>
                  <p className="text-sm text-muted mb-4">{comm.platforms?.join(', ')}</p>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wider text-muted">Participants</span>
                    <span className="text-sm font-bold text-ink">{comm.participant_count?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-wider text-muted">Avg Engagement</span>
                    <span className="text-sm font-bold text-ink">
                      {comm.avg_engagement !== undefined ? `${Math.round(comm.avg_engagement * 100)}%` : (comm.engagement?.toLocaleString() || '–')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-border/50 pt-4 mt-2">
                  <div className="flex-1 flex flex-col items-center p-2 bg-elevated rounded">
                    <span className="text-[10px] uppercase tracking-wider text-muted mb-1">Sentiment</span>
                    <span className="text-xs font-bold text-ink capitalize">{comm.dominant_sentiment || 'Neutral'}</span>
                  </div>
                  <div className={cn("flex-1 flex flex-col items-center p-2 rounded border", emotionStyle)}>
                    <span className="text-[10px] uppercase tracking-wider mb-1 opacity-80">Emotion</span>
                    <span className="text-xs font-bold capitalize">{comm.dominant_emotion || 'Unknown'}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  );
}
