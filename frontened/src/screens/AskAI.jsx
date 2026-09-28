import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareText, Send, Loader2, Bot } from 'lucide-react';
import { api } from '../api';
import { AskAIEvidenceCard } from '../components/shared/AskAIEvidenceCard';
import { cn } from '../utils/styles';

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  const [showEvidence, setShowEvidence] = useState(false);

  useEffect(() => {
    if (!isUser && msg.evidence) {
      const timer = setTimeout(() => setShowEvidence(true), 600);
      return () => clearTimeout(timer);
    }
  }, [isUser, msg.evidence]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full mb-6",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "max-w-[80%] rounded-xl p-5 shadow-sm",
        isUser 
          ? "bg-cyan text-panel font-medium" 
          : "bg-panel border border-border text-ink"
      )}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-3 text-violet border-b border-border/30 pb-2">
            <Bot size={16} />
            <span className="text-[10px] uppercase tracking-wider font-bold">Social Pulse AI</span>
          </div>
        )}
        
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>

        {!isUser && msg.evidence && showEvidence && (
          <AskAIEvidenceCard evidence={msg.evidence} />
        )}
      </div>
    </motion.div>
  );
}

export default function AskAI() {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Hello. I am Social Pulse AI. Ask me to analyze narratives, investigate network structures, or forecast trends.' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setLoading(true);

    try {
      const response = await api.askAi(userQuery);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.answer || 'Analysis complete.',
        evidence: response.evidence || null
      }]);
    } catch (error) {
      console.error("Error asking AI:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm currently unable to reach the analysis engine. Please try again later."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col relative overflow-hidden">
      <header className="flex items-center gap-3 mb-4 flex-shrink-0 border-b border-border/50 pb-4">
        <MessageSquareText className="text-violet" size={28} />
        <div>
          <h2 className="text-2xl font-bold tracking-tight leading-none text-ink">Ask Social Pulse AI</h2>
          <p className="text-xs uppercase tracking-wider text-muted mt-1">Investigative Chat</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pr-4 mb-4 scrollbar-thin">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} msg={msg} />
          ))}
        </AnimatePresence>
        
        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mb-6"
          >
            <div className="bg-panel border border-border rounded-xl p-5 flex items-center gap-3 text-muted">
              <Loader2 size={16} className="animate-spin text-cyan" />
              <span className="text-sm font-mono tracking-wider">ANALYZING...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 pt-2 border-t border-border/50">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about narratives, networks, or specific IDs..."
            className="w-full bg-panel border border-border text-ink rounded-lg py-4 pl-4 pr-12 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all shadow-sm placeholder:text-muted/60"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan text-panel rounded-md hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
