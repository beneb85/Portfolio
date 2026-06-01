/* ============================================================
   motion.js — shared GSAP motion layer
   Features: masked heading reveals, image parallax, hero entrance.
   No smooth-scroll library — runs on native scroll.
   Degrades gracefully: if GSAP is missing or reduced-motion is
   requested, all content is shown in its final state.

   Hero handshake: index.html's intro overlay calls
   triggerHeroAnimation(), which sets window.__heroPlayPending and
   dispatches a 'hero:play' event. Because the inline intro script
   runs during parse (before this deferred file), we check the
   pending flag on load AND listen for future events.
   ============================================================ */
(function () {
  'use strict';

  const root = document.documentElement;
  const splitEls = () => Array.from(document.querySelectorAll('[data-split]'));
  const parallaxEls = () => Array.from(document.querySelectorAll('[data-parallax]'));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  const animate = hasGSAP && !reduce;

  // Reveal split headings to their final, static state (fallback path).
  function revealAll() {
    root.classList.add('motion-ready');
    splitEls().forEach(el => { el.style.visibility = 'visible'; });
  }

  // Original class-toggle hero entrance (no GSAP / reduced motion).
  function heroFallback() {
    document.querySelectorAll('.hero-animate').forEach(el => {
      const delay = (parseInt(el.dataset.delay || 0, 10) * 130);
      setTimeout(() => el.classList.add('hero-animate--visible'), delay);
    });
  }

  // ── Hero handshake (works in every path) ────────────────────────────
  let heroPlayed = false;
  let playHero = heroFallback; // replaced below in the GSAP path
  function runHeroOnce() {
    if (heroPlayed) return;
    heroPlayed = true;
    playHero();
  }
  document.addEventListener('hero:play', runHeroOnce);

  // ── Degraded path: no GSAP or reduced motion ────────────────────────
  if (!animate) {
    revealAll();
    if (window.__heroPlayPending) runHeroOnce();
    return;
  }

  // ── Full GSAP path ──────────────────────────────────────────────────
  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger, window.SplitText);

  // Make .hero-animate elements visible (GSAP now owns their state),
  // then immediately hide via GSAP to prevent any pre-entrance flash.
  // Only on pages that actually have a hero (the home page).
  root.classList.add('motion-ready');
  const heroTargets = document.querySelectorAll('.hero-headline, .hero-btn');
  if (heroTargets.length) gsap.set(heroTargets, { opacity: 0 });

  playHero = function playHeroEntrance() {
    const headline = document.querySelector('.hero-headline');
    const btn = document.querySelector('.hero-btn');
    if (!headline) return;
    // fromTo (not from): we pre-set opacity:0 above to avoid a flash, so a
    // plain .from() would animate 0 → 0. Explicit end state fixes that.
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(headline,
      { yPercent: 40, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.9 });
    if (btn) tl.fromTo(btn,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6 }, '-=0.45');
  };
  window.__motion = { playHeroEntrance: playHero };

  function setup() {
    // Feature A — masked line-by-line heading reveals.
    splitEls().forEach(el => {
      el.style.visibility = 'visible';
      const split = new window.SplitText(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'reveal-line'
      });
      gsap.from(split.lines, {
        yPercent: 110,
        duration: 0.85,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });

    // Feature B — subtle image parallax.
    // Image is upscaled to 1.12 in CSS → ~6% headroom on each edge.
    // Travelling ±6% uses exactly that headroom so edges never show.
    parallaxEls().forEach(img => {
      const box = img.closest('[data-parallax-box]') || img;
      gsap.fromTo(img, { yPercent: 6 }, {
        yPercent: -6,
        ease: 'none',
        scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    window.ScrollTrigger.refresh();
  }

  function init() {
    try {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => { try { setup(); } catch (e) { revealAll(); } });
      } else {
        setup();
      }
    } catch (e) {
      revealAll();
    }
    // If the intro already fired before this file loaded, play now.
    if (window.__heroPlayPending) runHeroOnce();
  }

  // Refresh triggers on resize (line breaks / layout change).
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => window.ScrollTrigger.refresh(), 250);
  }, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
