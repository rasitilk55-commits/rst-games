// Olay Ufku: kuyruklu yıldızı kara deliklerin kütleçekimiyle bükerek portala ulaştır.
// Bölümler önceden hesaplanmış ve doğrulanmıştır (levels.js, tools/olay-ufku/gen.mjs + verify.mjs).
// Fizik physics.js'de; oyun, üretici ve testler aynı kodu kullanır.
import { createSky } from './sky.js';
import { simulate, aimFromPull, mirrorLevel, LAUNCH, W0, H0, DT, MOTE_R, CR, PULL, P_MIN } from './physics.js';
import { LEVELS, DAILY, CHAPTERS } from './levels.js';

const ENDLESS = 7;

/** Seviye numarasından bölüm verisi: 1–100 kampanya, sonrası doğrulanmış bölümlerin aynalanmış/özgün tekrarı. */
export function levelFor(spec) {
  if (spec.mode === 'daily') {
    const L = DAILY[(spec.seed >>> 0) % DAILY.length];
    return { ...L, ch: 0 };
  }
  const n = Math.max(1, spec.level | 0);
  if (n <= LEVELS.length) return LEVELS[n - 1];
  const k = n - LEVELS.length - 1;
  const base = LEVELS[40 + (k % 60)];
  const loop = Math.floor(k / 60);
  return { ...(loop % 2 === 0 ? mirrorLevel(base) : base), ch: ENDLESS, id: n };
}
export const chapterStart = (n) => (n === LEVELS.length + 1 ? ENDLESS : (CHAPTERS.find((c) => c.from === n) || {}).id || 0);

