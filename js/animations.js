/* ============================================
   DAY TRADING COURSE — Animations Engine
   ============================================ */

const Animations = {
  observer: null,

  init() {
    this.setupScrollReveal();
  },

  setupScrollReveal() {
    if (this.observer) this.observer.disconnect();

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Don't unobserve — allows re-animation if needed
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    this.observeElements();
  },

  observeElements() {
    const selectors = '.reveal, .reveal-left, .reveal-right, .reveal-scale';
    document.querySelectorAll(selectors).forEach(el => {
      this.observer.observe(el);
    });
  },

  // Call after dynamic content load
  refresh() {
    // Small delay to let DOM settle
    requestAnimationFrame(() => {
      this.observeElements();
    });
  },

  // Animate SVG draw-in
  drawSVG(selector) {
    document.querySelectorAll(selector).forEach(el => {
      el.classList.add('animate');
    });
  },

  // Animate counter from 0 to target
  animateCounter(element, target, duration = 1000) {
    const start = 0;
    const startTime = performance.now();
    const isDecimal = target % 1 !== 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;

      element.textContent = isDecimal ? current.toFixed(2) : Math.round(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  },

  // Typewriter effect
  typewriter(element, text, speed = 30) {
    return new Promise(resolve => {
      element.textContent = '';
      let i = 0;
      function type() {
        if (i < text.length) {
          element.textContent += text.charAt(i);
          i++;
          setTimeout(type, speed);
        } else {
          resolve();
        }
      }
      type();
    });
  },

  // Shake element (error feedback)
  shake(element) {
    element.style.animation = 'shake 0.4s ease';
    element.addEventListener('animationend', () => {
      element.style.animation = '';
    }, { once: true });
  },

  // Pop-in effect
  popIn(element) {
    element.style.animation = 'popIn 0.4s ease forwards';
  },

  // Stagger animate children
  staggerIn(parent, delay = 80) {
    const children = parent.children;
    Array.from(children).forEach((child, i) => {
      child.style.opacity = '0';
      child.style.transform = 'translateY(20px)';
      setTimeout(() => {
        child.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        child.style.opacity = '1';
        child.style.transform = 'translateY(0)';
      }, i * delay);
    });
  }
};
