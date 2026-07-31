/**
 * Support & Resistance Calculator — Techfrost Nifty_V6_SR PineScript exact formula port.
 *
 * Pine Script reference formulas:
 * =================================
 * ATM Strike Selection (Auto): Find strike where |CE_open - PE_open| is minimum (parity strike)
 * ATM Strike Selection (Manual): Use atmOverride directly
 *
 * SPOT S/R (Image 1):
 *   Spot_Pivot = ATM + (CE_ATM - PE_ATM)        [Synthetic Future]
 *   Spot_R1    = ATM        + CE_ATM             [ATM strike + ATM CE open]
 *   Spot_R2    = (ATM + 50) + CE_(ATM+50)
 *   Spot_R3    = (ATM +100) + CE_(ATM+100)
 *   Spot_R4    = (ATM +150) + CE_(ATM+150)
 *   Spot_R5    = (ATM +200) + CE_(ATM+200)
 *   Spot_S1    = ATM        - PE_ATM
 *   Spot_S2    = (ATM - 50) - PE_(ATM-50)
 *   Spot_S3    = (ATM -100) - PE_(ATM-100)
 *   Spot_S4    = (ATM -150) - PE_(ATM-150)
 *   Spot_S5    = (ATM -200) - PE_(ATM-200)
 *
 * PREMIUM S/R (Image 2) — idx 5 = selectedStrike(center), 4 = center-1, 6 = center+1, etc:
 *   pivot  = (CE_sel + PE_sel) / 2
 *   R1     = CE_sel                                           [ATM CE open]
 *   R2     = (CE_(sel-50) + PE_(sel+50)) / 2                 [ITM CE + OTM PE avg]
 *   R3     = (CE_(sel-100)+ PE_(sel+100))/ 2
 *   R4     = (CE_(sel-150)+ PE_(sel+150))/ 2
 *   R5     = (CE_(sel-200)+ PE_(sel+200))/ 2
 *   S1     = PE_sel                                           [ATM PE open]
 *   S2     = (CE_(sel+50) + PE_(sel-50)) / 2                 [OTM CE + ITM PE avg]
 *   S3     = (CE_(sel+100)+ PE_(sel-100))/ 2
 *   S4     = (CE_(sel+150)+ PE_(sel-150))/ 2
 *   S5     = (CE_(sel+200)+ PE_(sel-200))/ 2
 */

function round(n, dec = 2) {
  if (n === null || n === undefined || isNaN(n)) return null;
  return parseFloat(Number(n).toFixed(dec));
}

let openPriceDataStore = {
  timestamp: '09:15:30 AM',
  spotOpen: null,
  lockedAtmStrike: null,
  chainOpen: [],
};

function setOpenPriceData(spotOpen, chain) {
  if (!spotOpen || !chain || chain.length === 0) return;
  const atm = Math.round(spotOpen / 50) * 50;
  openPriceDataStore = {
    timestamp: '09:15:30 AM',
    spotOpen,
    lockedAtmStrike: atm,
    chainOpen: chain,
  };
}

function getOpenPriceData() {
  return openPriceDataStore;
}

