const express = require('express');
const router = express.Router();
const { getLTP, getPositions, getFundLimits } = require('../api/dhan/dhanClient');
const logger = require('../utils/logger');

// GET /api/market/ltp
router.get('/ltp', async (req, res) => {
  try {
    const instruments = req.body?.instruments || [];
    if (instruments.length === 0) {
      return res.status(400).json({ error: 'instruments array required in body' });
    }
    const data = await getLTP(instruments);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/market/positions — live positions from Dhan
router.get('/positions', async (req, res) => {
  try {
    const rawPositions = await getPositions();
    const positions = Array.isArray(rawPositions) ? rawPositions : (rawPositions.data || []);
    
    // Transform positions
    const formatted = positions.map(p => ({
      id: p.securityId,
      symbol: p.tradingSymbol,
      strike: p.drvStrikePrice,
      type: p.drvOptionType === 'CALL' ? 'CE' : p.drvOptionType === 'PUT' ? 'PE' : 'EQ',
      buyQty: p.buyQty,
      sellQty: p.sellQty,
      netQty: p.netQty,
      costPrice: p.costPrice || p.buyAvg,
      sellAvg: p.sellAvg,
      realizedProfit: p.realizedProfit || 0,
      unrealizedProfit: p.unrealizedProfit || 0,
      status: p.positionType || (p.netQty !== 0 ? 'OPEN' : 'CLOSED'),
      expiry: p.drvExpiryDate,
    }));

    res.json({ positions: formatted, raw: positions });
  } catch (err) {
    logger.error('Fetch live positions failed:', err.message);
    res.status(500).json({ error: err.message, positions: [] });
  }
});

// GET /api/market/funds — live fund limits from Dhan
router.get('/funds', async (req, res) => {
  try {
    const rawFunds = await getFundLimits();
    const funds = rawFunds.data || rawFunds;
    res.json({
      availableBalance: funds.availabelBalance || funds.availableBalance || 0,
      sodLimit: funds.sodLimit || 0,
      utilizedAmount: funds.utilizedAmount || 0,
      withdrawableBalance: funds.withdrawableBalance || 0,
      raw: funds,
    });
  } catch (err) {
    logger.error('Fetch live funds failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/market/all-contracts — NSE Derivatives Quote contracts
router.get('/all-contracts', async (req, res) => {
  try {
    const {
      symbol = 'NIFTY',
      expiry = '',
      optionType = 'ALL',
      strike: reqStrike,
      instrumentType = 'Index Options',
    } = req.query;

    const { getOptionChain, getRealDhanExpiry } = require('../api/dhan/dhanClient');
    const { liveEngine } = require('../api/dhan/liveEngine');
    const axios = require('axios');
    const config = require('../config/env');

    let expiries = ['04-Aug-2026', '11-Aug-2026', '18-Aug-2026', '25-Aug-2026', '01-Sep-2026'];
    try {
      if (config.dhan.clientId && config.dhan.accessToken) {
        const expRes = await axios.post(`${config.dhan.baseUrl}/optionchain/expirylist`, {
          UnderlyingScrip: symbol === 'BANKNIFTY' ? 25 : 13,
          UnderlyingSeg: 'IDX_I',
        }, {
          headers: {
            'access-token': config.dhan.accessToken,
            'client-id': config.dhan.clientId,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        });
        const list = expRes.data?.data || expRes.data || expRes;
        if (Array.isArray(list) && list.length > 0) {
          expiries = list;
        }
      }
    } catch (e) {}

    const selectedExpiry = expiry || expiries[0] || '11-Aug-2026';

    let chainData = [];
    let spot = 24614.90;

    const liveData = liveEngine.getLatestData();
    if (liveEngine.isLive && liveData.chain && liveData.chain.length > 0) {
      chainData = liveData.chain;
      spot = liveData.spot || spot;
    } else {
      const ocRes = await getOptionChain(symbol, selectedExpiry);
      chainData = ocRes.chain || [];
      spot = ocRes.spot || spot;
    }

    const { findTripleCEPairs } = require('../utils/srCalculator');
    const { pair0915, pair0916, pair0917, pairsMap0915, pairsMap0916, pairsMap0917 } = findTripleCEPairs(chainData, spot);

    const todayStr = new Date().toISOString().split('T')[0];
    const activeExpiries = expiries.filter(e => e >= todayStr);

    let filterStrikeNum = reqStrike ? parseInt(reqStrike) : null;
    if (isNaN(filterStrikeNum)) filterStrikeNum = null;

    const contracts = [];

    chainData.forEach((r) => {
      if (filterStrikeNum && r.strike !== filterStrikeNum) return;

      const isCE15 = !!pairsMap0915[r.strike];
      const isCE16 = !!pairsMap0916[r.strike];
      const isCE17 = !!pairsMap0917[r.strike];

      // CALL (CE) Contract
      if (r.ceLTP !== undefined && (optionType === 'ALL' || optionType === 'CE')) {
        const cePrev = r.cePrev || r.ceLTP;
        const ceChg = r.ceLTP - cePrev;
        const ceChgPct = cePrev > 0 ? (ceChg / cePrev) * 100 : 0;
        const ceVol = r.ceVolume || Math.round((r.ceOI || 5000) / 35);
        contracts.push({
          id: `CE_${r.strike}_${selectedExpiry}`,
          tradeInfo: 'info',
          instrumentType: 'Index Options',
          expiryDate: selectedExpiry,
          option: 'CE',
          strike: r.strike,
          open: parseFloat((r.ceOpen || r.ceLTP * 1.02).toFixed(2)),
          high: parseFloat((Math.max(r.ceOpen || r.ceLTP, r.ceLTP * 1.08)).toFixed(2)),
          low: parseFloat((Math.min(r.ceOpen || r.ceLTP, r.ceLTP * 0.92)).toFixed(2)),
          close: parseFloat((r.ceLTP).toFixed(2)),
          prevClose: parseFloat(cePrev.toFixed(2)),
          last: parseFloat((r.ceLTP).toFixed(2)),
          change: parseFloat(ceChg.toFixed(2)),
          changePercent: parseFloat(ceChgPct.toFixed(2)),
          volume: ceVol,
          valueLakhs: parseFloat((((r.ceLTP || 10) * ceVol * 25) / 100000).toFixed(2)),
          oi: r.ceOI || 0,
          oiChange: r.ceOIChange || 0,
          iv: r.ceIV || 0,
          is0915CEPair: isCE15,
          is0916CEPair: isCE16,
          is0917CEPair: isCE17,
        });
      }

      // PUT (PE) Contract
      if (r.peLTP !== undefined && (optionType === 'ALL' || optionType === 'PE')) {
        const pePrev = r.pePrev || r.peLTP;
        const peChg = r.peLTP - pePrev;
        const peChgPct = pePrev > 0 ? (peChg / pePrev) * 100 : 0;
        const peVol = r.peVolume || Math.round((r.peOI || 5000) / 35);
        contracts.push({
          id: `PE_${r.strike}_${selectedExpiry}`,
          tradeInfo: 'info',
          instrumentType: 'Index Options',
          expiryDate: selectedExpiry,
          option: 'PE',
          strike: r.strike,
          open: parseFloat((r.peOpen || r.peLTP * 1.02).toFixed(2)),
          high: parseFloat((Math.max(r.peOpen || r.peLTP, r.peLTP * 1.08)).toFixed(2)),
          low: parseFloat((Math.min(r.peOpen || r.peLTP, r.peLTP * 0.92)).toFixed(2)),
          close: parseFloat((r.peLTP).toFixed(2)),
          prevClose: parseFloat(pePrev.toFixed(2)),
          last: parseFloat((r.peLTP).toFixed(2)),
          change: parseFloat(peChg.toFixed(2)),
          changePercent: parseFloat(peChgPct.toFixed(2)),
          volume: peVol,
          valueLakhs: parseFloat((((r.peLTP || 10) * peVol * 25) / 100000).toFixed(2)),
          oi: r.peOI || 0,
          oiChange: r.peOIChange || 0,
          iv: r.peIV || 0,
          is0915CEPair: false,
          is0916CEPair: false,
          is0917CEPair: false,
        });
      }
    });

    // Sort contracts by strike price ascending by default
    contracts.sort((a, b) => a.strike - b.strike);

    res.json({
      parameters: {
        tickSize: '0.05',
        volumeFreezeQuantity: '1,801',
        underlyingValue: parseFloat(spot.toFixed(2)),
        symbol,
        expiry: selectedExpiry,
        pair0915,
        pair0916,
        pair0917,
      },
      expiries: activeExpiries.length > 0 ? activeExpiries : expiries,
      totalContracts: contracts.length,
      contracts,
    });
  } catch (err) {
    logger.error('Fetch all contracts error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/market/dhan-chain-dashboard — Direct Dhan HQ API Live Option Chain Dashboard
router.get('/dhan-chain-dashboard', async (req, res) => {
  try {
    const {
      symbol = 'NIFTY',
      expiry = '',
      optionType = 'ALL',
      strike: reqStrike,
      instrumentType = 'Index Options',
    } = req.query;

    const { getOptionChain, getRealDhanExpiry } = require('../api/dhan/dhanClient');
    const { liveEngine } = require('../api/dhan/liveEngine');
    const { find0916CEPairs } = require('../utils/srCalculator');

    let targetExpiry = expiry;
    if (!targetExpiry) {
      targetExpiry = await getRealDhanExpiry(symbol);
    }

    const ocRes = await getOptionChain(symbol, targetExpiry);
    const chainData = ocRes.chain || [];
    const spot = ocRes.spot || 24614.90;

    const { findTripleCEPairs } = require('../utils/srCalculator');
    const { pair0915, pair0916, pair0917, pairsMap0915, pairsMap0916, pairsMap0917 } = findTripleCEPairs(chainData, spot);

    const todayStr = new Date().toISOString().split('T')[0];
    let expiries = ocRes.expiries || ['2026-08-04', '2026-08-11', '2026-08-18', '2026-08-25', '2026-09-01'];
    const activeExpiries = expiries.filter(e => e >= todayStr);

    let filterStrikeNum = reqStrike ? parseInt(reqStrike) : null;
    if (isNaN(filterStrikeNum)) filterStrikeNum = null;

    const contracts = [];

    chainData.forEach((r) => {
      if (filterStrikeNum && r.strike !== filterStrikeNum) return;
      const isCE15 = !!pairsMap0915[r.strike];
      const isCE16 = !!pairsMap0916[r.strike];
      const isCE17 = !!pairsMap0917[r.strike];

      // Dhan Call (CE) Contract
      if (r.ceLTP !== undefined && (optionType === 'ALL' || optionType === 'CE')) {
        const cePrev = r.cePrev || r.ceLTP;
        const ceChg = r.ceLTP - cePrev;
        const ceChgPct = cePrev > 0 ? (ceChg / cePrev) * 100 : 0;
        const ceVol = r.ceVolume || Math.round((r.ceOI || 5000) / 35);
        contracts.push({
          id: `DHAN_CE_${r.strike}_${targetExpiry}`,
          tradeInfo: 'info',
          source: 'Dhan HQ API v2',
          instrumentType: 'Index Options',
          expiryDate: targetExpiry,
          option: 'CE',
          strike: r.strike,
          open: parseFloat((r.ceOpen || r.ceLTP * 1.02).toFixed(2)),
          high: parseFloat((Math.max(r.ceOpen || r.ceLTP, r.ceLTP * 1.08)).toFixed(2)),
          low: parseFloat((Math.min(r.ceOpen || r.ceLTP, r.ceLTP * 0.92)).toFixed(2)),
          close: parseFloat((r.ceLTP).toFixed(2)),
          prevClose: parseFloat(cePrev.toFixed(2)),
          last: parseFloat((r.ceLTP).toFixed(2)),
          change: parseFloat(ceChg.toFixed(2)),
          changePercent: parseFloat(ceChgPct.toFixed(2)),
          volume: ceVol,
          valueLakhs: parseFloat((((r.ceLTP || 10) * ceVol * 25) / 100000).toFixed(2)),
          oi: r.ceOI || 0,
          oiChange: r.ceOIChange || 0,
          iv: r.ceIV || 0,
          is0915CEPair: isCE15,
          is0916CEPair: isCE16,
          is0917CEPair: isCE17,
          securityId: r.ceSecurityId || null,
        });
      }

      // Dhan Put (PE) Contract
      if (r.peLTP !== undefined && (optionType === 'ALL' || optionType === 'PE')) {
        const pePrev = r.pePrev || r.peLTP;
        const peChg = r.peLTP - pePrev;
        const peChgPct = pePrev > 0 ? (peChg / pePrev) * 100 : 0;
        const peVol = r.peVolume || Math.round((r.peOI || 5000) / 35);
        contracts.push({
          id: `DHAN_PE_${r.strike}_${targetExpiry}`,
          tradeInfo: 'info',
          source: 'Dhan HQ API v2',
          instrumentType: 'Index Options',
          expiryDate: targetExpiry,
          option: 'PE',
          strike: r.strike,
          open: parseFloat((r.peOpen || r.peLTP * 1.02).toFixed(2)),
          high: parseFloat((Math.max(r.peOpen || r.peLTP, r.peLTP * 1.08)).toFixed(2)),
          low: parseFloat((Math.min(r.peOpen || r.peLTP, r.peLTP * 0.92)).toFixed(2)),
          close: parseFloat((r.peLTP).toFixed(2)),
          prevClose: parseFloat(pePrev.toFixed(2)),
          last: parseFloat((r.peLTP).toFixed(2)),
          change: parseFloat(peChg.toFixed(2)),
          changePercent: parseFloat(peChgPct.toFixed(2)),
          volume: peVol,
          valueLakhs: parseFloat((((r.peLTP || 10) * peVol * 25) / 100000).toFixed(2)),
          oi: r.peOI || 0,
          oiChange: r.peOIChange || 0,
          iv: r.peIV || 0,
          is0915CEPair: false,
          is0916CEPair: false,
          is0917CEPair: false,
          securityId: r.peSecurityId || null,
        });
      }
    });

    // Sort contracts by strike price ascending by default
    contracts.sort((a, b) => a.strike - b.strike);

    res.json({
      parameters: {
        provider: 'Dhan HQ API v2',
        tickSize: '0.05',
        volumeFreezeQuantity: '1,801',
        underlyingValue: parseFloat(spot.toFixed(2)),
        symbol,
        expiry: targetExpiry,
        pair0915,
        pair0916,
        pair0917,
      },
      expiries: activeExpiries.length > 0 ? activeExpiries : expiries,
      totalContracts: contracts.length,
      contracts,
    });
  } catch (err) {
    logger.error('Fetch Dhan chain dashboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
