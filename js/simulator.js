/* ============================================
   DAY TRADING COURSE — Trading Simulator
   ============================================ */

const Simulator = {
  state: null,
  canvas: null,
  ctx: null,
  interval: null,
  animFrame: null,

  init() {
    const container = document.querySelector('.simulator');
    if (!container) return;

    this.canvas = container.querySelector('canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.state = {
      data: this.generateRealisticData(200),
      visibleIndex: 30,
      position: null, // { type: 'long', entry, shares, index }
      cash: 25000,
      startingCash: 25000,
      pnl: 0,
      trades: [],
      paused: false
    };

    this.setupControls(container);
    this.resize();
    this.draw();

    window.addEventListener('resize', () => this.resize());
  },

  generateRealisticData(count) {
    const data = [];
    let price = 175;
    let trend = 0;
    let volatility = 1.5;

    for (let i = 0; i < count; i++) {
      // Regime changes
      if (Math.random() < 0.03) {
        trend = (Math.random() - 0.5) * 2;
        volatility = 0.8 + Math.random() * 3;
      }

      const noise = (Math.random() - 0.5) * volatility;
      const change = trend * 0.15 + noise;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.8;
      const low = Math.min(open, close) - Math.random() * volatility * 0.8;
      const volume = Math.floor(80000 + Math.random() * 400000 + Math.abs(change) * 50000);

      data.push({ open, high, low, close, volume });
      price = close;
    }
    return data;
  },

  setupControls(container) {
    const buyBtn = container.querySelector('.sim-btn.buy');
    const sellBtn = container.querySelector('.sim-btn.sell');
    const playBtn = container.querySelector('#sim-play');
    const resetBtn = container.querySelector('#sim-reset');
    const speedSelect = container.querySelector('#sim-speed');

    if (buyBtn) buyBtn.addEventListener('click', () => this.buy());
    if (sellBtn) sellBtn.addEventListener('click', () => this.sell());
    if (playBtn) playBtn.addEventListener('click', () => this.togglePlay());
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());
    if (speedSelect) speedSelect.addEventListener('change', () => {
      if (!this.state.paused) {
        this.stopPlayback();
        this.startPlayback();
      }
    });

    this.updateControls(container);
  },

  togglePlay() {
    if (this.state.paused) {
      this.startPlayback();
    } else {
      this.stopPlayback();
    }
    this.state.paused = !this.state.paused;

    const btn = document.querySelector('#sim-play');
    if (btn) {
      btn.innerHTML = this.state.paused ?
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg> Play' :
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause';
    }
  },

  startPlayback() {
    const speed = parseInt(document.querySelector('#sim-speed')?.value) || 500;
    this.interval = setInterval(() => this.advance(), speed);
  },

  stopPlayback() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },

  advance() {
    if (this.state.visibleIndex >= this.state.data.length - 1) {
      this.stopPlayback();
      this.endSession();
      return;
    }
    this.state.visibleIndex++;
    this.updatePnL();
    this.draw();
    this.updateStats();
  },

  buy() {
    const s = this.state;
    if (s.position) return; // Already in a position

    const currentPrice = s.data[s.visibleIndex].close;
    const shares = Math.floor(s.cash * 0.95 / currentPrice); // Use 95% of cash
    if (shares <= 0) return;

    s.position = {
      type: 'long',
      entry: currentPrice,
      shares: shares,
      index: s.visibleIndex
    };

    s.cash -= shares * currentPrice;
    this.updateStats();
    this.draw();
    showToast(`Bought ${shares} shares @ $${currentPrice.toFixed(2)}`, 'success');
  },

  sell() {
    const s = this.state;
    if (!s.position) return;

    const currentPrice = s.data[s.visibleIndex].close;
    const proceeds = s.position.shares * currentPrice;
    const tradePnL = (currentPrice - s.position.entry) * s.position.shares;

    s.trades.push({
      entry: s.position.entry,
      exit: currentPrice,
      shares: s.position.shares,
      pnl: tradePnL,
      entryIndex: s.position.index,
      exitIndex: s.visibleIndex
    });

    s.cash += proceeds;
    s.position = null;
    s.pnl = s.cash - s.startingCash;

    this.updateStats();
    this.draw();

    const sign = tradePnL >= 0 ? '+' : '';
    showToast(`Sold @ $${currentPrice.toFixed(2)} — ${sign}$${tradePnL.toFixed(2)}`, tradePnL >= 0 ? 'success' : 'error');
  },

  updatePnL() {
    const s = this.state;
    if (s.position) {
      const currentPrice = s.data[s.visibleIndex].close;
      const unrealized = (currentPrice - s.position.entry) * s.position.shares;
      s.pnl = (s.cash + s.position.shares * currentPrice) - s.startingCash;
    }
  },

  updateStats() {
    const s = this.state;
    const currentPrice = s.data[s.visibleIndex]?.close || 0;
    const totalValue = s.position ? s.cash + s.position.shares * currentPrice : s.cash;
    const totalPnL = totalValue - s.startingCash;

    this.setStat('sim-price', '$' + currentPrice.toFixed(2));
    this.setStat('sim-pnl', (totalPnL >= 0 ? '+' : '') + '$' + totalPnL.toFixed(2), totalPnL >= 0 ? '#10b981' : '#ef4444');
    this.setStat('sim-cash', '$' + s.cash.toFixed(0));
    this.setStat('sim-trades', s.trades.length.toString());
    this.setStat('sim-position', s.position ? `${s.position.shares} shares` : 'Flat');

    // Update button states
    const buyBtn = document.querySelector('.sim-btn.buy');
    const sellBtn = document.querySelector('.sim-btn.sell');
    if (buyBtn) buyBtn.disabled = !!s.position;
    if (sellBtn) sellBtn.disabled = !s.position;
  },

  setStat(id, value, color) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
      if (color) el.style.color = color;
    }
  },

  updateControls(container) {
    this.updateStats();
  },

  resize() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth;
    const h = parseInt(this.canvas.dataset.height) || 350;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.height = h + 'px';
    this.ctx.scale(dpr, dpr);
    this.width = w;
    this.height = h;
    this.draw();
  },

  draw() {
    const { ctx } = this;
    if (!ctx || !this.state) return;

    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    const s = this.state;
    const visibleCount = 60;
    const startIdx = Math.max(0, s.visibleIndex - visibleCount + 1);
    const endIdx = s.visibleIndex + 1;
    const visible = s.data.slice(startIdx, endIdx);

    const padding = { top: 15, right: 15, bottom: 25, left: 55 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const allPrices = visible.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...allPrices) - 1;
    const maxPrice = Math.max(...allPrices) + 1;
    const range = maxPrice - minPrice || 1;

    const gap = chartW / visibleCount;
    const candleW = Math.max(2, gap * 0.6);

    const toY = (p) => padding.top + (1 - (p - minPrice) / range) * chartH;
    const toX = (i) => padding.left + i * gap + gap / 2;

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      const price = maxPrice - (range / 4) * i;
      ctx.fillStyle = '#475569';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText('$' + price.toFixed(1), padding.left - 6, y + 3);
    }

    // Candles
    visible.forEach((d, i) => {
      const x = toX(i);
      const bullish = d.close >= d.open;

      ctx.strokeStyle = bullish ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(d.high));
      ctx.lineTo(x, toY(d.low));
      ctx.stroke();

      ctx.fillStyle = bullish ? '#10b981' : '#ef4444';
      const bodyTop = Math.min(toY(d.open), toY(d.close));
      const bodyH = Math.max(Math.abs(toY(d.close) - toY(d.open)), 1);
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
    });

    // Draw trade markers
    s.trades.forEach(trade => {
      // Entry marker
      if (trade.entryIndex >= startIdx && trade.entryIndex < endIdx) {
        const i = trade.entryIndex - startIdx;
        const x = toX(i);
        const y = toY(trade.entry);
        this.drawMarker(ctx, x, y, '#3b82f6', '▲');
      }
      // Exit marker
      if (trade.exitIndex >= startIdx && trade.exitIndex < endIdx) {
        const i = trade.exitIndex - startIdx;
        const x = toX(i);
        const y = toY(trade.exit);
        this.drawMarker(ctx, x, y, trade.pnl >= 0 ? '#10b981' : '#ef4444', '▼');
      }
    });

    // Current position entry line
    if (s.position && s.position.index >= startIdx) {
      const entryY = toY(s.position.entry);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, entryY);
      ctx.lineTo(w - padding.right, entryY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 9px Inter';
      ctx.textAlign = 'left';
      ctx.fillText('ENTRY $' + s.position.entry.toFixed(2), w - padding.right - 100, entryY - 5);
    }

    // Current price line
    const lastPrice = visible[visible.length - 1]?.close;
    if (lastPrice) {
      const y = toY(lastPrice);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(w - padding.right - 60, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price tag
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(w - padding.right, y - 9, 50, 18);
      ctx.fillStyle = '#0a0e17';
      ctx.font = 'bold 10px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.fillText(lastPrice.toFixed(2), w - padding.right + 4, y + 3);
    }
  },

  drawMarker(ctx, x, y, color, symbol) {
    ctx.fillStyle = color;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(symbol, x, y - 8);
  },

  endSession() {
    const s = this.state;
    // Force close any open position
    if (s.position) this.sell();

    const wins = s.trades.filter(t => t.pnl > 0).length;
    const losses = s.trades.filter(t => t.pnl <= 0).length;
    const winRate = s.trades.length > 0 ? ((wins / s.trades.length) * 100).toFixed(1) : '0';
    const totalPnL = s.cash - s.startingCash;

    showToast(`Session ended — ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)} | ${wins}W/${losses}L (${winRate}% win rate)`, totalPnL >= 0 ? 'success' : 'error');
  },

  reset() {
    this.stopPlayback();
    this.state = {
      data: this.generateRealisticData(200),
      visibleIndex: 30,
      position: null,
      cash: 25000,
      startingCash: 25000,
      pnl: 0,
      trades: [],
      paused: true
    };

    const btn = document.querySelector('#sim-play');
    if (btn) btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg> Play';

    this.draw();
    this.updateStats();
    showToast('Simulator reset', 'success');
  }
};
