// ─── Robot power cable (home page) ───────────────────────────
// A cable trails from the robot in the hero. Its plug follows the
// reader down the page — through gutters and empty bands, slipping
// behind cards and photos — and at the very end clicks into the
// socket. Power surges back up the cable and the robot gets up and dances.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HEAD_AT = 0.68;   // plug sits ~68% down the viewport
  const PLUG_BODY = 26;   // plug length from cable joint to prong base

  const robot  = document.querySelector('.robot');
  const port   = robot.querySelector('.r-port');
  const socket = document.querySelector('.socket');
  const label  = document.querySelector('.socket-label');
  const bubble = document.querySelector('.robot-bubble');

  const svg = document.createElementNS(NS, 'svg');
  svg.id = 'cable';
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <g transform="translate(2 5)"><path class="cable-shadow c-run"/><path class="cable-shadow c-tether"/></g>
    <path class="cable-main c-run"/><path class="cable-main c-tether"/>
    <g transform="translate(-0.8 -1.3)"><path class="cable-shine c-run"/><path class="cable-shine c-tether"/></g>
    <path class="cable-flow c-full"/>
    <path class="cable-surge c-full"/>
    <g class="plug">
      <rect x="-5" y="-4.5" width="10" height="9" rx="3" fill="#3A3354"/>
      <rect x="2" y="-10" width="24" height="20" rx="5" fill="#4A4366" stroke="#2B2640" stroke-width="1.2"/>
      <path d="M9 -6 V6 M13.5 -6 V6 M18 -6 V6" stroke="rgba(255,255,255,0.28)" stroke-width="1.4" stroke-linecap="round"/>
      <rect x="26" y="-7" width="12" height="3.6" rx="1.2" fill="#C9CCD6"/>
      <rect x="26" y="3.4" width="12" height="3.6" rx="1.2" fill="#C9CCD6"/>
    </g>`;
  document.body.prepend(svg);
  const runPaths    = svg.querySelectorAll('.c-run');
  const tetherPaths = svg.querySelectorAll('.c-tether');
  const fullPaths   = svg.querySelectorAll('.c-full');
  const surge       = svg.querySelector('.cable-surge');
  const plug        = svg.querySelector('.plug');

  // ── Geometry helpers ──
  const docRect = el => {
    const r = el.getBoundingClientRect();
    return { left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY,
             bottom: r.bottom + scrollY, width: r.width, height: r.height };
  };
  // Bounding box of the actual glyphs inside el (not its full-width block box)
  const textBounds = el => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT,
      { acceptNode: n => n.textContent.trim() ? 1 : 3 });
    const range = document.createRange();
    let b = null;
    while (walker.nextNode()) {
      range.selectNodeContents(walker.currentNode);
      for (const q of range.getClientRects()) {
        if (!q.width) continue;
        b = b ? { left: Math.min(b.left, q.left), right: Math.max(b.right, q.right),
                  top: Math.min(b.top, q.top), bottom: Math.max(b.bottom, q.bottom) }
              : { left: q.left, right: q.right, top: q.top, bottom: q.bottom };
      }
    }
    return { left: b.left + scrollX, right: b.right + scrollX,
             top: b.top + scrollY, bottom: b.bottom + scrollY };
  };
  // Map a point in an inline SVG's viewBox to document coordinates
  const svgPoint = (svgEl, x, y) => {
    const m = svgEl.getScreenCTM();
    return [m.a * x + m.c * y + m.e + scrollX, m.b * x + m.d * y + m.f + scrollY];
  };
  const $ = s => document.querySelector(s);
  const headerOf = sel => textBounds($(sel).closest('section').querySelector('.section-header'));

  let X, Y, S, MAXY, total, docH, anchor, plugEnd;

  function waypoints() {
    const vw = document.documentElement.clientWidth;
    const mobile = vw <= 768;
    svg.style.setProperty('--w', mobile ? 4.5 : 6);
    const content = mobile ? vw * 0.05 : Math.max(vw * 0.04, (vw - 1360) / 2 + 1360 * 0.04);
    const R = vw - content / 2, L = content / 2;
    const PAD = 28;
    const rightOf = b => Math.min(vw - 12, (b.right + PAD + vw) / 2);
    const leftOf  = b => Math.max(12, (b.left - PAD) / 2);
    const midY = b => (b.top + b.bottom) / 2;
    const pts = [];

    // Hero — starts at a floor anchor just right of the robot
    anchor = svgPoint(robot, 196, 121);
    const H = docRect($('.hero'));
    pts.push(anchor);
    if (mobile) pts.push([R, H.bottom - 12]);
    else pts.push([anchor[0] + (vw - anchor[0]) * 0.45, H.bottom - H.height * 0.05]);

    // Education — beside the heading, then under the cards and photos
    let hb = headerOf('.edu-grid');
    pts.push([rightOf(hb), midY(hb)]);
    const eg = docRect($('.edu-grid'));
    pts.push([eg.left + eg.width / 2, eg.top + eg.height * 0.55]);
    const ep = docRect($('.edu-photos'));
    pts.push([ep.left + ep.width * 0.22, midY(ep)]);
    pts.push([L, docRect($('.edu-grid').closest('section')).bottom]);

    // Experience — threads through the gap between the two cards
    hb = headerOf('.experience-list');
    pts.push([leftOf(hb), midY(hb)]);
    const xl = docRect($('.experience-list'));
    const cards = document.querySelectorAll('.exp-card');
    const c1 = docRect(cards[0]), c2 = docRect(cards[cards.length - 1]);
    pts.push([xl.left + xl.width * 0.62, (c1.bottom + c2.top) / 2]);
    pts.push([xl.left + xl.width * 0.85, c2.top + c2.height * 0.6]);
    pts.push([R, docRect($('.experience-list').closest('section')).bottom]);

    // Skills — rides in the open space right of the tag cloud
    hb = headerOf('.skills-group');
    pts.push([rightOf(hb), midY(hb)]);
    const sk = textBounds($('.skills-group').parentElement);
    const sx = rightOf(sk);
    pts.push([sx, sk.top + (sk.bottom - sk.top) * 0.2]);
    pts.push([sx, sk.bottom]);
    pts.push([vw * 0.5, docRect($('.skills-group').closest('section')).bottom]);

    // Interests — under the photo row, then straight into the socket
    hb = headerOf('.interests-photo-grid');
    pts.push([leftOf(hb), midY(hb)]);
    const ig = docRect($('.interests-photo-grid'));
    pts.push([ig.left + ig.width * 0.55, midY(ig)]);
    const face = svgPoint(socket, 8, 32);
    plugEnd = [face[0] - PLUG_BODY, face[1]];
    pts.push([plugEnd[0] - 170, face[1]]);
    pts.push([plugEnd[0] - 60, face[1]]);
    pts.push(plugEnd);
    return pts;
  }

  // Centripetal Catmull-Rom — smooth, no loops or cusps
  function sample(pts, step = 6) {
    const d = (a, b) => Math.max(1e-3, Math.hypot(b[0] - a[0], b[1] - a[1]));
    const n = pts.length;
    const P = [[2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]], ...pts,
               [2 * pts[n - 1][0] - pts[n - 2][0], 2 * pts[n - 1][1] - pts[n - 2][1]]];
    const out = [];
    for (let i = 1; i < P.length - 2; i++) {
      const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
      const t0 = 0, t1 = t0 + Math.sqrt(d(p0, p1)), t2 = t1 + Math.sqrt(d(p1, p2)), t3 = t2 + Math.sqrt(d(p2, p3));
      const steps = Math.max(2, Math.ceil(d(p1, p2) / step));
      for (let k = 0; k < steps; k++) {
        const t = t1 + (t2 - t1) * (k / steps);
        const mix = (a, b, ta, tb) => [((tb - t) * a[0] + (t - ta) * b[0]) / (tb - ta),
                                       ((tb - t) * a[1] + (t - ta) * b[1]) / (tb - ta)];
        const A1 = mix(p0, p1, t0, t1), A2 = mix(p1, p2, t1, t2), A3 = mix(p2, p3, t2, t3);
        const B1 = mix(A1, A2, t0, t2), B2 = mix(A2, A3, t1, t3);
        out.push(mix(B1, B2, t1, t2));
      }
    }
    out.push(pts[n - 1]);
    return out;
  }

  function build() {
    svg.style.height = '0px';
    docH = document.documentElement.scrollHeight;
    svg.style.height = docH + 'px';
    const pts = sample(waypoints());
    const n = pts.length;
    X = new Float32Array(n); Y = new Float32Array(n);
    S = new Float32Array(n); MAXY = new Float32Array(n);
    let d = '';
    for (let i = 0; i < n; i++) {
      X[i] = pts[i][0]; Y[i] = pts[i][1];
      S[i] = i ? S[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]) : 0;
      MAXY[i] = i ? Math.max(MAXY[i - 1], Y[i]) : Y[i];
      d += (i ? 'L' : 'M') + X[i].toFixed(1) + ' ' + Y[i].toFixed(1);
    }
    total = S[n - 1];
    const w = parseFloat(svg.style.getPropertyValue('--w'));
    for (const p of [...runPaths, ...fullPaths]) p.setAttribute('d', d);
    for (const p of [...runPaths, ...tetherPaths]) {
      p.style.strokeWidth = p.classList.contains('cable-shadow') ? w + 2 : p.classList.contains('cable-main') ? w : '';
    }
    for (const p of runPaths) p.style.strokeDasharray = `${total} ${total + 10}`;
    surge.style.strokeDasharray = `90 ${total + 90}`;
    lastHead = -1;
  }

  // How far along the cable the plug should be for this scroll position
  const atBottom = () => scrollY + innerHeight >= docH - 4;
  function targetLength() {
    if (connected) return total;
    if (atBottom()) return total;
    const hy = scrollY + innerHeight * HEAD_AT;
    let lo = 0, hi = MAXY.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; MAXY[mid] <= hy ? lo = mid : hi = mid - 1; }
    return Math.max(34, Math.min(S[lo], total - 140));
  }

  function pointAt(len) {
    let lo = 0, hi = S.length - 1;
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; S[mid] <= len ? lo = mid : hi = mid; }
    const seg = S[hi] - S[lo] || 1, f = Math.min(1, Math.max(0, (len - S[lo]) / seg));
    const a = Math.max(0, lo - 2), b = Math.min(S.length - 1, hi + 2);
    return [X[lo] + (X[hi] - X[lo]) * f, Y[lo] + (Y[hi] - Y[lo]) * f,
            Math.atan2(Y[b] - Y[a], X[b] - X[a]) * 180 / Math.PI];
  }

  let head = 0, lastHead = -1, connected = false;
  function render() {
    if (Math.abs(head - lastHead) > 0.05) {
      lastHead = head;
      for (const p of runPaths) p.style.strokeDashoffset = total - head;
      const [x, y, ang] = pointAt(head);
      plug.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
    }
    // Short slack lead from the robot's hip port to the floor anchor
    const pr = port.getBoundingClientRect();
    const px = pr.left + pr.width / 2 + scrollX, py = pr.top + pr.height / 2 + scrollY;
    const cx = (px + anchor[0]) / 2, cy = Math.max(py, anchor[1]) + 14;
    const td = `M${px.toFixed(1)} ${py.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${anchor[0].toFixed(1)} ${anchor[1].toFixed(1)}`;
    for (const p of tetherPaths) p.setAttribute('d', td);
  }

  // ── Power-up sequence ──
  function connect() {
    connected = true;
    document.body.classList.add('powered-page');
    label.disabled = false;
    label.textContent = 'Robot online · ↑ watch it dance';
    const powerRobot = () => {
      robot.classList.add('powered');
      new IntersectionObserver((entries, io) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        robot.classList.add('awake');
        bubble.textContent = 'Thanks for the power! ♪';
        setTimeout(() => bubble.classList.add('gone'), reduceMotion ? 2500 : 1800);
        setTimeout(() => robot.classList.add('dancing'), reduceMotion ? 0 : 1000);
      }, { threshold: 0.6 }).observe(robot);
    };
    if (reduceMotion) return powerRobot();
    // A bright pulse races from the socket back up to the robot
    surge.style.opacity = 1;
    surge.animate([{ strokeDashoffset: -total }, { strokeDashoffset: 90 }],
                  { duration: 1800, easing: 'cubic-bezier(.5,0,.75,0)' })
         .finished.then(() => { surge.style.opacity = 0; powerRobot(); });
  }
  label.addEventListener('click', () =>
    robot.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }));

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const target = targetLength();
    head = reduceMotion ? target : head + (target - head) * (1 - Math.exp(-dt * 4.5));
    if (!connected && target >= total && head >= total - 0.6) { head = total; connect(); }
    render();
    requestAnimationFrame(frame);
  }

  let pending = false;
  const rebuild = () => {
    if (pending) return; pending = true;
    requestAnimationFrame(() => { pending = false; build(); });
  };

  function start() {
    build();
    requestAnimationFrame(frame);
    new ResizeObserver(rebuild).observe(document.body);
    addEventListener('resize', rebuild);
    document.querySelectorAll('.fade-in').forEach(el => el.addEventListener('transitionend', rebuild));
  }
  document.fonts.ready.then(() => (document.readyState === 'complete' ? start() : addEventListener('load', start)));
})();
