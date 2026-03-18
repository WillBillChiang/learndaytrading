/* ============================================
   DAY TRADING COURSE — Quiz Engine
   ============================================ */

const Quiz = {
  activeQuizzes: {},

  initAll() {
    document.querySelectorAll('.quiz-container[data-quiz]').forEach(container => {
      const quizId = container.dataset.quiz;
      const dataEl = container.querySelector('script[type="application/json"]');
      if (!dataEl) return;

      try {
        const config = JSON.parse(dataEl.textContent);
        this.init(quizId, container, config);
      } catch (e) {
        console.warn('Failed to parse quiz config:', quizId, e);
      }
    });
  },

  init(quizId, container, config) {
    const state = {
      questions: config.questions,
      currentIndex: 0,
      score: 0,
      answered: [],
      total: config.questions.length
    };
    this.activeQuizzes[quizId] = state;

    // Check for previous score
    const prev = Progress.getQuizScore(quizId);
    if (prev) {
      container.querySelector('.quiz-score').textContent = `Best: ${prev.score}/${prev.total}`;
    }

    this.renderQuestion(quizId, container);
  },

  renderQuestion(quizId, container) {
    const state = this.activeQuizzes[quizId];
    const q = state.questions[state.currentIndex];
    const qNum = state.currentIndex + 1;
    const total = state.total;

    const optionsHTML = q.options.map((opt, i) => {
      const letter = String.fromCharCode(65 + i);
      return `
        <button class="quiz-option" data-index="${i}" onclick="Quiz.selectAnswer('${quizId}', this, ${i})">
          <span class="quiz-option-marker">${letter}</span>
          <span>${opt}</span>
        </button>`;
    }).join('');

    const bodyEl = container.querySelector('.quiz-body');
    if (!bodyEl) return;

    bodyEl.innerHTML = `
      <div class="quiz-question">${qNum}. ${q.question}</div>
      <div class="quiz-options">${optionsHTML}</div>
      <div class="quiz-feedback" id="feedback-${quizId}"></div>
      <div class="quiz-actions">
        <button class="btn btn-primary btn-sm" id="next-${quizId}" style="display:none" onclick="Quiz.nextQuestion('${quizId}')">
          ${qNum < total ? 'Next Question →' : 'See Results'}
        </button>
        <span style="margin-left:auto;font-size:0.8rem;color:var(--text-muted)">${qNum} of ${total}</span>
      </div>`;

    // Progress dots
    const dotsEl = container.querySelector('.quiz-dots');
    if (dotsEl) {
      dotsEl.innerHTML = state.questions.map((_, i) => {
        let cls = 'quiz-dot';
        if (i < state.answered.length) {
          cls += state.answered[i] ? ' correct' : ' incorrect';
        }
        if (i === state.currentIndex) cls += ' active';
        return `<span class="${cls}"></span>`;
      }).join('');
    }
  },

  selectAnswer(quizId, btn, selectedIndex) {
    const container = btn.closest('.quiz-container');
    const state = this.activeQuizzes[quizId];
    const q = state.questions[state.currentIndex];
    const correctIndex = q.correct;

    // Disable all options
    container.querySelectorAll('.quiz-option').forEach(opt => {
      opt.classList.add('disabled');
      const idx = parseInt(opt.dataset.index);
      if (idx === correctIndex) {
        opt.classList.add('correct');
      } else if (idx === selectedIndex && idx !== correctIndex) {
        opt.classList.add('incorrect');
      }
    });

    // Feedback
    const feedback = container.querySelector(`#feedback-${quizId}`);
    const isCorrect = selectedIndex === correctIndex;
    state.answered.push(isCorrect);

    if (isCorrect) {
      state.score++;
      feedback.className = 'quiz-feedback correct';
      feedback.innerHTML = `<strong>✓ Correct!</strong> ${q.explanation || ''}`;
    } else {
      feedback.className = 'quiz-feedback incorrect';
      feedback.innerHTML = `<strong>✗ Incorrect.</strong> The correct answer is <strong>${q.options[correctIndex]}</strong>. ${q.explanation || ''}`;
      Animations.shake(btn);
    }

    // Show next button
    document.getElementById(`next-${quizId}`).style.display = 'inline-flex';
  },

  nextQuestion(quizId) {
    const state = this.activeQuizzes[quizId];
    const container = document.querySelector(`[data-quiz="${quizId}"]`);

    state.currentIndex++;

    if (state.currentIndex >= state.total) {
      this.showResults(quizId, container);
      return;
    }

    this.renderQuestion(quizId, container);
  },

  showResults(quizId, container) {
    const state = this.activeQuizzes[quizId];
    const percent = Math.round((state.score / state.total) * 100);
    const grade = percent >= 80 ? 'Excellent!' : percent >= 60 ? 'Good job!' : 'Keep studying!';
    const gradeColor = percent >= 80 ? 'var(--bull-green)' : percent >= 60 ? 'var(--accent-gold)' : 'var(--bear-red)';

    // Save score
    Progress.setQuizScore(quizId, state.score, state.total);
    updateUI();

    const bodyEl = container.querySelector('.quiz-body');
    bodyEl.innerHTML = `
      <div style="text-align:center;padding:var(--space-lg) 0">
        <div style="font-size:3rem;font-weight:800;color:${gradeColor};font-family:var(--font-mono);margin-bottom:var(--space-sm)">
          ${state.score}/${state.total}
        </div>
        <div style="font-size:1.1rem;color:${gradeColor};font-weight:600;margin-bottom:var(--space-sm)">${grade}</div>
        <div style="font-size:0.9rem;color:var(--text-muted);margin-bottom:var(--space-xl)">You scored ${percent}%</div>

        <div style="display:flex;gap:var(--space-sm);justify-content:center;flex-wrap:wrap;margin-bottom:var(--space-lg)">
          ${state.answered.map((correct, i) => `
            <span style="width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:600;
              background:${correct ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'};
              color:${correct ? 'var(--bull-green)' : 'var(--bear-red)'}">
              ${correct ? '✓' : '✗'}
            </span>`).join('')}
        </div>

        <button class="btn btn-secondary" onclick="Quiz.restart('${quizId}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          Retry Quiz
        </button>
      </div>`;

    container.querySelector('.quiz-score').textContent = `Score: ${state.score}/${state.total}`;

    if (percent >= 80) {
      showToast(`Quiz passed! ${state.score}/${state.total}`, 'success');
    }
  },

  restart(quizId) {
    const state = this.activeQuizzes[quizId];
    state.currentIndex = 0;
    state.score = 0;
    state.answered = [];

    const container = document.querySelector(`[data-quiz="${quizId}"]`);
    this.renderQuestion(quizId, container);
  }
};
