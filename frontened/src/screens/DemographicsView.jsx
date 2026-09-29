import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import { PieChart as PieChartIcon, AlertTriangle, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DemographicsView() {
  const [narratives, setNarratives] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [demoData, setDemoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    api.getNarratives()
      .then(data => {
        const list = data?.narratives || (Array.isArray(data) ? data : []);
        setNarratives(list);
        if (list.length > 0) {
          setSelectedId(list[0].narrative_id || list[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Error fetching narratives in demographics:", err);
        setError("Unable to reach SCIOTRACE backend. Please check connection.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedId) {
      setLoading(true);
      setError(null);
      api.getDemographics(selectedId)
        .then(data => setDemoData(data))
        .catch(err => {
          console.error("Error fetching demographics:", err);
          setError("Unable to load demographics for this narrative.");
          setDemoData(null);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedId]);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PieChartIcon className="text-emerald" size={28} />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Demographics Insights</h2>
            <p className="text-xs uppercase tracking-wider text-muted mt-1">Aggregate Audience Data</p>
          </div>
        </div>
        {narratives.length > 0 && (
          <select 
            value={selectedId || ''} 
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-panel border border-border text-ink rounded-lg px-4 py-2 outline-none focus:border-cyan text-sm"
          >
            {narratives.map(n => {
              const nid = n.narrative_id || n.id;
              return <option key={nid} value={nid}>{n.title || n.topic || n.name || nid}</option>;
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

      <div className="bg-emerald/10 border border-emerald/20 text-emerald p-4 rounded-lg flex items-start gap-3">
        <ShieldCheck size={20} className="mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <strong className="font-bold">Privacy Notice:</strong> All demographic data is strictly aggregate-only. SCIOTRACE does not track, infer, or display individual-level demographic information.
        </div>
      </div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-24 bg-panel rounded-lg"></div>
            <div className="h-24 bg-panel rounded-lg"></div>
          </div>
          <div className="h-64 bg-panel rounded-lg"></div>
        </div>
      ) : !demoData ? (
        <div className="bg-panel border border-border border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-muted">
          <AlertTriangle size={40} className="mb-4 opacity-20" />
          <p className="text-lg font-medium text-ink mb-1">No Data Available</p>
          <p>No demographic insights found for this narrative.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
             <div className="bg-panel border border-border rounded-lg p-6 flex flex-col items-center text-center justify-center h-32">
                <span className="text-xs uppercase tracking-wider text-muted mb-2">Top Language</span>
                <span className="text-2xl font-black text-ink">{demoData.top_language || 'N/A'}</span>
             </div>
             <div className="bg-panel border border-border rounded-lg p-6 flex flex-col items-center text-center justify-center h-32">
                <span className="text-xs uppercase tracking-wider text-muted mb-2">Top Region</span>
                <span className="text-xl font-bold text-ink truncate max-w-full px-2">{demoData.top_region || 'N/A'}</span>
             </div>
             
             <div className="bg-panel border border-border rounded-lg p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Audience Tribes</h3>
                <div className="space-y-3">
                  {(demoData.audience_tribes || []).map((tribe, idx) => (
                    <div key={idx} className="bg-elevated p-3 rounded text-sm font-medium text-ink flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-cyan"></div>
                       {tribe}
                    </div>
                  ))}
                </div>
             </div>
          </div>

          <div className="lg:col-span-2 bg-panel border border-border rounded-lg p-6">
             <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-6">Age Brackets (Aggregate)</h3>
             <div className="h-80 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart 
                   data={
                     Array.isArray(demoData.age_brackets)
                       ? demoData.age_brackets
                       : Object.entries(demoData.age_brackets || {}).map(([bracket, val]) => ({
                           bracket,
                           percentage: Math.round(val <= 1 ? val * 100 : val)
                         }))
                   } 
                   margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                 >
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
                   <XAxis dataKey="bracket" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                   <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                   <Tooltip 
                     cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }}
                     contentStyle={{ backgroundColor: '#151C2F', borderColor: 'rgba(148, 163, 184, 0.2)', borderRadius: '8px', color: '#F8FAFC' }}
                     itemStyle={{ color: '#22D3EE' }}
                     formatter={(value) => [`${value}%`, 'Percentage']}
                   />
                   <Bar dataKey="percentage" fill="#22D3EE" radius={[4, 4, 0, 0]} maxBarSize={50} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
