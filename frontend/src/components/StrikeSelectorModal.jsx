import { useState } from 'react';

export default function StrikeSelectorModal({
  isOpen,
  onClose,
  atmStrike = 24400,
  selectedStrikes = [],
  onSelectStrikes,
}) {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState('');

  // Generate 108 strikes centered around 24000 (from 21200 to 26550 in step 50)
  const allStrikes = [];
  const baseAtm = Math.round(atmStrike / 50) * 50;
  for (let s = baseAtm - 2500; s <= baseAtm + 2500; s += 50) {
    allStrikes.push(s);
  }

  const filteredStrikes = allStrikes.filter(s =>
    searchQuery === '' ? true : String(s).includes(searchQuery)
  );

  const toggleStrike = (strike) => {
    if (selectedStrikes.includes(strike)) {
      onSelectStrikes(selectedStrikes.filter(s => s !== strike));
    } else {
      if (selectedStrikes.length >= 20) return;
      const updated = [...selectedStrikes, strike].sort((a, b) => a - b);
      onSelectStrikes(updated);
    }
  };

  const handlePreset = (count) => {
    const half = Math.floor(count / 2);
    const preset = [];
    for (let i = -half; i < count - half; i++) {
      preset.push(baseAtm + i * 50);
    }
    onSelectStrikes(preset.sort((a, b) => a - b));
  };

  const clearAll = () => {
    onSelectStrikes([]);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#ffffff',
        color: '#1e293b',
        borderRadius: '16px',
        width: '680px',
        maxWidth: '92vw',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px 12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Select Strike Prices
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.4rem',
              color: '#64748b',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Selected Progress Bar */}
        <div style={{ padding: '0 24px 16px 24px' }}>
          <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600, marginBottom: '6px' }}>
            {selectedStrikes.length}/20 selected
          </div>
          <div style={{ height: '6px', width: '100%', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(selectedStrikes.length / 20) * 100}%`,
              background: '#3b82f6',
              transition: 'width 0.2s',
            }} />
          </div>
        </div>

        {/* Presets & Search Controls Row */}
        <div style={{
          padding: '0 24px 16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          {/* Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>Default</span>
            {[6, 8, 10, 12].map(count => (
              <button
                key={count}
                onClick={() => handlePreset(count)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: selectedStrikes.length === count ? 'none' : '1px solid #cbd5e1',
                  background: selectedStrikes.length === count ? '#3b82f6' : '#ffffff',
                  color: selectedStrikes.length === count ? '#ffffff' : '#334155',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {count}
              </button>
            ))}
          </div>

          {/* Search & Clear */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search strike"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '6px 12px 6px 32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '150px',
                  background: '#ffffff',
                  color: '#0f172a',
                }}
              />
              <span style={{ position: 'absolute', left: '10px', top: '7px', color: '#94a3b8', fontSize: '0.85rem' }}>🔍</span>
            </div>
            <button
              onClick={clearAll}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #ef4444',
                background: '#ffffff',
                color: '#ef4444',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Selected Strike Tags Box */}
        {selectedStrikes.length > 0 && (
          <div style={{
            margin: '0 24px 16px 24px',
            padding: '10px 14px',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            background: '#f8fafc',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            maxHeight: '90px',
            overflowY: 'auto',
          }}>
            {selectedStrikes.map(str => (
              <span
                key={str}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #93c5fd',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                {str}
                <button
                  onClick={() => toggleStrike(str)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Strike Grid Container */}
        <div style={{
          padding: '0 24px',
          overflowY: 'auto',
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: '8px',
          alignContent: 'start',
        }}>
          {filteredStrikes.map(strike => {
            const isSelected = selectedStrikes.includes(strike);
            const isATM = strike === baseAtm;
            return (
              <button
                key={strike}
                onClick={() => toggleStrike(strike)}
                style={{
                  padding: '8px 4px',
                  borderRadius: '6px',
                  border: isSelected ? 'none' : isATM ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  background: isSelected ? '#3b82f6' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  fontWeight: isSelected || isATM ? 700 : 500,
                  fontSize: '0.82rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 4px rgba(59,130,246,0.3)' : 'none',
                }}
              >
                {strike}
              </button>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff',
        }}>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Showing <strong>{filteredStrikes.length}</strong> strikes
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '10px 28px',
              borderRadius: '8px',
              border: 'none',
              background: '#3b82f6',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(59,130,246,0.35)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
