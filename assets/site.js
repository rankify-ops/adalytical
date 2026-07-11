/* Adalytical — interactions */
(function () {
  'use strict';

  // Nav: shrink / frost on scroll
  var nav = document.querySelector('.nav');
  var floatCta = document.querySelector('.float-cta');
  function onScroll() {
    var y = window.scrollY;
    if (nav) nav.classList.toggle('scrolled', y > 40);
    if (floatCta) floatCta.classList.toggle('show', y > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile drawer
  var tog = document.querySelector('.mob-tog');
  var drawer = document.querySelector('.mdrawer');
  function setDrawer(open) {
    if (!drawer || !tog) return;
    drawer.classList.toggle('open', open);
    tog.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (tog) tog.addEventListener('click', function () {
    setDrawer(!drawer.classList.contains('open'));
  });
  if (drawer) drawer.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setDrawer(false); });
  });

  // Marquee: clone logo set to always cover the viewport, keep two identical
  // halves so the -50% loop wraps seamlessly at any screen width
  (function setupMarquee() {
    var track = document.querySelector('.marquee-track');
    if (!track) return;
    var kids = Array.prototype.slice.call(track.children);
    var base = kids.slice(0, Math.floor(kids.length / 2)).map(function (n) { return n.cloneNode(true); });
    if (!base.length) return;
    function appendSet() {
      base.forEach(function (n) { track.appendChild(n.cloneNode(true)); });
    }
    function build() {
      track.style.animation = 'none';
      track.innerHTML = '';
      appendSet();
      var setW = track.getBoundingClientRect().width;
      if (!setW) { track.style.animation = ''; return; }
      var copies = Math.max(1, Math.ceil((window.innerWidth * 1.15) / setW));
      for (var c = 1; c < copies; c++) appendSet();
      var halfW = track.getBoundingClientRect().width;
      Array.prototype.slice.call(track.children).forEach(function (n) {
        var clone = n.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      });
      track.style.animation = '';
      track.style.animationDuration = Math.max(18, Math.round(halfW / 70)) + 's';
    }
    build();
    window.addEventListener('load', build);
    var lastW = window.innerWidth, rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (window.innerWidth !== lastW) { lastW = window.innerWidth; build(); }
      }, 250);
    });
  })();

  // Hero grid: cubes darken in a staircase sequence (right, up, right, up…),
  // each new cube lighting as the previous returns to normal. A few run at
  // different points and times; a shared occupancy map keeps any two from
  // lighting the same cube or one right next to another.
  (function setupCubeSequence() {
    var grid = document.querySelector('.hero-grid');
    if (!grid) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var SIZE = 164, OFFY = 0, STEP = 560, MAX_STEPS = 8;
    var occupied = {};

    function dims() {
      var r = grid.getBoundingClientRect();
      return { cols: Math.ceil(r.width / SIZE), rows: Math.ceil(r.height / SIZE) };
    }
    // blocked if this cell or any of its 8 neighbours is held by another walker
    function blocked(col, row, mine) {
      for (var dc = -1; dc <= 1; dc++) {
        for (var dr = -1; dr <= 1; dr++) {
          var k = (col + dc) + ',' + (row + dr);
          if (occupied[k] && !mine[k]) return true;
        }
      }
      return false;
    }
    function litCell(col, row, mine) {
      var k = col + ',' + row;
      var c = document.createElement('div');
      c.className = 'hg-cell';
      c.style.transform = 'translate(' + (col * SIZE) + 'px,' + (row * SIZE + OFFY) + 'px)';
      grid.appendChild(c);
      void c.offsetWidth; // commit opacity:0 so the transition to 1 fires
      c.style.opacity = '1';
      c._key = k; c._mine = mine;
      occupied[k] = true; mine[k] = true;
      return c;
    }
    function fade(c) {
      if (!c) return;
      c.style.opacity = '0';
      // hold the slot until the cube has fully faded, so nothing lights beside a dimming one
      setTimeout(function () {
        if (c._key) { delete occupied[c._key]; if (c._mine) delete c._mine[c._key]; }
        if (c.parentNode) c.parentNode.removeChild(c);
      }, 600);
    }
    function walk() {
      var d = dims();
      var mine = {};
      var col, row, tries = 0;
      do {
        col = Math.floor(Math.random() * Math.max(1, d.cols - 5));
        row = Math.min(d.rows - 1, 3 + Math.floor(Math.random() * Math.max(1, d.rows - 4)));
        tries++;
      } while (blocked(col, row, mine) && tries < 40);
      if (blocked(col, row, mine)) { setTimeout(walk, 1200 + Math.random() * 1800); return; }
      var prev = null, goRight = true, steps = 0;
      (function step() {
        if (row < 0 || col >= d.cols || steps >= MAX_STEPS || blocked(col, row, mine)) {
          fade(prev);
          setTimeout(walk, 2200 + Math.random() * 3200);
          return;
        }
        var cur = litCell(col, row, mine);
        fade(prev);
        prev = cur;
        if (goRight) col++; else row--;
        goRight = !goRight;
        steps++;
        setTimeout(step, STEP);
      })();
    }
    var walkers = window.innerWidth < 700 ? 1 : 3;
    for (var i = 0; i < walkers; i++) {
      setTimeout(walk, i * 1400 + Math.random() * 900);
    }
  })();

  // Testimonial rows: same clone-to-fill + exact-halves treatment
  (function setupReviewRows() {
    document.querySelectorAll('.tst-track').forEach(function (track) {
      var base = Array.prototype.slice.call(track.children).map(function (n) { return n.cloneNode(true); });
      if (!base.length) return;
      function appendSet() {
        base.forEach(function (n) { track.appendChild(n.cloneNode(true)); });
      }
      function build() {
        track.style.animation = 'none';
        track.innerHTML = '';
        appendSet();
        var setW = track.getBoundingClientRect().width;
        if (!setW) { track.style.animation = ''; return; }
        var copies = Math.max(1, Math.ceil((window.innerWidth * 1.15) / setW));
        for (var c = 1; c < copies; c++) appendSet();
        var halfW = track.getBoundingClientRect().width;
        Array.prototype.slice.call(track.children).forEach(function (n) {
          var clone = n.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          track.appendChild(clone);
        });
        track.style.animation = '';
        track.style.animationDuration = Math.max(24, Math.round(halfW / 55)) + 's';
      }
      build();
      window.addEventListener('load', build);
      var lastW = window.innerWidth, rt;
      window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () {
          if (window.innerWidth !== lastW) { lastW = window.innerWidth; build(); }
        }, 250);
      });
    });
  })();

  // Services accordion (one open at a time)
  document.querySelectorAll('.srow-head').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.closest('.srow');
      var wasOpen = row.classList.contains('open');
      document.querySelectorAll('.srow.open').forEach(function (r) {
        r.classList.remove('open');
        r.querySelector('.srow-head').setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        row.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Count-up numbers
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function startCount(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var target = parseFloat(el.dataset.target);
    if (isNaN(target)) return;
    var dec = parseInt(el.dataset.decimals || '0', 10);
    var prefix = el.dataset.prefix || '';
    var suffix = el.dataset.suffix || '';
    var group = el.dataset.group === '1';
    var dur = 1400;
    var t0 = null;
    function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var val = target * easeOutCubic(p);
      var txt = dec ? val.toFixed(dec) : Math.round(val).toString();
      if (group) txt = Number(txt).toLocaleString('en-US');
      el.textContent = prefix + txt + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Section-by-section reveal with staggered children
  var secs = document.querySelectorAll('.rvsec');
  secs.forEach(function (sec) {
    sec.querySelectorAll('.rv').forEach(function (el, i) {
      el.style.setProperty('--i', i);
    });
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('vis');
          e.target.querySelectorAll('.cnt').forEach(startCount);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    secs.forEach(function (sec) { io.observe(sec); });
  } else {
    secs.forEach(function (sec) {
      sec.classList.add('vis');
      sec.querySelectorAll('.cnt').forEach(startCount);
    });
  }

  // Safety: force-reveal anything already in the viewport if IO hasn't fired
  setTimeout(function () {
    secs.forEach(function (sec) {
      if (sec.classList.contains('vis')) return;
      var r = sec.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        sec.classList.add('vis');
        sec.querySelectorAll('.cnt').forEach(startCount);
      }
    });
  }, 1200);

  // Current year in footer
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
