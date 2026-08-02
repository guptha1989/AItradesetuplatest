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

  // Spot S/R Manual Override
  const autoAtm = atm || (spot ? Math.round(spot / 50) * 50 : 24250);
  const [manualSpotInput, setManualSpotInput] = useState('');
  const [useManualSpot, setUseManualSpot] = useState(false);
  const [appliedSpotAtm, setAppliedSpotAtm] = useState(null);

  // Premium S/R Manual Override
  const [manualPremiumInput, setManualPremiumInput] = useState('');
  const [useManualPremium, setUseManualPremium] = useState(false);
  const [appliedPremiumStrike, setAppliedPremiumStrike] = useState(null);

  const effectiveSpotAtm = (useManualSpot && appliedSpotAtm && appliedSpotAtm > 0) ? appliedSpotAtm : autoAtm;
  const effectivePremiumStrike = (useManualPremium && appliedPremiumStrike && appliedPremiumStrike > 0) ? appliedPremiumStrike : effectiveSpotAtm;

  useEffect(() => {
    fetchSRData(effectiveSpotAtm, effectivePremiumStrike);
  }, [calcBasis, spot, effectiveSpotAtm, effectivePremiumStrike]);

  const fetchSRData = async (spotAtmVal, premiumStrikeVal) => {
    const resolvedSpotAtm    = (spotAtmVal        !== undefined) ? spotAtmVal        : effectiveSpotAtm;
    const resolvedPremiumStr = (premiumStrikeVal !== undefined) ? premiumStrikeVal : effectivePremiumStrike;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        mode: calcBasis,
        spot: spot || 24383.6,
        atm: resolvedSpotAtm,
        strike: resolvedPremiumStr,
      });
      const res = await fetch(`${API_BASE}/sr?${params}`).then(r => r.json());
      setData(res);
    } catch (err) {
      console.error('Fetch S&R failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSpotApply = () => {
    const val = parseInt(manualSpotInput);
    if (!isNaN(val) && val > 0) {
      const snapped = Math.round(val / 50) * 50;
      setAppliedSpotAtm(snapped);
      setUseManualSpot(true);
      fetchSRData(snapped, effectivePremiumStrike);
    }
  };

  const handleResetSpot = () => {
    setUseManualSpot(false);
    setAppliedSpotAtm(null);
    setManualSpotInput('');
    fetchSRData(autoAtm, effectivePremiumStrike);
  };

  const handlePremiumApply = () => {
    const val = parseInt(manualPremiumInput);
    if (!isNaN(val) && val > 0) {
      const snapped = Math.round(val / 50) * 50;
      setAppliedPremiumStrike(snapped);
      setUseManualPremium(true);
      fetchSRData(effectiveSpotAtm, snapped);
    }
  };

  const handleResetPremium = () => {
    setUseManualPremium(false);
    setAppliedPremiumStrike(null);
    setManualPremiumInput('');
    fetchSRData(effectiveSpotAtm, effectiveSpotAtm);
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
            Techfrost Nifty_V6_SR Engine | Independent Manual Controls for Spot S/R & Option Premium S/R
            {spot && ` | Current Spot: ₹${spot.toLocaleString('en-IN')}`}
            {` | Spot ATM: ${effectiveSpotAtm}`}
            {` | Premium Strike: ${effectivePremiumStrike}`}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => fetchSRData(effectiveSpotAtm, effectivePremiumStrike)} disabled={loading}>
          {loading ? '⏳' : '🔄'} Recalculate
        </button>
      </div>

      {/* Basis & Separate Manual Setting Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px' }}>
        {/* Calculation Basis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                height: '100%',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '2px', fontSize: '0.85rem' }}>{b.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{b.desc}</div>
            </div>
          ))}
        </div>

        {/* 1. Spot S/R Manual Setting */}
        <div className="card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>📍 SPOT S/R MANUAL ATM</span>
            {useManualSpot && (
              <span onClick={handleResetSpot} style={{ fontSize: '0.65rem', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>
                ✕ Reset ({autoAtm})
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              step="50"
              placeholder={`Auto: ${autoAtm}`}
              value={manualSpotInput}
              onChange={e => setManualSpotInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSpotApply()}
              style={{
                flex: 1,
                background: 'var(--color-bg-elevated)',
                border: `1px solid ${useManualSpot ? '#f59e0b' : 'var(--color-border)'}`,
                color: useManualSpot ? '#f59e0b' : 'var(--color-text-primary)',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
                outline: 'none',
                width: '100%',
              }}
            />
            <button
              onClick={handleSpotApply}
              style={{
                background: '#f59e0b',
                color: '#0a0e1a',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Apply
            </button>
          </div>
          <div style={{ marginTop: '6px', fontSize: '0.68rem', color: useManualSpot ? '#f59e0b' : 'var(--color-text-muted)' }}>
            {useManualSpot ? `⚡ Manual Spot ATM: ${effectiveSpotAtm}` : `Auto Spot ATM: ${autoAtm}`}
          </div>
        </div>

        {/* 2. Option Premium S/R Manual Setting */}
        <div className="card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>📊 PREMIUM S/R MANUAL STRIKE</span>
            {useManualPremium && (
              <span onClick={handleResetPremium} style={{ fontSize: '0.65rem', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>
                ✕ Reset ({effectiveSpotAtm})
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              step="50"
              placeholder={`Auto: ${effectiveSpotAtm}`}
              value={manualPremiumInput}
              onChange={e => setManualPremiumInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePremiumApply()}
              style={{
                flex: 1,
                background: 'var(--color-bg-elevated)',
                border: `1px solid ${useManualPremium ? '#3b82f6' : 'var(--color-border)'}`,
                color: useManualPremium ? '#3b82f6' : 'var(--color-text-primary)',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
                outline: 'none',
                width: '100%',
              }}
            />
            <button
              onClick={handlePremiumApply}
              style={{
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Apply
            </button>
          </div>
          <div style={{ marginTop: '6px', fontSize: '0.68rem', color: useManualPremium ? '#3b82f6' : 'var(--color-text-muted)' }}>
            {useManualPremium ? `⚡ Manual Premium Strike: ${effectivePremiumStrike}` : `Auto Premium Strike: ${effectiveSpotAtm}`}
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
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Straddle Avg = (CE + PE) / 2 per strike</span>
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
