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
  if (drawer) {
    var closeBtn = drawer.querySelector('.mdrawer-close');
    if (closeBtn) closeBtn.addEventListener('click', function () { setDrawer(false); });
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setDrawer(false); });
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) setDrawer(false);
  });

  // Marquee: clone logo set to always cover the viewport, keep two identical
  // halves so the -50% loop wraps seamlessly at any screen width
  (function setupMarquee() {
    var track = document.querySelector('.marquee-track');
    if (!track) return;
    var kids = Array.prototype.slice.call(track.children);
    var setCount = Math.max(1, Math.floor(kids.length / 2)); // markup lists the logos twice
    var base = kids.slice(0, setCount).map(function (n) { return n.cloneNode(true); });
    if (!base.length) return;
    var SPEED = 70; // px per second — constant regardless of how many copies fit
    var setW = 0;   // width of one logo set (measured once, after images load)
    function appendSet() { base.forEach(function (n) { track.appendChild(n.cloneNode(true)); }); }
    function build() {
      if (!setW) return;
      track.style.animation = 'none';
      track.innerHTML = '';
      // enough sets to comfortably cover the viewport, then duplicate the lot for a seamless -50% loop
      var sets = Math.max(2, Math.ceil((window.innerWidth * 1.25) / setW));
      var i;
      for (i = 0; i < sets; i++) appendSet();
      var contentW = setW * sets;
      for (i = 0; i < sets; i++) appendSet();
      Array.prototype.slice.call(track.children).forEach(function (n) { n.setAttribute('aria-hidden', 'true'); });
      // duration derived from real width => identical scroll speed on every load
      track.style.animation = '';
      track.style.animationDuration = (contentW / SPEED).toFixed(2) + 's';
    }
    function measure() { setW = track.getBoundingClientRect().width / 2; if (setW < 10) setW = 0; }
    // build only once the logo images have real dimensions, so the width (and speed) is deterministic
    var imgs = Array.prototype.slice.call(track.querySelectorAll('img'));
    var total = imgs.length, loaded = 0, started = false;
    function go() {
      if (started) return; started = true;
      // measure after a frame so the layout has settled with the loaded image sizes
      requestAnimationFrame(function () { requestAnimationFrame(function () { measure(); build(); }); });
    }
    if (!total) { go(); }
    else {
      imgs.forEach(function (img) {
        if (img.complete && img.naturalWidth) { if (++loaded >= total) go(); }
        else {
          var h = function () { if (++loaded >= total) go(); };
          img.addEventListener('load', h, { once: true });
          img.addEventListener('error', h, { once: true });
        }
      });
      setTimeout(go, 3000); // safety net if an image never fires
    }
    var lastW = window.innerWidth, rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (window.innerWidth !== lastW && setW) { lastW = window.innerWidth; build(); }
      }, 250);
    });
  })();

  // Hero grid: cube columns are sized to the content container so a column
  // line lands exactly on each rail (logo-left & CTA-right) — the header rails
  // and body cube lines become one continuous, evenly-padded frame.
  // Cubes darken in a staircase sequence (right, up, right, up…), each new
  // cube lighting as the previous returns to normal; a shared occupancy map
  // keeps any two walkers from lighting the same or a neighbouring cube.
  (function setupCubeSequence() {
    var grid = document.querySelector('.hero-grid');
    var ctr = document.querySelector('.hero .ctr');
    if (!grid || !ctr) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var STEP = 560, MAX_STEPS = 8;
    var occupied = {};
    var lay = { cw: 164, x0: 0, cols: 1, rows: 1 };

    // derive cell size from the content width so columns align to both rails
    function computeLayout() {
      var cs = getComputedStyle(ctr);
      var cr = ctr.getBoundingClientRect();
      var gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 0;
      // round to whole pixels so the vertical lines render as a crisp 1px (not a soft 2px)
      var frameLeft = Math.round(cr.left + parseFloat(cs.paddingLeft) - gutter);
      var frameRight = Math.round(cr.right - parseFloat(cs.paddingRight) + gutter);
      var W = Math.max(1, frameRight - frameLeft);
      var N = Math.max(1, Math.round(W / 164));
      var cw = W / N;
      // snap the hero height to whole cube rows so its bottom row is a full cube
      // (matches the strip's cube height and keeps the last row from clipping)
      var GRID_TOP = 63;
      var heroEl = grid.parentElement;
      var statsEl = heroEl.querySelector('.hero-stats');
      if (statsEl) {
        var contentBottomRel = statsEl.getBoundingClientRect().bottom - heroEl.getBoundingClientRect().top;
        var k = Math.max(1, Math.ceil((contentBottomRel + 18 - GRID_TOP) / cw));
        heroEl.style.minHeight = (GRID_TOP + k * cw) + 'px';
        heroEl.style.paddingBottom = '0px';
      }
      var gr = grid.getBoundingClientRect();
      var clInGrid = frameLeft - gr.left;            // frame-left within the grid box
      lay = {
        cw: cw,
        x0: ((clInGrid % cw) + cw) % cw,             // leftmost column line ≥ 0
        cols: Math.ceil(gr.width / cw) + 1,
        rows: Math.ceil(gr.height / cw) + 1
      };
      grid.style.backgroundSize = cw + 'px ' + cw + 'px';
      grid.style.backgroundPosition = clInGrid + 'px 0px'; // a line on each rail
      // expose to CSS so the logo strip can match the cube height, frame lines & fades
      var root = document.documentElement.style;
      root.setProperty('--cell', cw + 'px');
      root.setProperty('--frame-left', frameLeft + 'px');
      root.setProperty('--frame-right', frameRight + 'px');
      // center the little cube clusters in cube cells (the diamond sparkles stay put)
      var spots = [[0.9, 0.16], [0.9, 0.82], [0.08, 0.78]];
      grid.querySelectorAll('.hg-cluster').forEach(function (el, i) {
        var f = spots[i] || spots[spots.length - 1];
        var col = Math.round((f[0] * gr.width - lay.x0 - lay.cw / 2) / lay.cw);
        var row = Math.round((f[1] * gr.height - lay.cw / 2) / lay.cw);
        var cx = lay.x0 + col * lay.cw + lay.cw / 2;
        var cy = row * lay.cw + lay.cw / 2;
        cx = Math.max(lay.cw / 2, Math.min(cx, gr.width - lay.cw / 2));
        cy = Math.max(lay.cw / 2, Math.min(cy, gr.height - lay.cw / 2));
        el.style.left = cx + 'px';
        el.style.top = cy + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.transform = 'translate(-50%,-50%)';
      });
    }

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
      c.style.width = lay.cw + 'px';
      c.style.height = lay.cw + 'px';
      c.style.transform = 'translate(' + (lay.x0 + col * lay.cw) + 'px,' + (row * lay.cw) + 'px)';
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
      var cols = lay.cols, rows = lay.rows;
      var mine = {};
      var col, row, tries = 0;
      do {
        col = Math.floor(Math.random() * Math.max(1, cols - 5));
        row = Math.min(rows - 1, 3 + Math.floor(Math.random() * Math.max(1, rows - 4)));
        tries++;
      } while (blocked(col, row, mine) && tries < 40);
      if (blocked(col, row, mine)) { setTimeout(walk, 1200 + Math.random() * 1800); return; }
      var prev = null, goRight = true, steps = 0;
      (function step() {
        if (row < 0 || col >= lay.cols || steps >= MAX_STEPS || blocked(col, row, mine)) {
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

    computeLayout();
    window.addEventListener('load', computeLayout);
    var lastW = window.innerWidth, rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (window.innerWidth !== lastW) { lastW = window.innerWidth; computeLayout(); } }, 220);
    });
    if (!reduce) {
      var walkers = window.innerWidth < 700 ? 1 : 3;
      for (var i = 0; i < walkers; i++) {
        setTimeout(walk, i * 1400 + Math.random() * 900);
      }
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

  // Mega menu / dropdown: JS-driven open with a close delay so crossing the
  // gap between the nav item and the panel never drops the menu.
  (function setupMenus() {
    var items = document.querySelectorAll('.nav-l > li.has-mega, .nav-l > li.has-drop');
    items.forEach(function (li) {
      var t;
      li.addEventListener('mouseenter', function () {
        clearTimeout(t);
        items.forEach(function (o) { if (o !== li) o.classList.remove('open'); });
        li.classList.add('open');
      });
      li.addEventListener('mouseleave', function () {
        clearTimeout(t);
        t = setTimeout(function () { li.classList.remove('open'); }, 260);
      });
      // a click on the top link toggles (touch / keyboard friendly)
      var top = li.querySelector('a');
      if (top) top.addEventListener('click', function (e) {
        if (top.getAttribute('href') === '#') e.preventDefault();
      });
    });
  })();

  // Case study videos: click a play button to swap in the YouTube embed.
  // Set data-yt="VIDEO_ID" on the .vid-panel / .phone-frame to enable.
  document.querySelectorAll('.vid-play, .phone-play').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = btn.closest('[data-yt]');
      var id = panel && panel.getAttribute('data-yt');
      if (!id) return; // no video wired up yet
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      iframe.allow = 'accelerated-plc; autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      panel.querySelectorAll('.vid-play,.phone-play,.vid-tag,.vid-stats,.phone-tag,.phone-notch').forEach(function (el) { el.remove(); });
      panel.appendChild(iframe);
    });
  });

  // Current year in footer
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();

