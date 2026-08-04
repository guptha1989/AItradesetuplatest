import { useTradingStore } from '../store/tradingStore';

function SignalCard({ signal }) {
  const biasClass = signal.bias?.toLowerCase();
  const confidence = signal.confidence || 0;
  const confLevel = confidence >= 80 ? 'high' : confidence >= 60 ? 'medium' : 'low';
  const confColor = confLevel === 'high' ? 'var(--color-profit)' : confLevel === 'medium' ? 'var(--color-accent-yellow)' : 'var(--color-loss)';

  return (
    <div className={`signal-card ${biasClass}`} style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
            <span className={`badge badge-${biasClass}`}>{signal.bias}</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{signal.strategy}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {signal.generatedAt ? new Date(signal.generatedAt).toLocaleString('en-IN') : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>CONFIDENCE</div>
          <div className="font-mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: confColor }}>{confidence}%</div>
        </div>
      </div>

      <div className="confidence-bar" style={{ marginTop: '8px' }}>
        <div className={`confidence-fill ${confLevel}`} style={{ width: `${confidence}%` }} />
      </div>

      {/* Strategy Legs */}
      {signal.legs?.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>TRADE LEGS</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {signal.legs.map((leg, i) => (
              <div key={i} style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                background: leg.action === 'BUY' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color: leg.action === 'BUY' ? 'var(--color-profit)' : 'var(--color-loss)',
                border: `1px solid ${leg.action === 'BUY' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                {leg.action} {leg.strike} {leg.type} × {leg.lots}L
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk / Reward */}
      {(signal.max_profit_inr || signal.max_loss_inr) && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>MAX PROFIT</div>
            <div className="font-mono pnl-positive">+₹{(signal.max_profit_inr || 0).toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>MAX LOSS</div>
            <div className="font-mono pnl-negative">-₹{Math.abs(signal.max_loss_inr || 0).toLocaleString('en-IN')}</div>
          </div>
          {signal.key_levels?.support && (
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>SUPPORT</div>
              <div className="font-mono" style={{ color: 'var(--color-accent-blue)' }}>{signal.key_levels.support}</div>
            </div>
          )}
          {signal.key_levels?.resistance && (
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>RESISTANCE</div>
              <div className="font-mono" style={{ color: 'var(--color-accent-orange)' }}>{signal.key_levels.resistance}</div>
            </div>
          )}
        </div>
      )}

      {/* Reasoning */}
      <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
        💡 {signal.reasoning}
      </div>

      {/* Risk Factors */}
      {signal.risk_factors?.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          {signal.risk_factors.map((r, i) => (
            <div key={i} style={{ fontSize: '0.75rem', color: 'var(--color-accent-yellow)', marginBottom: '3px' }}>⚠ {r}</div>
          ))}
        </div>
      )}

      {/* Avoid If */}
      {signal.avoid_if && (
        <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.2)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-accent-yellow)' }}>🚫 Avoid if: {signal.avoid_if}</span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button className="btn btn-success btn-sm">✓ Execute Trade</button>
        <button className="btn btn-ghost btn-sm">💾 Save</button>
        <button className="btn btn-ghost btn-sm">✕ Reject</button>
      </div>
    </div>
  );
}

const API_BASE = 'http://localhost:3001/api';

export default function SignalPanel() {
  const { signals, latestSignal, clearSignals } = useTradingStore();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>🤖 AI Signals</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Powered by Gemini — Session-aware Nifty analysis</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost btn-sm" onClick={clearSignals}>Clear All</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              try {
                await fetch(`${API_BASE}/signals/generate`, { method: 'POST' });
              } catch (e) {
                console.error('Trigger signal error:', e);
              }
            }}
          >
            ⚡ Generate Now
          </button>
        </div>
      </div>

      {signals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🤖</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>No signals yet</div>
          <div style={{ fontSize: '0.85rem' }}>Gemini will analyze market data every 5 minutes during market hours</div>
        </div>
      ) : (
        signals.map((signal, i) => <SignalCard key={i} signal={signal} />)
      )}
    </div>
  );
}
