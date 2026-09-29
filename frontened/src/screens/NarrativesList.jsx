import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import { NarrativeCard } from '../components/shared/NarrativeCard';
import { Layers } from 'lucide-react';

export default function NarrativesList() {
  const [narratives, setNarratives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    api.getNarratives()
      .then(data => {
        const list = data?.narratives || (Array.isArray(data) ? data : []);
        setNarratives(list);
      })
      .catch(err => {
        console.error("Error fetching narratives:", err);
        setError("Unable to reach SCIOTRACE backend. Please check connection.");
        setNarratives([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-panel rounded"></div>
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-panel border border-border rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <Layers className="text-violet" size={28} />
        <h2 className="text-2xl font-bold tracking-tight text-ink">Narrative Intelligence</h2>
      </header>

      {error ? (
        <div className="bg-coral/10 border border-coral/25 text-coral p-6 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers size={24} className="flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="text-xs font-bold uppercase tracking-wider bg-coral/20 hover:bg-coral/30 px-3 py-1.5 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      ) : narratives.length === 0 ? (
        <div className="bg-panel border border-border border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-muted">
          <Layers size={40} className="mb-4 opacity-20" />
          <p className="text-lg font-medium text-ink mb-1">No Active Narratives</p>
          <p>The backend returned no narrative data.</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
          className="flex flex-col gap-4"
        >
          {narratives.map((narrative, idx) => (
            <motion.div 
              key={narrative.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <NarrativeCard narrative={narrative} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
