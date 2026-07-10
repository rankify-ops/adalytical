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
