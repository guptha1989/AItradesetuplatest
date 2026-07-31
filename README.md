# ===================================
# NIFTY OPTIONS AI TRADING PLATFORM
# ===================================

## Quick Start

### Prerequisites
- Node.js 20 LTS
- MySQL 8.x running locally
- Dhan API credentials (client ID + access token)
- Google Gemini API key

---

### 1. Database Setup
```bash
# Create the database and run schema
mysql -u root -p < database/schema.sql
```

### 2. Backend Setup
```bash
cd backend

# Copy env template and fill in your credentials
copy .env.example .env
# Edit .env with: MySQL password, Dhan client ID, Dhan access token, Gemini API key

# Install dependencies
npm install

# Run migrations (creates all tables)
npm run migrate

# Start the backend (dev mode with hot-reload)
npm run dev
```

Backend starts at: **http://localhost:3001**
WebSocket at: **ws://localhost:3001/ws**

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Dashboard opens at: **http://localhost:5173**

---

## Configuration (.env)

| Key | Description |
|-----|-------------|
| `PAPER_TRADING_MODE` | `true` = no real orders. **Always start true!** |
| `MAX_DAILY_LOSS` | System halts trading beyond this (INR) |
| `GEMINI_SIGNAL_INTERVAL_SEC` | How often AI generates signals (default: 300s) |
| `SIGNAL_CONFIDENCE_THRESHOLD` | Min confidence % to surface signal (default: 70) |

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/health` | System health check |
| GET | `/api/chain` | Live option chain |
| GET | `/api/chain/greeks` | Calculate Greeks |
| GET | `/api/signals` | List signals |
| POST | `/api/signals/generate` | Trigger AI signal now |
| GET | `/api/trades` | Trade journal |
| GET | `/api/trades/pnl` | Daily P&L summary |
| GET | `/api/market/positions` | Open positions |
| GET | `/api/market/funds` | Margin available |
| GET | `/api/system/status` | Risk manager status |
| POST | `/api/system/toggle-paper-mode` | Switch paper/live |

## WebSocket Channels

Connect to `ws://localhost:3001/ws`

| Channel | Data | Frequency |
|---------|------|-----------|
| `TICK_FEED` | LTP, OI, volume per instrument | 100ms |
| `SIGNAL_FEED` | AI signal JSON | On generate |
| `ORDER_FEED` | Order placed/cancelled events | Real-time |
| `PNL_FEED` | Risk status, positions | 1 min |
| `ALERT_FEED` | Risk alerts, halt notifications | Event-driven |
| `CHAIN_FEED` | Option chain snapshot | 5 min |

---

## ⚠️ Risk Guardrails (Always Active)

1. **Daily Loss Halt** — Auto-halts trading at `MAX_DAILY_LOSS`
2. **Market Hours** — Orders only 09:15–15:30 IST
3. **Expiry Day** — No new short positions after 14:00 on Thursdays
4. **Paper Mode Default** — All orders simulated until you explicitly switch
5. **Confidence Filter** — Signals below threshold are suppressed

---

## File Structure

```
Application - Trading/
├── backend/
│   ├── src/
│   │   ├── server.js          # Main entry point
│   │   ├── config/            # env.js, db.js
│   │   ├── api/
│   │   │   ├── dhan/          # REST + WebSocket clients
│   │   │   └── gemini/        # LLM client + signal analyzer
│   │   ├── oms/               # Order + Risk managers
│   │   ├── routes/            # REST API routes
│   │   ├── websocket/         # WS server
│   │   └── utils/             # Greeks, tick buffer, logger
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── store/             # Zustand state
│       └── components/        # Dashboard, SignalPanel, TradeJournal, OptionChain
└── database/
    └── schema.sql             # Full MySQL schema
```
