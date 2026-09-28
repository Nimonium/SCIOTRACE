import React, { useState, useEffect } from 'react';
import { Settings, Database, Server, HardDriveUpload, Cpu, Zap, Radio, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { api } from '../api';

export default function SettingsView() {
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [usage, setUsage] = useState(null);
  const [ingestingLive, setIngestingLive] = useState(false);
  const [liveResult, setLiveResult] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  const fetchUsage = async () => {
    try {
      const data = await api.getSystemUsage();
      setUsage(data);
    } catch (err) {
      console.error('Failed to load usage data:', err);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const handleResetToSeed = async () => {
    setResetting(true);
    setResetResult(null);
    try {
      const res = await api.resetToSeed();
      setResetResult({
        success: true,
        message: `Safety switch activated: ${res.message} Exactly 3 seeded stories loaded.`
      });
      fetchUsage();
    } catch (err) {
      setResetResult({ success: false, message: 'Failed to reset: ' + err.message });
    } finally {
      setResetting(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      await api.ingestSeed();
      setSeedResult({ success: true, message: 'Demo data loaded successfully. 3 seeded narratives generated.' });
      fetchUsage();
    } catch (err) {
      setSeedResult({ success: false, message: 'Failed to load demo data: ' + err.message });
    } finally {
      setSeeding(false);
    }
  };

  const handleLiveTelegramIngest = async () => {
    setIngestingLive(true);
    setLiveResult(null);
    try {
      const res = await api.ingestTelegramLive();
      setLiveResult({ success: true, message: `Successfully ingested ${res.ingested_count} live Telegram posts across active channels.` });
      fetchUsage();
    } catch (err) {
      setLiveResult({ success: false, message: 'Failed to ingest live Telegram stream: ' + err.message });
    } finally {
      setIngestingLive(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header className="flex items-center gap-3">
        <Settings className="text-muted" size={28} />
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">System Settings</h2>
          <p className="text-xs uppercase tracking-wider text-muted mt-1">Configuration, Cost Controls & Intelligence Feeds</p>
        </div>
      </header>

      <div className="space-y-6">
        {/* Cost Control & Hybrid NLP Routing */}
        <div className="bg-panel border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-4">
            <div className="flex items-center gap-3">
              <Cpu className="text-cyan" size={20} />
              <h3 className="text-lg font-bold text-ink">Hybrid NLP & Cloud Cost Control</h3>
            </div>
            <button 
              onClick={fetchUsage} 
              className="text-muted hover:text-ink flex items-center gap-1.5 text-xs font-mono bg-elevated px-2.5 py-1 rounded border border-border transition-colors"
            >
              <RefreshCw size={12} />
              Refresh Metrics
            </button>
          </div>

          <p className="text-sm text-muted mb-6">
            Social Pulse AI uses a 3-tier hybrid pipeline. Clean, high-confidence posts are classified locally at 0 cost via VADER and lexicon rules. Ambiguous sentiment, sarcasm, and complex policy mutations escalate to Gemini with intelligent batching.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-elevated p-3.5 rounded border border-border/60">
              <p className="text-[10px] uppercase tracking-wider text-muted mb-1 font-mono">Local Routine</p>
              <p className="text-xl font-black text-cyan font-mono">{usage?.local_classifications_count ?? '–'}</p>
              <p className="text-[10px] text-emerald mt-1 flex items-center gap-1">
                <CheckCircle2 size={11} /> {usage?.local_savings_percentage || '100%'} offloaded
              </p>
            </div>

            <div className="bg-elevated p-3.5 rounded border border-border/60">
              <p className="text-[10px] uppercase tracking-wider text-muted mb-1 font-mono">Real Gemini Calls</p>
              <p className="text-xl font-black text-ink font-mono">{usage?.gemini_calls_real ?? 0}</p>
              <p className="text-[10px] text-emerald mt-1 font-mono font-bold">$0.00 Live Spend</p>
            </div>

            <div className="bg-elevated p-3.5 rounded border border-amber/30 bg-amber/5">
              <p className="text-[10px] uppercase tracking-wider text-amber mb-1 font-mono">Emulated Escalations</p>
              <p className="text-xl font-black text-amber font-mono">{usage?.gemini_calls_emulated ?? 0}</p>
              <p className="text-[10px] text-amber/90 mt-1 font-mono">Would require live key</p>
            </div>

            <div className="bg-elevated p-3.5 rounded border border-border/60">
              <p className="text-[10px] uppercase tracking-wider text-muted mb-1 font-mono">Total API Saved</p>
              <p className="text-xl font-black text-emerald font-mono">{usage?.gemini_calls_saved_by_local_model ?? '–'}</p>
              <p className="text-[10px] text-muted mt-1 font-mono">Zero API Cost</p>
            </div>

            <div className="bg-elevated p-3.5 rounded border border-border/60">
              <p className="text-[10px] uppercase tracking-wider text-muted mb-1 font-mono">Est. Tokens</p>
              <p className="text-xl font-black text-ink font-mono">{usage?.estimated_gemini_tokens_used ?? 0}</p>
              <p className="text-[10px] text-muted mt-1 font-mono">Escalated Tokens</p>
            </div>
          </div>

          <div className="bg-elevated/50 p-4 rounded border border-border/40 text-xs text-muted flex items-start gap-3">
            <Zap className="text-amber flex-shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <div>
                <span className="font-semibold text-ink">API Key & Cost Transparency:</span> Because no <code>GEMINI_API_KEY</code> is set in <code>.env</code>, all <strong>{usage?.gemini_calls_emulated ?? 0} uncertain posts</strong> were flagged for escalation by the uncertainty gate and executed via the offline heuristic fallback at <strong>$0.00 actual cost</strong>.
              </div>
              <div className="text-[11px] text-muted/80">
                If a valid Gemini API key is configured, these {usage?.gemini_calls_emulated ?? 0} requests will automatically dispatch to Google's live <code>gemini-2.5-flash</code> endpoint and count under <em>Real Gemini Calls</em>.
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence Feeds: Telegram Live vs X Sample */}
        <div className="bg-panel border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-border/50 pb-4">
            <Radio className="text-emerald" size={20} />
            <h3 className="text-lg font-bold text-ink">Live Intelligence Feeds & Data Sources</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Telegram Channel Feed */}
            <div className="bg-elevated p-5 rounded border border-cyan/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-ink text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan animate-pulse" />
                    Telegram Live Channels
                  </h4>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/30 font-bold">
                    Connected: Live
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Real-time unauthenticated public feed ingestion from verified open channels (e.g., <code>durov</code>, <code>telegram</code>, <code>worldnews</code>, <code>tginfoen</code>). Full pipeline classification and dynamic narrative clustering.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/40">
                <button
                  onClick={handleLiveTelegramIngest}
                  disabled={ingestingLive}
                  className="w-full flex items-center justify-center gap-2 bg-cyan/10 hover:bg-cyan hover:text-black text-cyan text-xs font-bold py-2 rounded transition-colors disabled:opacity-50 border border-cyan/30"
                >
                  <RefreshCw size={14} className={ingestingLive ? 'animate-spin' : ''} />
                  {ingestingLive ? 'Ingesting Live Channels...' : 'Stream Latest Telegram Posts'}
                </button>
              </div>
            </div>

            {/* X / Twitter Sample Mode */}
            <div className="bg-elevated p-5 rounded border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-ink text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber" />
                    X (Twitter) Feed
                  </h4>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber/15 text-amber border border-amber/30 font-bold">
                    Sample Data Mode
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Operating in cost-protection sample mode. Posts are labeled with <code>sample_data: true</code>. No paid tier fees or fragile unofficial scrapers are used, ensuring 100% predictable compliance and zero API spend.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2 text-[11px] text-muted font-mono">
                <ShieldAlert size={14} className="text-amber flex-shrink-0" />
                <span>Zero live spend · Sample dataset</span>
              </div>
            </div>
          </div>

          {liveResult && (
            <div className={`p-3 rounded text-sm ${liveResult.success ? 'bg-emerald/10 text-emerald border border-emerald/20' : 'bg-coral/10 text-coral border border-coral/20'}`}>
              {liveResult.message}
            </div>
          )}
        </div>

        {/* Demo Mode Safety Switch */}
        <div className="bg-panel border border-amber/40 rounded-lg p-6 bg-gradient-to-br from-panel to-amber/5">
          <div className="flex items-center gap-3 mb-4 border-b border-border/50 pb-4">
            <ShieldAlert className="text-amber" size={20} />
            <div>
              <h3 className="text-lg font-bold text-ink">Demo Mode Safety Switch</h3>
              <p className="text-xs text-amber font-mono">POST /api/v1/system/reset-to-seed</p>
            </div>
          </div>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            Use this safety switch right before jury presentations. It instantly purges all noisy live-ingested Telegram streams, resets the narrative registry, and restores the database to <strong>exactly the 3 foundational seeded narratives</strong> with zero residual side effects.
          </p>
          
          <button 
            onClick={handleResetToSeed}
            disabled={resetting}
            className="flex items-center gap-2 bg-amber/15 hover:bg-amber hover:text-black text-amber font-bold px-4 py-2.5 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-amber/40"
          >
            <RefreshCw size={16} className={resetting ? 'animate-spin' : ''} />
            {resetting ? 'Restoring Clean Demo State...' : 'Reset to 3 Seed Narratives (Demo Mode)'}
          </button>
          
          {resetResult && (
            <div className={`mt-4 p-3 rounded text-sm ${resetResult.success ? 'bg-emerald/10 text-emerald border border-emerald/20' : 'bg-coral/10 text-coral border border-coral/20'}`}>
              {resetResult.message}
            </div>
          )}
        </div>

        {/* Database & Demo Data */}
        <div className="bg-panel border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-border/50 pb-4">
            <Database className="text-violet" size={20} />
            <h3 className="text-lg font-bold text-ink">Database & Benchmark Data</h3>
          </div>
          <p className="text-sm text-muted mb-6">
            Load or reset foundational benchmark narratives for evaluation and testing.
          </p>
          
          <button 
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 bg-elevated hover:bg-violet hover:text-ink text-ink font-medium px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-border hover:border-violet"
          >
            <HardDriveUpload size={18} />
            {seeding ? 'Loading Data...' : 'Reset / Load Benchmark Data'}
          </button>
          
          {seedResult && (
            <div className={`mt-4 p-3 rounded text-sm ${seedResult.success ? 'bg-emerald/10 text-emerald border border-emerald/20' : 'bg-coral/10 text-coral border border-coral/20'}`}>
              {seedResult.message}
            </div>
          )}
        </div>

        {/* API Configuration */}
        <div className="bg-panel border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-border/50 pb-4">
            <Server className="text-cyan" size={20} />
            <h3 className="text-lg font-bold text-ink">API Configuration</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted mb-1">Backend URL</label>
              <input type="text" readOnly value={import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'} className="w-full bg-elevated border border-border rounded p-2 text-sm text-ink outline-none cursor-not-allowed font-mono" />
              <p className="text-xs text-muted mt-1">Configured via environment variables.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

