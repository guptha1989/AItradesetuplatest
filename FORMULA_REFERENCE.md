# Techfrost Nifty Options AI Trading Platform
## Formula Reference & Calculation Summary

---

## 1. ATM STRIKE SELECTION

### Auto Mode
Scan all available strikes and find the one where the difference between CE and PE open price is **smallest** (closest to zero = parity strike):

```
For each strike in chain:
  diff = | CE_open - PE_open |
  if diff is smallest so far → this is ATM
```

**Example:**
| Strike | CE Open | PE Open | Diff |
|--------|---------|---------|------|
| 24350  | 120     | 45      | 75   |
| 24400  | 95      | 68      | 27   | ← ATM (smallest diff)
| 24450  | 75      | 95      | 20   |
| 24500  | 55      | 130     | 75   |

→ **ATM = 24450** (diff = 20, the minimum)

### Manual Mode
User types a specific strike → system snaps it to nearest 50 and uses that as ATM.

---

## 2. SPOT SUPPORT & RESISTANCE (IMAGE 1 TABLE)

All calculations use **9:15 AM Day Open premiums** (locked for the trading day).

### Synthetic Future (Pivot)

```
If CE_ATM > PE_ATM:
  Pivot = ATM + (CE_ATM - PE_ATM)   ← CE premium added

If PE_ATM > CE_ATM:
  Pivot = ATM - (PE_ATM - CE_ATM)   ← PE premium subtracted
```

**Examples:**
- ATM = 24400, CE = 184, PE = 84  → `24400 + (184 - 84)` = **24500**
- ATM = 24400, CE = 50, PE = 183  → `24400 - (183 - 50)` = **24267**

> ℹ️ This is the **Synthetic Futures Price** derived from options — the true market-implied fair value of the index.

---

### Spot Resistance Levels (R1 → R5)

Each level = **Strike + CE premium of THAT strike** (Day Open)

| Level | Formula                          | Example (ATM=24400, step=50)         |
|-------|----------------------------------|--------------------------------------|
| **R1** | `ATM + CE_ATM`                  | `24400 + 184` = **24584**            |
| **R2** | `(ATM+50)  + CE_(ATM+50)`       | `24450 + 167` = **24617**            |
| **R3** | `(ATM+100) + CE_(ATM+100)`      | `24500 + 130` = **24630**            |
| **R4** | `(ATM+150) + CE_(ATM+150)`      | `24550 + 95`  = **24645**            |
| **R5** | `(ATM+200) + CE_(ATM+200)`      | `24600 + 68`  = **24668**            |

> ℹ️ Logic: Each resistance = "where the market must reach for that CE to expire ITM" — the breakeven point for CE buyers.

---

### Spot Support Levels (S1 → S5)

Each level = **Strike - PE premium of THAT strike** (Day Open)

| Level | Formula                          | Example (ATM=24400, step=50)         |
|-------|----------------------------------|--------------------------------------|
| **S1** | `ATM - PE_ATM`                  | `24400 - 84`  = **24316**            |
| **S2** | `(ATM-50)  - PE_(ATM-50)`       | `24350 - 105` = **24245**            |
| **S3** | `(ATM-100) - PE_(ATM-100)`      | `24300 - 128` = **24172**            |
| **S4** | `(ATM-150) - PE_(ATM-150)`      | `24250 - 162` = **24088**            |
| **S5** | `(ATM-200) - PE_(ATM-200)`      | `24200 - 198` = **24002**            |

> ℹ️ Logic: Each support = "where the market must fall for that PE to expire ITM" — the breakeven point for PE buyers.

---

## 3. OPTION PREMIUM S&R (IMAGE 2 TABLE)

Uses the **Selected Strike** (chosen from dropdown — defaults to ATM). Uses Day Open premiums.

### Selected Strike Base
```
CE_selected = CE open of selected strike
PE_selected = PE open of selected strike
Base Pivot  = (CE_selected + PE_selected) / 2
```

---

### Premium Resistance Levels (R1 → R5)

Uses **ITM CE** (lower strikes = deeper ITM) averaged with **OTM PE** (higher strikes):

| Level | Formula                                                    |
|-------|------------------------------------------------------------|
| **R1** | `CE_selected`                                             |
| **R2** | `(CE_(sel-50) + PE_(sel+50)) / 2`                         |
| **R3** | `(CE_(sel-100) + PE_(sel+100)) / 2`                       |
| **R4** | `(CE_(sel-150) + PE_(sel+150)) / 2`                       |
| **R5** | `(CE_(sel-200) + PE_(sel+200)) / 2`                       |

> ℹ️ As strikes go deeper ITM for CE, the premium increases → higher resistance. Averaged with OTM PE for balance.

---

### Premium Support Levels (S1 → S5)

Uses **OTM CE** (higher strikes) averaged with **ITM PE** (lower strikes):

| Level | Formula                                                    |
|-------|------------------------------------------------------------|
| **S1** | `PE_selected`                                             |
| **S2** | `(CE_(sel+50) + PE_(sel-50)) / 2`                         |
| **S3** | `(CE_(sel+100) + PE_(sel-100)) / 2`                       |
| **S4** | `(CE_(sel+150) + PE_(sel-150)) / 2`                       |
| **S5** | `(CE_(sel+200) + PE_(sel-200)) / 2`                       |

---

## 4. DASHBOARD OVERVIEW

### Live Data Sources
| Source         | Data Provided                                |
|----------------|----------------------------------------------|
| Dhan API REST  | Option chain (strikes, CE/PE LTP, OI, volume)|
| Dhan WebSocket | Real-time tick updates for spot & options    |
| Fallback       | Replay engine (simulated chain) when API down|

---

### Dashboard Pages

| Page | Purpose |
|------|---------|
| **📊 Dashboard** | Live spot price, ATM, PCR, CE/PE OI summary, WebSocket status |
| **🔗 Option Chain** | Full option chain table with CE/PE LTP, OI, volume per strike |
| **📈 Trending OI** | OI buildup analysis — which strikes are seeing max OI addition |
| **🎯 S&R (Spot & Premium)** | Image 1 (Spot projections) + Image 2 (Premium levels) side-by-side |
| **📡 Signals** | AI-powered trade setup signals via Gemini LLM |
| **📒 Trade Journal** | Paper trade log — entry, exit, P&L tracking |

---

### Topbar Live Indicators
| Indicator | Formula |
|-----------|---------|
| **Spot Price** | Live from WebSocket / Dhan API |
| **ATM Strike** | Minimum `|CE - PE|` from current chain |
| **PCR** | Total PE OI ÷ Total CE OI across all strikes |
| **CE/PE Δ** | Real-time CE LTP change vs open |

---

### Manual ATM Override (S&R Page)
1. Type a strike in the **MANUAL ATM STRIKE OVERRIDE** box
2. Click **Apply** (or press Enter)
3. All S&R calculations recalculate using your entered ATM
4. Status shows: `⚡ Using manual ATM: 24500 (overriding auto 24450)`
5. Click **✕ Reset to Auto** to go back to auto-detection

---

## 5. CALCULATION BASIS OPTIONS

| Option | What is used as base premium |
|--------|------------------------------|
| **Day Open Price (9:15)** | The CE/PE premium at market open (9:15 AM) — locked for the day |
| **Prev Day Settlement** | Previous day closing / settlement price of the option |

> ℹ️ **Day Open Price is recommended** — levels are locked at 9:15 AM and remain stable throughout the trading session, acting as reliable S&R zones.

---

*Techfrost Nifty_V6_SR Engine — Formula Reference v1.0*
