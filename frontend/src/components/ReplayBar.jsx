import { useTradingStore } from '../store/tradingStore';

export default function ReplayBar() {
  const {
    replayMode, setReplayMode, replayStatus, replaySpeed,
    replayMinute, replayTime, replayProgress,
    startReplay, pauseReplay, setReplaySpeed, seekReplay, resetReplay
  } = useTradingStore();

  const isPlaying = replayStatus === 'PLAYING';

  const handleToggleMode = () => {
    if (replayMode) {
      pauseReplay();
      setReplayMode(false);
    } else {
      setReplayMode(true);
      if (replayStatus === 'STOPPED') startReplay(10);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) pauseReplay();
    else startReplay(replaySpeed);
  };

  const handleSliderChange = (e) => {
    const min = parseInt(e.target.value);
    seekReplay(min);
  };

  const handlePhaseJump = (min) => {
    seekReplay(min);
    if (!isPlaying) startReplay(replaySpeed);
  };

  return (
    <div style={{
      background: replayMode ? 'rgba(59,130,246,0.12)' : 'var(--color-bg-card)',
      borderBottom: `1px solid ${replayMode ? 'rgba(59,130,246,0.3)' : 'var(--color-border)'}`,
      padding: '8px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      fontSize: '0.82rem',
      transition: 'all 0.2s ease',
    }}>
      {/* Left: Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          className={`btn btn-sm ${replayMode ? 'btn-primary' : 'btn-ghost'}`}
          onClick={handleToggleMode}
          style={{ fontWeight: 700 }}
        >
          {replayMode ? '📼 REPLAY MODE' : '🔴 LIVE DATA'}
        </button>

        {replayMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--color-accent-blue)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
              ⏰ {replayTime || '09:15:00'} IST
            </span>
            <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
              {replayStatus}
            </span>
          </div>
        )}
      </div>

      {/* Center: Replay Controls & Timeline Scrubber */}
      {replayMode ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '600px' }}>
          {/* Play / Pause */}
          <button
            onClick={handlePlayPause}
            style={{
              background: isPlaying ? 'var(--color-loss)' : 'var(--color-profit)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 14px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
          </button>

          {/* Reset */}
          <button className="btn btn-ghost btn-sm" onClick={resetReplay} title="Reset to 09:15 AM">
            🔄 Reset
          </button>

          {/* Timeline Scrubber */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              <span>09:15</span>
              <span>11:30</span>
              <span>13:30</span>
              <span>15:30</span>
            </div>
            <input
              type="range"
              min="0"
              max="375"
              value={replayMinute}
              onChange={handleSliderChange}
              style={{
                width: '100%',
                cursor: 'pointer',
                accentColor: 'var(--color-accent-blue)',
                height: '6px',
              }}
            />
          </div>

          {/* Speed Selector */}
          <div style={{ display: 'flex', gap: '2px', border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
            {[1, 5, 10, 60].map(s => (
              <button
                key={s}
                onClick={() => setReplaySpeed(s)}
                style={{
                  padding: '2px 8px',
                  border: 'none',
                  background: replaySpeed === s ? 'var(--color-accent-blue)' : 'transparent',
                  color: replaySpeed === s ? 'white' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          ⚡ Streaming live Dhan API ticks & order book. Click "REPLAY MODE" to simulate intraday trading day.
        </div>
      )}

      {/* Right: Quick Jump Buttons */}
      {replayMode && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Jump:</span>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem', padding: '2px 6px' }} onClick={() => handlePhaseJump(0)}>🌅 Open</button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem', padding: '2px 6px' }} onClick={() => handlePhaseJump(45)}>📈 Trend</button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem', padding: '2px 6px' }} onClick={() => handlePhaseJump(135)}>☕ Midday</button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem', padding: '2px 6px' }} onClick={() => handlePhaseJump(315)}>💥 Expiry</button>
        </div>
      )}
    </div>
  );
}
