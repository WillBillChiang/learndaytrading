/* ============================================
   DAY TRADING COURSE — Calculators
   ============================================ */

const Calculator = {
  initAll() {
    // Position Size Calculator
    document.querySelectorAll('.position-calc').forEach(el => {
      this.initPositionCalc(el);
    });

    // Risk/Reward Calculator
    document.querySelectorAll('.rr-calc').forEach(el => {
      this.initRRCalc(el);
    });

    // P&L Calculator
    document.querySelectorAll('.pnl-calc').forEach(el => {
      this.initPnLCalc(el);
    });
  },

  initPositionCalc(container) {
    const inputs = container.querySelectorAll('input');
    const calculate = () => {
      const accountSize = parseFloat(container.querySelector('#pc-account')?.value) || 0;
      const riskPercent = parseFloat(container.querySelector('#pc-risk')?.value) || 0;
      const entryPrice = parseFloat(container.querySelector('#pc-entry')?.value) || 0;
      const stopPrice = parseFloat(container.querySelector('#pc-stop')?.value) || 0;

      const riskAmount = accountSize * (riskPercent / 100);
      const priceDiff = Math.abs(entryPrice - stopPrice);
      const shares = priceDiff > 0 ? Math.floor(riskAmount / priceDiff) : 0;
      const positionValue = shares * entryPrice;
      const actualRisk = shares * priceDiff;

      this.setResult(container, 'pc-shares', shares.toLocaleString());
      this.setResult(container, 'pc-risk-amount', '$' + riskAmount.toFixed(2));
      this.setResult(container, 'pc-position-value', '$' + positionValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));
      this.setResult(container, 'pc-actual-risk', '$' + actualRisk.toFixed(2));

      // Update slider labels
      const riskLabel = container.querySelector('.risk-percent-val');
      if (riskLabel) riskLabel.textContent = riskPercent.toFixed(1) + '%';
    };

    inputs.forEach(input => {
      input.addEventListener('input', calculate);
    });

    calculate();
  },

  initRRCalc(container) {
    const inputs = container.querySelectorAll('input');
    const canvas = container.querySelector('canvas');

    const calculate = () => {
      const entry = parseFloat(container.querySelector('#rr-entry')?.value) || 0;
      const stop = parseFloat(container.querySelector('#rr-stop')?.value) || 0;
      const target = parseFloat(container.querySelector('#rr-target')?.value) || 0;

      const risk = Math.abs(entry - stop);
      const reward = Math.abs(target - entry);
      const ratio = risk > 0 ? (reward / risk) : 0;
      const isLong = target > entry;

      this.setResult(container, 'rr-risk', '$' + risk.toFixed(2));
      this.setResult(container, 'rr-reward', '$' + reward.toFixed(2));
      this.setResult(container, 'rr-ratio', '1:' + ratio.toFixed(2));

      // Color the ratio
      const ratioEl = container.querySelector('#rr-ratio');
      if (ratioEl) {
        ratioEl.className = 'calc-result-value ' + (ratio >= 2 ? 'green' : ratio >= 1 ? 'gold' : 'red');
      }

      // Draw visualization
      if (canvas) this.drawRRChart(canvas, entry, stop, target, isLong);
    };

    inputs.forEach(input => input.addEventListener('input', calculate));
    calculate();
  },

  drawRRChart(canvas, entry, stop, target, isLong) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const prices = [entry, stop, target];
    const min = Math.min(...prices) - 2;
    const max = Math.max(...prices) + 2;
    const range = max - min || 1;

    const padding = { left: 70, right: 30, top: 20, bottom: 20 };
    const chartH = h - padding.top - padding.bottom;

    const toY = (p) => padding.top + (1 - (p - min) / range) * chartH;

    // Background zones
    const entryY = toY(entry);
    const stopY = toY(stop);
    const targetY = toY(target);

    // Risk zone (red)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.fillRect(padding.left, Math.min(entryY, stopY), w - padding.left - padding.right, Math.abs(stopY - entryY));

    // Reward zone (green)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.fillRect(padding.left, Math.min(entryY, targetY), w - padding.left - padding.right, Math.abs(targetY - entryY));

    // Lines
    const drawLine = (y, color, label, price) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(label === 'ENTRY' ? [] : [6, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(label, padding.left - 8, y - 6);
      ctx.font = '11px JetBrains Mono';
      ctx.fillText('$' + price.toFixed(2), padding.left - 8, y + 12);
    };

    drawLine(entryY, '#3b82f6', 'ENTRY', entry);
    drawLine(stopY, '#ef4444', 'STOP', stop);
    drawLine(targetY, '#10b981', 'TARGET', target);
  },

  initPnLCalc(container) {
    const inputs = container.querySelectorAll('input');
    const calculate = () => {
      const entry = parseFloat(container.querySelector('#pnl-entry')?.value) || 0;
      const exit = parseFloat(container.querySelector('#pnl-exit')?.value) || 0;
      const shares = parseFloat(container.querySelector('#pnl-shares')?.value) || 0;
      const commission = parseFloat(container.querySelector('#pnl-commission')?.value) || 0;

      const grossPnL = (exit - entry) * shares;
      const totalCommission = commission * 2; // entry + exit
      const netPnL = grossPnL - totalCommission;
      const percentReturn = entry > 0 ? ((exit - entry) / entry) * 100 : 0;

      this.setResult(container, 'pnl-gross', (grossPnL >= 0 ? '+' : '') + '$' + grossPnL.toFixed(2));
      this.setResult(container, 'pnl-net', (netPnL >= 0 ? '+' : '') + '$' + netPnL.toFixed(2));
      this.setResult(container, 'pnl-percent', (percentReturn >= 0 ? '+' : '') + percentReturn.toFixed(2) + '%');

      // Color
      ['pnl-gross', 'pnl-net', 'pnl-percent'].forEach(id => {
        const el = container.querySelector('#' + id);
        if (el) {
          const val = id === 'pnl-percent' ? percentReturn : (id === 'pnl-net' ? netPnL : grossPnL);
          el.className = 'calc-result-value ' + (val >= 0 ? 'green' : 'red');
        }
      });
    };

    inputs.forEach(input => input.addEventListener('input', calculate));
    calculate();
  },

  setResult(container, id, value) {
    const el = container.querySelector('#' + id);
    if (el) el.textContent = value;
  }
};
