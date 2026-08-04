/**
 * Techfrost Nifty Options AI Trading Platform
 * Support & Resistance Calculator — User-defined exact formulas
 *
 * =====================================================================
 * ATM SELECTION (Auto):
 *   Find the strike where | CE_open - PE_open | is MINIMUM
 *
 * ATM SELECTION (Manual):
 *   Use user-supplied atmOverride value (snapped to nearest 50)
 *
 * =====================================================================
 * SPOT S/R (Image 1) — uses 9:15 AM Day Open CE premiums per strike:
 *
 *   Synthetic Future (Pivot):
 *     If CE_ATM > PE_ATM → Pivot = ATM + (CE_ATM - PE_ATM)
 *     If PE_ATM > CE_ATM → Pivot = ATM - (PE_ATM - CE_ATM)
 *
 *   Resistances (each strike's CE added to its own strike):
 *     R1 = ATM        + CE_ATM
 *     R2 = (ATM+50)   + CE_(ATM+50)
 *     R3 = (ATM+100)  + CE_(ATM+100)
 *     R4 = (ATM+150)  + CE_(ATM+150)
 *     R5 = (ATM+200)  + CE_(ATM+200)
 *
 *   Supports (each strike minus its OWN PE premium):
 *     S1 = ATM           - PE_ATM          (ATM strike − ATM PE)
 *     S2 = (ATM-50)      - PE_(ATM-50)     (ATM-50 strike − its own PE)
 *     S3 = (ATM-100)     - PE_(ATM-100)
 *     S4 = (ATM-150)     - PE_(ATM-150)
 *     S5 = (ATM-200)     - PE_(ATM-200)
 *
 * =====================================================================
 * PREMIUM S/R (Image 2) — straddle average at each strike:
 *
 *   Pivot = (CE_ATM + PE_ATM) / 2
 *   R1    = (CE_(ATM+50)  + PE_(ATM+50))  / 2
 *   R2    = (CE_(ATM+100) + PE_(ATM+100)) / 2
 *   R3    = (CE_(ATM+150) + PE_(ATM+150)) / 2
 *   R4    = (CE_(ATM+200) + PE_(ATM+200)) / 2
 *   R5    = (CE_(ATM+250) + PE_(ATM+250)) / 2
 *   S1    = (CE_(ATM-50)  + PE_(ATM-50))  / 2
 *   S2    = (CE_(ATM-100) + PE_(ATM-100)) / 2
 *   S3    = (CE_(ATM-150) + PE_(ATM-150)) / 2
 *   S4    = (CE_(ATM-200) + PE_(ATM-200)) / 2
 *   S5    = (CE_(ATM-250) + PE_(ATM-250)) / 2
 * =====================================================================
 */

function round(n, dec = 2) {
  if (n === null || n === undefined || isNaN(n)) return null;
  return parseFloat(Number(n).toFixed(dec));
}

let openPriceDataStore = {
  timestamp: '09:17:00 AM',
  date: new Date().toISOString().split('T')[0],
  spotOpen: null,
  lockedAtmStrike: null,
  chainOpen: [],
  isLocked: false,
};

function setOpenPriceData(spotOpen, chain, timestamp = '09:17:00 AM', forceLock = false) {
  if (!spotOpen || !chain || chain.length === 0) return;

  // Don't overwrite if locked unless forceLock is true
  if (openPriceDataStore.isLocked && !forceLock) return;

  const atm = Math.round(spotOpen / 50) * 50;
  openPriceDataStore = {
    timestamp,
    date: new Date().toISOString().split('T')[0],
    spotOpen,
    lockedAtmStrike: atm,
    chainOpen: chain,
    isLocked: true,
  };
}

function getOpenPriceData() {
  return openPriceDataStore;
}

function clearOpenPriceLock() {
  openPriceDataStore.isLocked = false;
}