function calcTechfrostSR({ spot = 24383.6, chain = [], calcBasis = 'Day Open Price', strikeStep = 50, selectedStrike, atmOverride = null }) {
  if (!spot || spot <= 0) spot = 24383.6;

  // Store open price data when fresh data arrives
  if ((!openPriceDataStore.spotOpen || Math.abs(openPriceDataStore.spotOpen - spot) > 1000) && spot > 0 && chain.length > 0) {
    setOpenPriceData(spot, chain);
  }

  // Build sorted strike chain
  let strikeChain = Array.isArray(chain) && chain.length > 0 ? [...chain] : [];

  // Determine center/base ATM from which to generate synthetic strikes if chain is empty
  const roughAtm = (atmOverride && atmOverride > 0)
    ? Math.round(atmOverride / strikeStep) * strikeStep
    : Math.round(spot / strikeStep) * strikeStep;

  if (strikeChain.length === 0) {
    for (let i = -6; i <= 6; i++) {
      const strike = roughAtm + i * strikeStep;
      const dist = strike - spot;
      const approxCeOpen = Math.max(10, 250 - dist * 0.75);
      const approxPeOpen = Math.max(10, 250 + dist * 0.75);
      strikeChain.push({
        strike,
        ceOpen: approxCeOpen,
        peOpen: approxPeOpen,
        ceLTP: approxCeOpen,
        peLTP: approxPeOpen,
      });
    }
  }

  // Filter to strikes within ±400 of rough ATM and sort ascending
  const nearChain = strikeChain.filter(r => Math.abs(r.strike - roughAtm) <= 400);
  if (nearChain.length > 0) strikeChain = nearChain;
  strikeChain.sort((a, b) => a.strike - b.strike);

  // Helper: get base premium for a strike and type (CE/PE) based on calcBasis
  const getBasePremium = (strikeVal, type) => {
    const row = strikeChain.find(r => r.strike === strikeVal);
    if (!row) return 0;
    if (type === 'CE') {
      const openVal = row.ceOpen || row.ce_open;
      const ltpVal  = row.ceLTP  || row.ceLtp;
      const prevVal = row.cePrev || row.ce_prev;
      return calcBasis === 'Day Open Price'
        ? (openVal || ltpVal || prevVal || 0)
        : (prevVal || ltpVal || openVal || 0);
    } else {
      const openVal = row.peOpen || row.pe_open;
      const ltpVal  = row.peLTP  || row.peLtp;
      const prevVal = row.pePrev || row.pe_prev;
      return calcBasis === 'Day Open Price'
        ? (openVal || ltpVal || prevVal || 0)
        : (prevVal || ltpVal || openVal || 0);
    }
  };

  // =========================================================================
  // ATM STRIKE SELECTION — exact Pine Script logic
  // Manual: use atmOverride directly (rounded to strikeStep)
  // Auto:   find strike where |CE_open - PE_open| is minimum (parity strike)
  // =========================================================================
  let atmStrike;

  if (atmOverride && atmOverride > 0) {
    // Manual override — snap to nearest strikeStep
    atmStrike = Math.round(atmOverride / strikeStep) * strikeStep;
  } else {
    // Auto: Pine Script exact — find minimum |CE_open - PE_open|
    let minDiff = Infinity;
    atmStrike = roughAtm; // fallback
    for (const row of strikeChain) {
      const ceO = getBasePremium(row.strike, 'CE');
      const peO = getBasePremium(row.strike, 'PE');
      if (ceO > 0 && peO > 0) {
        const diff = Math.abs(ceO - peO);
        if (diff < minDiff) {
          minDiff = diff;
          atmStrike = row.strike;
        }
      }
    }
  }

  // Selected strike for Premium S/R table (Image 2)
  const targetStrike = selectedStrike || atmStrike;

  // =========================================================================
  // SPOT S/R CALCULATIONS (Image 1) — Pine Script exact formulas
  // =========================================================================
  const ceAtmBase = getBasePremium(atmStrike, 'CE');
  const peAtmBase = getBasePremium(atmStrike, 'PE');
  const diffAtm   = ceAtmBase - peAtmBase;

  // Synthetic Future Pivot
  const spotPivot = atmStrike + diffAtm;

  // Resistance levels: (ATM + n*step) + CE_(ATM + n*step)
  const r1CeBase = getBasePremium(atmStrike,                     'CE');
  const r2CeBase = getBasePremium(atmStrike + 1 * strikeStep,    'CE');
  const r3CeBase = getBasePremium(atmStrike + 2 * strikeStep,    'CE');
  const r4CeBase = getBasePremium(atmStrike + 3 * strikeStep,    'CE');
  const r5CeBase = getBasePremium(atmStrike + 4 * strikeStep,    'CE');

  const spotR1 = atmStrike                      + r1CeBase;
  const spotR2 = (atmStrike + 1 * strikeStep)   + r2CeBase;
  const spotR3 = (atmStrike + 2 * strikeStep)   + r3CeBase;
  const spotR4 = (atmStrike + 3 * strikeStep)   + r4CeBase;
  const spotR5 = (atmStrike + 4 * strikeStep)   + r5CeBase;

  // Support levels: (ATM - n*step) - PE_(ATM - n*step)
  const s1PeBase = getBasePremium(atmStrike,                     'PE');
  const s2PeBase = getBasePremium(atmStrike - 1 * strikeStep,    'PE');
  const s3PeBase = getBasePremium(atmStrike - 2 * strikeStep,    'PE');
  const s4PeBase = getBasePremium(atmStrike - 3 * strikeStep,    'PE');
  const s5PeBase = getBasePremium(atmStrike - 4 * strikeStep,    'PE');

  const spotS1 = atmStrike                      - s1PeBase;
  const spotS2 = (atmStrike - 1 * strikeStep)   - s2PeBase;
  const spotS3 = (atmStrike - 2 * strikeStep)   - s3PeBase;
  const spotS4 = (atmStrike - 3 * strikeStep)   - s4PeBase;
  const spotS5 = (atmStrike - 4 * strikeStep)   - s5PeBase;

  // =========================================================================
  // PREMIUM S/R CALCULATIONS (Image 2) — Pine Script exact formulas
  // Array index logic: idx5=selectedStrike, idx4=sel-1, idx6=sel+1
  // R levels: CE_(sel-n) + PE_(sel+n) / 2  (ITM CE + OTM PE)
  // S levels: CE_(sel+n) + PE_(sel-n) / 2  (OTM CE + ITM PE)
  // =========================================================================
  const ceBaseSel = getBasePremium(targetStrike, 'CE');
  const peBaseSel = getBasePremium(targetStrike, 'PE');
  const premiumPivot = (ceBaseSel + peBaseSel) / 2.0;

  // Premium Resistances — ITM CE (going lower strikes) + OTM PE (going higher strikes)
  const premR1 = ceBaseSel;
  const premR2 = (getBasePremium(targetStrike - 1 * strikeStep, 'CE') + getBasePremium(targetStrike + 1 * strikeStep, 'PE')) / 2.0;
  const premR3 = (getBasePremium(targetStrike - 2 * strikeStep, 'CE') + getBasePremium(targetStrike + 2 * strikeStep, 'PE')) / 2.0;
  const premR4 = (getBasePremium(targetStrike - 3 * strikeStep, 'CE') + getBasePremium(targetStrike + 3 * strikeStep, 'PE')) / 2.0;
  const premR5 = (getBasePremium(targetStrike - 4 * strikeStep, 'CE') + getBasePremium(targetStrike + 4 * strikeStep, 'PE')) / 2.0;

  // Premium Supports — OTM CE (going higher strikes) + ITM PE (going lower strikes)
  const premS1 = peBaseSel;
  const premS2 = (getBasePremium(targetStrike + 1 * strikeStep, 'CE') + getBasePremium(targetStrike - 1 * strikeStep, 'PE')) / 2.0;
  const premS3 = (getBasePremium(targetStrike + 2 * strikeStep, 'CE') + getBasePremium(targetStrike - 2 * strikeStep, 'PE')) / 2.0;
  const premS4 = (getBasePremium(targetStrike + 3 * strikeStep, 'CE') + getBasePremium(targetStrike - 3 * strikeStep, 'PE')) / 2.0;
  const premS5 = (getBasePremium(targetStrike + 4 * strikeStep, 'CE') + getBasePremium(targetStrike - 4 * strikeStep, 'PE')) / 2.0;

  // =========================================================================
  // STRUCTURED ROWS — Image 1: Spot S/R Table (4-column format)
  // =========================================================================
  const spotRows = [
    {
      metric: 'ATM Strike (9:15 Open)',
      chosenStrike: `${atmStrike}`,
      optionBase: `CE:${round(ceAtmBase, 1)} | PE:${round(peAtmBase, 1)}`,
      value: atmStrike,
      type: 'atm',
    },
    {
      metric: 'Synthetic Future (Pivot)',
      chosenStrike: `${atmStrike} (ATM)`,
      optionBase: `Diff: ${diffAtm >= 0 ? '+' : ''}${round(diffAtm, 1)}`,
      value: round(spotPivot, 1),
      type: 'pivot',
    },
    {
      metric: 'Resistance 1 (R1)',
      chosenStrike: `${atmStrike} CE`,
      optionBase: `${round(r1CeBase, 1)}`,
      value: round(spotR1, 1),
      type: 'resistance',
    },
    {
      metric: 'Resistance 2 (R2)',
      chosenStrike: `${atmStrike + 1 * strikeStep} CE`,
      optionBase: `${round(r2CeBase, 1)}`,
      value: round(spotR2, 1),
      type: 'resistance',
    },
    {
      metric: 'Resistance 3 (R3)',
      chosenStrike: `${atmStrike + 2 * strikeStep} CE`,
      optionBase: `${round(r3CeBase, 1)}`,
      value: round(spotR3, 1),
      type: 'resistance',
    },
    {
      metric: 'Resistance 4 (R4)',
      chosenStrike: `${atmStrike + 3 * strikeStep} CE`,
      optionBase: `${round(r4CeBase, 1)}`,
      value: round(spotR4, 1),
      type: 'resistance',
    },
    {
      metric: 'Resistance 5 (R5)',
      chosenStrike: `${atmStrike + 4 * strikeStep} CE`,
      optionBase: `${round(r5CeBase, 1)}`,
      value: round(spotR5, 1),
      type: 'resistance',
    },
    {
      metric: 'Support 1 (S1)',
      chosenStrike: `${atmStrike} PE`,
      optionBase: `${round(s1PeBase, 1)}`,
      value: round(spotS1, 1),
      type: 'support',
    },
    {
      metric: 'Support 2 (S2)',
      chosenStrike: `${atmStrike - 1 * strikeStep} PE`,
      optionBase: `${round(s2PeBase, 1)}`,
      value: round(spotS2, 1),
      type: 'support',
    },
    {
      metric: 'Support 3 (S3)',
      chosenStrike: `${atmStrike - 2 * strikeStep} PE`,
      optionBase: `${round(s3PeBase, 1)}`,
      value: round(spotS3, 1),
      type: 'support',
    },
    {
      metric: 'Support 4 (S4)',
      chosenStrike: `${atmStrike - 3 * strikeStep} PE`,
      optionBase: `${round(s4PeBase, 1)}`,
      value: round(spotS4, 1),
      type: 'support',
    },
    {
      metric: 'Support 5 (S5)',
      chosenStrike: `${atmStrike - 4 * strikeStep} PE`,
      optionBase: `${round(s5PeBase, 1)}`,
      value: round(spotS5, 1),
      type: 'support',
    },
  ];

  // =========================================================================
  // STRUCTURED ROWS — Image 2: Premium S/R Table (4-column format)
  // R2 Chosen Strike display: ITM CE (sel-50 CE) / OTM PE (sel+50 PE)
  // S2 Chosen Strike display: OTM CE (sel+50 CE) / ITM PE (sel-50 PE)
  // =========================================================================
  const premiumRows = [
    {
      metric: 'Selected Strike (Base)',
      chosenStrike: `${targetStrike}`,
      optionBase: `CE:${round(ceBaseSel, 1)} | PE:${round(peBaseSel, 1)}`,
      value: round(premiumPivot, 1),
      type: 'pivot',
    },
    {
      metric: 'R1 Premium (CE Base)',
      chosenStrike: `${targetStrike} CE`,
      optionBase: `${round(ceBaseSel, 1)}`,
      value: round(premR1, 1),
      type: 'resistance',
    },
    {
      metric: 'R2 Premium (ITM Avg 1)',
      chosenStrike: `${targetStrike - 1 * strikeStep} CE / ${targetStrike + 1 * strikeStep} PE`,
      optionBase: `Avg(${round(getBasePremium(targetStrike - 1 * strikeStep, 'CE'), 1)} + ${round(getBasePremium(targetStrike + 1 * strikeStep, 'PE'), 1)})`,
      value: round(premR2, 1),
      type: 'resistance',
    },
    {
      metric: 'R3 Premium (ITM Avg 2)',
      chosenStrike: `${targetStrike - 2 * strikeStep} CE / ${targetStrike + 2 * strikeStep} PE`,
      optionBase: `Avg(${round(getBasePremium(targetStrike - 2 * strikeStep, 'CE'), 1)} + ${round(getBasePremium(targetStrike + 2 * strikeStep, 'PE'), 1)})`,
      value: round(premR3, 1),
      type: 'resistance',
    },
    {
      metric: 'R4 Premium (ITM Avg 3)',
      chosenStrike: `${targetStrike - 3 * strikeStep} CE / ${targetStrike + 3 * strikeStep} PE`,
      optionBase: `Avg(${round(getBasePremium(targetStrike - 3 * strikeStep, 'CE'), 1)} + ${round(getBasePremium(targetStrike + 3 * strikeStep, 'PE'), 1)})`,
      value: round(premR4, 1),
      type: 'resistance',
    },
    {
      metric: 'R5 Premium (ITM Avg 4)',
      chosenStrike: `${targetStrike - 4 * strikeStep} CE / ${targetStrike + 4 * strikeStep} PE`,
      optionBase: `Avg(${round(getBasePremium(targetStrike - 4 * strikeStep, 'CE'), 1)} + ${round(getBasePremium(targetStrike + 4 * strikeStep, 'PE'), 1)})`,
      value: round(premR5, 1),
      type: 'resistance',
    },
    {
      metric: 'S1 Premium (PE Base)',
      chosenStrike: `${targetStrike} PE`,
      optionBase: `${round(peBaseSel, 1)}`,
      value: round(premS1, 1),
      type: 'support',
    },
    {
      metric: 'S2 Premium (OTM Avg 1)',
      chosenStrike: `${targetStrike + 1 * strikeStep} CE / ${targetStrike - 1 * strikeStep} PE`,
      optionBase: `Avg(${round(getBasePremium(targetStrike + 1 * strikeStep, 'CE'), 1)} + ${round(getBasePremium(targetStrike - 1 * strikeStep, 'PE'), 1)})`,
      value: round(premS2, 1),
      type: 'support',
    },
    {
      metric: 'S3 Premium (OTM Avg 2)',
      chosenStrike: `${targetStrike + 2 * strikeStep} CE / ${targetStrike - 2 * strikeStep} PE`,
      optionBase: `Avg(${round(getBasePremium(targetStrike + 2 * strikeStep, 'CE'), 1)} + ${round(getBasePremium(targetStrike - 2 * strikeStep, 'PE'), 1)})`,
      value: round(premS3, 1),
      type: 'support',
    },
    {
      metric: 'S4 Premium (OTM Avg 3)',
      chosenStrike: `${targetStrike + 3 * strikeStep} CE / ${targetStrike - 3 * strikeStep} PE`,
      optionBase: `Avg(${round(getBasePremium(targetStrike + 3 * strikeStep, 'CE'), 1)} + ${round(getBasePremium(targetStrike - 3 * strikeStep, 'PE'), 1)})`,
      value: round(premS4, 1),
      type: 'support',
    },
    {
      metric: 'S5 Premium (OTM Avg 4)',
      chosenStrike: `${targetStrike + 4 * strikeStep} CE / ${targetStrike - 4 * strikeStep} PE`,
      optionBase: `Avg(${round(getBasePremium(targetStrike + 4 * strikeStep, 'CE'), 1)} + ${round(getBasePremium(targetStrike - 4 * strikeStep, 'PE'), 1)})`,
      value: round(premS5, 1),
      type: 'support',
    },
  ];

  return {
    calcBasis,
    atmStrike,
    targetStrike,
    spot,
    openPriceData: openPriceDataStore,
    spotRows,
    premiumRows,
    spotLevels: {
      pivot: round(spotPivot),
      r1: round(spotR1), r2: round(spotR2), r3: round(spotR3), r4: round(spotR4), r5: round(spotR5),
      s1: round(spotS1), s2: round(spotS2), s3: round(spotS3), s4: round(spotS4), s5: round(spotS5),
    },
    premiumLevels: {
      pivot: round(premiumPivot),
      r1: round(premR1), r2: round(premR2), r3: round(premR3), r4: round(premR4), r5: round(premR5),
      s1: round(premS1), s2: round(premS2), s3: round(premS3), s4: round(premS4), s5: round(premS5),
    },
    calculatedAt: new Date().toISOString(),
  };
}

module.exports = { calcTechfrostSR, setOpenPriceData, getOpenPriceData, round };
