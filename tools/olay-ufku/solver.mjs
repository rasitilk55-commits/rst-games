// Olay Ufku çözücüsü: bir bölümün bütün atış uzayını (açı x güç) tarar.
// Üretici (gen.mjs) ve bağımsız doğrulayıcı (verify.mjs) bunu kullanır.
import { simulate } from '../../apps/olay-ufku/src/physics.js';

export const NA = 241; // açı adımı ≈ 0,69°
export const NP = 24; // güç adımı ≈ %3,7
export const AMIN = -Math.PI + 0.12;
export const AMAX = -0.12;
export const PMIN = 0.15;
export const PMAX = 1.0;
export const angleAt = (i) => AMIN + ((AMAX - AMIN) * i) / (NA - 1);
export const powerAt = (j) => PMIN + ((PMAX - PMIN) * j) / (NP - 1);
export const A_STEP_DEG = (((AMAX - AMIN) / (NA - 1)) * 180) / Math.PI;
export const P_STEP = (PMAX - PMIN) / (NP - 1);

/** Izgara: her hücre 0 (kayıp), 1 (portal), 2 (portal + 3 yıldız tozu). stepA/stepP ile kaba tarama yapılabilir.
 *  needJump: yalnızca solucan deliğinden geçen kazanan atışları say (solucan deliği bölümleri için). */
export function scan(level, stepA = 1, stepP = 1, offA = 0, offP = 0, needJump = false) {
  const cells = new Uint8Array(NA * NP);
  let n = 0, wins = 0, stars3 = 0;
  for (let i = 0; i < NA; i += stepA) {
    for (let j = 0; j < NP; j += stepP) {
      const a = angleAt(Math.min(NA - 1, i + offA)), p = Math.min(PMAX, powerAt(j) + offP);
      const r = simulate(level, a, p);
      n++;
      if (r.kind === 'win' && (!needJump || r.jumps.length > 0)) {
        wins++;
        const all3 = r.got.length === 3 && r.got.every(Boolean);
        if (all3) stars3++;
        cells[i * NP + j] = all3 ? 2 : 1;
      }
    }
  }
  return { cells, n, wins, stars3, rate: wins / n, rate3: stars3 / n };
}

/**
 * İnsan parmağı hassasiyeti: bw açı hücresi x bh güç hücresi boyunca her atışın kazandığı bir kutu var mı?
 * min: 1 = portal yeter, 2 = 3 yıldız gerekir. En "rahat" (çevresi de kazanan) kutuyu döndürür.
 */
export function findBox(cells, bw, bh, min = 1) {
  const S = new Int32Array((NA + 1) * (NP + 1));
  const idx = (i, j) => i * (NP + 1) + j;
  for (let i = 0; i < NA; i++) {
    for (let j = 0; j < NP; j++) {
      const v = cells[i * NP + j] >= min ? 1 : 0;
      S[idx(i + 1, j + 1)] = v + S[idx(i, j + 1)] + S[idx(i + 1, j)] - S[idx(i, j)];
    }
  }
  const sum = (i0, j0, i1, j1) => {
    i0 = Math.max(0, i0); j0 = Math.max(0, j0); i1 = Math.min(NA, i1); j1 = Math.min(NP, j1);
    return S[idx(i1, j1)] - S[idx(i0, j1)] - S[idx(i1, j0)] + S[idx(i0, j0)];
  };
  let best = null, count = 0;
  for (let i = 0; i + bw <= NA; i++) {
    for (let j = 0; j + bh <= NP; j++) {
      if (sum(i, j, i + bw, j + bh) !== bw * bh) continue;
      count++;
      const score = sum(i - 4, j - 2, i + bw + 4, j + bh + 2);
      if (!best || score > best.score) best = { i, j, score, ci: i + Math.floor(bw / 2), cj: j + Math.floor(bh / 2) };
    }
  }
  if (best) best.count = count;
  return best;
}

/** Atışın kütleçekimiyle ne kadar büküldüğü (derece): fırlatma yönü ile varış yönü arasındaki açı. */
export function bendDeg(a, r) {
  const b = Math.atan2(r.vy, r.vx);
  let d = Math.abs(b - a);
  while (d > Math.PI) d = Math.abs(d - 2 * Math.PI);
  return (d * 180) / Math.PI;
}
