import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import { AlertCard } from '../components/shared/AlertCard';
import { Bell, AlertTriangle } from 'lucide-react';

export default function AlertsList() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    api.getAlerts()
      .then(data => {
        const list = data?.alerts || (Array.isArray(data) ? data : []);
        setAlerts(list);
      })
      .catch(err => {
        console.error("Error fetching alerts:", err);
        setError("Unable to reach Social Pulse backend. Please check connection.");
        setAlerts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-panel rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-panel border border-border rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <Bell className="text-amber" size={28} />
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Active Alerts</h2>
          <p className="text-xs uppercase tracking-wider text-muted mt-1">Real-time early signals and warnings</p>
        </div>
      </header>

      {error ? (
        <div className="bg-coral/10 border border-coral/25 text-coral p-6 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="text-xs font-bold uppercase tracking-wider bg-coral/20 hover:bg-coral/30 px-3 py-1.5 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-panel border border-border border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-muted">
          <AlertTriangle size={40} className="mb-4 opacity-20" />
          <p className="text-lg font-medium text-ink mb-1">No Active Alerts</p>
          <p>The backend returned no alert data.</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {alerts.map((alert, idx) => (
            <motion.div 
              key={alert.narrative_id || alert.id || idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <AlertCard alert={alert} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
