/* ============================================
   DAY TRADING COURSE — Chart Rendering Engine
   ============================================ */

const Charts = {
  instances: {},

  initAll() {
    document.querySelectorAll('canvas[data-chart]').forEach(canvas => {
      const type = canvas.dataset.chart;
      const id = canvas.id;
      this.create(id, canvas, type);
    });

    // Init candlestick builders
    document.querySelectorAll('.candlestick-builder').forEach(el => {
      this.initCandlestickBuilder(el);
    });

    // Init indicator playgrounds
    document.querySelectorAll('.indicator-playground').forEach(el => {
      this.initIndicatorPlayground(el);
    });
  },

  create(id, canvas, type) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = (canvas.dataset.height || 300) * dpr;
    canvas.style.height = (canvas.dataset.height || 300) + 'px';
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = parseInt(canvas.dataset.height) || 300;

    this.instances[id] = { ctx, width, height, canvas };

    if (type === 'candlestick') {
      this.drawCandlestick(id, this.generateOHLC(50));
    } else if (type === 'line') {
      this.drawLine(id, this.generatePrices(80));
    } else if (type === 'indicator') {
      this.drawWithIndicators(id);
    }
  },

  // Generate random OHLC data
  generateOHLC(count) {
    const data = [];
    let price = 150 + Math.random() * 50;
    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.48) * 4;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      const volume = Math.floor(50000 + Math.random() * 200000);
      data.push({ open, high, low, close, volume });
      price = close;
    }
    return data;
  },

  generatePrices(count) {
    const data = [];
    let price = 100;
    for (let i = 0; i < count; i++) {
      price += (Math.random() - 0.48) * 3;
      data.push(price);
    }
    return data;
  },

  // Draw candlestick chart
  drawCandlestick(id, data) {
    const { ctx, width, height } = this.instances[id];
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 20, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const allPrices = data.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice || 1;

    const candleWidth = Math.max(2, (chartWidth / data.length) * 0.7);
    const gap = chartWidth / data.length;

    const toY = (price) => padding.top + (1 - (price - minPrice) / priceRange) * chartHeight;
    const toX = (i) => padding.left + i * gap + gap / 2;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Price labels
      const price = maxPrice - (priceRange / 4) * i;
      ctx.fillStyle = '#475569';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText('$' + price.toFixed(2), padding.left - 8, y + 4);
    }

    // Draw candles
    data.forEach((d, i) => {
      const x = toX(i);
      const openY = toY(d.open);
      const closeY = toY(d.close);
      const highY = toY(d.high);
      const lowY = toY(d.low);
      const bullish = d.close >= d.open;

      // Wick
      ctx.strokeStyle = bullish ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = bullish ? '#10b981' : '#ef4444';
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });
  },

  // Draw line chart
  drawLine(id, data) {
    const { ctx, width, height } = this.instances[id];
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 20, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const minPrice = Math.min(...data);
    const maxPrice = Math.max(...data);
    const priceRange = maxPrice - minPrice || 1;

    const toY = (val) => padding.top + (1 - (val - minPrice) / priceRange) * chartHeight;
    const toX = (i) => padding.left + (i / (data.length - 1)) * chartWidth;

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Area fill
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(data[0]));
    data.forEach((val, i) => ctx.lineTo(toX(i), toY(val)));
    ctx.lineTo(toX(data.length - 1), height - padding.bottom);
    ctx.lineTo(toX(0), height - padding.bottom);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(data[0]));
    data.forEach((val, i) => ctx.lineTo(toX(i), toY(val)));
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
  },

  // Draw chart with indicators
  drawWithIndicators(id) {
    const data = this.generateOHLC(80);
    const { ctx, width, height } = this.instances[id];

    // Store data for playground
    this.instances[id].data = data;

    this.drawCandlestick(id, data);

    // Draw SMA overlay
    const closes = data.map(d => d.close);
    const sma20 = this.calcSMA(closes, 20);
    this.drawOverlay(id, data, sma20, '#f59e0b', 20);
  },

  calcSMA(data, period) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) { result.push(null); continue; }
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[i - j];
      result.push(sum / period);
    }
    return result;
  },

  calcEMA(data, period) {
    const result = [];
    const multiplier = 2 / (period + 1);
    let ema = data[0];
    for (let i = 0; i < data.length; i++) {
      if (i === 0) { result.push(ema); continue; }
      ema = (data[i] - ema) * multiplier + ema;
      result.push(i < period - 1 ? null : ema);
    }
    return result;
  },

  calcRSI(data, period = 14) {
    const result = new Array(data.length).fill(null);
    let gains = 0, losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = data[i] - data[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    result[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

    for (let i = period + 1; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      avgGain = (avgGain * (period - 1) + Math.max(0, diff)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(0, -diff)) / period;
      result[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    }
    return result;
  },

  calcBollingerBands(data, period = 20, stdDev = 2) {
    const sma = this.calcSMA(data, period);
    const upper = [], lower = [];
    for (let i = 0; i < data.length; i++) {
      if (sma[i] === null) { upper.push(null); lower.push(null); continue; }
      let sumSq = 0;
      for (let j = 0; j < period; j++) sumSq += Math.pow(data[i - j] - sma[i], 2);
      const std = Math.sqrt(sumSq / period);
      upper.push(sma[i] + stdDev * std);
      lower.push(sma[i] - stdDev * std);
    }
    return { upper, middle: sma, lower };
  },

  drawOverlay(id, ohlcData, overlayData, color, startIndex = 0) {
    const { ctx, width, height } = this.instances[id];
    const padding = { top: 20, right: 20, bottom: 30, left: 60 };
    const chartHeight = height - padding.top - padding.bottom;
    const chartWidth = width - padding.left - padding.right;

    const allPrices = ohlcData.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice || 1;

    const gap = chartWidth / ohlcData.length;
    const toY = (price) => padding.top + (1 - (price - minPrice) / priceRange) * chartHeight;
    const toX = (i) => padding.left + i * gap + gap / 2;

    ctx.beginPath();
    let started = false;
    overlayData.forEach((val, i) => {
      if (val === null) return;
      const x = toX(i);
      const y = toY(val);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.stroke();
  },

  // Candlestick builder interactive
  initCandlestickBuilder(container) {
    const openSlider = container.querySelector('#cb-open');
    const highSlider = container.querySelector('#cb-high');
    const lowSlider = container.querySelector('#cb-low');
    const closeSlider = container.querySelector('#cb-close');

    if (!openSlider) return;

    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    const update = () => {
      let o = parseFloat(openSlider.value);
      let h = parseFloat(highSlider.value);
      let l = parseFloat(lowSlider.value);
      let c = parseFloat(closeSlider.value);

      // Update value displays
      container.querySelectorAll('.slider-label-value').forEach(el => {
        const input = container.querySelector(`#${el.dataset.for}`);
        if (input) el.textContent = '$' + parseFloat(input.value).toFixed(2);
      });

      this.drawSingleCandle(canvas, o, h, l, c);

      // Determine pattern
      const patternEl = container.querySelector('.pattern-name');
      if (patternEl) {
        patternEl.textContent = this.identifyPattern(o, h, l, c);
      }
    };

    [openSlider, highSlider, lowSlider, closeSlider].forEach(s => {
      if (s) s.addEventListener('input', update);
    });

    update();
  },

  drawSingleCandle(canvas, open, high, low, close) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padding = 30;
    const priceMin = Math.min(open, high, low, close) - 5;
    const priceMax = Math.max(open, high, low, close) + 5;
    const range = priceMax - priceMin || 1;

    const toY = (p) => padding + (1 - (p - priceMin) / range) * (h - padding * 2);
    const cx = w / 2;
    const candleW = 40;
    const bullish = close >= open;

    // Wick
    ctx.strokeStyle = bullish ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, toY(high));
    ctx.lineTo(cx, toY(low));
    ctx.stroke();

    // Body
    ctx.fillStyle = bullish ? '#10b981' : '#ef4444';
    const bodyTop = Math.min(toY(open), toY(close));
    const bodyH = Math.max(Math.abs(toY(close) - toY(open)), 2);
    ctx.beginPath();
    ctx.roundRect(cx - candleW / 2, bodyTop, candleW, bodyH, 3);
    ctx.fill();

    // Labels
    ctx.font = '11px JetBrains Mono';
    ctx.textAlign = 'left';
    const labelX = cx + candleW / 2 + 12;

    ctx.fillStyle = '#94a3b8';
    ctx.fillText('H: $' + high.toFixed(2), labelX, toY(high) + 4);
    ctx.fillText('L: $' + low.toFixed(2), labelX, toY(low) + 4);

    ctx.textAlign = 'right';
    const labelXL = cx - candleW / 2 - 12;
    ctx.fillStyle = bullish ? '#10b981' : '#ef4444';
    ctx.fillText('O: $' + open.toFixed(2), labelXL, toY(open) + 4);
    ctx.fillText('C: $' + close.toFixed(2), labelXL, toY(close) + 4);
  },

  identifyPattern(o, h, l, c) {
    const body = Math.abs(c - o);
    const range = h - l;
    const upperWick = h - Math.max(o, c);
    const lowerWick = Math.min(o, c) - l;
    const bullish = c > o;

    if (range === 0) return 'No data';
    const bodyRatio = body / range;
    const upperWickRatio = upperWick / range;
    const lowerWickRatio = lowerWick / range;

    if (bodyRatio < 0.1) return 'Doji';
    if (lowerWickRatio > 0.6 && bodyRatio < 0.3 && bullish) return 'Hammer';
    if (lowerWickRatio > 0.6 && bodyRatio < 0.3 && !bullish) return 'Hanging Man';
    if (upperWickRatio > 0.6 && bodyRatio < 0.3) return 'Shooting Star';
    if (bodyRatio > 0.8 && bullish) return 'Strong Bullish';
    if (bodyRatio > 0.8 && !bullish) return 'Strong Bearish';
    if (bodyRatio > 0.5 && bullish) return 'Bullish';
    if (bodyRatio > 0.5 && !bullish) return 'Bearish';
    return 'Spinning Top';
  },

  // Indicator playground
  initIndicatorPlayground(container) {
    const canvasId = container.querySelector('canvas')?.id;
    if (!canvasId || !this.instances[canvasId]) return;

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const sliders = container.querySelectorAll('input[type="range"]');

    const redraw = () => {
      const data = this.instances[canvasId].data;
      if (!data) return;

      this.drawCandlestick(canvasId, data);
      const closes = data.map(d => d.close);

      // SMA
      const smaCheck = container.querySelector('#show-sma');
      const smaPeriod = container.querySelector('#sma-period');
      if (smaCheck?.checked && smaPeriod) {
        const period = parseInt(smaPeriod.value);
        const sma = this.calcSMA(closes, period);
        this.drawOverlay(canvasId, data, sma, '#f59e0b', period);
        const label = container.querySelector('.sma-period-val');
        if (label) label.textContent = period;
      }

      // EMA
      const emaCheck = container.querySelector('#show-ema');
      const emaPeriod = container.querySelector('#ema-period');
      if (emaCheck?.checked && emaPeriod) {
        const period = parseInt(emaPeriod.value);
        const ema = this.calcEMA(closes, period);
        this.drawOverlay(canvasId, data, ema, '#8b5cf6', period);
        const label = container.querySelector('.ema-period-val');
        if (label) label.textContent = period;
      }

      // Bollinger Bands
      const bbCheck = container.querySelector('#show-bb');
      if (bbCheck?.checked) {
        const bb = this.calcBollingerBands(closes);
        this.drawOverlay(canvasId, data, bb.upper, '#06b6d4', 20);
        this.drawOverlay(canvasId, data, bb.lower, '#06b6d4', 20);
      }
    };

    checkboxes.forEach(cb => cb.addEventListener('change', redraw));
    sliders.forEach(s => s.addEventListener('input', redraw));

    redraw();
  }
};
