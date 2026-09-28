// Olay Ufku fiziği: oyun, bölüm üreticisi ve testler bu tek dosyayı kullanır.
// Saf JavaScript (tarayıcı/DOM yok), sabit adımlı ve deterministik.
// Dünya her cihazda aynıdır: 400 x 720 birim; ekrana sığdırılarak çizilir.

export const W0 = 400;
export const H0 = 720;
export const LAUNCH = { x: 200, y: 590 };
export const DT = 1 / 150;
export const MAXT = 7;
export const STEPS = Math.round(MAXT / DT);
export const G = 12000; // kara delik çekimi: k = G * rh^2
export const GW = 9000; // beyaz delik itişi:  k = GW * r^2
export const CR = 6; // kuyruklu yıldız yarıçapı
export const MOTE_R = 13; // yıldız tozu toplama yarıçapı
export const PULL = 130; // tam güç için geri çekme mesafesi (dünya birimi)
export const A_MIN = -Math.PI + 0.05;
export const A_MAX = -0.05;
export const P_MIN = 0.08;
export const BOUNDS = { x0: -40, x1: W0 + 40, y0: -120, y1: H0 + 40 };

export const speedOf = (p) => 150 + p * 450;

/** Noktanın [x0,y0]-[x1,y1] doğru parçasına en yakın uzaklığının karesi (hızlı cisimler aradan kaçmasın diye). */
export function segDist2(x0, y0, x1, y1, px, py) {
  const vx = x1 - x0, vy = y1 - y0;
  const wx = px - x0, wy = py - y0;
  const vv = vx * vx + vy * vy;
  let t = vv > 0 ? (wx * vx + wy * vy) / vv : 0;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const dx = x0 + vx * t - px, dy = y0 + vy * t - py;
  return dx * dx + dy * dy;
}

/**
 * Bir atışı simüle eder.
 * level: { holes:[{x,y,rh}], whites:[{x,y,r}], worms:[{ax,ay,bx,by,r}], rocks:[{x,y,r}], portal:{x,y,R}, motes:[[x,y],...] }
 * opts: { record: boolean, R: portal yarıçapı (güç için) }
 * Dönüş: { kind: 'win'|'swallow'|'burn'|'crash'|'lost', steps, minD, got:[bool], jumps:[adım], hit, path?, vx, vy }
 */