/* ================ MULTI-STEP LEAD FORM MODAL ================ */
(function () {
  var FORM_ENDPOINT = ''; // <-- paste a Formspree endpoint (https://formspree.io/f/xxxx) to receive leads by email

  var IC = {
    cart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 6h15l-1.5 9h-12z" stroke-linejoin="round"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>',
    wrench:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14.5 5.5a3.5 3.5 0 0 0-4.9 4.9L4 16v4h4l5.6-5.6a3.5 3.5 0 0 0 4.9-4.9L16 12l-2-2z" stroke-linejoin="round"/></svg>',
    code:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 8l-4 4 4 4M15 8l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3 2 20h20z" stroke-linejoin="round"/><path d="M12 10v4M12 17h.01" stroke-linecap="round"/></svg>',
    q:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3M12 17h.01" stroke-linecap="round"/></svg>',
    plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 9v6M9 12h6" stroke-linecap="round"/></svg>'
  };
  var ARROW = '<svg class="mo-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function opt(val, icon) { return '<button type="button" class="mform-opt" data-val="' + val + '"><span class="mo-ico">' + icon + '</span>' + val + ARROW + '</button>'; }
  var BACK = '<button type="button" class="mform-back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>Back</button>';

  var html =
    '<div class="mform" role="dialog" aria-modal="true" aria-label="Book a strategy call">' +
      '<div class="mform-head"><span class="mform-brand">Book a strategy call</span><div class="mform-progress"><i></i></div><button type="button" class="mform-close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12" stroke-linecap="round"/></svg></button></div>' +
      '<div class="mform-body">' +
        '<div class="mform-step active">' +
          '<span class="mform-eyebrow">Step 1 of 3</span><h3 class="mform-q">What do you need Google Ads for?</h3><p class="mform-sub">So we can tailor your strategy to how you actually make money.</p>' +
          '<div class="mform-opts" data-key="goal">' + opt('E-commerce store',IC.cart) + opt('Service-based business',IC.wrench) + opt('SaaS / software',IC.code) + opt('Something else',IC.grid) + '</div>' +
        '</div>' +
        '<div class="mform-step">' +
          '<span class="mform-eyebrow">Step 2 of 3</span><h3 class="mform-q">Is your website built to convert customers?</h3><p class="mform-sub">The best campaign still fails on a page that does not convert.</p>' +
          '<div class="mform-opts" data-key="website">' + opt('Yes, it converts well',IC.check) + opt('No, it needs work',IC.warn) + opt('Not sure',IC.q) + opt('I need a new site',IC.plus) + '</div>' +
          '<div class="mform-actions">' + BACK + '</div>' +
        '</div>' +
        '<div class="mform-step">' +
          '<span class="mform-eyebrow">Step 3 of 3</span><h3 class="mform-q">Where should we send your strategy?</h3><div class="mform-summary"></div>' +
          '<form class="mform-form" novalidate>' +
            '<div class="mform-field"><label>Your name</label><input name="name" type="text" placeholder="Jane Smith" autocomplete="name"></div>' +
            '<div class="mform-field"><label>Email</label><input name="email" type="email" placeholder="jane@company.com" autocomplete="email"></div>' +
            '<div class="mform-field"><label>Website</label><input name="site" type="text" placeholder="yourcompany.com" autocomplete="url"></div>' +
            '<div class="mform-field"><label>Monthly ad spend (optional)</label><select name="spend"><option value="">Select a range</option><option>Not running ads yet</option><option>Under $5k / mo</option><option>$5k to $20k / mo</option><option>$20k to $50k / mo</option><option>$50k+ / mo</option></select></div>' +
            '<div class="mform-field"><label>Anything else? (optional)</label><textarea name="msg" placeholder="Tell us a bit about your goals..."></textarea></div>' +
            '<div class="mform-actions">' + BACK + '<button type="submit" class="mform-submit">Book my call <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
          '</form>' +
        '</div>' +
        '<div class="mform-step"><div class="mform-succ"><div class="mform-succ-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h3>You are all set.</h3><p>Thanks &mdash; we have your details. An ex-Google strategist will be in touch within one business day to lock in your call.</p><button type="button" class="mform-submit mform-done" style="margin:0 auto">Done</button></div></div>' +
      '</div>' +
    '</div>';

  var overlay = document.createElement('div');
  overlay.className = 'mform-overlay';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  var steps = overlay.querySelectorAll('.mform-step');
  var bar = overlay.querySelector('.mform-progress i');
  var summary = overlay.querySelector('.mform-summary');
  var pct = [33, 66, 100, 100];
  var data = {};
  var cur = 0;

  function show(i) {
    cur = i;
    for (var k = 0; k < steps.length; k++) steps[k].classList.toggle('active', k === i);
    bar.style.width = pct[i] + '%';
    if (i === 2) {
      summary.innerHTML = (data.goal ? '<span class="mform-chip">' + data.goal + '</span>' : '') + (data.website ? '<span class="mform-chip">' + data.website + '</span>' : '');
    }
  }
  function open() { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; show(0); }
  function close() { overlay.classList.remove('open'); document.body.style.overflow = ''; }

  overlay.querySelectorAll('.mform-opts').forEach(function (grp) {
    grp.addEventListener('click', function (e) {
      var b = e.target.closest('.mform-opt'); if (!b) return;
      grp.querySelectorAll('.mform-opt').forEach(function (o) { o.classList.remove('sel'); });
      b.classList.add('sel');
      data[grp.getAttribute('data-key')] = b.getAttribute('data-val');
      setTimeout(function () { show(cur + 1); }, 170);
    });
  });
  overlay.querySelectorAll('.mform-back').forEach(function (b) { b.addEventListener('click', function () { if (cur > 0) show(cur - 1); }); });
  overlay.querySelector('.mform-close').addEventListener('click', close);
  overlay.querySelector('.mform-done').addEventListener('click', close);
  overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });

  var form = overlay.querySelector('.mform-form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.name.value.trim(), email = form.email.value.trim(), ok = true;
    if (!name) { form.name.classList.add('err'); ok = false; } else form.name.classList.remove('err');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { form.email.classList.add('err'); ok = false; } else form.email.classList.remove('err');
    if (!ok) return;
    var payload = { goal: data.goal || '', website_state: data.website || '', name: name, email: email, site: form.site.value.trim(), monthly_spend: form.spend.value, message: form.msg.value.trim(), page: location.href };
    var btn = form.querySelector('.mform-submit'); btn.disabled = true; btn.textContent = 'Sending...';
    function done() { show(3); }
    if (FORM_ENDPOINT) {
      fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) }).then(done).catch(done);
    } else {
      console.log('[Adalytical lead]', payload); // no endpoint wired yet — visible for testing
      setTimeout(done, 450);
    }
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('#book') !== -1) { e.preventDefault(); open(); }
  });
  window.AdalyticalOpenForm = open;
})();

/* ---- Spotlight + border-glow card grids (vanilla "Magic Bento") ---- */
(function () {
  var grids = document.querySelectorAll('.glow-grid');
  if (!grids.length || !window.matchMedia || matchMedia('(pointer:fine)').matches === false) return;
  grids.forEach(function (grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.why-card'));
    if (!cards.length) return;
    var mx = 0, my = 0, raf = null;
    function paint() {
      raf = null;
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i], r = card.getBoundingClientRect();
        card.style.setProperty('--gx', (mx - r.left) + 'px');
        card.style.setProperty('--gy', (my - r.top) + 'px');
        var dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
        var dist = Math.sqrt(dx * dx + dy * dy);
        var reach = Math.max(r.width, r.height) * 0.9 + 240;
        var g = 1 - dist / reach;
        card.style.setProperty('--glow', (g > 0 ? g : 0).toFixed(3));
      }
    }
    grid.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    });
    grid.addEventListener('pointerleave', function () {
      for (var i = 0; i < cards.length; i++) cards[i].style.setProperty('--glow', '0');
    });
  });
})();
