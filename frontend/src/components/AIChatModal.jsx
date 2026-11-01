import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTradingStore } from '../store/tradingStore';

export default function AIChatModal({ isOpen, onClose }) {
  const { spot, atm, pcr, vix, todayPnl, positions } = useTradingStore();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: `👋 Hello! I am **ThetaGrid AI Copilot**, powered by Google Gemini 2.5 Flash.\n\nI have real-time access to your live Dhan HQ account, market feeds, option chains, and intraday algorithms. How can I assist your trading today?`,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (queryText = null) => {
    const textToSend = (typeof queryText === 'string' ? queryText : input).trim();
    if (!textToSend || loading) return;

    const userMsg = {
      id: 'user-' + Date.now(),
      role: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          context: {
            spot,
            atm,
            pcr,
            vix,
            todayPnl,
            positionCount: positions?.length || 0,
          }
        }),
      }).then(r => r.json());

      if (res.success && res.reply) {
        const botMsg = {
          id: 'bot-' + Date.now(),
          role: 'assistant',
          text: res.reply,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        throw new Error(res.error || 'No response from AI model');
      }
    } catch (err) {
      toast.error('AI query failed: ' + err.message);
      setMessages(prev => [
        ...prev,
        {
          id: 'bot-err-' + Date.now(),
          role: 'assistant',
          text: `⚠️ **Error communicating with Gemini 2.5 Flash**: ${err.message}\n\nPlease check that your Gemini API key in backend/.env is valid.`,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const quickPills = [
    'Analyze Nifty 9:15 open premium decay trend',
    'What does current OI Crossover indicate?',
    'Review my Dhan margin & open positions',
    'Give a high-probability strike recommendation',
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(3px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '20px',
    }}>
      <div style={{
        width: '520px',
        maxWidth: '95vw',
        height: '90vh',
        background: '#ffffff',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        boxShadow: '0 20px 40px -10px rgba(37, 99, 235, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideInRight 0.25s ease',
      }}>
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🤖</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                ThetaGrid AI Copilot
              </div>
              <div style={{ fontSize: '0.72rem', color: '#bfdbfe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', background: '#34d399', borderRadius: '50%', display: 'inline-block' }} />
                Gemini 2.5 Flash • Dhan HQ Live Grounding
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: 'white',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Live Dhan Snapshot Bar */}
        <div style={{
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
          color: '#475569',
        }}>
          <span>NIFTY: <strong style={{ color: '#1e40af' }}>₹{spot?.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</strong></span>
          <span>ATM: <strong style={{ color: '#2563eb' }}>{atm}</strong></span>
          <span>PCR: <strong style={{ color: pcr >= 1 ? '#16a34a' : '#dc2626' }}>{pcr}</strong></span>
          <span>VIX: <strong>{vix}</strong></span>
          <span>Open: <strong>{positions?.length || 0} legs</strong></span>
        </div>

        {/* Messages List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          background: '#f8fafc',
        }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{
                background: m.role === 'user' ? '#2563eb' : '#ffffff',
                color: m.role === 'user' ? '#ffffff' : '#0f172a',
                border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                padding: '12px 14px',
                borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                fontSize: '0.82rem',
                lineHeight: 1.5,
                boxShadow: m.role === 'user' ? '0 2px 6px rgba(37, 99, 235, 0.2)' : '0 2px 6px rgba(0,0,0,0.04)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {m.text}
              </div>
              <span style={{
                fontSize: '0.65rem',
                color: '#94a3b8',
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                padding: '0 4px',
              }}>
                {m.time}
              </span>
            </div>
          ))}

          {loading && (
            <div style={{
              alignSelf: 'flex-start',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '10px 14px',
              borderRadius: '12px 12px 12px 2px',
              fontSize: '0.78rem',
              color: '#2563eb',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>🧠 Analyzing Dhan real-time order book &amp; option chain with Gemini...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div style={{
          padding: '8px 16px',
          background: '#ffffff',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}>
          {quickPills.map((pill, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(pill)}
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '4px 10px',
                borderRadius: '14px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div style={{
          padding: '12px 16px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '10px',
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask ThetaGrid AI about options, decay, PCR, strikes..."
            style={{
              flex: 1,
              padding: '10px 14px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: '#0f172a',
              outline: 'none',
            }}
          />
          <button
            disabled={loading || !input.trim()}
            onClick={() => handleSend()}
            style={{
              background: loading || !input.trim() ? '#94a3b8' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '0 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Ask</span> ➔
          </button>
        </div>

      </div>
    </div>
  );
}

