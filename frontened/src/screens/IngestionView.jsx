import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Send, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../api';

export default function IngestionView() {
  const [formData, setFormData] = useState({
    platform: 'twitter',
    author: '',
    content: '',
    timestamp: new Date().toISOString(),
    parent_id: '',
    community_id: '',
    narrative_id: ''
  });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [result, setResult] = useState(null);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setResult(null);
    try {
      const res = await api.ingestEvent(formData);
      setStatus('success');
      setResult(res);
      setFormData(prev => ({ ...prev, content: '', author: '' })); // reset some fields
    } catch (err) {
      setStatus('error');
      setResult(err.message || 'Failed to ingest event');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header className="flex items-center gap-3">
        <Radio className="text-violet" size={28} />
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Live Event Ingestion</h2>
          <p className="text-xs uppercase tracking-wider text-muted mt-1">Manual data entry for intelligence processing</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-panel border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-1">Platform</label>
                <select name="platform" value={formData.platform} onChange={handleChange} className="w-full bg-elevated border border-border rounded p-2 text-sm text-ink outline-none focus:border-cyan">
                  <option value="twitter">Twitter</option>
                  <option value="reddit">Reddit</option>
                  <option value="telegram">Telegram</option>
                  <option value="news">News</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-1">Author</label>
                <input required type="text" name="author" value={formData.author} onChange={handleChange} className="w-full bg-elevated border border-border rounded p-2 text-sm text-ink outline-none focus:border-cyan" placeholder="@username" />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted mb-1">Content</label>
              <textarea required name="content" value={formData.content} onChange={handleChange} rows="4" className="w-full bg-elevated border border-border rounded p-2 text-sm text-ink outline-none focus:border-cyan resize-none" placeholder="Enter social post content..."></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-1">Community ID (Optional)</label>
                <input type="text" name="community_id" value={formData.community_id} onChange={handleChange} className="w-full bg-elevated border border-border rounded p-2 text-sm text-ink outline-none focus:border-cyan" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-1">Narrative ID (Optional)</label>
                <input type="text" name="narrative_id" value={formData.narrative_id} onChange={handleChange} className="w-full bg-elevated border border-border rounded p-2 text-sm text-ink outline-none focus:border-cyan" />
              </div>
            </div>

            <button disabled={status === 'loading'} type="submit" className="w-full bg-cyan text-panel font-bold py-3 rounded flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50">
              {status === 'loading' ? 'Processing...' : <><Send size={18} /> Ingest Event</>}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          {status === 'idle' && (
            <div className="bg-elevated/50 border border-border border-dashed rounded-lg h-full min-h-[300px] flex items-center justify-center text-muted text-sm p-8 text-center">
              Submit an event to see the NLP classification pipeline results here.
            </div>
          )}

          {status === 'error' && (
            <div className="bg-coral/10 border border-coral/20 text-coral p-6 rounded-lg flex items-start gap-3">
              <XCircle size={24} className="flex-shrink-0" />
              <div>
                <h4 className="font-bold mb-1">Ingestion Failed</h4>
                <p className="text-sm opacity-90">{result}</p>
              </div>
            </div>
          )}

          {status === 'success' && result && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-panel border border-border rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald mb-4">
                <CheckCircle size={20} />
                <span className="font-bold">Successfully Processed</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-elevated p-3 rounded">
                  <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Sentiment</div>
                  <div className="text-sm font-bold capitalize text-ink">{result.sentiment || 'N/A'}</div>
                </div>
                <div className="bg-elevated p-3 rounded">
                  <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Emotion</div>
                  <div className="text-sm font-bold capitalize text-ink">{result.emotion || 'N/A'}</div>
                </div>
                <div className="bg-elevated p-3 rounded">
                  <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Topics</div>
                  <div className="text-xs text-ink truncate">{result.topics?.join(', ') || 'None'}</div>
                </div>
                <div className="bg-elevated p-3 rounded">
                  <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Assigned Narrative</div>
                  <div className="text-xs text-ink truncate">{result.assigned_narrative || result.narrative_id || 'New Narrative Generated'}</div>
                </div>
              </div>

              {result.entities && result.entities.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="text-[10px] uppercase tracking-wider text-muted mb-2">Extracted Entities</div>
                  <div className="flex flex-wrap gap-2">
                    {result.entities.map((e, i) => (
                      <span key={i} className="text-xs bg-violet/10 text-violet px-2 py-1 rounded border border-violet/20">{e}</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
