import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useTradingStore } from './store/tradingStore';
import Topbar from './components/Topbar';
import ReplayBar from './components/ReplayBar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import OICrossoverView from './components/OICrossoverView';
import PremiumDecayView from './components/PremiumDecayView';
import TrendingOI from './components/TrendingOI';
import OptionChainView from './components/OptionChainView';
import SignalPanel from './components/SignalPanel';
import PolicyAlertsView from './components/PolicyAlertsView';
import PolicyCreatorView from './components/PolicyCreatorView';
import BacktestView from './components/BacktestView';
import SupportResistance from './components/SupportResistance';
import TradeTerminalView from './components/TradeTerminalView';
import RealtimeChartView from './components/RealtimeChartView';
import AIChatModal from './components/AIChatModal';

function App() {
  const { connectWS, activePage, theme } = useTradingStore();
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  useEffect(() => {
    connectWS();
  }, []);

  useEffect(() => {
    document.body.className = theme === 'light' ? 'theme-light' : 'theme-darkblue';
  }, [theme]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':       return <Dashboard />;
      case 'charts':          return <RealtimeChartView />;
      case 'pro-charts':      return <RealtimeChartView />;
      case 'oi-crossover':    return <OICrossoverView />;
      case 'premium-decay':   return <PremiumDecayView />;
      case 'trending':        return <TrendingOI />;
      case 'chain':           return <OptionChainView />;
      case 'policy-alerts':   return <PolicyAlertsView />;
      case 'signals':         return <SignalPanel />;
      case 'backtest':        return <BacktestView />;
      case 'policy-creator':  return <PolicyCreatorView />;
      case 'sr':              return <SupportResistance />;
      case 'order-book':      return <TradeTerminalView initialTab="ORDERS" />;
      case 'positions':       return <TradeTerminalView initialTab="POSITIONS" />;
      case 'journal':         return <TradeTerminalView initialTab="JOURNAL" />;
      case 'terminal':        return <TradeTerminalView initialTab="ORDERS" />;
      default:                return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Topbar onOpenAIChat={() => setIsAIChatOpen(true)} />
      <ReplayBar />
      <div className="app-content">
        <Sidebar onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="main-panel">
          {renderPage()}
        </main>
      </div>
      <AIChatModal isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a2235',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.85rem',
          },
        }}
      />
    </div>
  );
}

export default App;
