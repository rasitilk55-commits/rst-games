// Kelebek Sarkaç: kaotik çift sarkacın ucundaki kelebeği doğru anda bırak, çiçeğe konsun.
// Sarkaç her denemede aynı hareketi yapar (deterministik), bu yüzden ritim öğrenilebilir.

// Ayarlanmış seviye yerleşimi önbelleği: aynı seviye aynı ekranda tekrar hesaplanmaz (yeniden deneme anında başlar).
const tuneCache = new Map();

export function createGame(api) {
  const W0 = 400, DT = 1 / 240, GRAV = 520, FG = 560, VK = 0.62, DRAG = 0.35;
  let W = 0, H = 0, DPR = 1, SC = 1, WH = 0;
  const P = {};
  let spec = null, LV = null;
  let H1 = [], H2 = [], HW1 = [], HW2 = [], k = 0, st = [0, 0, 0, 0];
  let state = 'idle', relK = -1, flight = null, fi = 0, ghost = null, readyAt = 0, hintK = null, flashOn = false, acc = 0;
  let lastGhost = null; // {key, k}
  let boostSlow = false, boostWide = false, tuning = false;

  const specKey = () => spec.level + '|' + spec.seed;

  /* ---------- Seviye ---------- */
  function makeLevel(n, seed) {
    const r = api.rng(seed ?? n * 9973 + 17);
    const chaos = Math.min(1, (n - 1) / 12);
    return {
      n,
      th1: 0.9 + chaos * 1.5 + r() * 0.4,
      th2: 1.1 + chaos * 1.8 + r() * 0.5,
      ratio: 0.8 + r() * 0.45,
      m2: 0.6 + r() * 0.8,
      tx: 0.14 + r() * 0.72,
      ty: r(),
      R: Math.max(24, 66 - n * 3.2),
      wind: n >= 4 ? Math.round((r() * 2 - 1) * (50 + n * 6)) : 0,
      move: n >= 7 ? { amp: 26 + r() * 40, sp: 0.6 + r() * 0.8 } : null,
      obs: n >= 10 ? { fx: 0.28 + r() * 0.44, fy: r() } : null,
    };
  }
  function setupWorld() {
    P.offX = (W / SC - W0) / 2;
    P.gy = WH - 64;
    P.px = W0 / 2;
    P.py = Math.max(118, WH * 0.2);
    const L = Math.min(98, (P.gy - P.py) * 0.34);
    P.L1 = L;
    P.L2 = L * LV.ratio;
    P.R = LV.R * (!tuning && boostWide ? 1.45 : 1); // Geniş Çiçek gücü (zorluk ayarı güçsüz yapılır)
    P.tx = 40 + LV.tx * (W0 - 80);
    const lowest = P.py + P.L1 + P.L2 + 30;
    P.ty = Math.min(P.gy - 34, lowest + (P.gy - 34 - lowest) * LV.ty);
    if (P.ty < lowest) P.ty = P.gy - 34;
    P.wind = LV.wind;
    P.move = LV.move;
    P.obs = LV.obs ? { x: 60 + LV.obs.fx * (W0 - 120), y: P.py + 40 + LV.obs.fy * (P.ty - P.py - 80), r: 14 } : null;
    if (P.obs && Math.hypot(P.obs.x - P.tx, P.obs.y - P.ty) < P.R + 40) P.obs.x = P.tx > W0 / 2 ? P.tx - P.R - 70 : P.tx + P.R + 70;
  }
  const targetAt = (t) => ({ x: P.tx + (P.move ? P.move.amp * Math.sin(t * P.move.sp * 2) : 0), y: P.ty });

  /* ---------- Fizik (RK4) ---------- */
  function accel(t1, t2, w1, w2) {
    const m1 = 1, m2 = LV.m2, l1 = P.L1, l2 = P.L2, g = GRAV, d = t1 - t2, den = 2 * m1 + m2 - m2 * Math.cos(2 * d);
    return [
      (-g * (2 * m1 + m2) * Math.sin(t1) - m2 * g * Math.sin(t1 - 2 * t2) - 2 * Math.sin(d) * m2 * (w2 * w2 * l2 + w1 * w1 * l1 * Math.cos(d))) / (l1 * den),
      (2 * Math.sin(d) * (w1 * w1 * l1 * (m1 + m2) + g * (m1 + m2) * Math.cos(t1) + w2 * w2 * l2 * m2 * Math.cos(d))) / (l2 * den),
    ];
  }
  function stepPend() {
    const [a, b, c, d] = st, h = DT;
    const k1 = accel(a, b, c, d), s1 = [c, d, k1[0], k1[1]];
    const k2 = accel(a + s1[0] * h / 2, b + s1[1] * h / 2, c + s1[2] * h / 2, d + s1[3] * h / 2), s2 = [c + s1[2] * h / 2, d + s1[3] * h / 2, k2[0], k2[1]];
    const k3 = accel(a + s2[0] * h / 2, b + s2[1] * h / 2, c + s2[2] * h / 2, d + s2[3] * h / 2), s3 = [c + s2[2] * h / 2, d + s2[3] * h / 2, k3[0], k3[1]];
    const k4 = accel(a + s3[0] * h, b + s3[1] * h, c + s3[2] * h, d + s3[3] * h), s4 = [c + s3[2] * h, d + s3[3] * h, k4[0], k4[1]];
    for (let i = 0; i < 4; i++) st[i] += h / 6 * (s1[i] + 2 * s2[i] + 2 * s3[i] + s4[i]);
    H1.push(st[0]); H2.push(st[1]); HW1.push(st[2]); HW2.push(st[3]);
  }
  function ensureHist(n) { while (H1.length <= n) stepPend(); }
  function joints(i) {
    const t1 = H1[i], t2 = H2[i];
    const x1 = P.px + P.L1 * Math.sin(t1), y1 = P.py + P.L1 * Math.cos(t1);
    return { x1, y1, x2: x1 + P.L2 * Math.sin(t2), y2: y1 + P.L2 * Math.cos(t2) };
  }
  function bobAt(i) {
    const t1 = H1[i], t2 = H2[i], w1 = HW1[i], w2 = HW2[i], j = joints(i);
    return { x: j.x2, y: j.y2, vx: P.L1 * Math.cos(t1) * w1 + P.L2 * Math.cos(t2) * w2, vy: -P.L1 * Math.sin(t1) * w1 - P.L2 * Math.sin(t2) * w2 };
  }
  function simFlight(i) {
    let { x, y, vx, vy } = bobAt(i);
    vx *= VK; vy *= VK;
    const path = [[x, y]];
    let minD = 1e9, inside = false, prev = 1e9;
    for (let s = 1; s <= 1400; s++) {
      const t = (i + s) * DT;
      vx += (P.wind - vx * DRAG) * DT;
      vy += (FG - vy * DRAG) * DT;
      x += vx * DT;
      y += vy * DT;
      const T = targetAt(t), d = Math.hypot(x - T.x, y - T.y);
      if (inside && d > prev) return { path, hit: true, best: prev, i };
      path.push([x, y]);
      if (d < minD) minD = d;
      if (d < P.R) { inside = true; prev = d; continue; }
      if (inside) return { path, hit: true, best: prev, i };
      if (P.obs && Math.hypot(x - P.obs.x, y - P.obs.y) < P.obs.r + 4) return { path, hit: false, minD, i, block: true };
      if (y > P.gy || x < -60 || x > W0 + 60) break;
    }
    return { path, hit: false, minD, i };
  }
  // Bulunan isabetin çevresindeki bütün isabetli anları tarar ve ortadakini seçer (insan hassasiyetine uygun).
  function centerOf(i) {
    let a = i, b = i;
    ensureHist(i + 80);
    while (a - 1 >= 150 && simFlight(a - 1).hit) a--;
    while (b + 1 < i + 80 && simFlight(b + 1).hit) b++;
    const m = Math.round((a + b) / 2);
    return { ...simFlight(m), width: b - a + 1 };
  }
  function findGhost(i0) {
    ensureHist(i0 + 250);
    for (let d = 1; d <= 240; d++) {
      for (const sgn of [-1, 1]) {
        const i = i0 + sgn * d;
        if (i < 150) continue; // ipucu anı en az 0,6 sn sonra olmalı ki dokunulabilsin
        if (simFlight(i).hit) {
          const c = centerOf(i);
          return { ...c, di: c.i - i0 };
        }
      }
    }
    return null;
  }
  function findFirstHit() {
    for (let i = 150; i < 240 * 12; i += 2) {
      ensureHist(i + 2);
      if (simFlight(i).hit) return centerOf(i).i;
    }
    return null;
  }

  /* ---------- Akış ---------- */
  function resetHist() {
    st = [LV.th1, LV.th2, 0, 0];
    H1 = [st[0]]; H2 = [st[1]]; HW1 = [0]; HW2 = [0];
  }
  // 0,6–6 sn arasında bırakılan anların yüzde kaçı isabetli? En uzun kesintisiz isabet dizisi de ölçülür.
  function scanRate(stride = 6) {
    let hit = 0, n = 0, run = 0, bestRun = 0, bestEnd = -1;
    for (let i = 150; i < 1440; i += stride) {
      ensureHist(i); n++;
      if (simFlight(i).hit) { hit++; run++; if (run > bestRun) { bestRun = run; bestEnd = i; } } else run = 0;
    }
    return { rate: hit / n, run: bestRun, at: bestEnd };
  }
  const hitRate = (stride = 6) => scanRate(stride).rate;
  // Bir isabet anını içeren kesintisiz isabet penceresinin tam genişliği (adım; 1 adım = 1/240 sn).
  function windowAt(i) {
    let a = i, b = i;
    ensureHist(i + 400);
    while (a - 1 >= 150 && simFlight(a - 1).hit) a--;
    while (b + 1 < i + 400 && simFlight(b + 1).hit) b++;
    lastSpan = [a, b];
    return b - a + 1;
  }
  let lastSpan = [0, 0];
  // İnsan için gereken en dar pencere: ilk seviyelerde 125 ms, sonra 83 ms, ileri seviyelerde 58 ms.
  const minWindow = (n) => (n <= 5 ? 30 : n <= 15 ? 20 : 14);
  // Zorluk eğrisi: ilk seviyeler kolay (~%40 isabet), sonra giderek zorlaşır (~%6).
  // Çiçeğin yeri, hedef zorluğa en yakın ve insanın yakalayabileceği genişlikte bir pencere bırakan adaylardan seçilir.
  // Hiçbir aday uygun değilse çiçek büyütülür. Böylece imkânsız seviye çıkmaz (tools/test/kelebek-levels.mjs doğrular).
  function tuneTarget() {
    const n = spec.level, want = Math.max(0.06, 0.45 - n * 0.035), need = minWindow(n);
    const key = specKey() + '|' + Math.round(WH);
    const cached = tuneCache.get(key);
    if (cached) { Object.assign(LV, cached); setupWorld(); return; }
    const r = api.rng((spec.seed ?? n * 7919) + 101);
    const R0 = LV.R;
    let best = null;
    tuning = true;
    for (let grow = 0; grow < 6 && !best; grow++) {
      LV.R = R0 * (1 + grow * 0.15);
      const cands = [];
      for (let c = 0; c < 14; c++) {
        if (c > 0 || grow > 0) { LV.tx = 0.1 + r() * 0.8; LV.ty = r(); }
        setupWorld();
        resetHist();
        const sc = scanRate(8);
        if (!(sc.rate > 0 && sc.run >= 2)) continue;
        const cand = { score: Math.abs(sc.rate - want), tx: LV.tx, ty: LV.ty, at: sc.at };
        // Hedef zorluğa yeterince yakın ve penceresi geniş aday bulunduysa aramayı bitir (telefonda hızlı açılış).
        if (cand.score < 0.03 + want * 0.3 && windowAt(sc.at) >= need) { cands.length = 0; cands.push(cand); break; }
        cands.push(cand);
      }
      cands.sort((a, b) => a.score - b.score);
      for (const c of cands.slice(0, 5)) {
        LV.tx = c.tx; LV.ty = c.ty; setupWorld(); resetHist(); ensureHist(c.at);
        const w = windowAt(c.at);
        if (w >= need) { best = { tx: c.tx, ty: c.ty, R: LV.R, win: w }; break; }
      }
    }
    if (!best) best = { tx: 0.5, ty: 1, R: R0 * 2.2, win: 0 }; // son çare: dev çiçek, sarkacın hemen altında
    tuning = false;
    tuneCache.set(key, { tx: best.tx, ty: best.ty, R: best.R });
    LV.tx = best.tx; LV.ty = best.ty; LV.R = best.R;
    lastWin = best.win;
    setupWorld();
  }
  let lastWin = 0;
  let ffwd = 1;
  let autoRel = -1; // yalnızca testler / mağaza görüntüleri: belirli adımda otomatik bırak
  function begin() {
    const bs = spec.boosters || [];
    boostSlow = bs.includes('slow');
    boostWide = bs.includes('wide');
    LV = makeLevel(spec.level, spec.seed);
    setupWorld();
    tuneTarget();
    resetHist();
    k = 0; relK = -1; flight = null; fi = 0; ghost = null; acc = 0;
    hintK = null;
    if (spec.hint) {
      hintK = lastGhost && lastGhost.key === specKey() ? lastGhost.k : findFirstHit();
      // geçmişi sıfırla: hesaplama sırasında ileri simüle edildi, oyun baştan başlamalı
      st = [LV.th1, LV.th2, 0, 0];
      H1 = [st[0]]; H2 = [st[1]]; HW1 = [0]; HW2 = [0];
    }
    state = 'swing';
    readyAt = performance.now() + 450;
    const subs = [];
    if (P.wind) subs.push(api.t('wind') + ' ' + (P.wind > 0 ? '→' : '←'));
    if (P.move) subs.push(api.t('swaying'));
    if (P.obs) subs.push(api.t('thorn'));
    api.hud(null, spec.mode === 'daily' ? api.t('dailySub') : subs.join(' · ') || api.t('subDefault'));
    api.tip(hintK != null ? api.t('tipHint') : api.t('tip'));
    flashOn = false;
    api.flash(null);
  }
  function release() {
    if (state !== 'swing' || performance.now() < readyAt) return;
    relK = k;
    flight = simFlight(k);
    fi = 0;
    state = 'fly';
    api.tip(null);
    api.flash(null);
    api.sfx('tap');
    api.haptic('light');
  }
  function endFlight() {
    state = 'result';
    if (flight.hit) {
      const q = flight.best / P.R, stars = q < 0.3 ? 3 : q < 0.65 ? 2 : 1;
      api.win({ stars, base: stars * 10 + (stars === 3 ? 10 : 0) });
      return;
    }
    ghost = findGhost(relK);
    if (ghost) lastGhost = { key: specKey(), k: ghost.i };
    let lead, msg;
    if (ghost) {
      const s = ghost.di * DT;
      lead = api.t(s < 0 ? 'early' : 'late', { s: api.fmtSec(s) });
      msg = api.t('landWould');
    } else if (flight.minD < P.R * 1.8) {
      lead = api.t('close');
      msg = api.t('closeMsg');
    } else {
      msg = api.t('chaos');
    }
    api.fail({ title: flight.block ? api.t('blocked') : api.t('failTitle'), lead, msg, hintAvailable: !!ghost });
  }

  /* ---------- Çizim ---------- */
  const X = (x) => (x + P.offX) * SC * DPR, Y = (y) => y * SC * DPR, Z = (v) => v * SC * DPR;
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  function wingCol(sk, t, alt) {
    if (!sk.rainbow) return alt ? sk.b : sk.a;
    return `hsl(${(t * 90 + (alt ? 60 : 0)) % 360} 90% ${alt ? 78 : 62}%)`;
  }
  function butterfly(c, x, y, s, ang, flap, sk, t) {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    const f = 0.25 + 0.75 * Math.abs(Math.cos(flap));
    for (const side of [-1, 1]) {
      c.fillStyle = wingCol(sk, t, false);
      c.beginPath(); c.ellipse(side * s * 0.55 * f, -s * 0.28, s * 0.6 * f, s * 0.42, side * 0.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = wingCol(sk, t, true);
      c.beginPath(); c.ellipse(side * s * 0.42 * f, s * 0.28, s * 0.4 * f, s * 0.3, -side * 0.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.6)';
      c.beginPath(); c.arc(side * s * 0.6 * f, -s * 0.32, s * 0.1, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#2B2340';
    c.beginPath(); c.ellipse(0, 0, s * 0.1, s * 0.5, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#2B2340';
    c.lineWidth = Math.max(1, s * 0.06);
    c.beginPath(); c.moveTo(0, -s * 0.45); c.lineTo(-s * 0.2, -s * 0.8); c.moveTo(0, -s * 0.45); c.lineTo(s * 0.2, -s * 0.8); c.stroke();
    c.restore();
  }
  function drawScene(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H * DPR);
    g.addColorStop(0, '#FFE3D3'); g.addColorStop(0.55, '#F3D9E6'); g.addColorStop(1, '#D9D2F5');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W * DPR, H * DPR);
    const sx = W * DPR * 0.82, sy = H * DPR * 0.2, sr = Z(90);
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    sg.addColorStop(0, 'rgba(255,241,210,.95)'); sg.addColorStop(1, 'rgba(255,241,210,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E7C6DC';
    ctx.beginPath(); ctx.moveTo(0, Y(P.gy - 40));
    for (let x = 0; x <= W * DPR; x += 20) ctx.lineTo(x, Y(P.gy - 46) + Math.sin((x / (W * DPR)) * 6.3 + 1) * Z(16));
    ctx.lineTo(W * DPR, H * DPR); ctx.lineTo(0, H * DPR); ctx.fill();
    ctx.fillStyle = '#8CC7A1'; ctx.fillRect(0, Y(P.gy), W * DPR, H * DPR - Y(P.gy));
    ctx.fillStyle = '#74B78C'; ctx.fillRect(0, Y(P.gy), W * DPR, Z(6));
    if (P.wind) {
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = Z(1.6); ctx.lineCap = 'round';
      const span = W / SC + 60, sp = P.wind > 0 ? 1 : -1;
      for (let i = 0; i < 9; i++) {
        const x = (((i * 97 + t * Math.abs(P.wind) * 0.9 * sp) % span) + span) % span - 30 - P.offX;
        const y = 60 + i * ((P.gy - 120) / 9);
        ctx.beginPath(); ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(x) + Z(22) * sp, Y(y)); ctx.stroke();
      }
    }
    // dal
    ctx.strokeStyle = '#6B4F3A'; ctx.lineCap = 'round'; ctx.lineWidth = Z(7);
    ctx.beginPath(); ctx.moveTo(0, Y(P.py - 26)); ctx.quadraticCurveTo(X(P.px - 60), Y(P.py - 18), X(P.px + 18), Y(P.py - 2)); ctx.stroke();
    ctx.fillStyle = '#5FAE7E';
    [[-90, -30], [-40, -24], [10, -12]].forEach(([dx, dy], i) => { ctx.beginPath(); ctx.ellipse(X(P.px + dx), Y(P.py + dy), Z(11), Z(6), -0.5 + i * 0.3, 0, Math.PI * 2); ctx.fill(); });
    // diken
    if (P.obs) {
      const o = P.obs;
      ctx.fillStyle = '#6B4F3A'; ctx.beginPath(); ctx.arc(X(o.x), Y(o.y), Z(o.r * 0.7), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4A3528';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(X(o.x + Math.cos(a) * o.r * 0.6), Y(o.y + Math.sin(a) * o.r * 0.6));
        ctx.lineTo(X(o.x + Math.cos(a + 0.2) * o.r * 1.25), Y(o.y + Math.sin(a + 0.2) * o.r * 1.25));
        ctx.lineTo(X(o.x + Math.cos(a + 0.4) * o.r * 0.6), Y(o.y + Math.sin(a + 0.4) * o.r * 0.6));
        ctx.fill();
      }
    }
  }
  function drawFlower(ctx, t) {
    const T = targetAt(t), R = P.R;
    ctx.strokeStyle = '#4E9E6E'; ctx.lineWidth = Z(4); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(X(T.x), Y(T.y + R * 0.4)); ctx.quadraticCurveTo(X(T.x + 8), Y((T.y + P.gy) / 2), X(P.tx), Y(P.gy + 4)); ctx.stroke();
    ctx.fillStyle = '#5FAE7E'; ctx.beginPath(); ctx.ellipse(X(P.tx + 10), Y((T.y + P.gy) / 2 + 10), Z(10), Z(5), 0.6, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 0.2;
      ctx.fillStyle = i % 2 ? '#FF8FA3' : '#FFA4B5';
      ctx.beginPath(); ctx.ellipse(X(T.x + Math.cos(a) * R * 0.62), Y(T.y + Math.sin(a) * R * 0.62), Z(R * 0.42), Z(R * 0.25), a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#FFD36B'; ctx.beginPath(); ctx.arc(X(T.x), Y(T.y), Z(R * 0.38), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(217,145,43,.5)'; ctx.lineWidth = Z(1.5); ctx.beginPath(); ctx.arc(X(T.x), Y(T.y), Z(R * 0.18), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(43,35,64,.14)'; ctx.setLineDash([Z(4), Z(5)]); ctx.beginPath(); ctx.arc(X(T.x), Y(T.y), Z(R), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  function drawPendulum(ctx, t, i, withBfly) {
    const j = joints(i), sk = api.skin();
    const n = Math.min(i, 300);
    if (n > 2) {
      ctx.lineCap = 'round';
      for (let q = i - n + 1; q <= i; q += 2) {
        const a = joints(q - 1), b = joints(q), al = (q - (i - n)) / n;
        ctx.strokeStyle = sk.rainbow ? `hsla(${(q * 2) % 360},90%,62%,${al * 0.55})` : hexA(sk.a, al * 0.55);
        ctx.lineWidth = Z(1 + al * 2.6);
        ctx.beginPath(); ctx.moveTo(X(a.x2), Y(a.y2)); ctx.lineTo(X(b.x2), Y(b.y2)); ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(43,35,64,.75)'; ctx.lineWidth = Z(2.2);
    ctx.beginPath(); ctx.moveTo(X(P.px), Y(P.py)); ctx.lineTo(X(j.x1), Y(j.y1)); ctx.lineTo(X(j.x2), Y(j.y2)); ctx.stroke();
    ctx.fillStyle = '#2B2340';
    [[P.px, P.py, 4], [j.x1, j.y1, 5]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(X(x), Y(y), Z(r), 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2B2340'; ctx.lineWidth = Z(2);
    ctx.beginPath(); ctx.arc(X(j.x2), Y(j.y2), Z(5), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (withBfly) butterfly(ctx, X(j.x2), Y(j.y2 - 10), Z(15), 0, t * 3, sk, t);
    return j;
  }
  function drawHint(ctx, j) {
    if (hintK == null || state !== 'swing') return;
    const rem = hintK - k;
    if (rem <= 150 && rem >= -6) {
      const r = Math.max(0, rem) / 150;
      ctx.strokeStyle = 'rgba(255,107,90,.9)'; ctx.lineWidth = Z(3);
      ctx.beginPath(); ctx.arc(X(j.x2), Y(j.y2 - 4), Z(14 + r * 60), 0, Math.PI * 2); ctx.stroke();
    }
    const on = rem <= 48 && rem >= -4; // tepki süresi için ~0,2 sn önceden uyar
    if (on !== flashOn) { flashOn = on; api.flash(on ? api.t('now') : null); }
  }
  function drawPath(ctx, path, upto, col, dash, w) {
    if (path.length < 2) return;
    ctx.strokeStyle = col; ctx.lineWidth = Z(w); ctx.setLineDash(dash ? [Z(5), Z(6)] : []);
    ctx.beginPath(); ctx.moveTo(X(path[0][0]), Y(path[0][1]));
    for (let q = 1; q <= Math.min(upto, path.length - 1); q += 2) ctx.lineTo(X(path[q][0]), Y(path[q][1]));
    ctx.stroke(); ctx.setLineDash([]);
  }

  return {
    start(s) { spec = s; if (W) begin(); },
    resize(w, h, dpr) {
      W = w; H = h; DPR = dpr; SC = Math.min(W, 560) / W0; WH = H / SC;
      if (spec) { if (state === 'swing' || state === 'idle') begin(); else setupWorld(); }
    },
    pointer(type) { if (type === 'down') release(); },
    frame(ctx, dt, t) {
      if (!LV) return;
      acc += dt * (boostSlow ? 0.5 : 1) * (autoRel >= 0 ? ffwd : 1); // Yavaş Çekim gücü: zaman yarı hızda akar
      while (acc >= DT) {
        acc -= DT;
        stepPend();
        k++;
        if (autoRel === k && state === 'swing') { autoRel = -1; readyAt = 0; release(); }
        if (state === 'fly') { fi++; if (fi >= flight.path.length - 1) { endFlight(); break; } }
      }
      drawScene(ctx, t);
      const tT = state === 'swing' ? k * DT : (relK + Math.min(fi, flight ? flight.path.length - 1 : 0)) * DT;
      drawFlower(ctx, tT);
      const j = drawPendulum(ctx, t, k, state === 'swing');
      drawHint(ctx, j);
      const sk = api.skin();
      if (flight) {
        drawPath(ctx, flight.path, fi, hexA(state === 'result' && !flight.hit ? '#2B2340' : sk.a, 0.35), true, 2);
        if (ghost && state === 'result') {
          drawPath(ctx, ghost.path, ghost.path.length, 'rgba(255,255,255,.95)', true, 2.4);
          const g = ghost.path[ghost.path.length - 1];
          butterfly(ctx, X(g[0]), Y(g[1]), Z(13), 0, t * 2, { a: '#FFFFFF', b: '#F4F0FA' }, t);
        }
        const p = flight.path[Math.min(fi, flight.path.length - 1)];
        const pp = flight.path[Math.max(0, Math.min(fi, flight.path.length - 1) - 3)];
        const ang = state === 'fly' ? Math.atan2(p[1] - pp[1], p[0] - pp[0]) + Math.PI / 2 : 0;
        butterfly(ctx, X(p[0]), Y(p[1]), Z(15), state === 'fly' ? ang * 0.35 : 0, state === 'fly' ? t * 22 : t * 3, sk, t);
      }
    },
    // Test yardımcısı: 0,6–6 sn arasında bırakılan anların yüzde kaçı isabet ediyor?
    __probe() { const r = hitRate(3); resetHist(); return r; },
    // Test yardımcısı: seviyenin isabet oranı, en geniş pencere ve gereken en dar pencere.
    // ff: bırakma anına kadar zamanı hızlandır (yavaş test makineleri için); bırakınca normal hıza döner
    __releaseAt(step, ff = 1) { autoRel = step; ffwd = ff; },
    __analyze() {
      // Geçmiş yalnızca ileri uzatılır (sıfırlanmaz): oyun sürerken çağrılsa da sarkacın zamanı kaymaz.
      const sc = scanRate(2), w = sc.at >= 0 ? windowAt(sc.at) : 0;
      return { rate: sc.rate, window: w, need: minWindow(spec.level), R: LV.R, tuned: lastWin, center: Math.round((lastSpan[0] + lastSpan[1]) / 2), span: lastSpan.slice() };
    },
    drawSkin(c, w, h, skin, t) { butterfly(c, w / 2, h / 2 + h * 0.06, h * 0.3, 0, 0.4, skin, t); },
  };
}
