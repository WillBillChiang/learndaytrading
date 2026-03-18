/* ============================================
   DAY TRADING COURSE — Main Application
   ============================================ */

let currentModule = 'home';

// --- Navigation ---
function navigateTo(module) {
  currentModule = module;
  Progress.setCurrentModule(module);
  updateActiveNav(module);
  updateBreadcrumb(module);
  loadModule(module);
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadModule(module) {
  const contentArea = document.getElementById('contentArea');
  contentArea.classList.remove('page-enter');

  if (module === 'home') {
    contentArea.innerHTML = getHomePage();
    void contentArea.offsetWidth; // force reflow
    contentArea.classList.add('page-enter');
    Animations.refresh();
    return;
  }

  const path = `modules/module${module}.html`;
  fetch(path)
    .then(r => {
      if (!r.ok) throw new Error('Module not found');
      return r.text();
    })
    .then(html => {
      contentArea.innerHTML = html;
      void contentArea.offsetWidth;
      contentArea.classList.add('page-enter');
      Animations.refresh();
      initModuleInteractives(module);
    })
    .catch(() => {
      contentArea.innerHTML = `
        <div style="text-align:center; padding: 4rem 2rem;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom:1rem">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h2 style="color:var(--text-muted);margin-bottom:0.5rem">Module Coming Soon</h2>
          <p style="color:var(--text-muted)">This module is still being developed. Check back soon!</p>
          <button class="btn btn-primary" style="margin-top:1.5rem" onclick="navigateTo('home')">Back to Home</button>
        </div>`;
      contentArea.classList.add('page-enter');
    });
}

function initModuleInteractives(module) {
  // Initialize quizzes
  Quiz.initAll();

  // Initialize calculators
  if (typeof Calculator !== 'undefined') Calculator.initAll();

  // Initialize charts
  if (typeof Charts !== 'undefined') Charts.initAll();

  // Initialize simulator
  if (typeof Simulator !== 'undefined' && module == 10) Simulator.init();

  // Module completion button
  setupCompleteButton(module);
}

function setupCompleteButton(module) {
  const btn = document.getElementById('completeModuleBtn');
  if (!btn) return;

  const isCompleted = Progress.isModuleCompleted(Number(module));
  if (isCompleted) {
    btn.classList.add('completed');
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Completed`;
  }

  btn.addEventListener('click', () => {
    const num = Number(module);
    if (Progress.isModuleCompleted(num)) {
      Progress.uncompleteModule(num);
      btn.classList.remove('completed');
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Mark Complete`;
      showToast('Module unmarked');
    } else {
      Progress.completeModule(num);
      btn.classList.add('completed');
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Completed`;
      showToast('Module completed! 🎉', 'success');
    }
    updateUI();
  });
}

function updateActiveNav(module) {
  document.querySelectorAll('.module-nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.module == module) {
      item.classList.add('active');
    }
  });
}

function updateBreadcrumb(module) {
  const bc = document.getElementById('breadcrumb');
  if (module === 'home') {
    bc.innerHTML = '<span>Course Home</span>';
  } else {
    const names = {
      1: 'How Markets Really Work',
      2: 'Reading Candlesticks',
      3: 'Chart Patterns & Structure',
      4: 'Technical Indicators',
      5: 'Risk Management',
      6: 'Trading Psychology',
      7: 'Day Trading Strategies',
      8: 'Tools of the Trade',
      9: 'Building Your Trading Plan',
      10: 'Simulation & Final Exam',
      11: 'Order Flow & Tape Reading',
      12: 'Options for Day Traders',
      13: 'Algorithmic & Quant Trading',
      14: 'Market Regimes & Microstructure',
      15: 'Advanced Risk & Portfolio'
    };
    bc.innerHTML = `Module ${module} · <span>${names[module]}</span>`;
  }
}

// --- UI Updates ---
function updateUI() {
  // Progress bar
  const percent = Progress.getProgressPercent();
  document.getElementById('progressFill').style.width = percent + '%';
  document.getElementById('progressPercent').textContent = percent + '%';
  document.getElementById('completedCount').textContent = Progress.getCompletedCount();
  document.getElementById('totalScore').textContent = Progress.getTotalScore();

  // Nav items completed state
  document.querySelectorAll('.module-nav-item').forEach(item => {
    const mod = item.dataset.module;
    if (mod !== 'home' && Progress.isModuleCompleted(Number(mod))) {
      item.classList.add('completed');
    } else {
      item.classList.remove('completed');
    }
  });
}

// --- Sidebar ---
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('active');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// --- Toast ---
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const text = document.getElementById('toastText');
  toast.className = 'toast ' + type;
  text.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- Home Page ---
function getHomePage() {
  const modules = [
    { num: 1, title: 'How Markets Really Work', desc: 'Market microstructure, order types, dark pools, PFOF, and HFT.', icon: 'building', color: '#3b82f6' },
    { num: 2, title: 'Reading Candlesticks', desc: 'Candlestick anatomy, volume confirmation, and multi-timeframe analysis.', icon: 'candle', color: '#f59e0b' },
    { num: 3, title: 'Chart Patterns & Structure', desc: 'Support, resistance, harmonics, Wyckoff, and Smart Money Concepts.', icon: 'chart', color: '#8b5cf6' },
    { num: 4, title: 'Technical Indicators', desc: 'Moving averages, RSI, MACD, Volume Profile, and market internals.', icon: 'indicator', color: '#06b6d4' },
    { num: 5, title: 'Risk Management', desc: 'Position sizing, Kelly Criterion, Monte Carlo, and correlation risk.', icon: 'shield', color: '#10b981' },
    { num: 6, title: 'Trading Psychology', desc: 'Kahneman\'s dual systems, flow state, biases, and mental resilience.', icon: 'brain', color: '#ec4899' },
    { num: 7, title: 'Day Trading Strategies', desc: 'VWAP strategies, advanced ORB, order flow scalping, and gap trading.', icon: 'strategy', color: '#f97316' },
    { num: 8, title: 'Tools of the Trade', desc: 'Level 2, tape reading, algorithmic orders, and journal software.', icon: 'tools', color: '#14b8a6' },
    { num: 9, title: 'Building Your Trading Plan', desc: 'Regime-based plans, edge tracking, and tax optimization.', icon: 'plan', color: '#a855f7' },
    { num: 10, title: 'Simulation & Final Exam', desc: 'Advanced scenarios, 30-day challenge, and comprehensive final exam.', icon: 'rocket', color: '#ef4444' },
    { num: 11, title: 'Order Flow & Tape Reading', desc: 'DOM trading, footprint charts, volume delta, and auction theory.', icon: 'orderflow', color: '#0ea5e9', advanced: true },
    { num: 12, title: 'Options for Day Traders', desc: 'Greeks, GEX, options flow, 0DTE trading, and IV analysis.', icon: 'options', color: '#d946ef', advanced: true },
    { num: 13, title: 'Algorithmic & Quant Trading', desc: 'Backtesting, statistical edge, ML in trading, and building bots.', icon: 'algo', color: '#6366f1', advanced: true },
    { num: 14, title: 'Market Regimes & Microstructure', desc: 'VIX regimes, market internals, dark pools, and macro events.', icon: 'regime', color: '#f43f5e', advanced: true },
    { num: 15, title: 'Advanced Risk & Portfolio', desc: 'Kelly Criterion, Monte Carlo, VaR, scaling, and prop firms.', icon: 'portfolio', color: '#84cc16', advanced: true }
  ];

  const coreModules = modules.filter(m => !m.advanced);
  const advancedModules = modules.filter(m => m.advanced);

  const renderCard = m => {
    const completed = Progress.isModuleCompleted(m.num);
    return `
      <div class="module-card reveal hover-lift" onclick="navigateTo(${m.num})">
        <div class="module-card-number">${m.advanced ? 'ADVANCED ' : ''}MODULE ${String(m.num).padStart(2, '0')}</div>
        <div class="module-card-icon" style="background: ${m.color}15; color: ${m.color}">
          ${getModuleIcon(m.icon)}
        </div>
        <h3>${m.title}</h3>
        <p>${m.desc}</p>
        <div class="module-card-footer">
          <span class="module-card-status ${completed ? 'completed' : ''}">${completed ? '✓ Completed' : 'Start →'}</span>
        </div>
      </div>`;
  };

  const moduleCards = coreModules.map(renderCard).join('') +
    `<div class="module-grid-divider reveal" style="grid-column:1/-1;text-align:center;padding:2rem 0 1rem">
      <div style="display:inline-flex;align-items:center;gap:0.75rem;color:#64748b;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.1em">
        <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#334155)"></div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        Advanced Modules
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#334155)"></div>
      </div>
      <p style="color:#475569;font-size:0.8rem;margin-top:0.5rem">State-of-the-art strategies and research for serious traders</p>
    </div>` +
    advancedModules.map(renderCard).join('');

  return `
    <div class="hero">
      <div class="hero-badge">
        <span class="pulse-dot"></span>
        15 Interactive Modules
      </div>
      <h1>Master <span class="gradient-text">Day Trading</span></h1>
      <p class="hero-description">
        From market mechanics to live simulation — build the skills, discipline,
        and strategy you need to trade with confidence.
      </p>
      <div class="hero-actions">
        <button class="btn btn-primary btn-lg" onclick="navigateTo(getNextModule())">
          ${Progress.getCompletedCount() > 0 ? 'Continue Learning' : 'Start Course'}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
        <button class="btn btn-secondary btn-lg" onclick="navigateTo(1)">
          Browse Modules
        </button>
      </div>

      <!-- Hero Illustration -->
      <div class="hero-illustration">
        ${getHeroSVG()}
      </div>
    </div>

    <div class="module-grid stagger-children">
      ${moduleCards}
    </div>
  `;
}

function getNextModule() {
  for (let i = 1; i <= 15; i++) {
    if (!Progress.isModuleCompleted(i)) return i;
  }
  return 1;
}

// --- Module Icons ---
function getModuleIcon(type) {
  const icons = {
    building: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="18" x2="15" y2="18"/></svg>',
    candle: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="9" y1="2" x2="9" y2="6"/><rect x="6" y="6" width="6" height="8" rx="1" fill="currentColor" opacity="0.2"/><line x1="9" y1="14" x2="9" y2="18"/><line x1="17" y1="4" x2="17" y2="8"/><rect x="14" y="8" width="6" height="10" rx="1" fill="currentColor" opacity="0.2"/><line x1="17" y1="18" x2="17" y2="22"/></svg>',
    chart: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 20 8 14 13 17 21 7"/><line x1="17" y1="7" x2="21" y2="7"/><line x1="21" y1="7" x2="21" y2="11"/></svg>',
    indicator: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 12h2l3-8 4 16 3-8h6"/></svg>',
    shield: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
    brain: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5 4 7l3 4 3-4c2-2 4-4 4-7a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2"/></svg>',
    strategy: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
    tools: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    plan: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>',
    rocket: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
    orderflow: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/><path d="M2 20h20"/></svg>',
    options: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>',
    algo: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>',
    regime: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    portfolio: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>'
  };
  return icons[type] || icons.chart;
}

// --- Hero SVG ---
function getHeroSVG() {
  return `
    <svg viewBox="0 0 700 300" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <!-- Grid background -->
      <defs>
        <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.05"/>
        </linearGradient>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3b82f6"/>
          <stop offset="50%" stop-color="#10b981"/>
          <stop offset="100%" stop-color="#8b5cf6"/>
        </linearGradient>
        <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- Subtle grid -->
      <g opacity="0.06" stroke="#94a3b8" stroke-width="0.5">
        <line x1="0" y1="60" x2="700" y2="60"/>
        <line x1="0" y1="120" x2="700" y2="120"/>
        <line x1="0" y1="180" x2="700" y2="180"/>
        <line x1="0" y1="240" x2="700" y2="240"/>
        <line x1="140" y1="0" x2="140" y2="300"/>
        <line x1="280" y1="0" x2="280" y2="300"/>
        <line x1="420" y1="0" x2="420" y2="300"/>
        <line x1="560" y1="0" x2="560" y2="300"/>
      </g>

      <!-- Area fill under chart -->
      <path d="M50 200 L120 180 L180 195 L240 140 L300 155 L360 110 L420 130 L480 85 L540 100 L600 60 L650 75 L650 280 L50 280 Z" fill="url(#areaGrad)" opacity="0.4">
        <animate attributeName="opacity" values="0;0.4" dur="1.5s" fill="freeze"/>
      </path>

      <!-- Main chart line -->
      <polyline points="50,200 120,180 180,195 240,140 300,155 360,110 420,130 480,85 540,100 600,60 650,75"
        stroke="url(#lineGrad)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"
        stroke-dasharray="1200" stroke-dashoffset="1200">
        <animate attributeName="stroke-dashoffset" from="1200" to="0" dur="2s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1"/>
      </polyline>

      <!-- Candlesticks -->
      <g opacity="0" style="animation: fadeIn 0.5s ease 1.5s forwards">
        <!-- Green candle 1 -->
        <line x1="100" y1="170" x2="100" y2="210" stroke="#10b981" stroke-width="1.5"/>
        <rect x="94" y="180" width="12" height="20" rx="2" fill="#10b981" opacity="0.8"/>

        <!-- Red candle 2 -->
        <line x1="160" y1="175" x2="160" y2="215" stroke="#ef4444" stroke-width="1.5"/>
        <rect x="154" y="180" width="12" height="25" rx="2" fill="#ef4444" opacity="0.8"/>

        <!-- Green candle 3 -->
        <line x1="220" y1="130" x2="220" y2="165" stroke="#10b981" stroke-width="1.5"/>
        <rect x="214" y="135" width="12" height="22" rx="2" fill="#10b981" opacity="0.8"/>

        <!-- Green candle 4 -->
        <line x1="350" y1="95" x2="350" y2="135" stroke="#10b981" stroke-width="1.5"/>
        <rect x="344" y="100" width="12" height="25" rx="2" fill="#10b981" opacity="0.8"/>

        <!-- Red candle 5 -->
        <line x1="450" y1="110" x2="450" y2="150" stroke="#ef4444" stroke-width="1.5"/>
        <rect x="444" y="115" width="12" height="25" rx="2" fill="#ef4444" opacity="0.8"/>

        <!-- Green candle 6 -->
        <line x1="570" y1="50" x2="570" y2="90" stroke="#10b981" stroke-width="1.5"/>
        <rect x="564" y="55" width="12" height="28" rx="2" fill="#10b981" opacity="0.8"/>
      </g>

      <!-- Floating data cards -->
      <g style="animation: float 3s ease-in-out infinite" opacity="0" >
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-8;0,0" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;1" dur="0.5s" begin="2s" fill="freeze"/>
        <rect x="460" y="30" width="120" height="50" rx="10" fill="#111827" stroke="#1e293b" stroke-width="1"/>
        <text x="475" y="50" fill="#94a3b8" font-size="10" font-family="Inter">P&amp;L Today</text>
        <text x="475" y="68" fill="#10b981" font-size="16" font-weight="700" font-family="JetBrains Mono">+$2,847</text>
      </g>

      <g style="animation: floatReverse 4s ease-in-out infinite" opacity="0">
        <animate attributeName="opacity" values="0;1" dur="0.5s" begin="2.3s" fill="freeze"/>
        <rect x="80" y="100" width="110" height="50" rx="10" fill="#111827" stroke="#1e293b" stroke-width="1"/>
        <text x="95" y="120" fill="#94a3b8" font-size="10" font-family="Inter">Win Rate</text>
        <text x="95" y="138" fill="#3b82f6" font-size="16" font-weight="700" font-family="JetBrains Mono">67.3%</text>
      </g>

      <!-- Glowing dot at latest price -->
      <circle cx="650" cy="75" r="5" fill="#10b981" opacity="0">
        <animate attributeName="opacity" values="0;1" dur="0.3s" begin="2s" fill="freeze"/>
        <animate attributeName="r" values="4;7;4" dur="2s" begin="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="650" cy="75" r="3" fill="#10b981" opacity="0">
        <animate attributeName="opacity" values="0;1" dur="0.3s" begin="2s" fill="freeze"/>
      </circle>
    </svg>`;
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  Progress.load();
  updateUI();
  Animations.init();

  // Load saved module or home
  const saved = Progress.getCurrentModule();
  navigateTo(saved || 'home');

  // Sidebar overlay click
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
});