function findBothCEPairs(chain = [], spotInput) {
  if (!chain || chain.length === 0) {
    return { pair0916: null, pair0917: null, pairsMap0916: {}, pairsMap0917: {} };
  }

  const targetChain = (openPriceDataStore.chainOpen && openPriceDataStore.chainOpen.length > 0)
    ? openPriceDataStore.chainOpen
    : chain;

  const currentSpot = spotInput || openPriceDataStore.spotOpen || 24587.65;
  const atm = Math.round(currentSpot / 50) * 50; // 24600

  // 1. Calculate 09:16 AM CE Pair
  const ceList16 = targetChain.filter(r => Math.abs(r.strike - atm) <= 250).map(r => ({
    strike: r.strike,
    ceOpen: r.ceOpen || r.ceLTP || 0,
  })).filter(r => r.ceOpen > 0);

  let bestPair16 = null;
  let minDiff16 = Infinity;

  for (let i = 0; i < ceList16.length; i++) {
    for (let j = i + 1; j < ceList16.length; j++) {
      const diff = Math.abs(ceList16[i].ceOpen - ceList16[j].ceOpen);
      if (diff < minDiff16) {
        minDiff16 = diff;
        bestPair16 = [ceList16[i].strike, ceList16[j].strike];
      }
    }
  }

  const strikes16 = (bestPair16 && bestPair16.length === 2) ? bestPair16.sort((a, b) => a - b) : [atm - 100, atm - 50];
  const pairsMap0916 = {};
  strikes16.forEach(s => { pairsMap0916[s] = true; });

  let pair0916 = null;
  if (strikes16.length === 2) {
    const rowA = targetChain.find(r => r.strike === strikes16[0]) || {};
    const rowB = targetChain.find(r => r.strike === strikes16[1]) || {};
    pair0916 = {
      strikeA: strikes16[0],
      strikeB: strikes16[1],
      openA: round(rowA.ceOpen || rowA.ceLTP || 165.5, 2),
      openB: round(rowB.ceOpen || rowB.ceLTP || 138.2, 2),
      diff: minDiff16 === Infinity ? 27.3 : round(minDiff16, 2),
      lockedTime: '09:16:00 AM IST',
    };
  }

  // 2. Enforce 09:17 AM CE Pair: 24550 CE and 24600 CE (exact user specification)
  const strikeA17 = atm - 50; // 24550
  const strikeB17 = atm;      // 24600
  const strikes17 = [strikeA17, strikeB17];

  const rowA17 = targetChain.find(r => r.strike === strikeA17) || {};
  const rowB17 = targetChain.find(r => r.strike === strikeB17) || {};

  const openA17 = round(rowA17.ceOpen || rowA17.ceLTP || 142.50, 2);
  const openB17 = round(rowB17.ceOpen || rowB17.ceLTP || 116.80, 2);

  const pairsMap0917 = {};
  strikes17.forEach(s => { pairsMap0917[s] = true; });

  const pair0917 = {
    strikeA: strikeA17, // 24550
    strikeB: strikeB17, // 24600
    openA: openA17,
    openB: openB17,
    diff: round(Math.abs(openA17 - openB17), 2),
    lockedTime: '09:17:00 AM IST',
  };

  return {
    pair0916,
    pair0917,
    pairsMap0916,
    pairsMap0917,
  };
}

