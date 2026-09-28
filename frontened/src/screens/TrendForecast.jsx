import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Activity, ChevronRight } from 'lucide-react';
import { api } from '../api';
import { MomentumGauge } from '../components/shared/MomentumGauge';
import { MomentumSparkline } from '../components/shared/MomentumSparkline';
import { MomentumBadge } from '../components/shared/MomentumBadge';

export default function TrendForecast() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        const data = await api.getTrends().catch(err => {
          console.error("Error fetching trends:", err);
          return null;
        });
        if (!data) {
          setError("Unable to reach Social Pulse backend. Please check connection.");
          setTrends([]);
        } else {
          const list = data?.trends || (Array.isArray(data) ? data : []);
          setTrends(list);
        }
      } catch (err) {
        console.error("Error in trend forecast screen:", err);
        setError("Unable to reach Social Pulse backend.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-panel rounded mb-8"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-panel border border-border rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 pb-12">
        <header className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
          <Activity className="text-violet" size={28} />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Trend Forecast</h2>
            <p className="text-xs uppercase tracking-wider text-muted mt-1">Ranked by momentum</p>
          </div>
        </header>
        <div className="bg-coral/10 border border-coral/25 text-coral p-6 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={24} className="flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="text-xs font-bold uppercase tracking-wider bg-coral/20 hover:bg-coral/30 px-3 py-1.5 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="space-y-6 pb-12">
        <header className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
          <Activity className="text-violet" size={28} />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Trend Forecast</h2>
            <p className="text-xs uppercase tracking-wider text-muted mt-1">Ranked by momentum</p>
          </div>
        </header>
        <div className="bg-panel border border-border border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-muted">
          <Activity size={40} className="mb-4 opacity-20" />
          <p className="text-lg font-medium text-ink mb-1">No Trends Available</p>
          <p>The backend returned no trend data.</p>
        </div>
      </div>
    );
  }

  const sortedTrends = [...trends].sort((a, b) => (b.momentum_score || b.momentum || 0) - (a.momentum_score || a.momentum || 0));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
        <Activity className="text-violet" size={28} />
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Trend Forecast</h2>
          <p className="text-xs uppercase tracking-wider text-muted mt-1">Ranked by momentum</p>
        </div>
      </header>

      <div className="bg-panel border border-border rounded-lg shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 text-xs font-bold uppercase tracking-wider text-muted">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-4">Topic</div>
          <div className="col-span-2 text-center">Momentum</div>
          <div className="col-span-2 text-center">Trend</div>
          <div className="col-span-2 text-center">Breakout Prob.</div>
          <div className="col-span-1 text-right pr-2"></div>
        </div>

        {/* Table Body */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col"
        >
          {sortedTrends.map((trend, index) => (
            <motion.div 
              key={trend.id} 
              variants={itemVariants}
              onClick={() => navigate(`/narratives/${trend.id}`)}
              className="group grid grid-cols-12 gap-4 p-4 items-center border-b border-border/20 last:border-b-0 cursor-pointer hover:bg-elevated transition-colors duration-200"
            >
              <div className="col-span-1 text-center font-mono text-muted">
                #{index + 1}
              </div>
              
              <div className="col-span-4 flex flex-col gap-1">
                <span className="font-bold text-ink truncate pr-4">
                  {trend.topic || trend.name || 'Unknown'}
                </span>
                <span className="text-[10px] font-mono text-muted">
                  ID: {trend.id}
                </span>
              </div>
              
              <div className="col-span-2 flex flex-col items-center gap-2">
                <MomentumGauge score={trend.momentum ?? trend.momentum_score ?? 0} state={trend.state || trend.momentum_state || 'dormant'} />
                <MomentumBadge state={trend.state || trend.momentum_state || 'dormant'} />
              </div>
              
              <div className="col-span-2 flex justify-center items-center">
                <MomentumSparkline data={trend.momentum_history || trend.history || []} state={trend.state || trend.momentum_state || 'dormant'} />
              </div>

              <div className="col-span-2 flex justify-center items-center">
                <span className="font-mono text-lg font-bold text-ink">
                  {trend.breakout_probability != null ? Math.round(trend.breakout_probability <= 1 ? trend.breakout_probability * 100 : trend.breakout_probability) : 0}%
                </span>
              </div>

              <div className="col-span-1 flex justify-end pr-2 text-muted group-hover:text-cyan transition-colors">
                <ChevronRight size={20} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