export function simulate(level, a, p, opts = {}) {
  const record = !!opts.record;
  const R = opts.R ?? level.portal.R;
  const holes = level.holes || [], whites = level.whites || [], worms = level.worms || [], rocks = level.rocks || [], motes = level.motes || [];
  let x = LAUNCH.x, y = LAUNCH.y;
  const sp = speedOf(p);
  let vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
  const path = record ? [[x, y]] : null;
  const got = motes.map(() => false);
  const jumps = [];
  let minD = Infinity;
  let ignore = -1; // solucan deliğinden çıkınca aynı ağızdan hemen geri girmemek için (0: A, 1: B)
  const R2 = R * R;
  const pr = level.portal;
  const end = (kind, s, hit) => ({ kind, steps: s, minD, got, jumps, hit, path, vx, vy });

  for (let s = 1; s <= STEPS; s++) {
    let ax = 0, ay = 0;
    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      const dx = h.x - x, dy = h.y - y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
      const f = (G * h.rh * h.rh) / (d2 + h.rh * h.rh * 0.25) / d;
      ax += dx * f; ay += dy * f;
    }
    for (let i = 0; i < whites.length; i++) {
      const w = whites[i];
      const dx = x - w.x, dy = y - w.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
      const f = (GW * w.r * w.r) / (d2 + w.r * w.r) / d;
      ax += dx * f; ay += dy * f;
    }
    vx += ax * DT; vy += ay * DT;
    const px = x, py = y;
    x += vx * DT; y += vy * DT;

    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      if (segDist2(px, py, x, y, h.x, h.y) < h.rh * h.rh) { if (record) path.push([x, y]); return end('swallow', s, i); }
    }
    for (let i = 0; i < whites.length; i++) {
      const w = whites[i];
      if (segDist2(px, py, x, y, w.x, w.y) < (w.r + CR) * (w.r + CR)) { if (record) path.push([x, y]); return end('burn', s, i); }
    }
    for (let i = 0; i < rocks.length; i++) {
      const k = rocks[i];
      if (segDist2(px, py, x, y, k.x, k.y) < (k.r + CR) * (k.r + CR)) { if (record) path.push([x, y]); return end('crash', s, i); }
    }
    for (let i = 0; i < motes.length; i++) {
      if (!got[i] && segDist2(px, py, x, y, motes[i][0], motes[i][1]) < (MOTE_R + CR) * (MOTE_R + CR)) got[i] = true;
    }
    const pd2 = segDist2(px, py, x, y, pr.x, pr.y);
    const pd = Math.sqrt(pd2);
    if (pd < minD) minD = pd;
    if (pd2 < R2) { if (record) path.push([x, y]); return end('win', s, -1); }

    // Solucan deliği: A'ya giren B'den aynı hız ve aynı konum farkıyla çıkar (ve tersi)
    for (let i = 0; i < worms.length; i++) {
      const w = worms[i], r2 = w.r * w.r;
      if (ignore === i * 2 && (x - w.ax) ** 2 + (y - w.ay) ** 2 > (w.r + 2) ** 2) ignore = -1;
      if (ignore === i * 2 + 1 && (x - w.bx) ** 2 + (y - w.by) ** 2 > (w.r + 2) ** 2) ignore = -1;
      if (ignore !== i * 2 && segDist2(px, py, x, y, w.ax, w.ay) < r2) {
        x = w.bx + (x - w.ax); y = w.by + (y - w.ay); ignore = i * 2 + 1; jumps.push(s); break;
      }
      if (ignore !== i * 2 + 1 && segDist2(px, py, x, y, w.bx, w.by) < r2) {
        x = w.ax + (x - w.bx); y = w.ay + (y - w.by); ignore = i * 2; jumps.push(s); break;
      }
    }

    if (record) path.push([x, y]);
    if (!(x === x) || !(y === y)) return end('lost', s, -2); // NaN koruması
    if (x < BOUNDS.x0 || x > BOUNDS.x1 || y < BOUNDS.y0 || y > BOUNDS.y1) return end('lost', s, -1);
  }
  return end('lost', STEPS, -1);
}

/** Parmak hareketinden nişan: geri çekme vektörü → açı ve güç. Yalnızca yukarı yönlere izin verilir. */
export function aimFromPull(dx, dy) {
  const len = Math.hypot(dx, dy);
  if (len < 6) return null;
  let a = Math.atan2(dy, dx);
  if (a > A_MAX) a = a > Math.PI / 2 ? A_MIN : A_MAX;
  if (a < A_MIN) a = A_MIN;
  return { a, p: Math.min(1, len / PULL) };
}

/** Bölümü x ekseninde aynalar (100. bölümden sonraki sonsuz mod için). Fizik simetriktir. */
export function mirrorLevel(L) {
  const mx = (v) => Math.round((W0 - v) * 10) / 10;
  return {
    ...L,
    holes: (L.holes || []).map((h) => ({ ...h, x: mx(h.x), tilt: -(h.tilt || 0) })),
    whites: (L.whites || []).map((w) => ({ ...w, x: mx(w.x) })),
    worms: (L.worms || []).map((w) => ({ ...w, ax: mx(w.ax), bx: mx(w.bx) })),
    rocks: (L.rocks || []).map((k) => ({ ...k, x: mx(k.x), rot: -k.rot })),
    portal: { ...L.portal, x: mx(L.portal.x) },
    motes: (L.motes || []).map(([x, y]) => [mx(x), y]),
    sol: L.sol ? { a: -Math.PI - L.sol.a, p: L.sol.p } : null,
    sol3: L.sol3 ? { a: -Math.PI - L.sol3.a, p: L.sol3.p } : null,
    mirrored: true,
  };
}