export function createGame(api) {
  const sky = createSky();
  let W = 0, H = 0, DPR = 1, SC = 1, offX = 0, offY = 0;
  let spec = null, level = null, state = 'idle', R = 26;
  let drag = null, flight = null, fi = 0, acc = 0, readyAt = 0, parts = [], shake = 0, flash = 0, endAt = 0, endKind = '';
  let preview = null, hintPath = null, boostPath = false, got = [false, false, false], jumpIdx = 0;
  const introShown = new Set();
  let testSpeed = 1; // yalnızca testlerde hızlandırmak için
  let launches = 0; // öğretici el: ilk atışlara kadar gösterilir
  // Uyarlanır görüntü kalitesi: kare süresi uzarsa gökyüzü gölgelendiricisi daha düşük çözünürlükte çizilir.
  const Q_STEPS = [0.72, 0.58, 0.46];
  let qIdx = 0, frameAvg = 16, qCool = 0;
  const calm = !!api.reducedMotion; // Hareketi azalt: ekran sarsıntısı ve parlama kapalı

  /* ---------- Akış ---------- */
  function begin() {
    level = levelFor(spec);
    const bs = spec.boosters || [];
    boostPath = bs.includes('path');
    R = level.portal.R * (bs.includes('portal') ? 1.6 : 1);
    state = 'aim';
    drag = null; flight = null; fi = 0; acc = 0; parts = []; shake = 0; flash = 0; preview = null; jumpIdx = 0;
    got = [false, false, false];
    hintPath = spec.hint ? simulate(level, level.sol3.a, level.sol3.p, { record: true, R }).path : null;
    readyAt = performance.now() + 250;
    const chName = api.t('ch' + level.ch);
    api.hud(null, spec.mode === 'daily' ? api.t('dailySub') : level.ch === ENDLESS ? chName : api.t('chLabel', { n: level.ch, name: chName }));
    api.tip(hintPath ? api.t('tipHint') : api.t(level.ch === 5 && spec.level === 31 ? 'tipWorm' : level.ch === 4 && spec.level === 21 ? 'tipWhite' : 'tip'));
    const intro = spec.mode !== 'daily' && chapterStart(spec.level);
    if (intro && !introShown.has(spec.level)) {
      introShown.add(spec.level);
      setTimeout(() => api.toast(api.t('ch' + intro) + ' · ' + api.t('chIntro' + intro)), 400);
    }
  }
  function launch(aim) {
    flight = simulate(level, aim.a, aim.p, { record: true, R });
    fi = 0; acc = 0; jumpIdx = 0; launches++;
    state = 'fly';
    preview = null;
    api.tip(null);
    api.sfx('tap');
    api.haptic('medium');
    for (let i = 0; i < 18; i++) {
      const a = aim.a + Math.PI + (Math.random() - 0.5) * 1.2;
      parts.push({ x: LAUNCH.x, y: LAUNCH.y, vx: Math.cos(a) * (60 + Math.random() * 120), vy: Math.sin(a) * (60 + Math.random() * 120), t: 0, life: 0.5, col: api.skin().b });
    }
  }
  function burst(x, y, col, n, spd, life) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random());
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life, col });
    }
  }
  function finish() {
    state = 'done';
    flash = Math.min(flash, 0.1);
    const n = flight.got.filter(Boolean).length;
    if (flight.kind === 'win') {
      const stars = n >= 3 ? 3 : n >= 1 ? 2 : 1;
      api.win({ stars, base: 10 + n * 5 + (stars === 3 ? 10 : 0) + Math.min(20, Math.floor((level.ch || 0) * 2)), detail: api.t('dust', { n }) });
      return;
    }
    const near = flight.minD < R * 2.3;
    const k = flight.kind;
    const title = api.t({ swallow: 'swallowed', burn: 'burned', crash: 'crashed', lost: 'lost' }[k]);
    const msg = api.t({ swallow: 'swallowMsg', burn: 'burnMsg', crash: 'crashMsg', lost: 'lostMsg' }[k]);
    api.fail({ title, lead: near ? api.t('near') : null, msg, hintAvailable: true });
  }

  /* ---------- Çizim yardımcıları ---------- */
  const X = (x) => (x + offX) * SC * DPR, Y = (y) => (y + offY) * SC * DPR, Z = (v) => v * SC * DPR;
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  function comet(c, x, y, s, sk, t, vx = 1, vy = -1) {
    const col = sk.rainbow ? `hsl(${(t * 120) % 360} 95% 70%)` : sk.a;
    const pulse = sk.pulse ? 0.75 + 0.25 * Math.sin(t * 9) : 1;
    const g = c.createRadialGradient(x, y, 0, x, y, s * 3.2 * pulse);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, s * 3.2 * pulse, 0, Math.PI * 2); c.fill();
    const len = Math.hypot(vx, vy) || 1;
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = s * 0.25;
    c.beginPath(); c.moveTo(x - (vy / len) * s * 1.8, y + (vx / len) * s * 1.8); c.lineTo(x + (vy / len) * s * 1.8, y - (vx / len) * s * 1.8); c.stroke();
  }
  const isJump = (path, i) => Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]) > 40;
  function drawTrail(ctx, path, upto, sk, t) {
    const n = Math.min(70, upto);
    for (let i = upto - n + 1; i <= upto; i++) {
      if (i < 1 || isJump(path, i)) continue;
      const a = path[i - 1], b = path[i], k = (i - (upto - n)) / n;
      ctx.strokeStyle = sk.rainbow ? `hsla(${(i * 4 + t * 100) % 360},95%,65%,${k * 0.8})` : hexA(k > 0.6 ? sk.a : sk.b, k * 0.85);
      ctx.lineWidth = Z(0.5 + k * 5);
      ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(b[0]), Y(b[1])); ctx.stroke();
    }
  }
  function drawDots(ctx, path, upto, col, gap = 5) {
    ctx.fillStyle = col;
    const end = Math.min(upto, path.length);
    for (let i = gap; i < end; i += gap) {
      ctx.globalAlpha = 1 - (i / Math.max(end, 1)) * 0.7;
      ctx.beginPath(); ctx.arc(X(path[i][0]), Y(path[i][1]), Z(1.8), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawRock(ctx, k, t) {
    ctx.save();
    ctx.translate(X(k.x), Y(k.y));
    ctx.rotate(k.rot + t * k.spin);
    ctx.beginPath();
    k.v.forEach((m, i) => { const a = (i / k.v.length) * Math.PI * 2, rr = Z(k.r * m); i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); });
    ctx.closePath();
    const g = ctx.createRadialGradient(-Z(k.r * 0.4), -Z(k.r * 0.4), Z(1), 0, 0, Z(k.r * 1.2));
    g.addColorStop(0, '#8A7F92'); g.addColorStop(1, '#231D2B');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,140,.35)'; ctx.lineWidth = Z(1); ctx.stroke();
    ctx.restore();
  }
  function drawWorm(ctx, x, y, r, col, dir, t) {
    const g = ctx.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), Z(r * 2.2));
    g.addColorStop(0, hexA(col, 0.15)); g.addColorStop(0.45, hexA(col, 0.55)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X(x), Y(y), Z(r * 2.2), 0, Math.PI * 2); ctx.fill();
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a0 = t * 2.2 * dir + (i * Math.PI * 2) / 3;
      ctx.strokeStyle = hexA(col, 1); ctx.lineWidth = Z(3);
      ctx.beginPath(); ctx.arc(X(x), Y(y), Z(r), a0, a0 + 1.4); ctx.stroke();
      ctx.strokeStyle = hexA(col, 0.5); ctx.lineWidth = Z(1.4);
      ctx.beginPath(); ctx.arc(X(x), Y(y), Z(r * 0.55), -a0 * 1.3, -a0 * 1.3 + 1.2); ctx.stroke();
    }
  }
  function fallbackSky(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H * DPR);
    g.addColorStop(0, '#0B0820'); g.addColorStop(1, '#05060F');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W * DPR, H * DPR);
    for (const h of level.holes) {
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(X(h.x), Y(h.y), Z(h.rh), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FF9A3C'; ctx.lineWidth = Z(3); ctx.beginPath(); ctx.ellipse(X(h.x), Y(h.y), Z(h.rh * 2.6), Z(h.rh * 0.8), h.tilt || 0, 0, Math.PI * 2); ctx.stroke();
    }
    for (const w of level.whites || []) { ctx.fillStyle = '#E8F2FF'; ctx.beginPath(); ctx.arc(X(w.x), Y(w.y), Z(w.r * 1.3), 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#CFE3FF'; ctx.beginPath(); ctx.arc(X(level.portal.x), Y(level.portal.y), Z(R * 0.6), 0, Math.PI * 2); ctx.fill();
  }

  function adaptQuality(dt) {
    if (testSpeed !== 1 || !dt) return;
    frameAvg += (dt * 1000 - frameAvg) * 0.05;
    if (qCool > 0) { qCool -= dt; return; }
    if (frameAvg > 26 && qIdx < Q_STEPS.length - 1) { qIdx++; qCool = 2; }
    else if (frameAvg < 15 && qIdx > 0) { qIdx--; qCool = 4; }
  }
  // Öğretici el (Seviye 1–2): parmağın kuyruklu yıldızı nasıl geri çekeceğini gösterir.
  function drawTutorial(ctx, t) {
    if (spec.mode !== 'levels' || spec.level > 2 || launches > 1 || drag || state !== 'aim' || hintPath) return;
    const a = level.sol3.a, k = (t % 2.2) / 2.2, pull = Math.min(1, k / 0.6) * PULL * level.sol3.p;
    const sx = LAUNCH.x, sy = LAUNCH.y + 8;
    const hx = sx - Math.cos(a) * pull, hy = sy - Math.sin(a) * pull;
    const alpha = k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Z(2); ctx.setLineDash([Z(4), Z(5)]);
    ctx.beginPath(); ctx.moveTo(X(sx), Y(sy)); ctx.lineTo(X(hx), Y(hy)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(X(hx), Y(hy), Z(k < 0.6 ? 13 : 13 + (k - 0.6) * 20), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,160,255,.9)'; ctx.lineWidth = Z(2.5);
    ctx.beginPath(); ctx.arc(X(hx), Y(hy), Z(19), 0, Math.PI * 2); ctx.stroke();
    // ok: fırlatma yönü
    ctx.strokeStyle = 'rgba(255,230,160,.9)'; ctx.lineWidth = Z(3);
    const ax = LAUNCH.x + Math.cos(a) * 44, ay = LAUNCH.y + Math.sin(a) * 44;
    ctx.beginPath(); ctx.moveTo(X(LAUNCH.x + Math.cos(a) * 22), Y(LAUNCH.y + Math.sin(a) * 22)); ctx.lineTo(X(ax), Y(ay));
    ctx.lineTo(X(ax - Math.cos(a - 0.5) * 10), Y(ay - Math.sin(a - 0.5) * 10)); ctx.moveTo(X(ax), Y(ay));
    ctx.lineTo(X(ax - Math.cos(a + 0.5) * 10), Y(ay - Math.sin(a + 0.5) * 10)); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function render(ctx, dt, t) {
    adaptQuality(dt);
    const sh = calm ? 0 : shake;
    const sx = sh ? (Math.random() - 0.5) * Z(sh) : 0, sy = sh ? (Math.random() - 0.5) * Z(sh) : 0;
    if (sky.ok) {
      // Yüksek çözünürlüklü tabletlerde piksel bütçesi: en fazla ~1,1 milyon piksel gölgelendirilir.
      const budget = Math.min(1, Math.sqrt(1.1e6 / Math.max(1, W * H * DPR * DPR)));
      const q = Math.min(Q_STEPS[qIdx], budget), pxs = SC * DPR * q;
      const tx = (x) => (x + offX) * pxs, ty = (y) => (y + offY) * pxs;
      sky.render({
        w: Math.max(2, Math.round(W * DPR * q)), h: Math.max(2, Math.round(H * DPR * q)), time: t, px: pxs,
        holes: level.holes.map((h) => ({ x: tx(h.x), y: ty(h.y), rh: h.rh * pxs, k: Math.pow(h.rh * 3.0 * pxs, 2), tilt: h.tilt })),
        whites: (level.whites || []).map((w) => ({ x: tx(w.x), y: ty(w.y), r: w.r * pxs, k: Math.pow(w.r * 3.5 * pxs, 2) })),
        portal: { x: tx(level.portal.x), y: ty(level.portal.y), r: R * pxs, glow: 1 + (state === 'fly' ? 0.3 : 0) },
        flash: calm ? Math.min(flash, 0.15) : flash,
      });
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(sky.canvas, sx, sy, W * DPR, H * DPR);
    } else fallbackSky(ctx);

    ctx.save();
    ctx.translate(sx, sy);
    const P = level.portal;
    ctx.strokeStyle = 'rgba(190,220,255,.35)'; ctx.lineWidth = Z(1.2); ctx.setLineDash([Z(4), Z(6)]);
    ctx.beginPath(); ctx.arc(X(P.x), Y(P.y), Z(R), t * 0.4, t * 0.4 + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    for (const k of level.rocks) drawRock(ctx, k, t);
    ctx.globalCompositeOperation = 'lighter';
    for (const w of level.worms || []) {
      drawWorm(ctx, w.ax, w.ay, w.r, '#B388FF', 1, t);
      drawWorm(ctx, w.bx, w.by, w.r, '#4DE8D0', -1, t);
    }
    level.motes.forEach(([mx, my], i) => {
      if (got[i]) return;
      const pr = 1 + 0.15 * Math.sin(t * 4 + i);
      const g = ctx.createRadialGradient(X(mx), Y(my), 0, X(mx), Y(my), Z(MOTE_R * pr));
      g.addColorStop(0, 'rgba(255,245,200,1)'); g.addColorStop(0.35, 'rgba(255,200,90,.8)'); g.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X(mx), Y(my), Z(MOTE_R * pr), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,200,.8)'; ctx.lineWidth = Z(1.2);
      ctx.beginPath(); ctx.moveTo(X(mx - 6 * pr), Y(my)); ctx.lineTo(X(mx + 6 * pr), Y(my)); ctx.moveTo(X(mx), Y(my - 6 * pr)); ctx.lineTo(X(mx), Y(my + 6 * pr)); ctx.stroke();
    });
    const lg = ctx.createRadialGradient(X(LAUNCH.x), Y(LAUNCH.y), 0, X(LAUNCH.x), Y(LAUNCH.y), Z(30));
    lg.addColorStop(0, 'rgba(140,170,255,.5)'); lg.addColorStop(1, 'rgba(140,170,255,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(X(LAUNCH.x), Y(LAUNCH.y), Z(30), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(170,190,255,.6)'; ctx.lineWidth = Z(1.5);
    ctx.beginPath(); ctx.arc(X(LAUNCH.x), Y(LAUNCH.y), Z(16 + Math.sin(t * 3) * 1.5), 0, Math.PI * 2); ctx.stroke();
    const sk = api.skin();
    if (state === 'aim') {
      if (hintPath) {
        drawDots(ctx, hintPath, hintPath.length, 'rgba(255,230,160,.9)', 6);
        ctx.strokeStyle = 'rgba(255,230,160,.9)'; ctx.lineWidth = Z(2.5);
        ctx.beginPath(); ctx.moveTo(X(LAUNCH.x), Y(LAUNCH.y)); ctx.lineTo(X(LAUNCH.x + Math.cos(level.sol3.a) * 40), Y(LAUNCH.y + Math.sin(level.sol3.a) * 40)); ctx.stroke();
      }
      if (preview) {
        // Bölüm 1 öğretici: uzun ön izleme. Uzun Rota gücü bütün yolu gösterir.
        const upto = boostPath ? preview.path.length : Math.min(preview.path.length, level.ch === 1 ? 150 : 60);
        drawDots(ctx, preview.path, upto, hexA(sk.a, 0.95), 4);
        ctx.strokeStyle = preview.aim.p > 0.9 ? '#FF7A7A' : hexA(sk.a, 0.9); ctx.lineWidth = Z(3);
        ctx.beginPath(); ctx.arc(X(LAUNCH.x), Y(LAUNCH.y), Z(22), -Math.PI / 2, -Math.PI / 2 + preview.aim.p * Math.PI * 2); ctx.stroke();
      }
      comet(ctx, X(LAUNCH.x), Y(LAUNCH.y), Z(5), sk, t);
      drawTutorial(ctx, t);
    }
    if (flight) {
      const i = Math.min(fi, flight.path.length - 1);
      const [cx, cy] = flight.path[i];
      if (state === 'fly' || endKind === 'win') drawTrail(ctx, flight.path, i, sk, t);
      if (state === 'fly') {
        const [px, py] = flight.path[Math.max(0, i - 2)];
        comet(ctx, X(cx), Y(cy), Z(5), sk, t, cx - px, cy - py);
      } else if (endKind === 'swallow') {
        // spagettileşme: kuyruklu yıldız çekilerek incelir ve olay ufkunda kaybolur
        const k = Math.min(1, (performance.now() - endAt) / 700), h = level.holes[flight.hit];
        const x = cx + (h.x - cx) * k, y = cy + (h.y - cy) * k;
        ctx.strokeStyle = hexA(sk.a, 1 - k); ctx.lineWidth = Z(4 * (1 - k) + 0.5);
        ctx.beginPath(); ctx.moveTo(X(cx), Y(cy)); ctx.lineTo(X(x), Y(y)); ctx.stroke();
      }
    }
    parts = parts.filter((p) => (p.t += dt) < p.life);
    for (const p of parts) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97;
      ctx.globalAlpha = 1 - p.t / p.life;
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), Z(1.8), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  function stepFlight(dt) {
    const path = flight.path;
    const i0 = Math.min(fi, path.length - 1);
    const near = flight.kind === 'win' && Math.hypot(path[i0][0] - level.portal.x, path[i0][1] - level.portal.y) < R * 3;
    acc += dt * testSpeed * (near ? 0.45 : 1); // portala yaklaşırken ağır çekim
    while (acc >= DT) {
      acc -= DT;
      fi++;
      const i = Math.min(fi, path.length - 1);
      const [x, y] = path[i];
      level.motes.forEach(([mx, my], k) => {
        if (flight.got[k] && !got[k] && Math.hypot(x - mx, y - my) < MOTE_R + CR + 6) {
          got[k] = true; burst(mx, my, '#FFE39A', 20, 90, 0.6); api.sfx('coin'); api.haptic('light');
        }
      });
      while (jumpIdx < flight.jumps.length && fi >= flight.jumps[jumpIdx]) {
        const w = level.worms[0];
        if (w) { burst(w.ax, w.ay, '#B388FF', 24, 110, 0.6); burst(w.bx, w.by, '#4DE8D0', 24, 110, 0.6); }
        api.sfx('pop'); api.haptic('light');
        jumpIdx++;
      }
      if (fi >= path.length - 1) {
        // Uçuş boyunca toplanan ama çizimde yakalanamayan tozları da işaretle
        flight.got.forEach((g, k) => { got[k] = got[k] || g; });
        state = 'ending';
        endKind = flight.kind;
        endAt = performance.now();
        const [ex, ey] = path[path.length - 1];
        if (endKind === 'win') { flash = 0.85; burst(level.portal.x, level.portal.y, '#CFE6FF', 60, 180, 0.9); api.sfx('win3'); }
        else if (endKind === 'swallow') { shake = 9; api.sfx('fail'); api.haptic('heavy'); }
        else if (endKind === 'burn') { shake = 7; flash = 0.35; burst(ex, ey, '#DDEBFF', 50, 160, 0.7); api.haptic('heavy'); }
        else if (endKind === 'crash') { shake = 6; burst(ex, ey, '#FFB27A', 40, 140, 0.7); api.haptic('heavy'); }
        return;
      }
    }
  }

  return {
    start(s) { spec = s; if (W) begin(); },
    // Seviye haritası için bölüm grupları (kit bu listeyi kullanır)
    chapters(maxN) {
      const out = CHAPTERS.map((c) => ({ from: c.from, to: c.to, name: api.t('chLabel', { n: c.id, name: api.t('ch' + c.id) }) }));
      for (let a = LEVELS.length + 1; a <= maxN; a += 20) out.push({ from: a, to: a + 19, name: api.t('ch' + ENDLESS) + ` · ${a}–${a + 19}` });
      return out;
    },
    resize(w, h, dpr) {
      W = w; H = h; DPR = dpr;
      SC = Math.min(W / W0, H / H0); // dünya her ekrana sığar; fizik her cihazda aynı
      offX = (W / SC - W0) / 2; offY = (H / SC - H0) / 2;
      if (spec && (state === 'aim' || state === 'idle')) begin();
    },
    pointer(type, x, y) {
      if (state !== 'aim') return;
      const wx = x / SC - offX, wy = y / SC - offY;
      if (type === 'down') { if (performance.now() < readyAt) return; drag = { sx: wx, sy: wy }; }
      else if (type === 'move' && drag) {
        const aim = aimFromPull(drag.sx - wx, drag.sy - wy);
        preview = aim ? { aim, path: simulate(level, aim.a, aim.p, { record: true, R }).path } : null;
      } else if (type === 'up' && drag) {
        const aim = aimFromPull(drag.sx - wx, drag.sy - wy);
        drag = null;
        if (aim && aim.p > P_MIN) launch(aim); else preview = null;
      } else if (type === 'cancel') { drag = null; preview = null; }
    },
    frame(ctx, dt, t) {
      if (!spec || !W || !level) return;
      shake = Math.max(0, shake - dt * 20);
      flash = Math.max(0, flash - dt * 1.6);
      if (state === 'fly') stepFlight(dt);
      else if (state === 'ending' && performance.now() - endAt > (endKind === 'win' ? 650 : 800)) finish();
      render(ctx, dt, t);
    },
    drawSkin(c, w, h, skin, t) {
      c.fillStyle = '#0B0820';
      c.beginPath(); if (c.roundRect) c.roundRect(0, 0, w, h, h * 0.2); else c.rect(0, 0, w, h); c.fill();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) {
        const k = i / 14;
        c.strokeStyle = skin.rainbow ? `hsla(${i * 25},95%,65%,${k * 0.8})` : hexA(k > 0.6 ? skin.a : skin.b, k * 0.8);
        c.lineWidth = 1 + k * h * 0.08;
        c.beginPath(); c.moveTo(w * (0.12 + k * 0.5), h * (0.8 - k * 0.45)); c.lineTo(w * (0.12 + (k + 0.07) * 0.5), h * (0.8 - (k + 0.07) * 0.45)); c.stroke();
      }
      comet(c, w * 0.66, h * 0.4, h * 0.07, skin, t, 1, -0.9);
      c.globalCompositeOperation = 'source-over';
    },
    // Test yardımcıları (tarayıcı testleri ve mağaza görüntüleri için)
    __win() { return [level.sol3.a, level.sol3.p]; },
    __sol() { return [level.sol.a, level.sol.p]; },
    __speed(k) { testSpeed = k; },
    __info() { return { id: level.id, ch: level.ch, state, mirrored: !!level.mirrored, q: Q_STEPS[qIdx], calm }; },
    /** (a, p) atışı için ekranda parmağın izleyeceği yol: başlangıç ve bitiş (CSS pikseli). */
    __dragFor(a, p, sx = W / 2, sy = H * 0.5) {
      const d = PULL * p * SC;
      return { x0: sx, y0: sy, x1: sx - Math.cos(a) * d, y1: sy - Math.sin(a) * d };
    },
  };
}
