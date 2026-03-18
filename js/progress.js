/* ============================================
   DAY TRADING COURSE — Progress Tracking
   ============================================ */

const Progress = {
  STORAGE_KEY: 'daytrade_progress',

  _data: null,

  _defaults() {
    return {
      completedModules: [],
      quizScores: {},
      currentModule: 'home',
      totalScore: 0,
      lastVisit: null,
      streak: 0,
      checklistItems: {}
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this._data = raw ? JSON.parse(raw) : this._defaults();
    } catch {
      this._data = this._defaults();
    }
    this._data.lastVisit = new Date().toISOString();
    this.save();
    return this._data;
  },

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._data));
    } catch {
      // localStorage full or unavailable
    }
  },

  getData() {
    if (!this._data) this.load();
    return this._data;
  },

  // Module completion
  completeModule(moduleNum) {
    const data = this.getData();
    if (!data.completedModules.includes(moduleNum)) {
      data.completedModules.push(moduleNum);
      this.save();
    }
  },

  uncompleteModule(moduleNum) {
    const data = this.getData();
    data.completedModules = data.completedModules.filter(m => m !== moduleNum);
    this.save();
  },

  isModuleCompleted(moduleNum) {
    return this.getData().completedModules.includes(moduleNum);
  },

  getCompletedCount() {
    return this.getData().completedModules.length;
  },

  getProgressPercent() {
    return Math.round((this.getCompletedCount() / 10) * 100);
  },

  // Quiz scores
  setQuizScore(quizId, score, total) {
    const data = this.getData();
    data.quizScores[quizId] = { score, total, timestamp: Date.now() };
    this._recalcTotalScore();
    this.save();
  },

  getQuizScore(quizId) {
    return this.getData().quizScores[quizId] || null;
  },

  _recalcTotalScore() {
    const data = this.getData();
    let total = 0;
    Object.values(data.quizScores).forEach(q => {
      total += q.score;
    });
    data.totalScore = total;
  },

  getTotalScore() {
    return this.getData().totalScore;
  },

  // Current module
  setCurrentModule(module) {
    const data = this.getData();
    data.currentModule = module;
    this.save();
  },

  getCurrentModule() {
    return this.getData().currentModule;
  },

  // Checklist items
  toggleChecklist(key) {
    const data = this.getData();
    data.checklistItems[key] = !data.checklistItems[key];
    this.save();
    return data.checklistItems[key];
  },

  isChecklistChecked(key) {
    return !!this.getData().checklistItems[key];
  },

  // Reset
  reset() {
    this._data = this._defaults();
    this.save();
  }
};
