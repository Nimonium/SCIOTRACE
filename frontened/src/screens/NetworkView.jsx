import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, ArrowLeft, X, Filter, AlertTriangle } from 'lucide-react';
import { api } from '../api';
import { NetworkGraph } from '../components/shared/NetworkGraph';
import { roleColors, cn } from '../utils/styles';

const ALL_ROLES = ['Originator', 'Amplifier', 'Bridge', 'Authority'];

export default function NetworkView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [narratives, setNarratives] = useState([]);
  const [currentNarrativeId, setCurrentNarrativeId] = useState(id);
  
  const [activeRoles, setActiveRoles] = useState(ALL_ROLES);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    async function initNarratives() {
      try {
        const res = await api.getNarratives();
        const list = Array.isArray(res) ? res : (res?.narratives || []);
        setNarratives(list);
        if ((!id || id === 'default') && list.length > 0) {
          const firstId = list[0].narrative_id || list[0].id;
          setCurrentNarrativeId(firstId);
        } else {
          setCurrentNarrativeId(id);
        }
      } catch (err) {
        console.error("Error loading narratives for network view:", err);
      }
    }
    initNarratives();
  }, [id]);

  useEffect(() => {
    if (!currentNarrativeId || currentNarrativeId === 'default') return;

    async function fetchData() {
      setLoading(true);
      try {
        const network = await api.getNarrativeNetwork(currentNarrativeId).catch(() => null);
        setData(network || { nodes: [], links: [] });
      } catch (error) {
        console.error("Error fetching network:", error);
        setData({ nodes: [], links: [] });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentNarrativeId]);

  const toggleRole = (role) => {
    setActiveRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleNarrativeChange = (newId) => {
    setCurrentNarrativeId(newId);
    navigate(`/network/${newId}`);
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] bg-panel border border-border rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-muted font-mono tracking-wider">MAPPING TOPOLOGY...</span>
      </div>
    );
  }

  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="h-[calc(100vh-6rem)] flex flex-col relative overflow-hidden">
        <header className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-panel rounded-full transition-colors text-muted hover:text-ink">
              <ArrowLeft size={20} />
            </button>
            <Network className="text-cyan" size={24} />
            <div>
              <h2 className="text-2xl font-bold tracking-tight leading-none text-ink">Network View</h2>
              <p className="text-xs font-mono text-muted mt-1">Narrative: {currentNarrativeId || id}</p>
            </div>
          </div>
          {narratives.length > 0 && (
            <select
              value={currentNarrativeId}
              onChange={(e) => handleNarrativeChange(e.target.value)}
              className="bg-panel border border-border rounded-md px-3 py-1.5 text-xs text-ink font-mono focus:outline-none focus:border-cyan"
            >
              {narratives.map((n) => (
                <option key={n.narrative_id || n.id} value={n.narrative_id || n.id}>
                  {n.title || n.narrative_id || n.id}
                </option>
              ))}
            </select>
          )}
        </header>
        <div className="flex-1 border border-border border-dashed rounded-lg bg-background flex flex-col items-center justify-center text-muted">
           <AlertTriangle size={40} className="mb-4 opacity-20" />
           <p className="text-lg font-medium text-ink mb-1">No Network Data</p>
           <p>The backend returned no network topology for this narrative.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col relative overflow-hidden">
      <header className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-panel rounded-full transition-colors text-muted hover:text-ink"
          >
            <ArrowLeft size={20} />
          </button>
          <Network className="text-cyan" size={24} />
          <div>
            <h2 className="text-2xl font-bold tracking-tight leading-none text-ink">Network View</h2>
            <p className="text-xs font-mono text-muted mt-1">Narrative: {currentNarrativeId || id}</p>
          </div>
        </div>
        {narratives.length > 0 && (
          <select
            value={currentNarrativeId}
            onChange={(e) => handleNarrativeChange(e.target.value)}
            className="bg-panel border border-border rounded-md px-3 py-1.5 text-xs text-ink font-mono focus:outline-none focus:border-cyan"
          >
            {narratives.map((n) => (
              <option key={n.narrative_id || n.id} value={n.narrative_id || n.id}>
                {n.title || n.narrative_id || n.id}
              </option>
            ))}
          </select>
        )}
      </header>

      <div className="flex-1 relative border border-border rounded-lg overflow-hidden bg-[#0B1020] shadow-inner">
        <NetworkGraph 
          data={data} 
          isMini={false} 
          activeRoles={activeRoles} 
          onNodeClick={setSelectedNode} 
        />

        {/* Floating Filter Panel */}
        <div className="absolute top-4 left-4 bg-panel/90 backdrop-blur border border-border p-4 rounded-lg shadow-md w-48 z-10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
            <Filter size={14} />
            Filters
          </h3>
          <div className="space-y-2">
            {ALL_ROLES.map(role => {
              const isActive = activeRoles.includes(role);
              const color = roleColors[role.toLowerCase()] || '#94A3B8';
              return (
                <label key={role} className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleRole(role)}>
                  <div className={cn(
                    "w-4 h-4 rounded-sm border flex items-center justify-center transition-colors",
                    isActive ? "bg-elevated border-muted" : "bg-transparent border-border"
                  )}>
                    {isActive && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
                  </div>
                  <span className="text-sm text-ink group-hover:opacity-80 transition-opacity">
                    {role}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Node Detail Side Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute top-4 right-4 bottom-4 w-72 bg-panel/95 backdrop-blur border border-border rounded-lg shadow-xl flex flex-col z-20"
            >
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <h3 className="font-bold text-ink">Node Inspector</h3>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="p-1 hover:bg-elevated rounded text-muted hover:text-ink transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-4 flex flex-col gap-6">
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted block mb-1">ID / Hash</span>
                  <div className="bg-background p-2 rounded border border-border/50 font-mono text-sm break-all text-ink">
                    {selectedNode.id}
                  </div>
                </div>
                
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted block mb-1">Role Classification</span>
                  <div 
                    className="inline-block px-3 py-1 rounded text-sm font-bold"
                    style={{ 
                      backgroundColor: roleColors[selectedNode.role?.toLowerCase()] || '#94A3B8',
                      color: '#0B1020'
                    }}
                  >
                    {selectedNode.role || 'Unknown'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-muted block mb-1">Influence Score</span>
                    <span className="text-xl font-bold font-mono text-ink">{Math.round(selectedNode.influence_score || 0)}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs uppercase tracking-wider text-muted block mb-1">Detected Community</span>
                  <p className="text-sm text-ink">
                    {selectedNode.community || 'Unassigned / Global'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
