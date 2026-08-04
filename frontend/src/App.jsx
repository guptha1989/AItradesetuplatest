import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useTradingStore } from './store/tradingStore';
import Topbar from './components/Topbar';
import ReplayBar from './components/ReplayBar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SignalPanel from './components/SignalPanel';
import TradeJournal from './components/TradeJournal';
import OptionChainView from './components/OptionChainView';
import AllContractsView from './components/AllContractsView';
import DhanDashboardView from './components/DhanDashboardView';
import TrendingOI from './components/TrendingOI';
import SupportResistance from './components/SupportResistance';

function App() {
  const { connectWS, activePage } = useTradingStore();

  useEffect(() => {
    connectWS();
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':       return <Dashboard />;
      case 'dhan-dashboard':  return <DhanDashboardView />;
      case 'all-contracts':   return <AllContractsView />;
      case 'chain':           return <OptionChainView />;
      case 'signals':         return <SignalPanel />;
      case 'journal':         return <TradeJournal />;
      case 'trending':        return <TrendingOI />;
      case 'sr':              return <SupportResistance />;
      default:                return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Topbar />
      <ReplayBar />
      <div className="app-content">
        <Sidebar />
        <main className="main-panel">
          {renderPage()}
        </main>
      </div>
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