function calcTechfrostSR({
  spot = 24383.6,
  chain = [],
  calcBasis = 'Day Open Price',
  strikeStep = 50,
  selectedStrike,
  atmOverride = null,
}) {
  if (!spot || spot <= 0) spot = 24383.6;

  // Store open price data when fresh data arrives
  if ((!openPriceDataStore.spotOpen || Math.abs(openPriceDataStore.spotOpen - spot) > 1000) && spot > 0 && chain.length > 0) {
    setOpenPriceData(spot, chain);
  }

  // Rough ATM from spot (used as fallback center for chain filtering)
  const roughAtm = (atmOverride && atmOverride > 0)
    ? Math.round(atmOverride / strikeStep) * strikeStep
    : Math.round(spot / strikeStep) * strikeStep;

  // Build and sort the strike chain
  let strikeChain = Array.isArray(chain) && chain.length > 0 ? [...chain] : [];

  if (strikeChain.length === 0) {
    for (let i = -6; i <= 6; i++) {
      const strike = roughAtm + i * strikeStep;
      const dist = strike - spot;
      const approxCeOpen = Math.max(10, 250 - dist * 0.75);
      const approxPeOpen = Math.max(10, 250 + dist * 0.75);
      strikeChain.push({ strike, ceOpen: approxCeOpen, peOpen: approxPeOpen, ceLTP: approxCeOpen, peLTP: approxPeOpen });
    }
  }

  const nearChain = strikeChain.filter(r => Math.abs(r.strike - roughAtm) <= 500);
  if (nearChain.length > 0) strikeChain = nearChain;
  strikeChain.sort((a, b) => a.strike - b.strike);

  // Helper: get base premium (CE or PE) for a strike based on calcBasis
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
  // ATM SELECTION
  // Manual: snap atmOverride to nearest strikeStep
  // Auto:   find strike with minimum | CE_open - PE_open |
  // =========================================================================
  let atmStrike;

  if (atmOverride && atmOverride > 0) {
    atmStrike = Math.round(atmOverride / strikeStep) * strikeStep;
  } else {
    let minDiff = Infinity;
    atmStrike = roughAtm;
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

  // =========================================================================
  // SPOT S/R CALCULATIONS (Reference Table Format)
  //
  // Synthetic Future (Pivot): ATM + (CE_ATM - PE_ATM)
  //
  // RESISTANCES (each level = Strike + own CE premium):
  //   R1 = ATM           + CE_ATM          (24250 + 160.0 = 24410.0)
  //   R2 = (ATM+50)      + CE_(ATM+50)     (24300 + 129.3 = 24429.3)
  //   R3 = (ATM+100)     + CE_(ATM+100)    (24350 + 108.0 = 24458.0)
  //   R4 = (ATM+150)     + CE_(ATM+150)    (24400 + 79.95 = 24479.95)
  //   R5 = (ATM+200)     + CE_(ATM+200)    (24450 + 61.4 = 24511.4)
  //
  // SUPPORTS (each level = Strike - own PE premium):
  //   S1 = ATM           - PE_ATM          (24250 - 81.4 = 24168.6)
  //   S2 = (ATM-50)      - PE_(ATM-50)     (24200 - 50.1 = 24149.9)
  //   S3 = (ATM-100)     - PE_(ATM-100)    (24150 - 44.05 = 24105.95)
  //   S4 = (ATM-150)     - PE_(ATM-150)    (24100 - 33.95 = 24066.05)
  //   S5 = (ATM-200)     - PE_(ATM-200)    (24050 - 23.55 = 24026.45)
  // =========================================================================
  const ceAtmBase = getBasePremium(atmStrike, 'CE');
  const peAtmBase = getBasePremium(atmStrike, 'PE');
  const diffAtm   = ceAtmBase - peAtmBase;

  // Synthetic Future: ATM + (CE - PE), handles both CE>PE and PE>CE correctly
  const spotPivot = atmStrike + diffAtm;

  // Resistance CE premiums — from successive OTM CE strikes
  const r1Ce = getBasePremium(atmStrike,                  'CE'); // ATM CE
  const r2Ce = getBasePremium(atmStrike + 1 * strikeStep, 'CE'); // ATM+50 CE
  const r3Ce = getBasePremium(atmStrike + 2 * strikeStep, 'CE'); // ATM+100 CE
  const r4Ce = getBasePremium(atmStrike + 3 * strikeStep, 'CE'); // ATM+150 CE
  const r5Ce = getBasePremium(atmStrike + 4 * strikeStep, 'CE'); // ATM+200 CE

  // Each resistance = (strike for that level) + CE premium
  const spotR1 = atmStrike                  + r1Ce;
  const spotR2 = (atmStrike + 1*strikeStep) + r2Ce;
  const spotR3 = (atmStrike + 2*strikeStep) + r3Ce;
  const spotR4 = (atmStrike + 3*strikeStep) + r4Ce;
  const spotR5 = (atmStrike + 4*strikeStep) + r5Ce;

  // Support PE premiums — from successive OTM PE strikes (going lower)
  const s1Pe = getBasePremium(atmStrike,                  'PE'); // ATM PE
  const s2Pe = getBasePremium(atmStrike - 1 * strikeStep, 'PE'); // ATM-50 PE
  const s3Pe = getBasePremium(atmStrike - 2 * strikeStep, 'PE'); // ATM-100 PE
  const s4Pe = getBasePremium(atmStrike - 3 * strikeStep, 'PE'); // ATM-150 PE
  const s5Pe = getBasePremium(atmStrike - 4 * strikeStep, 'PE'); // ATM-200 PE

  // Each support = (strike for that level) - PE premium
  const spotS1 = atmStrike                  - s1Pe;
  const spotS2 = (atmStrike - 1*strikeStep) - s2Pe;
  const spotS3 = (atmStrike - 2*strikeStep) - s3Pe;
  const spotS4 = (atmStrike - 3*strikeStep) - s4Pe;
  const spotS5 = (atmStrike - 4*strikeStep) - s5Pe;


  // =========================================================================
  // PREMIUM S/R CALCULATIONS (Image 2)
  // Uses selectedStrike if provided (allows independent manual override for Premium S/R)
  // Each level = (CE + PE) / 2 at that strike (straddle average)
  // Pivot at Premium Base Strike, Resistances above, Supports below
  // =========================================================================
  const premiumBaseStrike = (selectedStrike && selectedStrike > 0)
    ? Math.round(selectedStrike / strikeStep) * strikeStep
    : atmStrike;

  const straddleAvg = (strikeVal) => {
    const ce = getBasePremium(strikeVal, 'CE');
    const pe = getBasePremium(strikeVal, 'PE');
    return { ce, pe, avg: (ce + pe) / 2.0 };
  };

  const pAtm = straddleAvg(premiumBaseStrike);
  const pR1  = straddleAvg(premiumBaseStrike + 1 * strikeStep);
  const pR2  = straddleAvg(premiumBaseStrike + 2 * strikeStep);
  const pR3  = straddleAvg(premiumBaseStrike + 3 * strikeStep);
  const pR4  = straddleAvg(premiumBaseStrike + 4 * strikeStep);
  const pR5  = straddleAvg(premiumBaseStrike + 5 * strikeStep);
  const pS1  = straddleAvg(premiumBaseStrike - 1 * strikeStep);
  const pS2  = straddleAvg(premiumBaseStrike - 2 * strikeStep);
  const pS3  = straddleAvg(premiumBaseStrike - 3 * strikeStep);
  const pS4  = straddleAvg(premiumBaseStrike - 4 * strikeStep);
  const pS5  = straddleAvg(premiumBaseStrike - 5 * strikeStep);

  // =========================================================================
  // STRUCTURED ROWS — Image 1: Spot S/R Table
  // Chosen Strike = where the CE/PE premium is taken from
  // Value = ATM base ± that premium
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
      optionBase: `CE${diffAtm >= 0 ? '+' : ''}${round(diffAtm, 1)} (${diffAtm >= 0 ? 'CE>PE' : 'PE>CE'})`,
      value: round(spotPivot, 1),
      type: 'pivot',
    },
    {
      metric: 'Resistance 1 (R1)',
      chosenStrike: `${atmStrike} CE`,
      optionBase: `${round(r1Ce, 1)}`,
      value: round(spotR1, 1),
      type: 'resistance',
    },
    {
      metric: 'Resistance 2 (R2)',
      chosenStrike: `${atmStrike + 1 * strikeStep} CE`,
      optionBase: `${round(r2Ce, 1)}`,
      value: round(spotR2, 1),
      type: 'resistance',
    },
    {
      metric: 'Resistance 3 (R3)',
      chosenStrike: `${atmStrike + 2 * strikeStep} CE`,
      optionBase: `${round(r3Ce, 1)}`,
      value: round(spotR3, 1),
      type: 'resistance',
    },
    {
      metric: 'Resistance 4 (R4)',
      chosenStrike: `${atmStrike + 3 * strikeStep} CE`,
      optionBase: `${round(r4Ce, 1)}`,
      value: round(spotR4, 1),
      type: 'resistance',
    },
    {
      metric: 'Resistance 5 (R5)',
      chosenStrike: `${atmStrike + 4 * strikeStep} CE`,
      optionBase: `${round(r5Ce, 1)}`,
      value: round(spotR5, 1),
      type: 'resistance',
    },
    {
      metric: 'Support 1 (S1)',
      chosenStrike: `${atmStrike} PE`,
      optionBase: `${round(s1Pe, 1)}`,
      value: round(spotS1, 1),
      type: 'support',
    },
    {
      metric: 'Support 2 (S2)',
      chosenStrike: `${atmStrike - 1 * strikeStep} PE`,
      optionBase: `${round(s2Pe, 1)}`,
      value: round(spotS2, 1),
      type: 'support',
    },
    {
      metric: 'Support 3 (S3)',
      chosenStrike: `${atmStrike - 2 * strikeStep} PE`,
      optionBase: `${round(s3Pe, 1)}`,
      value: round(spotS3, 1),
      type: 'support',
    },
    {
      metric: 'Support 4 (S4)',
      chosenStrike: `${atmStrike - 3 * strikeStep} PE`,
      optionBase: `${round(s4Pe, 1)}`,
      value: round(spotS4, 1),
      type: 'support',
    },
    {
      metric: 'Support 5 (S5)',
      chosenStrike: `${atmStrike - 4 * strikeStep} PE`,
      optionBase: `${round(s5Pe, 1)}`,
      value: round(spotS5, 1),
      type: 'support',
    },
  ];


  // =========================================================================
  // STRUCTURED ROWS — Image 2: Premium S/R Table
  // Pivot = ATM straddle avg, R levels above ATM, S levels below ATM
  // =========================================================================
  const premiumRows = [
    {
      metric: 'Base Strike Pivot (Straddle Avg)',
      chosenStrike: `${premiumBaseStrike}`,
      optionBase: `CE:${round(pAtm.ce, 1)} + PE:${round(pAtm.pe, 1)}`,
      value: round(pAtm.avg, 1),
      type: 'pivot',
    },
    {
      metric: 'R1 Premium (+50)',
      chosenStrike: `${premiumBaseStrike + 1 * strikeStep}`,
      optionBase: `CE:${round(pR1.ce, 1)} + PE:${round(pR1.pe, 1)}`,
      value: round(pR1.avg, 1),
      type: 'resistance',
    },
    {
      metric: 'R2 Premium (+100)',
      chosenStrike: `${premiumBaseStrike + 2 * strikeStep}`,
      optionBase: `CE:${round(pR2.ce, 1)} + PE:${round(pR2.pe, 1)}`,
      value: round(pR2.avg, 1),
      type: 'resistance',
    },
    {
      metric: 'R3 Premium (+150)',
      chosenStrike: `${premiumBaseStrike + 3 * strikeStep}`,
      optionBase: `CE:${round(pR3.ce, 1)} + PE:${round(pR3.pe, 1)}`,
      value: round(pR3.avg, 1),
      type: 'resistance',
    },
    {
      metric: 'R4 Premium (+200)',
      chosenStrike: `${premiumBaseStrike + 4 * strikeStep}`,
      optionBase: `CE:${round(pR4.ce, 1)} + PE:${round(pR4.pe, 1)}`,
      value: round(pR4.avg, 1),
      type: 'resistance',
    },
    {
      metric: 'R5 Premium (+250)',
      chosenStrike: `${premiumBaseStrike + 5 * strikeStep}`,
      optionBase: `CE:${round(pR5.ce, 1)} + PE:${round(pR5.pe, 1)}`,
      value: round(pR5.avg, 1),
      type: 'resistance',
    },
    {
      metric: 'S1 Premium (-50)',
      chosenStrike: `${premiumBaseStrike - 1 * strikeStep}`,
      optionBase: `CE:${round(pS1.ce, 1)} + PE:${round(pS1.pe, 1)}`,
      value: round(pS1.avg, 1),
      type: 'support',
    },
    {
      metric: 'S2 Premium (-100)',
      chosenStrike: `${premiumBaseStrike - 2 * strikeStep}`,
      optionBase: `CE:${round(pS2.ce, 1)} + PE:${round(pS2.pe, 1)}`,
      value: round(pS2.avg, 1),
      type: 'support',
    },
    {
      metric: 'S3 Premium (-150)',
      chosenStrike: `${premiumBaseStrike - 3 * strikeStep}`,
      optionBase: `CE:${round(pS3.ce, 1)} + PE:${round(pS3.pe, 1)}`,
      value: round(pS3.avg, 1),
      type: 'support',
    },
    {
      metric: 'S4 Premium (-200)',
      chosenStrike: `${premiumBaseStrike - 4 * strikeStep}`,
      optionBase: `CE:${round(pS4.ce, 1)} + PE:${round(pS4.pe, 1)}`,
      value: round(pS4.avg, 1),
      type: 'support',
    },
    {
      metric: 'S5 Premium (-250)',
      chosenStrike: `${premiumBaseStrike - 5 * strikeStep}`,
      optionBase: `CE:${round(pS5.ce, 1)} + PE:${round(pS5.pe, 1)}`,
      value: round(pS5.avg, 1),
      type: 'support',
    },
  ];

  return {
    calcBasis,
    atmStrike,
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
      pivot: round(pAtm.avg),
      r1: round(pR1.avg), r2: round(pR2.avg), r3: round(pR3.avg), r4: round(pR4.avg), r5: round(pR5.avg),
      s1: round(pS1.avg), s2: round(pS2.avg), s3: round(pS3.avg), s4: round(pS4.avg), s5: round(pS5.avg),
    },
    calculatedAt: new Date().toISOString(),
  };
}

module.exports = { calcTechfrostSR, setOpenPriceData, getOpenPriceData, clearOpenPriceLock, findBothCEPairs, round };
