import { useEffect, useState } from 'react';
import { useTradingStore } from '../store/tradingStore';

const API_BASE = 'http://localhost:3001/api';

const CALC_BASES = [
  { value: 'day_open',   label: '🌅 Day Open Price (9:15)', desc: 'Locked to 9:15 AM Day Open premiums' },
  { value: 'prev_close', label: '📅 Prev Day Settlement',  desc: 'Uses previous day close/settlement price' },
];

export default function SupportResistance() {
  const { spot, atm } = useTradingStore();
  const [calcBasis, setCalcBasis] = useState('day_open');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedStrike, setSelectedStrike] = useState(null);

  // Manual ATM override
  const autoAtm = atm || (spot ? Math.round(spot / 50) * 50 : 24250);
  const [manualAtmInput, setManualAtmInput] = useState('');
  const [useManualAtm, setUseManualAtm] = useState(false);
  const [appliedAtm, setAppliedAtm] = useState(null); // committed manual ATM
  const manualAtmVal = parseInt(manualAtmInput);

  // effectiveAtm: use committed appliedAtm if set, otherwise auto
  const effectiveAtm = (useManualAtm && appliedAtm && appliedAtm > 0) ? appliedAtm : autoAtm;

  const currentAtm = effectiveAtm;
  const activeStrike = selectedStrike || currentAtm;

  useEffect(() => {
    fetchSRData(effectiveAtm, activeStrike);
  }, [calcBasis, activeStrike, spot, effectiveAtm]);

  // Accept explicit atmVal and strikeVal to avoid stale closure bugs on manual apply
  const fetchSRData = async (atmVal, strikeVal) => {
    const resolvedAtm    = (atmVal    !== undefined) ? atmVal    : effectiveAtm;
    const resolvedStrike = (strikeVal !== undefined) ? strikeVal : activeStrike;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        mode: calcBasis,
        spot: spot || 24383.6,
        strike: resolvedStrike,
        atm: resolvedAtm,
      });
      const res = await fetch(`${API_BASE}/sr?${params}`).then(r => r.json());
      setData(res);
    } catch (err) {
      console.error('Fetch S&R failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualAtmApply = () => {
    if (!isNaN(manualAtmVal) && manualAtmVal > 0) {
      const snapped = Math.round(manualAtmVal / 50) * 50;
      setAppliedAtm(snapped);
      setUseManualAtm(true);
      setSelectedStrike(null);
      // fetch immediately with the snapped value — no state race
      fetchSRData(snapped, snapped);
    }
  };

  const handleResetAtm = () => {
    setUseManualAtm(false);
    setAppliedAtm(null);
    setManualAtmInput('');
    setSelectedStrike(null);
    // fetch with auto ATM immediately
    fetchSRData(autoAtm, autoAtm);
  };

  const spotRows = data?.spotRows || [];
  const premiumRows = data?.premiumRows || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>🎯 Support & Resistance (Spot & Premium)</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Techfrost Nifty_V6_SR Engine | Spot Projections (Image 1) & Option Premium Levels (Image 2)
            {spot && ` | Current Spot: ₹${spot.toLocaleString('en-IN')}`}
            {` | ATM Strike: ${currentAtm}`}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => fetchSRData(effectiveAtm, activeStrike)} disabled={loading}>
          {loading ? '⏳' : '🔄'} Recalculate
        </button>
      </div>

      {/* Basis, ATM Override & Strike selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Calculation Basis */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {CALC_BASES.map(b => (
            <div
              key={b.value}
              onClick={() => setCalcBasis(b.value)}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: `1px solid ${calcBasis === b.value ? 'var(--color-accent-blue)' : 'var(--color-border)'}`,
                background: calcBasis === b.value ? 'rgba(59,130,246,0.08)' : 'var(--color-bg-card)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '2px', fontSize: '0.85rem' }}>{b.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{b.desc}</div>
            </div>
          ))}
        </div>

        {/* Right column: Manual ATM + Strike Picker stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Manual ATM Strike Entry */}
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>MANUAL ATM STRIKE OVERRIDE</span>
              {useManualAtm && (
                <span
                  onClick={handleResetAtm}
                  style={{ fontSize: '0.65rem', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕ Reset to Auto ({autoAtm})
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                step="50"
                placeholder={`Auto: ${autoAtm}`}
                value={manualAtmInput}
                onChange={e => setManualAtmInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualAtmApply()}
                style={{
                  flex: 1,
                  background: 'var(--color-bg-elevated)',
                  border: `1px solid ${useManualAtm ? '#f59e0b' : 'var(--color-border)'}`,
                  color: useManualAtm ? '#f59e0b' : 'var(--color-text-primary)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none',
                  width: '100%',
                }}
              />
              <button
                onClick={handleManualAtmApply}
                style={{
                  background: '#f59e0b',
                  color: '#0a0e1a',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Apply
              </button>
            </div>
            <div style={{ marginTop: '6px', fontSize: '0.7rem', color: useManualAtm ? '#f59e0b' : 'var(--color-text-muted)' }}>
              {useManualAtm
                ? `⚡ Using manual ATM: ${effectiveAtm} (overriding auto ${autoAtm})`
                : `Auto-detected ATM: ${autoAtm} from live spot ₹${(spot || 24383.6).toFixed(2)}`}
            </div>
          </div>

          {/* Selected Strike Picker (for Premium S/R column) */}
          <div className="card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>CHOSEN STRIKE (PREMIUM S/R)</div>
            <select
              value={activeStrike}
              onChange={e => setSelectedStrike(parseInt(e.target.value))}
              style={{ width: '100%', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.95rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}
            >
              {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map(offset => {
                const str = currentAtm + offset * 50;
                return (
                  <option key={str} value={str}>
                    {str} {offset === 0 ? '(ATM)' : offset > 0 ? `(+${offset * 50})` : `(${offset * 50})`}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Main S&R Grid: Spot vs Premium side-by-side matching Image 1 & Image 2 exact 4-column format */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Table 1: Image 1 Exact Spot S/R Levels */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#eab308' }}>
              📊 Spot Support & Resistance (Image 1 Format)
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Formula: Strike ± Option Base</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)', color: '#eab308', textTransform: 'none', fontSize: '0.75rem', fontWeight: 700 }}>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Metric / Level</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Chosen Strike</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Option Base (9:15)</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Spot S/R Value</th>
              </tr>
            </thead>
            <tbody>
              {spotRows.map((r, i) => {
                const isPivot = r.type === 'pivot';
                const isAtm = r.type === 'atm';
                const isRes = r.type === 'resistance';
                const isSup = r.type === 'support';

                const valColor = isRes ? '#ef4444' : isSup ? '#06b6d4' : isPivot ? '#3b82f6' : 'var(--color-text-primary)';

                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isPivot || isAtm ? 'rgba(59,130,246,0.06)' : undefined }}>
                    <td style={{ padding: '9px 14px', fontWeight: isRes || isSup ? 700 : 800, color: isRes ? '#ef4444' : isSup ? '#06b6d4' : 'var(--color-text-primary)' }}>
                      {r.metric}
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                      {r.chosenStrike}
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-secondary)' }}>
                      {r.optionBase}
                    </td>
                    <td className="font-mono" style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: valColor }}>
                      {r.value?.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table 2: Image 2 Exact Option Premium S/R Levels */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#10b981' }}>
              📊 Option Premium Support & Resistance (Image 2 Format)
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>BEP = (CE + PE) / 2</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)', color: '#10b981', textTransform: 'none', fontSize: '0.75rem', fontWeight: 700 }}>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Metric / Level</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Chosen Strike</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Option Base (9:15)</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Premium S/R Value</th>
              </tr>
            </thead>
            <tbody>
              {premiumRows.map((r, i) => {
                const isPivot = r.type === 'pivot';
                const isRes = r.type === 'resistance';
                const isSup = r.type === 'support';

                const valColor = isRes ? '#ef4444' : isSup ? '#06b6d4' : isPivot ? '#10b981' : 'var(--color-text-primary)';

                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isPivot ? 'rgba(16,185,129,0.06)' : undefined }}>
                    <td style={{ padding: '9px 14px', fontWeight: isRes || isSup ? 700 : 800, color: isRes ? '#ef4444' : isSup ? '#06b6d4' : 'var(--color-text-primary)' }}>
                      {r.metric}
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                      {r.chosenStrike}
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-secondary)' }}>
                      {r.optionBase}
                    </td>
                    <td className="font-mono" style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: valColor }}>
                      {r.value?.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
