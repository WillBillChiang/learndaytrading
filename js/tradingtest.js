/* ============================================
   DAY TRADING COURSE — Trading Simulator Test
   Comprehensive trading simulator with scoring
   ============================================ */

const TradingTest = {
  canvas: null,
  ctx: null,
  timerInterval: null,
  candleInterval: null,
  pendingTimeouts: [],
  resizeHandler: null,
  debounceTimers: {},

  // ─── TICKERS & CATALYSTS ───────────────────────────────
  TICKERS: ['NVAX','MSTR','PLTR','RIVN','SOFI','DKNG','AFRM','UPST','HOOD','SMCI'],

  CATALYSTS: [
    {text: 'beat earnings by 15%, raised full-year guidance', gapDir: 1, gapSize: [1,3]},
    {text: 'missed revenue estimates, CEO stepping down', gapDir: -1, gapSize: [1,4]},
    {text: 'received FDA approval for lead drug candidate', gapDir: 1, gapSize: [2,5]},
    {text: 'announced $2B stock buyback program', gapDir: 1, gapSize: [0.5,2]},
    {text: 'no significant news pre-market', gapDir: 0, gapSize: [0,0.5]},
    {text: 'upgraded to Overweight by Goldman Sachs', gapDir: 1, gapSize: [1,3]},
    {text: 'downgraded to Sell by Morgan Stanley', gapDir: -1, gapSize: [1,3]},
    {text: 'CFO sold 500,000 shares in open market filing', gapDir: -1, gapSize: [0.5,2]},
    {text: 'partnership deal with major tech company announced', gapDir: 1, gapSize: [1,4]},
    {text: 'sector-wide selling pressure from macro concerns', gapDir: -1, gapSize: [0.5,2]}
  ],

  NEWS_MESSAGES: [
    {text: 'BREAKING: Fed Chair hints at potential rate cut in upcoming meeting', sentiment: 1},
    {text: 'ALERT: Sector ETF seeing unusual volume, institutional rotation detected', sentiment: 0},
    {text: 'UPDATE: Large block trade executed on dark pool — 2M shares', sentiment: 0},
    {text: 'BREAKING: Trade policy announcement rattles markets', sentiment: -1},
    {text: 'ALERT: Options sweep detected — $5M in calls bought at ask', sentiment: 1},
    {text: 'UPDATE: Short interest data shows 15% increase in borrowing', sentiment: -1},
    {text: 'BREAKING: Competitor announces surprise product launch', sentiment: -1},
    {text: 'ALERT: Bond yields spike, rotation out of growth stocks', sentiment: -1},
    {text: 'UPDATE: Whale alert — 10,000 call contracts purchased', sentiment: 1},
    {text: 'BREAKING: SEC announces investigation into sector practices', sentiment: -1},
    {text: 'ALERT: Analyst raises price target by 40%', sentiment: 1},
    {text: 'UPDATE: Insider buying cluster detected this week', sentiment: 1},
    {text: 'BREAKING: Supply chain disruption reported in key market', sentiment: -1},
    {text: 'ALERT: VIX spike signals increased market uncertainty', sentiment: -1},
    {text: 'UPDATE: Unusual dark pool activity detected, large prints', sentiment: 0},
    {text: 'BREAKING: Macro data comes in hotter than expected', sentiment: -1},
    {text: 'ALERT: Market maker repositioning detected on Level 2', sentiment: 0},
    {text: 'UPDATE: Sector peer announces guidance cut, sympathy move likely', sentiment: -1},
    {text: 'BREAKING: Government contract awarded, revenue impact expected', sentiment: 1},
    {text: 'ALERT: Short squeeze conditions forming — high SI% + low float', sentiment: 1}
  ],

  // ─── STATE ─────────────────────────────────────────────
  state: null,

  getDefaultState() {
    return {
      candles: [],
      timeRemaining: 300,
      totalDuration: 300,
      duration: 5,
      cash: 25000,
      startingCash: 25000,
      position: null,
      trades: [],
      pendingOrders: [],
      equityHistory: [],
      maxEquity: 25000,
      maxDrawdown: 0,
      newsEvents: [],
      running: false,
      orderType: 'market',
      candleSpeed: 2000,
      ticker: '',
      previousClose: 0,
      catalyst: '',
      phaseLog: [],
      startTime: null,
      totalCandles: 150,
      currentPhase: null,
      phaseIndex: 0,
      phaseCandles: 0,
      phases: [],
      swingHighs: [],
      swingLows: [],
      cumulativeVWAPNumerator: 0,
      cumulativeVWAPVolume: 0,
      vwap: 0,
      currentBid: 0,
      currentAsk: 0,
      newsSchedule: [],
      openingDirection: 1,
      baseVolatility: 0,
      baseVolume: 0,
      dailyATRBound: 0,
      sessionHigh: 0,
      sessionLow: Infinity
    };
  },

  // ─── DURATION CONFIG ───────────────────────────────────
  getDurationConfig(minutes) {
    if (minutes <= 15) return { candles: minutes * 30, speed: 2000 };
    if (minutes <= 60) return { candles: 390, speed: Math.round(minutes * 60000 / 390) };
    if (minutes <= 120) return { candles: 780, speed: Math.round(minutes * 60000 / 780) };
    return { candles: 1560, speed: Math.round(minutes * 60000 / 1560) };
  },

  // ─── MARKET ENGINE ────────────────────────────────────
  MarketEngine: {
    generatePhases(totalCandles) {
      const numPhases = Math.max(6, Math.floor(totalCandles / 25));
      const phases = [];
      const phaseTypes = ['OPENING', 'TREND_PULLBACK', 'CHOPPY', 'FAKE_THEN_REAL_BREAKOUT', 'TRENDING', 'END_SESSION'];
      const candlesPerPhase = Math.floor(totalCandles / numPhases);

      for (let i = 0; i < numPhases; i++) {
        const typeIndex = Math.min(i, phaseTypes.length - 1);
        let type;
        if (i === 0) type = 'OPENING';
        else if (i === numPhases - 1) type = 'END_SESSION';
        else {
          const midTypes = ['TREND_PULLBACK', 'CHOPPY', 'FAKE_THEN_REAL_BREAKOUT', 'TRENDING'];
          type = midTypes[(i - 1) % midTypes.length];
        }

        const start = i * candlesPerPhase;
        const end = (i === numPhases - 1) ? totalCandles : (i + 1) * candlesPerPhase;
        phases.push({ type, start, end, length: end - start });
      }
      return phases;
    },

    scheduleNews(totalCandles, newsMessages) {
      const count = Math.max(2, Math.floor(totalCandles / 50));
      const schedule = [];
      const usedMessages = new Set();
      for (let i = 0; i < count; i++) {
        const minCandle = Math.floor(totalCandles * 0.1);
        const maxCandle = Math.floor(totalCandles * 0.9);
        let candleIndex = minCandle + Math.floor(Math.random() * (maxCandle - minCandle));
        // Avoid bunching
        while (schedule.some(s => Math.abs(s.candleIndex - candleIndex) < 10)) {
          candleIndex = minCandle + Math.floor(Math.random() * (maxCandle - minCandle));
        }
        let msgIdx;
        do {
          msgIdx = Math.floor(Math.random() * newsMessages.length);
        } while (usedMessages.has(msgIdx) && usedMessages.size < newsMessages.length);
        usedMessages.add(msgIdx);

        const sentiment = newsMessages[msgIdx].sentiment;
        let direction;
        if (sentiment === 0) {
          direction = Math.random() > 0.5 ? 1 : -1;
        } else {
          direction = Math.random() < 0.8 ? sentiment : -sentiment;
        }
        const magnitude = 0.01 + Math.random() * 0.02; // 1-3%
        schedule.push({ candleIndex, message: newsMessages[msgIdx].text, direction, magnitude });
      }
      return schedule.sort((a, b) => a.candleIndex - b.candleIndex);
    },

    getPhaseForCandle(candleIndex, phases) {
      for (const phase of phases) {
        if (candleIndex >= phase.start && candleIndex < phase.end) return phase;
      }
      return phases[phases.length - 1];
    },

    getVolumeMultiplier(candleIndex, totalCandles) {
      return 2.5 * Math.exp(-0.015 * candleIndex) + 0.3 + 1.8 * Math.exp(-0.015 * (totalCandles - candleIndex));
    },

    getSpread(state, isNewsCandle) {
      if (isNewsCandle) return 0.30 + Math.random() * 0.20;
      const lastCandle = state.candles[state.candles.length - 1];
      if (lastCandle) {
        const bodyPct = Math.abs(lastCandle.close - lastCandle.open) / lastCandle.open;
        if (bodyPct > 0.01) return 0.05 + Math.random() * 0.10;
      }
      return 0.01 + Math.random() * 0.02;
    },

    generateNextCandle(state, tt) {
      const candleIndex = state.candles.length;
      const totalCandles = state.totalCandles;
      const phase = this.getPhaseForCandle(candleIndex, state.phases);
      state.phaseLog.push(phase.type);

      const prevCandle = state.candles.length > 0 ? state.candles[state.candles.length - 1] : null;
      const prevClose = prevCandle ? prevCandle.close : state.previousClose;

      // Check for scheduled news event
      const newsEvent = state.newsSchedule.find(n => n.candleIndex === candleIndex);
      let newsJolt = 0;
      if (newsEvent) {
        newsJolt = prevClose * newsEvent.magnitude * newsEvent.direction;
        state.newsEvents.push({ index: candleIndex, message: newsEvent.message });
        tt.showNewsEvent(newsEvent.message);
      }

      // Phase-specific parameters
      let trendBias = 0;
      let volatilityMult = 1;
      let volumeMult = 1;
      let bodyRatio = 0.5; // proportion of candle that is body vs wick

      const phaseProgress = (candleIndex - phase.start) / phase.length;
      const dir = state.openingDirection;

      switch (phase.type) {
        case 'OPENING': {
          if (candleIndex === 0) {
            // Gap candle
            const gapPct = (0.005 + Math.random() * 0.015) * dir;
            trendBias = gapPct * prevClose;
          } else {
            trendBias = dir * state.baseVolatility * (0.3 + Math.random() * 0.4);
          }
          volatilityMult = 2 + Math.random();
          volumeMult = 3 + Math.random() * 2;
          bodyRatio = 0.7;
          break;
        }
        case 'TREND_PULLBACK': {
          const pullbackStart = 0.6;
          if (phaseProgress < pullbackStart) {
            trendBias = dir * state.baseVolatility * (0.2 + Math.random() * 0.3);
            bodyRatio = 0.65;
          } else {
            trendBias = -dir * state.baseVolatility * (0.3 + Math.random() * 0.3);
            bodyRatio = 0.5;
          }
          volatilityMult = 1.2 + Math.random() * 0.5;
          volumeMult = 1.5 + Math.random();
          break;
        }
        case 'CHOPPY': {
          // Mean-reverting around midpoint
          const midpoint = state.candles.length > 5
            ? state.candles.slice(-10).reduce((s, c) => s + c.close, 0) / Math.min(10, state.candles.length)
            : prevClose;
          trendBias = (midpoint - prevClose) * 0.3 + (Math.random() - 0.5) * state.baseVolatility * 0.3;
          volatilityMult = 0.3 + Math.random() * 0.2;
          volumeMult = 0.6 + Math.random() * 0.3;
          bodyRatio = 0.2 + Math.random() * 0.2; // dojis
          break;
        }
        case 'FAKE_THEN_REAL_BREAKOUT': {
          const fakeEnd = 0.2;
          const reverseEnd = 0.45;
          if (phaseProgress < fakeEnd) {
            // Fake breakout in one direction
            trendBias = dir * state.baseVolatility * (0.5 + Math.random() * 0.3);
            volumeMult = 2 + Math.random();
            bodyRatio = 0.7;
          } else if (phaseProgress < reverseEnd) {
            // Sharp reversal
            trendBias = -dir * state.baseVolatility * (0.6 + Math.random() * 0.4);
            volumeMult = 2.5 + Math.random();
            bodyRatio = 0.75;
          } else {
            // Real breakout in opposite direction
            trendBias = -dir * state.baseVolatility * (0.4 + Math.random() * 0.3);
            volumeMult = 2 + Math.random() * 1.5;
            bodyRatio = 0.7;
          }
          volatilityMult = 1.5 + Math.random();
          break;
        }
        case 'TRENDING': {
          // Sustained directional move with small pullbacks
          const trendDir = Math.random() > 0.5 ? 1 : -1;
          if (Math.random() < 0.2) {
            // Small pullback
            trendBias = -trendDir * state.baseVolatility * (0.1 + Math.random() * 0.15);
            bodyRatio = 0.4;
          } else {
            trendBias = trendDir * state.baseVolatility * (0.2 + Math.random() * 0.3);
            bodyRatio = 0.7;
          }
          volatilityMult = 1 + Math.random() * 0.5;
          volumeMult = 1.2 + Math.random() * 0.8;
          break;
        }
        case 'END_SESSION': {
          trendBias = (Math.random() - 0.5) * state.baseVolatility * 0.8;
          volatilityMult = 1.5 + Math.random();
          volumeMult = 1.5 + Math.random() * 1.5;
          bodyRatio = 0.5 + Math.random() * 0.2;
          break;
        }
      }

      // Round number magnetism
      const roundLevel = Math.round(prevClose / 5) * 5;
      if (Math.abs(prevClose - roundLevel) / prevClose < 0.003) {
        trendBias += (roundLevel - prevClose) * 0.15;
      }

      // Generate OHLC
      const noise = (Math.random() - 0.5) * state.baseVolatility * volatilityMult;
      let change = trendBias + noise + newsJolt;

      // ATR constraint: limit total session range
      const potentialPrice = prevClose + change;
      if (potentialPrice > state.previousClose * (1 + state.dailyATRBound)) {
        change = state.previousClose * (1 + state.dailyATRBound) - prevClose;
      } else if (potentialPrice < state.previousClose * (1 - state.dailyATRBound)) {
        change = state.previousClose * (1 - state.dailyATRBound) - prevClose;
      }

      const open = prevClose;
      const close = prevClose + change;
      const bullish = close >= open;

      // Body and wicks
      const body = Math.abs(close - open);
      const totalRange = body / Math.max(bodyRatio, 0.1);
      const wickSpace = totalRange - body;
      const upperWickPct = 0.2 + Math.random() * 0.6;

      let high, low;
      if (bullish) {
        high = close + wickSpace * upperWickPct;
        low = open - wickSpace * (1 - upperWickPct);
      } else {
        high = open + wickSpace * upperWickPct;
        low = close - wickSpace * (1 - upperWickPct);
      }

      // Ensure OHLC validity
      high = Math.max(high, open, close);
      low = Math.min(low, open, close);
      if (high === low) high += 0.01;

      // Volume
      const baseVolMult = this.getVolumeMultiplier(candleIndex, totalCandles);
      const volume = Math.floor(state.baseVolume * baseVolMult * volumeMult * (0.7 + Math.random() * 0.6));

      // Spread and bid/ask
      const isNewsCandle = !!newsEvent;
      const spread = this.getSpread(state, isNewsCandle);
      const bid = Math.round((close - spread / 2) * 100) / 100;
      const ask = Math.round((close + spread / 2) * 100) / 100;

      const candle = {
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume,
        spread: Math.round(spread * 100) / 100,
        bid,
        ask,
        newsText: newsEvent ? newsEvent.message : null,
        index: candleIndex,
        phase: phase.type
      };

      // Update swing highs/lows
      if (state.candles.length >= 2) {
        const prev2 = state.candles[state.candles.length - 2];
        const prev1 = state.candles[state.candles.length - 1];
        if (prev1.high > prev2.high && prev1.high > candle.high) {
          state.swingHighs.push({ price: prev1.high, index: prev1.index });
        }
        if (prev1.low < prev2.low && prev1.low < candle.low) {
          state.swingLows.push({ price: prev1.low, index: prev1.index });
        }
      }

      // Update session high/low
      state.sessionHigh = Math.max(state.sessionHigh, candle.high);
      state.sessionLow = Math.min(state.sessionLow, candle.low);

      // Update VWAP
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      state.cumulativeVWAPNumerator += typicalPrice * volume;
      state.cumulativeVWAPVolume += volume;
      state.vwap = state.cumulativeVWAPVolume > 0
        ? state.cumulativeVWAPNumerator / state.cumulativeVWAPVolume
        : candle.close;

      // Update bid/ask from candle
      state.currentBid = candle.bid;
      state.currentAsk = candle.ask;

      return candle;
    }
  },

  // ─── ORDER ENGINE ─────────────────────────────────────
  OrderEngine: {
    orderPending: false,

    getSlippage(state, shares, isStop) {
      const lastCandle = state.candles[state.candles.length - 1];
      const bodyPct = lastCandle ? Math.abs(lastCandle.close - lastCandle.open) / lastCandle.open : 0;
      const isVolatile = bodyPct > 0.01;

      let base;
      if (isStop) {
        base = isVolatile ? 0.05 + Math.random() * 0.05 : 0.02 + Math.random() * 0.08;
      } else {
        base = isVolatile ? 0.05 + Math.random() * 0.10 : 0.01 + Math.random() * 0.02;
      }

      // Scale slightly by share count vs volume
      if (lastCandle && lastCandle.volume > 0) {
        const volumeImpact = Math.min(shares / lastCandle.volume, 0.1);
        base += volumeImpact * 0.5;
      }

      return Math.round(base * 100) / 100;
    },

    getFillDelay(state) {
      const lastCandle = state.candles[state.candles.length - 1];
      const bodyPct = lastCandle ? Math.abs(lastCandle.close - lastCandle.open) / lastCandle.open : 0;
      return bodyPct > 0.01 ? 300 + Math.floor(Math.random() * 200) : 200 + Math.floor(Math.random() * 300);
    },

    executeMarketOrder(side, shares, tt) {
      const state = tt.state;
      if (!state.running) return;
      if (this.orderPending) return;
      if (shares <= 0) return;
      shares = Math.floor(shares);

      if (side === 'sell' && !state.position) {
        showToast('No position to sell', 'error');
        return;
      }

      if (side === 'buy' && state.position && state.position.side === 'short') {
        showToast('Cannot buy while short — close position first', 'error');
        return;
      }

      if (side === 'sell' && state.position) {
        shares = Math.min(shares, state.position.shares);
      }

      if (side === 'buy') {
        const cost = shares * state.currentAsk;
        const commission = Math.max(1, Math.round(shares * 0.005 * 100) / 100);
        if (cost + commission > state.cash) {
          const affordableShares = Math.floor((state.cash - 1) / state.currentAsk);
          if (affordableShares <= 0) {
            showToast('Insufficient buying power', 'error');
            return;
          }
          shares = affordableShares;
        }
      }

      this.orderPending = true;
      tt.setButtonsState(true);

      const delay = this.getFillDelay(state);
      const timeoutId = setTimeout(() => {
        this.fillMarketOrder(side, shares, tt);
        this.orderPending = false;
        tt.setButtonsState(false);
        // Remove timeout from tracking
        const idx = tt.pendingTimeouts.indexOf(timeoutId);
        if (idx > -1) tt.pendingTimeouts.splice(idx, 1);
      }, delay);
      tt.pendingTimeouts.push(timeoutId);
    },

    fillMarketOrder(side, shares, tt) {
      const state = tt.state;
      if (!state.running) return;

      const lastCandle = state.candles[state.candles.length - 1];
      if (!lastCandle) return;

      const slippage = this.getSlippage(state, shares, false);
      let fillPrice;

      // Partial fills for large orders
      if (shares > 500 && lastCandle.volume > 0) {
        const fillRate = 0.6 + Math.random() * 0.4;
        shares = Math.max(1, Math.floor(shares * fillRate));
      }

      const commission = Math.max(1, Math.round(shares * 0.005 * 100) / 100);

      if (side === 'buy') {
        fillPrice = Math.round((state.currentAsk + slippage) * 100) / 100;
        const totalCost = shares * fillPrice + commission;

        if (totalCost > state.cash) {
          shares = Math.max(1, Math.floor((state.cash - commission) / fillPrice));
          if (shares <= 0) {
            showToast('Insufficient buying power after slippage', 'error');
            return;
          }
        }

        state.cash -= shares * fillPrice + commission;

        if (state.position && state.position.side === 'long') {
          // Average up/down
          const totalShares = state.position.shares + shares;
          const totalCostBasis = state.position.avgPrice * state.position.shares + fillPrice * shares;
          state.position.avgPrice = Math.round((totalCostBasis / totalShares) * 100) / 100;
          state.position.shares = totalShares;
        } else {
          state.position = {
            side: 'long',
            shares,
            avgPrice: fillPrice,
            entryIndex: state.candles.length - 1,
            stopLoss: null
          };
          // Apply stop loss from input
          const stopInput = document.getElementById('ttStopLoss');
          if (stopInput && stopInput.value) {
            const stopPrice = parseFloat(stopInput.value);
            if (!isNaN(stopPrice) && stopPrice > 0 && stopPrice < fillPrice) {
              state.position.stopLoss = stopPrice;
            }
          }
        }

        showToast(`Filled: BUY ${shares} @ $${fillPrice.toFixed(2)} (comm: $${commission.toFixed(2)})`, 'success');
      } else {
        // Sell
        fillPrice = Math.round((state.currentBid - slippage) * 100) / 100;

        if (!state.position) return;

        const sellShares = Math.min(shares, state.position.shares);
        const proceeds = sellShares * fillPrice - commission;
        state.cash += proceeds;

        const tradePnL = (fillPrice - state.position.avgPrice) * sellShares - commission;
        state.trades.push({
          side: 'long',
          entry: state.position.avgPrice,
          exit: fillPrice,
          shares: sellShares,
          pnl: Math.round(tradePnL * 100) / 100,
          entryIndex: state.position.entryIndex,
          exitIndex: state.candles.length - 1,
          commission,
          holdingCandles: (state.candles.length - 1) - state.position.entryIndex
        });

        if (sellShares >= state.position.shares) {
          state.position = null;
        } else {
          state.position.shares -= sellShares;
        }

        const sign = tradePnL >= 0 ? '+' : '';
        showToast(`Filled: SELL ${sellShares} @ $${fillPrice.toFixed(2)} (${sign}$${tradePnL.toFixed(2)})`, tradePnL >= 0 ? 'success' : 'error');
      }

      tt.updateStats();
      tt.draw();
    },

    placeLimitOrder(side, shares, limitPrice, tt) {
      const state = tt.state;
      if (!state.running) return;
      if (shares <= 0 || isNaN(limitPrice) || limitPrice <= 0) {
        showToast('Invalid limit order parameters', 'error');
        return;
      }
      shares = Math.floor(shares);

      state.pendingOrders.push({
        side,
        shares,
        limitPrice: Math.round(limitPrice * 100) / 100,
        placedAt: state.candles.length - 1,
        id: Date.now() + Math.random()
      });

      showToast(`Limit ${side.toUpperCase()} ${shares} shares @ $${limitPrice.toFixed(2)} placed`, 'success');
      tt.renderPendingOrders();
    },

    checkPendingOrders(candle, tt) {
      const state = tt.state;
      const toRemove = [];

      for (let i = 0; i < state.pendingOrders.length; i++) {
        const order = state.pendingOrders[i];
        const age = candle.index - order.placedAt;

        // Auto-cancel after scaled candle count (~13% of session)
        const expiryCandles = Math.round(20 * state.totalCandles / 150);
        if (age > expiryCandles) {
          toRemove.push(i);
          showToast(`Limit order expired: ${order.side.toUpperCase()} ${order.shares} @ $${order.limitPrice.toFixed(2)}`, 'error');
          continue;
        }

        let filled = false;
        if (order.side === 'buy' && candle.low <= order.limitPrice) {
          // Fill buy limit
          const fillShares = order.shares;
          const commission = Math.max(1, Math.round(fillShares * 0.005 * 100) / 100);
          const cost = fillShares * order.limitPrice + commission;

          if (cost <= state.cash) {
            state.cash -= cost;
            if (state.position && state.position.side === 'long') {
              const totalShares = state.position.shares + fillShares;
              const totalCostBasis = state.position.avgPrice * state.position.shares + order.limitPrice * fillShares;
              state.position.avgPrice = Math.round((totalCostBasis / totalShares) * 100) / 100;
              state.position.shares = totalShares;
            } else {
              state.position = {
                side: 'long',
                shares: fillShares,
                avgPrice: order.limitPrice,
                entryIndex: candle.index,
                stopLoss: null
              };
              // Apply stop loss from input
              const stopInput = document.getElementById('ttStopLoss');
              if (stopInput && stopInput.value) {
                const stopPrice = parseFloat(stopInput.value);
                if (!isNaN(stopPrice) && stopPrice > 0 && stopPrice < order.limitPrice) {
                  state.position.stopLoss = stopPrice;
                }
              }
            }
            showToast(`Limit BUY filled: ${fillShares} @ $${order.limitPrice.toFixed(2)}`, 'success');
            filled = true;
          }
          toRemove.push(i);
        } else if (order.side === 'sell' && candle.high >= order.limitPrice) {
          // Fill sell limit
          if (state.position && state.position.side === 'long') {
            const fillShares = Math.min(order.shares, state.position.shares);
            const commission = Math.max(1, Math.round(fillShares * 0.005 * 100) / 100);
            const proceeds = fillShares * order.limitPrice - commission;
            state.cash += proceeds;

            const tradePnL = (order.limitPrice - state.position.avgPrice) * fillShares - commission;
            state.trades.push({
              side: 'long',
              entry: state.position.avgPrice,
              exit: order.limitPrice,
              shares: fillShares,
              pnl: Math.round(tradePnL * 100) / 100,
              entryIndex: state.position.entryIndex,
              exitIndex: candle.index,
              commission,
              holdingCandles: candle.index - state.position.entryIndex
            });

            if (fillShares >= state.position.shares) {
              state.position = null;
            } else {
              state.position.shares -= fillShares;
            }

            showToast(`Limit SELL filled: ${fillShares} @ $${order.limitPrice.toFixed(2)}`, 'success');
            filled = true;
          }
          toRemove.push(i);
        }
      }

      // Remove filled/expired orders in reverse
      for (let i = toRemove.length - 1; i >= 0; i--) {
        state.pendingOrders.splice(toRemove[i], 1);
      }
      if (toRemove.length > 0) tt.renderPendingOrders();
    },

    checkStopLoss(candle, tt) {
      const state = tt.state;
      if (!state.position || !state.position.stopLoss) return;

      if (state.position.side === 'long' && candle.low <= state.position.stopLoss) {
        const slippage = this.getSlippage(state, state.position.shares, true);
        const fillPrice = Math.round((state.position.stopLoss - slippage) * 100) / 100;
        const shares = state.position.shares;
        const commission = Math.max(1, Math.round(shares * 0.005 * 100) / 100);
        const proceeds = shares * fillPrice - commission;
        state.cash += proceeds;

        const tradePnL = (fillPrice - state.position.avgPrice) * shares - commission;
        state.trades.push({
          side: 'long',
          entry: state.position.avgPrice,
          exit: fillPrice,
          shares,
          pnl: Math.round(tradePnL * 100) / 100,
          entryIndex: state.position.entryIndex,
          exitIndex: candle.index,
          commission,
          holdingCandles: candle.index - state.position.entryIndex,
          stoppedOut: true
        });

        state.position = null;
        showToast(`STOP LOSS hit: Sold ${shares} @ $${fillPrice.toFixed(2)} (slippage: $${slippage.toFixed(2)})`, 'error');
        tt.updateStats();
        tt.draw();
      }
    },

    closePosition(tt) {
      const state = tt.state;
      if (!state.position) {
        showToast('No position to close', 'error');
        return;
      }
      this.executeMarketOrder('sell', state.position.shares, tt);
    },

    cancelPendingOrder(orderId, tt) {
      const state = tt.state;
      const idx = state.pendingOrders.findIndex(o => o.id === orderId);
      if (idx > -1) {
        const order = state.pendingOrders[idx];
        state.pendingOrders.splice(idx, 1);
        showToast(`Cancelled: ${order.side.toUpperCase()} ${order.shares} @ $${order.limitPrice.toFixed(2)}`, 'success');
        tt.renderPendingOrders();
      }
    }
  },

  // ─── SCORE ENGINE ─────────────────────────────────────
  ScoreEngine: {
    calculate(state) {
      const risk = this.scoreRiskManagement(state);
      const quality = this.scoreTradeQuality(state);
      const discipline = this.scoreDiscipline(state);
      const performance = this.scorePerformance(state);

      const totalScore = Math.max(0, Math.min(100, risk.score + quality.score + discipline.score + performance.score));
      let grade;
      if (totalScore >= 90) grade = 'A+';
      else if (totalScore >= 80) grade = 'A';
      else if (totalScore >= 70) grade = 'B';
      else if (totalScore >= 60) grade = 'C';
      else if (totalScore >= 50) grade = 'D';
      else grade = 'F';

      const feedback = this.generateFeedback({ risk, quality, discipline, performance }, state);

      return {
        riskManagement: risk,
        tradeQuality: quality,
        discipline,
        performance,
        totalScore,
        grade,
        feedback
      };
    },

    scoreRiskManagement(state) {
      let score = 25;
      const details = [];
      const trades = state.trades;

      if (trades.length === 0) {
        return { score: 5, details: ['No trades taken — cannot assess risk management'] };
      }

      // Position sizing: max position value / starting cash
      let maxPosValue = 0;
      for (const t of trades) {
        const posVal = t.shares * t.entry;
        if (posVal > maxPosValue) maxPosValue = posVal;
      }
      const posRatio = maxPosValue / state.startingCash;
      if (posRatio > 0.5) {
        score -= 8;
        details.push(`Position sizing too large: ${(posRatio * 100).toFixed(0)}% of account in one trade`);
      } else if (posRatio > 0.3) {
        score -= 3;
        details.push(`Position sizing moderate: ${(posRatio * 100).toFixed(0)}% of account in one trade`);
      } else {
        details.push(`Good position sizing: max ${(posRatio * 100).toFixed(0)}% of account`);
      }

      // Max drawdown
      const ddPct = state.maxDrawdown / state.startingCash;
      if (ddPct > 0.10) {
        score -= 8;
        details.push(`Drawdown too high: ${(ddPct * 100).toFixed(1)}% (max 10% recommended)`);
      } else if (ddPct > 0.05) {
        score -= 3;
        details.push(`Moderate drawdown: ${(ddPct * 100).toFixed(1)}%`);
      } else {
        details.push(`Well controlled drawdown: ${(ddPct * 100).toFixed(1)}%`);
      }

      // Largest single loss
      const losses = trades.filter(t => t.pnl < 0);
      if (losses.length > 0) {
        const maxLoss = Math.max(...losses.map(t => Math.abs(t.pnl)));
        const maxLossPct = maxLoss / state.startingCash;
        if (maxLossPct > 0.03) {
          score -= 5;
          details.push(`Largest single loss $${maxLoss.toFixed(2)} (${(maxLossPct * 100).toFixed(1)}% of account) — too large`);
        }
      }

      // Average holding time for losers
      if (losses.length > 0) {
        const avgHold = losses.reduce((s, t) => s + (t.holdingCandles || 0), 0) / losses.length;
        if (avgHold > 15) {
          score -= 4;
          details.push(`Losing trades held too long: avg ${avgHold.toFixed(0)} candles — use stop losses`);
        }
      }

      // Bonus for stop loss usage
      const stoppedTrades = trades.filter(t => t.stoppedOut);
      if (stoppedTrades.length > 0 && stoppedTrades.length / trades.length > 0.5) {
        score += 3;
        details.push('Bonus: Stop losses used on majority of trades');
      }

      score = Math.max(0, Math.min(25, score));
      return { score, details };
    },

    scoreTradeQuality(state) {
      let score = 25;
      const details = [];
      const trades = state.trades;

      if (trades.length === 0) {
        return { score: 0, details: ['No trades taken — cannot assess trade quality'] };
      }

      // Win rate
      const wins = trades.filter(t => t.pnl > 0);
      const winRate = wins.length / trades.length;
      if (winRate < 0.3) {
        score -= 10;
        details.push(`Low win rate: ${(winRate * 100).toFixed(0)}% (below 30%)`);
      } else if (winRate < 0.5) {
        score -= 4;
        details.push(`Win rate: ${(winRate * 100).toFixed(0)}% — room for improvement`);
      } else {
        details.push(`Solid win rate: ${(winRate * 100).toFixed(0)}%`);
      }

      // R:R ratio (avg win / avg loss)
      const losses = trades.filter(t => t.pnl <= 0);
      if (wins.length > 0 && losses.length > 0) {
        const avgWin = wins.reduce((s, t) => s + t.pnl, 0) / wins.length;
        const avgLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length);
        const rr = avgLoss > 0 ? avgWin / avgLoss : 999;
        if (rr < 1.0) {
          score -= 8;
          details.push(`Poor risk/reward ratio: ${rr.toFixed(2)}:1 (average win $${avgWin.toFixed(2)} vs average loss $${avgLoss.toFixed(2)})`);
        } else if (rr < 1.5) {
          score -= 3;
          details.push(`Moderate R:R ratio: ${rr.toFixed(2)}:1`);
        } else {
          details.push(`Strong R:R ratio: ${rr.toFixed(2)}:1`);
        }
      }

      // Entry timing: did price move favorably within 3 candles?
      let goodEntries = 0;
      for (const t of trades) {
        const entryIdx = t.entryIndex;
        const lookAhead = Math.min(entryIdx + 3, state.candles.length - 1);
        let favorable = false;
        for (let i = entryIdx + 1; i <= lookAhead; i++) {
          if (state.candles[i]) {
            if (t.side === 'long' && state.candles[i].close > t.entry) {
              favorable = true;
              break;
            }
          }
        }
        if (favorable) goodEntries++;
      }
      const entryQuality = trades.length > 0 ? goodEntries / trades.length : 0;
      if (entryQuality < 0.4) {
        score -= 5;
        details.push(`Poor entry timing: only ${(entryQuality * 100).toFixed(0)}% of entries showed immediate favorable movement`);
      } else {
        details.push(`Entry timing: ${(entryQuality * 100).toFixed(0)}% showed favorable movement within 3 candles`);
      }

      // "Bought the top" detection
      let boughtTopCount = 0;
      for (const t of trades) {
        const lookBack = Math.max(0, t.entryIndex - 5);
        if (t.entryIndex >= 5 && state.candles[lookBack] && state.candles[t.entryIndex]) {
          const moveRange = state.candles[t.entryIndex].close - state.candles[lookBack].close;
          const direction = moveRange > 0 ? 1 : -1;
          if (direction === 1 && Math.abs(moveRange) > 0) {
            // Check if entered after 80% of the move
            const highInRange = Math.max(...state.candles.slice(lookBack, t.entryIndex + 1).map(c => c.high));
            const lowInRange = Math.min(...state.candles.slice(lookBack, t.entryIndex + 1).map(c => c.low));
            const totalMove = highInRange - lowInRange;
            if (totalMove > 0 && (t.entry - lowInRange) / totalMove > 0.8) {
              boughtTopCount++;
            }
          }
        }
      }
      if (boughtTopCount > 0) {
        details.push(`Bought the top ${boughtTopCount} time(s) — entered after 80%+ of a directional move`);
        score -= Math.min(5, boughtTopCount * 2);
      }

      score = Math.max(0, Math.min(25, score));
      return { score, details };
    },

    scoreDiscipline(state) {
      let score = 25;
      const details = [];
      const trades = state.trades;
      const scaledThreshold = Math.round(15 * state.totalCandles / 150);
      const scaledModerate = Math.round(10 * state.totalCandles / 150);

      if (trades.length === 0) {
        score -= 15;
        details.push('No trades taken — practice executing your plan');
        return { score: Math.max(0, score), details };
      }

      // Over-trading
      if (trades.length > scaledThreshold) {
        score -= 10;
        details.push(`Over-trading: ${trades.length} trades in session (max recommended: ${scaledThreshold})`);
      } else if (trades.length > scaledModerate) {
        score -= 5;
        details.push(`Moderate trade frequency: ${trades.length} trades`);
      } else {
        details.push(`Good trade frequency: ${trades.length} trades`);
      }

      // Revenge trading: 2 consecutive losses within 5 candles
      let revengeCount = 0;
      for (let i = 1; i < trades.length; i++) {
        if (trades[i].pnl < 0 && trades[i - 1].pnl < 0) {
          const gap = trades[i].entryIndex - trades[i - 1].exitIndex;
          if (gap <= 5) {
            revengeCount++;
          }
        }
      }
      if (revengeCount > 0) {
        const penalty = Math.min(12, revengeCount * 3);
        score -= penalty;
        details.push(`Revenge trading detected: ${revengeCount} instance(s) of back-to-back losses within 5 candles`);
      }

      // Trading during CHOPPY phase
      let choppyTrades = 0;
      for (const t of trades) {
        if (t.entryIndex < state.phaseLog.length && state.phaseLog[t.entryIndex] === 'CHOPPY') {
          choppyTrades++;
        }
      }
      if (choppyTrades > 0) {
        const penalty = Math.min(8, choppyTrades * 2);
        score -= penalty;
        details.push(`Traded during choppy/low-volatility phase: ${choppyTrades} time(s) — avoid range-bound markets`);
      }

      // Took profits too early
      let earlyProfitCount = 0;
      for (const t of trades) {
        if (t.pnl > 0) {
          const gainPct = (t.exit - t.entry) / t.entry;
          if (gainPct < 0.005 && t.exitIndex < state.candles.length - 1) {
            // Check if price continued > 1% after exit
            const lookAhead = Math.min(t.exitIndex + 5, state.candles.length - 1);
            for (let i = t.exitIndex + 1; i <= lookAhead; i++) {
              if (state.candles[i]) {
                const continuedGain = (state.candles[i].high - t.exit) / t.exit;
                if (continuedGain > 0.01) {
                  earlyProfitCount++;
                  break;
                }
              }
            }
          }
        }
      }
      if (earlyProfitCount > 0) {
        details.push(`Took profits too early ${earlyProfitCount} time(s): sold for <0.5% gain when price continued >1%`);
        score -= Math.min(5, earlyProfitCount * 2);
      }

      score = Math.max(0, Math.min(25, score));
      return { score, details };
    },

    scorePerformance(state) {
      let score = 0;
      const details = [];
      const trades = state.trades;

      // Calculate final equity
      const equity = state.cash + (state.position ? state.position.shares * state.candles[state.candles.length - 1].close : 0);
      const returnPct = (equity - state.startingCash) / state.startingCash;

      if (returnPct > 0.02) {
        score = 25;
        details.push(`Excellent return: +${(returnPct * 100).toFixed(2)}%`);
      } else if (returnPct > 0.01) {
        score = 20;
        details.push(`Good return: +${(returnPct * 100).toFixed(2)}%`);
      } else if (returnPct > 0) {
        score = 15;
        details.push(`Positive return: +${(returnPct * 100).toFixed(2)}%`);
      } else if (returnPct > -0.01) {
        score = 10;
        details.push(`Small loss: ${(returnPct * 100).toFixed(2)}%`);
      } else if (returnPct > -0.03) {
        score = 5;
        details.push(`Moderate loss: ${(returnPct * 100).toFixed(2)}%`);
      } else {
        score = 0;
        details.push(`Large loss: ${(returnPct * 100).toFixed(2)}%`);
      }

      // Sharpe-like ratio bonus from equity history
      if (state.equityHistory.length > 5) {
        const returns = [];
        for (let i = 1; i < state.equityHistory.length; i++) {
          returns.push((state.equityHistory[i] - state.equityHistory[i - 1]) / state.equityHistory[i - 1]);
        }
        const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
        const variance = returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const std = Math.sqrt(variance);
        const sharpe = std > 0 ? avgReturn / std : 0;
        if (sharpe > 0.5) {
          score += 3;
          details.push(`Bonus: Consistent returns (Sharpe-like ratio: ${sharpe.toFixed(2)})`);
        }
      }

      // Commission drag
      if (trades.length > 0) {
        const totalCommissions = trades.reduce((s, t) => s + (t.commission || 0), 0);
        const grossProfits = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
        if (grossProfits > 0 && totalCommissions / grossProfits > 0.2) {
          score -= 3;
          details.push(`High commission drag: $${totalCommissions.toFixed(2)} in commissions (${(totalCommissions / grossProfits * 100).toFixed(0)}% of gross profits)`);
        }
      }

      score = Math.max(0, Math.min(25, score));
      return { score, details };
    },

    generateFeedback(results, state) {
      const categories = [
        { name: 'Risk Management', data: results.risk },
        { name: 'Trade Quality', data: results.quality },
        { name: 'Discipline', data: results.discipline },
        { name: 'Performance', data: results.performance }
      ];

      // Sort by score ascending (worst first)
      categories.sort((a, b) => a.data.score - b.data.score);

      const tips = [];
      const trades = state.trades;
      const equity = state.cash + (state.position ? state.position.shares * state.candles[state.candles.length - 1].close : 0);
      const returnPct = ((equity - state.startingCash) / state.startingCash * 100).toFixed(2);

      for (const cat of categories) {
        if (tips.length >= 3) break;
        if (cat.data.score < 20) {
          switch (cat.name) {
            case 'Risk Management':
              if (state.maxDrawdown / state.startingCash > 0.05) {
                tips.push(`Your max drawdown was ${(state.maxDrawdown / state.startingCash * 100).toFixed(1)}%. Set stop losses to limit each trade to 1-2% of your account.`);
              } else {
                tips.push('Focus on consistent position sizing. Keep each position under 30% of your account value.');
              }
              break;
            case 'Trade Quality':
              if (trades.length > 0) {
                const wins = trades.filter(t => t.pnl > 0).length;
                const wr = (wins / trades.length * 100).toFixed(0);
                tips.push(`Your win rate was ${wr}%. Wait for higher-probability setups near key support/resistance levels.`);
              }
              break;
            case 'Discipline':
              if (trades.length > Math.round(15 * state.totalCandles / 150)) {
                tips.push(`You took ${trades.length} trades. Reduce trade frequency — focus on 3-5 high-quality setups per session.`);
              } else if (trades.length === 0) {
                tips.push('You took no trades. Identify at least 2-3 clear setups and execute with defined risk.');
              } else {
                tips.push('Avoid trading during choppy consolidation. Wait for clean breakouts with volume confirmation.');
              }
              break;
            case 'Performance':
              tips.push(`Your return was ${returnPct}%. Focus on cutting losses quickly and letting winners run.`);
              break;
          }
        }
      }

      // Fill to 3 tips if needed
      while (tips.length < 3) {
        const generic = [
          'Always define your stop loss before entering a trade.',
          'Wait for volume confirmation before committing to a breakout.',
          'Review your trades after each session to identify recurring mistakes.'
        ];
        tips.push(generic[tips.length % generic.length]);
      }

      return tips.slice(0, 3);
    }
  },

  // ─── CHART RENDERER ───────────────────────────────────
  draw() {
    const { ctx } = this;
    if (!ctx || !this.state) return;

    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    const s = this.state;
    if (s.candles.length === 0) return;

    const visibleCount = 60;
    const startIdx = Math.max(0, s.candles.length - visibleCount);
    const endIdx = s.candles.length;
    const visible = s.candles.slice(startIdx, endIdx);

    const padding = { top: 15, right: 60, bottom: 35, left: 55 };
    const volumeHeight = (h - padding.top - padding.bottom) * 0.2;
    const chartH = h - padding.top - padding.bottom - volumeHeight;
    const chartW = w - padding.left - padding.right;

    // Price range
    const allPrices = visible.flatMap(d => [d.high, d.low]);
    if (s.vwap) allPrices.push(s.vwap);
    if (s.position && s.position.stopLoss) allPrices.push(s.position.stopLoss);
    const minPrice = Math.min(...allPrices) - 0.5;
    const maxPrice = Math.max(...allPrices) + 0.5;
    const range = maxPrice - minPrice || 1;

    // Volume range
    const maxVolume = Math.max(...visible.map(d => d.volume), 1);

    const gap = chartW / visibleCount;
    const candleW = Math.max(2, gap * 0.6);

    const toY = (p) => padding.top + (1 - (p - minPrice) / range) * chartH;
    const toX = (i) => padding.left + i * gap + gap / 2;
    const toVolY = (v) => padding.top + chartH + volumeHeight * (1 - v / maxVolume);

    // Grid lines with price labels
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      const price = maxPrice - (range / gridLines) * i;
      ctx.fillStyle = '#475569';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('$' + price.toFixed(2), padding.left - 6, y + 3);
    }

    // Volume bars
    visible.forEach((d, i) => {
      const x = toX(i);
      const bullish = d.close >= d.open;
      const volH = (d.volume / maxVolume) * volumeHeight;
      ctx.fillStyle = bullish ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)';
      ctx.fillRect(x - candleW / 2, padding.top + chartH + volumeHeight - volH, candleW, volH);
    });

    // News event vertical lines
    for (const news of s.newsEvents) {
      if (news.index >= startIdx && news.index < endIdx) {
        const i = news.index - startIdx;
        const x = toX(i);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartH + volumeHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Small "N" marker
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('N', x, padding.top - 3);
      }
    }

    // Candlesticks
    visible.forEach((d, i) => {
      const x = toX(i);
      const bullish = d.close >= d.open;

      // Wick
      ctx.strokeStyle = bullish ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(d.high));
      ctx.lineTo(x, toY(d.low));
      ctx.stroke();

      // Body
      ctx.fillStyle = bullish ? '#10b981' : '#ef4444';
      const bodyTop = Math.min(toY(d.open), toY(d.close));
      const bodyH = Math.max(Math.abs(toY(d.close) - toY(d.open)), 1);
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
    });

    // VWAP line (blue, dashed)
    if (s.vwap && visible.length > 1) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      const vwapY = toY(s.vwap);
      if (vwapY >= padding.top && vwapY <= padding.top + chartH) {
        ctx.beginPath();
        ctx.moveTo(padding.left, vwapY);
        ctx.lineTo(w - padding.right, vwapY);
        ctx.stroke();

        ctx.fillStyle = '#3b82f6';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('VWAP', padding.left + 4, vwapY - 4);
      }
      ctx.setLineDash([]);
    }

    // Trade entry markers (blue up arrow) and exit markers (green/red down arrow)
    for (const trade of s.trades) {
      if (trade.entryIndex >= startIdx && trade.entryIndex < endIdx) {
        const i = trade.entryIndex - startIdx;
        const x = toX(i);
        const y = toY(trade.entry);
        ctx.fillStyle = '#3b82f6';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('\u25B2', x, y + 16);
      }
      if (trade.exitIndex >= startIdx && trade.exitIndex < endIdx) {
        const i = trade.exitIndex - startIdx;
        const x = toX(i);
        const y = toY(trade.exit);
        ctx.fillStyle = trade.pnl >= 0 ? '#10b981' : '#ef4444';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('\u25BC', x, y - 8);
      }
    }

    // Entry price dashed line for open position
    if (s.position) {
      const entryY = toY(s.position.avgPrice);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, entryY);
      ctx.lineTo(w - padding.right, entryY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ENTRY $' + s.position.avgPrice.toFixed(2), padding.left + 4, entryY - 5);

      // Stop-loss line (red dashed)
      if (s.position.stopLoss) {
        const slY = toY(s.position.stopLoss);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, slY);
        ctx.lineTo(w - padding.right, slY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('STOP $' + s.position.stopLoss.toFixed(2), padding.left + 4, slY - 5);
      }
    }

    // Current price tag (gold rectangle on right edge)
    const lastCandle = visible[visible.length - 1];
    if (lastCandle) {
      const y = toY(lastCandle.close);

      // Dashed line to tag
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(w - padding.right - 40, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price tag
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(w - padding.right, y - 9, 55, 18);
      ctx.fillStyle = '#0a0e17';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(lastCandle.close.toFixed(2), w - padding.right + 4, y + 4);
    }
  },

  // ─── TIMER ─────────────────────────────────────────────
  tickTimer() {
    if (!this.state || !this.state.startTime) return;
    const elapsed = (Date.now() - this.state.startTime) / 1000;
    this.state.timeRemaining = Math.max(0, this.state.totalDuration - elapsed);
    this.updateTimerDisplay();
    if (this.state.timeRemaining <= 0) this.endTest();
  },

  updateTimerDisplay() {
    const el = document.getElementById('ttTimer');
    if (!el) return;
    const t = Math.ceil(this.state.timeRemaining);
    const min = Math.floor(t / 60);
    const sec = t % 60;
    el.textContent = String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');

    if (t <= 60) {
      el.classList.add('tt-timer-pulse');
    } else {
      el.classList.remove('tt-timer-pulse');
    }
  },

  // ─── UI METHODS ────────────────────────────────────────
  init() {
    this.canvas = document.getElementById('ttChart');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.resize();
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);

    this.bindEvents();
    this.showStartScreen();
    this.loadBestScores();
  },

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.candleInterval) {
      clearInterval(this.candleInterval);
      this.candleInterval = null;
    }
    for (const t of this.pendingTimeouts) {
      clearTimeout(t);
    }
    this.pendingTimeouts = [];
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    // Clear debounce timers
    for (const key in this.debounceTimers) {
      clearTimeout(this.debounceTimers[key]);
    }
    this.debounceTimers = {};
    this.state = null;
    this.OrderEngine.orderPending = false;
  },

  resize() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parseInt(this.canvas.dataset.height) || 400;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.width = w;
    this.height = h;
    if (this.state && this.state.candles.length > 0) {
      this.draw();
    }
  },

  bindEvents() {
    // Buy button
    const buyBtn = document.getElementById('ttBuyBtn');
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        if (this.debounceTimers.buy) return;
        this.debounceTimers.buy = setTimeout(() => { delete this.debounceTimers.buy; }, 300);
        this.handleBuy();
      });
    }

    // Sell button
    const sellBtn = document.getElementById('ttSellBtn');
    if (sellBtn) {
      sellBtn.addEventListener('click', () => {
        if (this.debounceTimers.sell) return;
        this.debounceTimers.sell = setTimeout(() => { delete this.debounceTimers.sell; }, 300);
        this.handleSell();
      });
    }

    // Close position button
    const closeBtn = document.getElementById('ttCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (this.debounceTimers.close) return;
        this.debounceTimers.close = setTimeout(() => { delete this.debounceTimers.close; }, 300);
        this.OrderEngine.closePosition(this);
      });
    }

    // Order type tabs (HTML uses data-type attribute)
    const orderTabs = document.querySelectorAll('.tt-order-tab');
    orderTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const type = tab.dataset.type;
        if (this.state) this.state.orderType = type;
        orderTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const limitGroup = document.querySelector('.tt-limit-group');
        if (limitGroup) limitGroup.style.display = type === 'limit' ? 'block' : 'none';
      });
    });

    // Quick size buttons
    const sizeButtons = document.querySelectorAll('[data-pct]');
    sizeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.state) return;
        const pct = parseInt(btn.dataset.pct) / 100;
        const lastCandle = this.state.candles[this.state.candles.length - 1];
        if (!lastCandle) return;
        const maxShares = Math.floor((this.state.cash * pct) / lastCandle.close);
        const input = document.getElementById('ttShares');
        if (input) input.value = Math.max(1, maxShares);
      });
    });

    // Retry button
    const retryBtn = document.getElementById('ttRetryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.restart());
    }

    // Start button
    const startBtn = document.getElementById('ttStartBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startTest());
    }
  },

  handleBuy() {
    if (!this.state || !this.state.running) return;
    const sharesInput = document.getElementById('ttShares');
    const shares = parseInt(sharesInput?.value) || 100;

    if (this.state.orderType === 'market') {
      this.OrderEngine.executeMarketOrder('buy', shares, this);
    } else {
      const limitInput = document.getElementById('ttLimitPrice');
      const limitPrice = parseFloat(limitInput?.value);
      if (isNaN(limitPrice) || limitPrice <= 0) {
        showToast('Enter a valid limit price', 'error');
        return;
      }
      this.OrderEngine.placeLimitOrder('buy', shares, limitPrice, this);
    }
  },

  handleSell() {
    if (!this.state || !this.state.running) return;
    const sharesInput = document.getElementById('ttShares');
    const shares = parseInt(sharesInput?.value) || (this.state.position ? this.state.position.shares : 100);

    if (this.state.orderType === 'market') {
      this.OrderEngine.executeMarketOrder('sell', shares, this);
    } else {
      const limitInput = document.getElementById('ttLimitPrice');
      const limitPrice = parseFloat(limitInput?.value);
      if (isNaN(limitPrice) || limitPrice <= 0) {
        showToast('Enter a valid limit price', 'error');
        return;
      }
      this.OrderEngine.placeLimitOrder('sell', shares, limitPrice, this);
    }
  },

  setButtonsState(disabled) {
    const buyBtn = document.getElementById('ttBuyBtn');
    const sellBtn = document.getElementById('ttSellBtn');
    const closeBtn = document.getElementById('ttCloseBtn');
    if (buyBtn) {
      buyBtn.disabled = disabled;
      buyBtn.textContent = disabled ? 'Order Pending...' : 'BUY';
    }
    if (sellBtn) {
      sellBtn.disabled = disabled;
      sellBtn.textContent = disabled ? 'Order Pending...' : 'SELL';
    }
    if (closeBtn) closeBtn.disabled = disabled;
  },

  showStartScreen() {
    const screen = document.getElementById('ttStartScreen');
    if (screen) screen.style.display = 'block';
    const tradingUi = document.getElementById('ttTradingUi');
    if (tradingUi) tradingUi.style.display = 'none';
    const results = document.getElementById('ttResultsScreen');
    if (results) results.style.display = 'none';
  },

  hideStartScreen() {
    const screen = document.getElementById('ttStartScreen');
    if (screen) screen.style.display = 'none';
    const tradingUi = document.getElementById('ttTradingUi');
    if (tradingUi) tradingUi.style.display = '';
  },

  startTest() {
    const durationSelect = document.getElementById('ttDuration');
    const minutes = durationSelect ? parseInt(durationSelect.value) || 5 : 5;

    const config = this.getDurationConfig(minutes);
    this.state = this.getDefaultState();
    this.state.duration = minutes;
    this.state.totalDuration = minutes * 60;
    this.state.timeRemaining = minutes * 60;
    this.state.totalCandles = config.candles;
    this.state.candleSpeed = config.speed;

    // Random stock context
    const ticker = this.TICKERS[Math.floor(Math.random() * this.TICKERS.length)];
    const catalyst = this.CATALYSTS[Math.floor(Math.random() * this.CATALYSTS.length)];
    this.state.ticker = ticker;
    this.state.catalyst = catalyst.text;

    // Generate starting price (typical mid-cap range)
    const basePrice = 20 + Math.random() * 180; // $20-$200
    this.state.previousClose = Math.round(basePrice * 100) / 100;

    // Opening direction from catalyst
    this.state.openingDirection = catalyst.gapDir || (Math.random() > 0.5 ? 1 : -1);

    // Gap from previous close
    const gapPct = catalyst.gapSize[0] + Math.random() * (catalyst.gapSize[1] - catalyst.gapSize[0]);
    const gapPrice = this.state.previousClose * (1 + (gapPct / 100) * this.state.openingDirection);
    this.state.previousClose = Math.round(this.state.previousClose * 100) / 100;

    // Base volatility and volume
    this.state.baseVolatility = this.state.previousClose * 0.003; // ~0.3% per candle
    this.state.baseVolume = 100000 + Math.floor(Math.random() * 400000);
    this.state.dailyATRBound = 0.025; // 2.5%
    this.state.sessionHigh = gapPrice;
    this.state.sessionLow = gapPrice;

    // Generate phases
    this.state.phases = this.MarketEngine.generatePhases(this.state.totalCandles);

    // Schedule news events
    this.state.newsSchedule = this.MarketEngine.scheduleNews(this.state.totalCandles, this.NEWS_MESSAGES);

    // Set first candle's "previous close" to the gap price
    const firstPrevClose = this.state.previousClose;
    this.state.previousClose = Math.round(gapPrice * 100) / 100;

    // Update context display
    const tickerEl = document.getElementById('ttTicker');
    if (tickerEl) tickerEl.textContent = ticker;
    const catalystEl = document.getElementById('ttCatalyst');
    if (catalystEl) catalystEl.textContent = catalyst.text;
    const prevCloseEl = document.getElementById('ttPrevClose');
    if (prevCloseEl) prevCloseEl.textContent = '$' + firstPrevClose.toFixed(2);

    this.hideStartScreen();
    this.resize();
    this.state.running = true;
    this.state.startTime = Date.now();

    // Generate initial context candles (5 candles to give some visual)
    for (let i = 0; i < 5; i++) {
      const candle = this.MarketEngine.generateNextCandle(this.state, this);
      this.state.candles.push(candle);
      this.updateEquityHistory();
    }

    this.draw();
    this.updateStats();
    this.updateTimerDisplay();

    // Start intervals
    this.timerInterval = setInterval(() => this.tickTimer(), 1000);
    this.candleInterval = setInterval(() => {
      if (!this.state || !this.state.running) return;
      if (this.state.candles.length >= this.state.totalCandles) {
        this.endTest();
        return;
      }

      const candle = this.MarketEngine.generateNextCandle(this.state, this);
      this.state.candles.push(candle);

      // Check pending orders and stop losses
      this.OrderEngine.checkPendingOrders(candle, this);
      this.OrderEngine.checkStopLoss(candle, this);

      // Update equity history
      this.updateEquityHistory();

      this.draw();
      this.updateStats();
    }, this.state.candleSpeed);
  },

  updateEquityHistory() {
    if (!this.state || this.state.candles.length === 0) return;
    const lastCandle = this.state.candles[this.state.candles.length - 1];
    const equity = this.state.cash +
      (this.state.position ? this.state.position.shares * lastCandle.close : 0);

    this.state.equityHistory.push(equity);

    if (equity > this.state.maxEquity) {
      this.state.maxEquity = equity;
    }
    const drawdown = this.state.maxEquity - equity;
    if (drawdown > this.state.maxDrawdown) {
      this.state.maxDrawdown = drawdown;
    }
  },

  endTest() {
    if (!this.state) return;
    this.state.running = false;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.candleInterval) {
      clearInterval(this.candleInterval);
      this.candleInterval = null;
    }

    // Force close any open position
    if (this.state.position) {
      const lastCandle = this.state.candles[this.state.candles.length - 1];
      if (lastCandle) {
        const shares = this.state.position.shares;
        const fillPrice = lastCandle.close;
        const commission = Math.max(1, Math.round(shares * 0.005 * 100) / 100);
        const proceeds = shares * fillPrice - commission;
        this.state.cash += proceeds;

        const tradePnL = (fillPrice - this.state.position.avgPrice) * shares - commission;
        this.state.trades.push({
          side: 'long',
          entry: this.state.position.avgPrice,
          exit: fillPrice,
          shares,
          pnl: Math.round(tradePnL * 100) / 100,
          entryIndex: this.state.position.entryIndex,
          exitIndex: lastCandle.index,
          commission,
          holdingCandles: lastCandle.index - this.state.position.entryIndex
        });
        this.state.position = null;
      }
    }

    // Calculate score
    const results = this.ScoreEngine.calculate(this.state);
    this.saveBestScore(results.totalScore);
    this.showResults(results);
  },

  updateStats() {
    if (!this.state) return;
    const s = this.state;
    const lastCandle = s.candles[s.candles.length - 1];
    if (!lastCandle) return;

    const currentPrice = lastCandle.close;
    const totalValue = s.position ? s.cash + s.position.shares * currentPrice : s.cash;
    const totalPnL = totalValue - s.startingCash;

    this.setStat('ttPrice', '$' + currentPrice.toFixed(2));
    this.setStat('ttPnl', (totalPnL >= 0 ? '+' : '') + '$' + totalPnL.toFixed(2), totalPnL >= 0 ? '#10b981' : '#ef4444');
    this.setStat('ttCash', '$' + s.cash.toFixed(2));
    this.setStat('ttEquity', '$' + totalValue.toFixed(2));
    this.setStat('ttBid', '$' + s.currentBid.toFixed(2));
    this.setStat('ttAsk', '$' + s.currentAsk.toFixed(2));
    this.setStat('ttSpread', '$' + (s.currentAsk - s.currentBid).toFixed(2));
    this.setStat('ttVWAP', '$' + s.vwap.toFixed(2));
    this.setStat('ttTradeCount', s.trades.length.toString());

    // Position info
    const posSection = document.getElementById('ttPositionSection');
    if (posSection) {
      if (s.position) {
        posSection.style.display = '';
        const unrealized = (currentPrice - s.position.avgPrice) * s.position.shares;
        const perShare = currentPrice - s.position.avgPrice;
        this.setStat('ttPosShares', s.position.shares.toString());
        this.setStat('ttPosAvg', '$' + s.position.avgPrice.toFixed(2));
        this.setStat('ttPosPerShare', (perShare >= 0 ? '+' : '') + '$' + perShare.toFixed(2), perShare >= 0 ? '#10b981' : '#ef4444');
        this.setStat('ttPosPnl', (unrealized >= 0 ? '+' : '') + '$' + unrealized.toFixed(2), unrealized >= 0 ? '#10b981' : '#ef4444');
      } else {
        posSection.style.display = 'none';
      }
    }

    // Pending orders section visibility
    const pendingSection = document.getElementById('ttPendingSection');
    if (pendingSection) {
      pendingSection.style.display = s.pendingOrders.length > 0 ? '' : 'none';
    }

    // Price change from previous close
    const changePct = ((currentPrice - s.previousClose) / s.previousClose * 100).toFixed(2);
    const changeSign = changePct >= 0 ? '+' : '';
    this.setStat('ttChange', changeSign + changePct + '%', changePct >= 0 ? '#10b981' : '#ef4444');
    const changeEl = document.getElementById('ttChange');
    if (changeEl) {
      const isUp = parseFloat(changePct) >= 0;
      changeEl.classList.toggle('up', isUp);
      changeEl.classList.toggle('down', !isUp);
    }

    // Session clock: map candle index to simulated market time (9:30 AM - 4:00 PM)
    const sessionMinutes = 390; // 6.5 hours
    const candleProgress = s.candles.length / s.totalCandles;
    const elapsedMinutes = Math.floor(candleProgress * sessionMinutes);
    const clockHour = Math.floor((570 + elapsedMinutes) / 60); // 570 = 9:30
    const clockMin = (570 + elapsedMinutes) % 60;
    const ampm = clockHour >= 12 ? 'PM' : 'AM';
    const displayHour = clockHour > 12 ? clockHour - 12 : clockHour;
    this.setStat('ttSessionClock', displayHour + ':' + String(clockMin).padStart(2, '0') + ' ' + ampm);

    // Update trade log during session
    this.updateTradeLog();

    // Volume
    this.setStat('ttVolume', this.formatVolume(lastCandle.volume));
  },

  setStat(id, value, color) {
    const el = document.getElementById(id);
    if (el) {
      if (typeof value === 'string' && !value.includes('<')) {
        el.textContent = value;
      } else {
        el.innerHTML = value;
      }
      if (color) el.style.color = color;
    }
  },

  formatVolume(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
    return v.toString();
  },

  showNewsEvent(text) {
    const ticker = document.getElementById('ttNewsTicker');
    const textEl = document.getElementById('ttNewsText');
    if (!ticker) return;
    if (textEl) textEl.textContent = text;
    ticker.classList.remove('tt-news-animate');
    void ticker.offsetWidth; // force reflow
    ticker.classList.add('tt-news-animate');
    ticker.style.display = 'flex';

    const timeoutId = setTimeout(() => {
      ticker.style.display = 'none';
      const idx = this.pendingTimeouts.indexOf(timeoutId);
      if (idx > -1) this.pendingTimeouts.splice(idx, 1);
    }, 5000);
    this.pendingTimeouts.push(timeoutId);
  },

  updateTradeLog() {
    const el = document.getElementById('ttTradeLog');
    if (!el || !this.state) return;
    const trades = this.state.trades;
    if (trades.length === 0) {
      el.innerHTML = '<div class="tt-log-empty">No trades yet</div>';
      return;
    }
    el.innerHTML = trades.map((t, i) => {
      const sign = t.pnl >= 0 ? '+' : '';
      const color = t.pnl >= 0 ? '#10b981' : '#ef4444';
      return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e293b;font-size:0.78rem">
        <span style="color:#94a3b8">#${i + 1} ${t.side.toUpperCase()}</span>
        <span style="color:#94a3b8">${t.shares}sh @ $${t.entry.toFixed(2)} -> $${t.exit.toFixed(2)}</span>
        <span style="color:${color};font-weight:600">${sign}$${t.pnl.toFixed(2)}</span>
      </div>`;
    }).join('');
  },

  renderPendingOrders() {
    const container = document.getElementById('ttPendingOrders');
    if (!container || !this.state) return;

    if (this.state.pendingOrders.length === 0) {
      container.innerHTML = '<span style="color:#64748b;font-size:0.8rem">No pending orders</span>';
      return;
    }

    container.innerHTML = this.state.pendingOrders.map(order => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #1e293b;font-size:0.8rem">
        <span style="color:${order.side === 'buy' ? '#10b981' : '#ef4444'}">${order.side.toUpperCase()} ${order.shares} @ $${order.limitPrice.toFixed(2)}</span>
        <button onclick="TradingTest.OrderEngine.cancelPendingOrder(${order.id}, TradingTest)" style="background:none;border:1px solid #475569;color:#ef4444;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:0.7rem">Cancel</button>
      </div>
    `).join('');
  },

  showResults(results) {
    // Hide trading UI, show results screen
    const tradingUi = document.getElementById('ttTradingUi');
    if (tradingUi) tradingUi.style.display = 'none';
    const resultsScreen = document.getElementById('ttResultsScreen');
    if (!resultsScreen) return;
    resultsScreen.style.display = 'block';

    const s = this.state;
    const finalEquity = s.cash;
    const totalReturn = finalEquity - s.startingCash;
    const returnPct = (totalReturn / s.startingCash * 100).toFixed(2);
    const wins = s.trades.filter(t => t.pnl > 0).length;
    const losses = s.trades.filter(t => t.pnl <= 0).length;
    const winRate = s.trades.length > 0 ? (wins / s.trades.length * 100).toFixed(1) : '0';

    const gradeColor = {
      'A+': '#10b981', 'A': '#10b981', 'B': '#3b82f6', 'C': '#f59e0b', 'D': '#f97316', 'F': '#ef4444'
    };
    const color = gradeColor[results.grade] || '#64748b';
    const pct = results.totalScore / 100;
    const circumference = 2 * Math.PI * 45;
    const dashOffset = circumference * (1 - pct);

    // Score circle SVG
    const scoreCircle = document.getElementById('ttScoreCircle');
    if (scoreCircle) {
      scoreCircle.innerHTML = `
        <svg width="120" height="120" viewBox="0 0 120 120" style="display:block;margin:0 auto">
          <circle cx="60" cy="60" r="45" fill="none" stroke="#1e293b" stroke-width="8"/>
          <circle cx="60" cy="60" r="45" fill="none" stroke="${color}" stroke-width="8"
            stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
            stroke-linecap="round" transform="rotate(-90 60 60)"
            style="transition:stroke-dashoffset 1s ease"/>
          <text x="60" y="52" text-anchor="middle" fill="${color}" font-size="28" font-weight="700">${results.grade}</text>
          <text x="60" y="74" text-anchor="middle" fill="#e2e8f0" font-size="14" font-weight="600">${results.totalScore}/100</text>
        </svg>
        <div style="text-align:center;color:#64748b;font-size:0.85rem;margin-top:0.5rem">${s.ticker} &mdash; ${s.catalyst}</div>
      `;
    }

    // Stats grid
    const statsEl = document.getElementById('ttResultsStats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;text-align:center">
          <div style="background:#1e293b;padding:0.75rem;border-radius:8px">
            <div style="color:#64748b;font-size:0.7rem;text-transform:uppercase">Return</div>
            <div style="color:${totalReturn >= 0 ? '#10b981' : '#ef4444'};font-size:1.1rem;font-weight:600;font-family:monospace">${totalReturn >= 0 ? '+' : ''}$${totalReturn.toFixed(2)}</div>
            <div style="color:${totalReturn >= 0 ? '#10b981' : '#ef4444'};font-size:0.8rem">${totalReturn >= 0 ? '+' : ''}${returnPct}%</div>
          </div>
          <div style="background:#1e293b;padding:0.75rem;border-radius:8px">
            <div style="color:#64748b;font-size:0.7rem;text-transform:uppercase">Trades</div>
            <div style="color:#e2e8f0;font-size:1.1rem;font-weight:600">${s.trades.length}</div>
            <div style="color:#64748b;font-size:0.8rem">${wins}W / ${losses}L</div>
          </div>
          <div style="background:#1e293b;padding:0.75rem;border-radius:8px">
            <div style="color:#64748b;font-size:0.7rem;text-transform:uppercase">Win Rate</div>
            <div style="color:#e2e8f0;font-size:1.1rem;font-weight:600">${winRate}%</div>
            <div style="color:#64748b;font-size:0.8rem">Max DD: $${s.maxDrawdown.toFixed(0)}</div>
          </div>
        </div>
      `;
    }

    // Category bars
    const categoriesEl = document.getElementById('ttResultsCategories');
    if (categoriesEl) {
      categoriesEl.innerHTML =
        this.renderScoreCategory('Risk Management', results.riskManagement, 25, '#ef4444') +
        this.renderScoreCategory('Trade Quality', results.tradeQuality, 25, '#3b82f6') +
        this.renderScoreCategory('Discipline', results.discipline, 25, '#f59e0b') +
        this.renderScoreCategory('Performance', results.performance, 25, '#10b981');
    }

    // Feedback tips
    const feedbackEl = document.getElementById('ttResultsFeedback');
    if (feedbackEl) {
      feedbackEl.innerHTML = `
        <div style="background:#1e293b;padding:1rem;border-radius:8px">
          <h4 style="color:#e2e8f0;margin-bottom:0.75rem;font-size:0.9rem">Top Tips for Improvement</h4>
          ${results.feedback.map((tip, i) => `
            <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;font-size:0.8rem;color:#94a3b8;line-height:1.4">
              <span style="color:#f59e0b;font-weight:700;flex-shrink:0">${i + 1}.</span>
              <span>${tip}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Trade log table
    const tradesEl = document.getElementById('ttResultsTrades');
    if (tradesEl) {
      if (s.trades.length === 0) {
        tradesEl.innerHTML = '<div style="color:#64748b;text-align:center;padding:1rem">No trades were executed</div>';
      } else {
        tradesEl.innerHTML = `
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
              <thead>
                <tr style="border-bottom:2px solid #1e293b;text-align:left;color:#64748b">
                  <th style="padding:6px 8px">#</th>
                  <th style="padding:6px 8px">Side</th>
                  <th style="padding:6px 8px">Shares</th>
                  <th style="padding:6px 8px">Entry</th>
                  <th style="padding:6px 8px">Exit</th>
                  <th style="padding:6px 8px">P&L</th>
                  <th style="padding:6px 8px">Candles</th>
                </tr>
              </thead>
              <tbody>
                ${s.trades.map((t, i) => {
                  const pnlColor = t.pnl >= 0 ? '#10b981' : '#ef4444';
                  const sign = t.pnl >= 0 ? '+' : '';
                  return `<tr style="border-bottom:1px solid #1e293b;color:#94a3b8">
                    <td style="padding:6px 8px">${i + 1}</td>
                    <td style="padding:6px 8px;color:${t.side === 'long' ? '#10b981' : '#ef4444'}">${t.side.toUpperCase()}</td>
                    <td style="padding:6px 8px">${t.shares}</td>
                    <td style="padding:6px 8px;font-family:monospace">$${t.entry.toFixed(2)}</td>
                    <td style="padding:6px 8px;font-family:monospace">$${t.exit.toFixed(2)}</td>
                    <td style="padding:6px 8px;color:${pnlColor};font-weight:600;font-family:monospace">${sign}$${t.pnl.toFixed(2)}</td>
                    <td style="padding:6px 8px">${t.holdingCandles || 0}${t.stoppedOut ? ' (SL)' : ''}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }
  },

  renderScoreCategory(name, data, maxScore, color) {
    const pct = (data.score / maxScore * 100).toFixed(0);
    return `
      <div style="margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="color:#e2e8f0;font-size:0.85rem;font-weight:500">${name}</span>
          <span style="color:${color};font-size:0.85rem;font-weight:600">${data.score}/${maxScore}</span>
        </div>
        <div style="background:#0f172a;border-radius:4px;height:6px;overflow:hidden">
          <div style="background:${color};height:100%;width:${pct}%;border-radius:4px;transition:width 0.5s"></div>
        </div>
        <div style="margin-top:4px">
          ${data.details.map(d => `<div style="color:#64748b;font-size:0.75rem;line-height:1.3;margin-top:2px">- ${d}</div>`).join('')}
        </div>
      </div>
    `;
  },

  restart() {
    const results = document.getElementById('ttResultsScreen');
    if (results) results.style.display = 'none';
    this.destroy();
    this.canvas = document.getElementById('ttChart');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      this.resizeHandler = () => this.resize();
      window.addEventListener('resize', this.resizeHandler);
    }
    this.showStartScreen();
  },

  saveBestScore(score) {
    try {
      const duration = this.state ? this.state.duration : 5;
      if (typeof Progress !== 'undefined' && Progress.setTestBestScore) {
        Progress.setTestBestScore(duration, score);
      }
    } catch (e) { /* ignore */ }
  },

  loadBestScores() {
    try {
      let best = 0;
      if (typeof Progress !== 'undefined' && Progress.getTestBestScore) {
        // Check all durations and show the best overall
        const durations = [5, 10, 15, 30, 60, 120, 240, 480];
        for (const d of durations) {
          const s = Progress.getTestBestScore(d);
          if (s > best) best = s;
        }
      }
      const el = document.getElementById('ttBestScore');
      if (el) el.textContent = best > 0 ? best + '/100' : '--';
    } catch (e) { /* ignore */ }
  }
};
