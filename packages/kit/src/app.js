// RST Kit: bütün oyunların ortak kabuğu.
// Seviye akışı ve sonuç kartı + bağlılık döngüleri (7 günlük hediye, günlük görevler, günün seviyesi,
// şans çarkı, yıldız sandığı, Altın Yol) + gelir (ödüllü/geçiş reklam, altın paketleri, güçler,
// başlangıç paketi, VIP abonelik, sezon kartı, reklamsız paket). Oyun modülü yalnızca oyunun kendisini yazar.
import { createStore } from './storage.js';
import { createAds } from './ads.js';
import { createIap } from './iap.js';
import { createFeedback, shareText } from './feedback.js';
import { isNative, platform, loadPlugin } from './native.js';
import { rng, hash, dayKey, yesterdayKey, lang, translate, fmtSec } from './util.js';
import { KIT_TEXT } from './strings.js';
import { icon } from './icons.js';
import { askNotifications, scheduleReminders } from './notify.js';
import * as E from './economy.js';

const $ = (s, r = document) => r.querySelector(s);
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function btn(id, cls, text, onClick) {
  const b = el('button', cls, text);
  if (id) b.id = id;
  b.type = 'button';
  b.onclick = onClick;
  return b;
}
const APPLE_EULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export async function createApp(cfg) {
  const K = (k, v) => translate(KIT_TEXT, k, v);
  const T = (k, v) => translate(cfg.texts, k, v);
  const nameOf = (o) => (typeof o.name === 'string' ? o.name : o.name[lang] || o.name.en);
  const BOOSTERS = cfg.boosters || [];
  const boosterDef = (id) => BOOSTERS.find((b) => b.id === id);
  const P = { ...E.PRODUCTS, ...(cfg.products || {}) };
  const PASS = E.passRewards(cfg);
  const CAL = E.calendar(cfg);
  // Kullanım koşulları: oyuna özel adres yoksa iOS'ta Apple standart EULA, Android'de Google Play Hizmet Şartları
  const TERMS_URL = cfg.termsUrl || (platform() === 'ios' ? APPLE_EULA : 'https://play.google.com/about/play-terms/index.html');
  const WHEEL = E.wheel(cfg);

  for (const [k, v] of Object.entries(cfg.theme || {})) document.documentElement.style.setProperty(k, v);
  document.title = T('title');
  document.documentElement.lang = lang;
  mountShell();

  const store = await createStore(cfg.id, E.defaults(cfg));
  let S = E.migrate(store.data, cfg);
  const save = () => { store.save(); updateHud(); };

  const fx = createFeedback(() => S.prefs);
  const ads = createAds(cfg.ads, { noAds: () => E.noAds(S), simulate: simulateAd });
  const iap = createIap(cfg.iap, {
    products: P,
    onEntitlements: setEntitlements,
    grant: grantProduct,
    ownedOnce: (k) => (k === 'starter' ? S.offers.starterBought : false),
    simulate: simulatePurchase,
  });
  let prices = {};
  // Satın alma yoksa (RevenueCat anahtarı girilmemiş) satın alma arayüzü tamamen gizlenir. Testte: ?debug=1&noiap=1
  const iapOn = iap.available() && !(!isNative() && /[?&]debug=1/.test(location.search) && /[?&]noiap=1/.test(location.search));
  const priceOf = (k) => prices[k] || P[k].price[lang] || P[k].price.en;

  let mode = 'levels';
  let cur = S.level; // oynanan seviye (S.level = açılmış en yüksek seviye)
  let hintKey = null;
  let result = null; // {kind, at}
  let boost = new Set(); // bu deneme için seçilen güçler
  let committed = false; // oyuncu bu denemede ilk hamlesini yaptı mı

  const levelKey = () => (mode === 'daily' ? 'd' + dayKey() : 'l' + cur);

  /* ---------- Oyuna açılan arayüz ---------- */
  const api = {
    lang, t: T, k: K, rng, hash, fmtSec,
    reducedMotion: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
    get mode() { return mode; },
    skin: () => {
      const s = cfg.skins.find((x) => x.id === S.skin) || cfg.skins[0];
      return s.vip && !E.isVip(S) ? cfg.skins[0] : s;
    },
    hud(title, sub) {
      if (title != null) $('#rst-title').textContent = title;
      if (sub != null) $('#rst-sub').textContent = sub;
    },
    tip(text) {
      const e = $('#rst-tip');
      if (text) { e.textContent = text; e.hidden = false; } else e.hidden = true;
    },
    flash(text) {
      const e = $('#rst-flash');
      if (text) { e.textContent = text; e.classList.add('on'); } else e.classList.remove('on');
    },
    sfx: (n) => fx.sfx(n),
    haptic: (k) => fx.haptic(k),
    toast,
    win,
    fail,
  };
  const game = cfg.createGame(api);

  /* ---------- Tuval ---------- */
  const cv = $('#rst-cv');
  const ctx = cv.getContext('2d');
  function resize() {
    const r = $('#rst-stage').getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    game.resize(r.width, r.height, dpr);
  }
  window.addEventListener('resize', resize);
  let last = performance.now();
  let frameErr = false;
  document.addEventListener('visibilitychange', () => {
    // Arka plana geçince sesi durdur; dönünce zaman sıçramasın
    if (document.hidden) { fx.suspend(); store.flush && store.flush(); } else { last = performance.now(); fx.resume(); }
  });
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    try {
      game.frame(ctx, dt, now / 1000);
    } catch (err) {
      // Bir karedeki hata oyunu dondurmasın: kaydet ve seviyeyi güvenle yeniden başlat
      if (!frameErr) { frameErr = true; console.error('[rst] frame', err); setTimeout(() => { frameErr = false; startLevel(); }, 300); }
    }
    requestAnimationFrame(frame);
  }
  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  cv.addEventListener('pointerdown', (e) => {
    fx.unlock();
    if (result) {
      if (performance.now() - result.at < 350) return;
      if (result.kind === 'win') next(); else startLevel();
      return;
    }
    if (!committed) commit();
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* yok say */ }
    game.pointer && game.pointer('down', ...pos(e));
  });
  cv.addEventListener('pointermove', (e) => { if (!result && game.pointer) game.pointer('move', ...pos(e)); });
  cv.addEventListener('pointerup', (e) => { if (!result && game.pointer) game.pointer('up', ...pos(e)); });
  cv.addEventListener('pointercancel', (e) => { if (!result && game.pointer) game.pointer('cancel', ...pos(e)); });

  /* ---------- Akış ---------- */
  function startLevel(keepBoost = false) {
    closeSheet();
    if (!keepBoost) boost = new Set();
    committed = false;
    const daily = mode === 'daily';
    api.hud(daily ? K('daily') : K('level', { n: cur }), '');
    game.start({
      mode,
      level: daily ? cfg.dailyLevel || 9 : cur,
      seed: daily ? hash(cfg.id + '-' + dayKey()) : null,
      hint: hintKey === levelKey(),
      boosters: [...boost],
    });
    renderBoostBar();
    updateHud();
  }
  // İlk hamlede seçilen güçler harcanır ve deneme sayılır.
  function commit() {
    committed = true;
    S.attempts++;
    E.questEvent(S, 'play');
    for (const id of boost) {
      S.boosters[id] = Math.max(0, (S.boosters[id] || 0) - 1);
      E.questEvent(S, 'booster');
    }
    $('#rst-boostbar').hidden = true;
    save();
  }

  function addLevelCoins(n) {
    const v = E.isVip(S) ? n * 2 : n;
    S.coins += v;
    return v;
  }

  function win({ stars, base, title, detail }) {
    const key = levelKey();
    const gained = addLevelCoins(base);
    let tries = null, bonus = 0;
    if (mode === 'daily') {
      const D = dailyEntry();
      D.tries++;
      tries = D.tries;
      if (!D.done) {
        D.done = true;
        D.stars = stars;
        bonus = 50;
        S.coins += bonus;
        S.streak = S.lastDaily === yesterdayKey() ? S.streak + 1 : 1;
        S.lastDaily = dayKey();
        E.questEvent(S, 'daily');
        S.xp += 30;
      }
    }
    const prevBest = mode === 'daily' ? 0 : S.best[cur] || 0;
    const newStars = Math.max(0, stars - prevBest);
    if (mode !== 'daily') { S.best[cur] = Math.max(prevBest, stars); S.level = Math.max(S.level, cur + 1); }
    S.chestStars = Math.min(E.CHEST_STARS, S.chestStars + newStars);
    const tierBefore = E.passTier(S);
    const xp = 10 + stars * 5;
    S.xp += xp;
    const tierUp = E.passTier(S) > tierBefore;
    S.wins++;
    E.questEvent(S, 'win');
    if (stars >= 3) E.questEvent(S, 'stars3');
    delete S.fails[key];
    hintKey = null;
    save();
    fx.sfx(stars >= 3 ? 'win3' : 'win');
    fx.haptic('success');

    const c = el('div', 'rst-card');
    const st = el('div', 'rst-stars');
    for (let i = 1; i <= 3; i++) st.appendChild(el('i', i <= stars ? 'on' : '', '★'));
    c.appendChild(st);
    c.appendChild(el('h2', null, title || T('win' + stars)));
    const bits = [K('coinsGained', { n: gained + bonus }) + (E.isVip(S) ? ' (VIP ×2)' : '')];
    if (tries) bits.push(K('tries', { n: tries }));
    if (detail) bits.push(detail);
    bits.push(K('xpGain', { n: xp + (bonus ? 30 : 0) }));
    c.appendChild(el('p', null, bits.join(' · ')));

    // Yıldız sandığı ilerlemesi
    const chest = el('div', 'rst-chestrow');
    const full = S.chestStars >= E.CHEST_STARS;
    chest.innerHTML = `<span class="rst-ico">${icon('chest')}</span>`;
    const info = el('div', 'rst-grow');
    info.appendChild(el('small', null, K('chestTitle') + ' · ' + K('chestProgress', { a: S.chestStars, b: E.CHEST_STARS })));
    info.appendChild(progress(S.chestStars / E.CHEST_STARS));
    chest.appendChild(info);
    if (full) chest.appendChild(btn('rst-openchest', 'rst-mini-btn', K('chestOpen'), (ev) => { ev.currentTarget.remove(); openChest(); }));
    c.appendChild(chest);

    const row = el('div', 'rst-row');
    row.appendChild(btn('rst-next', 'rst-big', mode === 'daily' ? K('backToLevels') : K('next'), next));
    if (gained > 0) {
      const d = btn('rst-double', 'rst-alt rst-ad', K('double'), async () => {
        const ok = await watchAd();
        if (!ok) return;
        S.coins += gained; save();
        d.disabled = true; d.textContent = K('added');
        fx.sfx('coin');
        toast(K('coinsGained', { n: gained }));
      });
      row.appendChild(d);
    }
    c.appendChild(row);
    if (mode === 'daily') c.appendChild(btn('rst-share', 'rst-alt', K('copyResult'), doShare));
    openSheet(c, 'win');
    if (tierUp) setTimeout(() => toast(K('tier', { n: E.passTier(S) }) + ' · ' + K('road')), 600);

    // Tetikleyiciler: başlangıç paketi ve bildirim izni (her biri yalnızca bir kez)
    if (iapOn && mode === 'levels' && S.level >= 3 && !S.offers.starterAt && !S.offers.starterBought) {
      S.offers.starterAt = Date.now();
      save();
      setTimeout(openStarterPopup, 900);
    } else if (isNative() && S.wins >= 3 && !S.notifAsked) {
      S.notifAsked = true;
      save();
      setTimeout(() => { $('#rst-notif').hidden = false; }, 900);
    }
    reminders();
  }

  function fail({ title, lead, msg, hintAvailable }) {
    const key = levelKey();
    S.fails[key] = (S.fails[key] || 0) + 1;
    const fails = S.fails[key];
    if (mode === 'daily') {
      const D = dailyEntry();
      if (!D.done) D.tries++;
    }
    save();
    fx.sfx('fail');
    fx.haptic('error');
    const c = el('div', 'rst-card');
    c.appendChild(el('h2', null, title || T('failTitle')));
    const p = el('p');
    if (lead) { p.appendChild(el('span', 'rst-near', lead)); p.append(' '); }
    if (msg) p.append(msg);
    c.appendChild(p);
    const row = el('div', 'rst-row');
    row.appendChild(btn('rst-retry', 'rst-big', K('retry'), () => startLevel()));
    if (hintAvailable) {
      row.appendChild(btn('rst-hint', 'rst-alt rst-ad', T('hint'), async () => {
        if (!(await watchAd())) return;
        hintKey = levelKey();
        startLevel();
      }));
    }
    c.appendChild(row);
    // Takılan oyuncuya bağlama uygun güç önerisi (2. başarısızlıktan sonra)
    const rec = BOOSTERS.find((b) => !boost.has(b.id));
    if (fails >= 2 && rec) {
      const have = S.boosters[rec.id] || 0;
      const label = K('useBooster', { name: nameOf(rec) }) + (have ? ` (${have})` : ` · ${E.BOOSTER_PRICE}`);
      const b = btn('rst-usebooster', 'rst-alt rst-boost-cta', label, () => {
        if (!have && !buyBooster(rec.id, 1)) return;
        boost = new Set([rec.id]);
        startLevel(true);
      });
      b.insertAdjacentHTML('afterbegin', `<span class="rst-ico">${icon(rec.icon)}</span>`);
      c.appendChild(b);
    }
    if (fails >= 3 && mode === 'levels') {
      c.appendChild(btn('rst-skip', 'rst-alt rst-ad', K('skipLevel'), async () => {
        if (!(await watchAd())) return;
        delete S.fails[key];
        S.level = Math.max(S.level, cur + 1);
        cur++;
        save();
        startLevel();
      }));
    }
    openSheet(c, 'fail');
  }

  async function next() {
    closeSheet();
    if (mode === 'daily') { mode = 'levels'; cur = S.level; startLevel(); return; }
    cur++;
    S.level = Math.max(S.level, cur);
    save();
    await ads.levelDone();
    startLevel();
  }

  function dailyEntry() {
    const k = dayKey();
    if (!S.daily[k]) {
      S.daily[k] = { tries: 0 };
      const keys = Object.keys(S.daily).sort();
      while (keys.length > 30) delete S.daily[keys.shift()];
    }
    return S.daily[k];
  }

  function openSheet(card, kind) {
    const sh = $('#rst-sheet');
    sh.innerHTML = '';
    sh.appendChild(card);
    sh.hidden = false;
    $('#rst-boostbar').hidden = true;
    api.tip(null);
    api.flash(null);
    result = { kind, at: performance.now() };
  }
  function closeSheet() {
    $('#rst-sheet').hidden = true;
    result = null;
  }

  /* ---------- Güç çubuğu ---------- */
  function renderBoostBar() {
    const bar = $('#rst-boostbar');
    bar.innerHTML = '';
    if (!BOOSTERS.length || committed) { bar.hidden = true; return; }
    for (const b of BOOSTERS) {
      const on = boost.has(b.id);
      const n = S.boosters[b.id] || 0;
      const chip = btn('rst-boost-' + b.id, 'rst-chip' + (on ? ' on' : ''), null, () => toggleBoost(b.id));
      chip.innerHTML = `<span class="rst-ico">${icon(b.icon)}</span><span>${nameOf(b)}</span><b class="rst-count">${n > 0 ? n : '+'}</b>`;
      chip.setAttribute('aria-pressed', String(on));
      bar.appendChild(chip);
    }
    bar.hidden = false;
  }
  function toggleBoost(id) {
    fx.unlock();
    if (boost.has(id)) { boost.delete(id); startLevel(true); return; }
    if ((S.boosters[id] || 0) <= 0 && !buyBooster(id, 1)) return;
    boost.add(id);
    fx.sfx('pop');
    toast(K('boosterOn', { name: nameOf(boosterDef(id)) }));
    startLevel(true);
  }
  function buyBooster(id, n) {
    const cost = n === 5 ? E.BOOSTER_PRICE * 4 : E.BOOSTER_PRICE * n;
    if (S.coins < cost) {
      toast(K('needCoins', { n: cost - S.coins }));
      openShop('coins');
      return false;
    }
    S.coins -= cost;
    S.boosters[id] = (S.boosters[id] || 0) + n;
    save();
    fx.sfx('buy');
    toast(K('boosterBought', { name: nameOf(boosterDef(id)) }));
    return true;
  }

  /* ---------- Ödüller ---------- */
  function rewardLabel(r) {
    if (r.type === 'coins') return K('rCoins', { n: r.n });
    if (r.type === 'booster') return K('rBooster', { n: r.n, name: nameOf(boosterDef(r.id)) });
    const s = cfg.skins.find((x) => x.id === r.id);
    return K('rSkin', { name: s ? nameOf(s) : r.id });
  }
  function grant(r) {
    if (r.type === 'coins') S.coins += r.n;
    else if (r.type === 'booster') S.boosters[r.id] = (S.boosters[r.id] || 0) + r.n;
    else if (r.type === 'skin') {
      if (S.owned.includes(r.id)) { S.coins += 300; save(); return K('rCoins', { n: 300 }); }
      S.owned.push(r.id);
    }
    save();
    return rewardLabel(r);
  }
  function openChest() {
    if (S.chestStars < E.CHEST_STARS) return;
    S.chestStars = 0;
    S.chestsOpened++;
    E.questEvent(S, 'chest');
    const coins = 100 + Math.floor(Math.random() * 3) * 50;
    const labels = [grant({ type: 'coins', n: coins })];
    if (BOOSTERS.length) labels.push(grant({ type: 'booster', id: BOOSTERS[Math.floor(Math.random() * BOOSTERS.length)].id, n: 1 }));
    fx.sfx('win3');
    fx.haptic('success');
    toast(K('chestGot', { r: labels.join(' + ') }));
  }
  function progress(frac) {
    const p = el('div', 'rst-progress');
    const i = el('i');
    i.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%';
    p.appendChild(i);
    return p;
  }

  /* ---------- Reklam ---------- */
  async function watchAd() {
    const ok = await ads.rewarded();
    if (!ok) { toast(K('adFailed')); return false; }
    E.questEvent(S, 'ad');
    save();
    return true;
  }
  function simulateAd(kind) {
    if (kind === 'interstitial') { toast(K('interSim')); return Promise.resolve(true); }
    return new Promise((res) => {
      const ov = $('#rst-ad');
      const f = $('#rst-adfill');
      ov.hidden = false;
      f.style.transition = 'none';
      f.style.width = '0';
      void f.offsetWidth;
      f.style.transition = 'width 3s linear';
      f.style.width = '100%';
      setTimeout(() => { ov.hidden = true; res(true); }, 3050);
    });
  }

  /* ---------- Satın alma ---------- */
  function simulatePurchase(k) {
    if (k === 'restore') { toast(K('simRestore')); return Promise.resolve(false); }
    return new Promise((res) => {
      $('#rst-simname').textContent = productTitle(k) + ' · ' + priceOf(k);
      $('#rst-sim').hidden = false;
      $('#rst-simbuy').onclick = () => { $('#rst-sim').hidden = true; res(true); };
      $('#rst-simcancel').onclick = () => { $('#rst-sim').hidden = true; res(false); };
    });
  }
  function productTitle(k) {
    const p = P[k];
    if (p.kind === 'consumable') return K('coinsPack', { n: p.coins.toLocaleString(lang) });
    return { starter: K('starterTitle'), no_ads: K('noAdsTitle'), pass: K('roadTitle'), vip_w: K('vipTitle'), vip_m: K('vipTitle') }[k] || k;
  }
  async function buy(k) {
    fx.unlock();
    const ok = await iap.buy(k);
    if (ok) {
      fx.sfx('win3');
      fx.haptic('success');
      toast(K('purchased'));
      refreshOpenPanels();
    } else if (isNative()) toast(K('purchaseFailed'));
    return ok;
  }
  function grantProduct(k) {
    const p = P[k];
    if (p.kind === 'consumable') S.coins += p.coins;
    if (k === 'starter' && !S.offers.starterBought) {
      S.offers.starterBought = true;
      S.coins += p.coins;
      for (const b of BOOSTERS) S.boosters[b.id] = (S.boosters[b.id] || 0) + p.boosters;
      for (const s of cfg.skins) if (s.starter && !S.owned.includes(s.id)) S.owned.push(s.id);
    }
    save();
  }
  function setEntitlements(active, additive) {
    const was = { ...S.ent };
    if (additive) for (const a of active) S.ent[a] = true;
    else S.ent = Object.fromEntries(active.map((a) => [a, true]));
    if (S.ent.no_ads && !S.offers.noAdsGranted) {
      S.offers.noAdsGranted = true;
      S.coins += P.no_ads.coins || 0;
      for (const s of cfg.skins) if (s.pack && !S.owned.includes(s.id)) S.owned.push(s.id);
    }
    if (S.ent.vip) for (const s of cfg.skins) if (s.vip && !S.owned.includes(s.id)) S.owned.push(s.id);
    if (!was.vip && S.ent.vip) S.vipDay = '';
    save();
  }

  /* ---------- Bugün paneli ---------- */
  function openToday() {
    fx.unlock();
    S.lastOpenDay = dayKey();
    save();
    renderToday();
    $('#rst-today').hidden = false;
  }
  function renderToday() {
    const box = $('#rst-todaybody');
    box.innerHTML = '';
    // VIP günlük hediye
    if (E.isVip(S) && S.vipDay !== dayKey()) {
      const v = el('div', 'rst-offer rst-vipcard');
      v.innerHTML = `<b>${icon('crown')} ${K('vipDaily')}</b><span>${K('rCoins', { n: 100 })}</span>`;
      v.appendChild(btn('rst-vipclaim', 'rst-mini-btn', K('claim'), () => {
        S.vipDay = dayKey(); S.coins += 100; save(); fx.sfx('coin'); renderToday();
      }));
      box.appendChild(v);
    }
    // 7 günlük hediye
    const cal = section(K('calendarTitle'));
    const grid = el('div', 'rst-cal');
    const ready = E.calendarReady(S);
    CAL.forEach((r, i) => {
      const cell = el('div', 'rst-calcell' + (i === 6 ? ' big' : ''));
      const done = i < S.calendar.idx;
      const now = i === S.calendar.idx && ready;
      if (done) cell.classList.add('done');
      if (now) cell.classList.add('now');
      cell.appendChild(el('small', null, K('dayN', { n: i + 1 })));
      cell.appendChild(el('b', null, rewardLabel(r)));
      if (now) cell.appendChild(btn('rst-calclaim', 'rst-mini-btn', K('claim'), () => {
        const label = grant(r);
        S.calendar = { last: dayKey(), idx: (S.calendar.idx + 1) % 7 };
        save(); fx.sfx('coin'); fx.haptic('success'); toast(label); renderToday();
      }));
      else if (done) cell.appendChild(el('span', 'rst-ok', '✓'));
      else if (i === S.calendar.idx) cell.appendChild(el('span', 'rst-mini', K('tomorrow')));
      grid.appendChild(cell);
    });
    cal.appendChild(grid);
    box.appendChild(cal);
    // Günün seviyesi
    const D = S.daily[dayKey()];
    const dl = section(K('dailyTitle'));
    dl.appendChild(el('p', null, D && D.done ? K('dailyDone', { n: D.tries, s: S.streak }) : K('dailyNew') + (S.streak ? ' ' + K('dailyStreak', { n: S.streak }) : '')));
    const drow = el('div', 'rst-row');
    drow.appendChild(btn('rst-dailyplay', 'rst-big', D && D.done ? K('playAgain') : K('play'), () => {
      $('#rst-today').hidden = true; mode = 'daily'; hintKey = null; startLevel();
    }));
    if (D && D.done) drow.appendChild(btn('rst-dailycopy', 'rst-alt', K('copyResult'), doShare));
    dl.appendChild(drow);
    box.appendChild(dl);
    // Görevler
    const Q = E.ensureQuests(S);
    const qs = section(K('questsTitle'));
    Q.list.forEach((q, i) => {
      const row = el('div', 'rst-quest');
      const info = el('div', 'rst-grow');
      info.appendChild(el('b', null, K('q_' + q.type, { n: q.target })));
      info.appendChild(progress(q.progress / q.target));
      info.appendChild(el('small', null, `${q.progress}/${q.target} · ${K('rCoins', { n: q.reward })}`));
      row.appendChild(info);
      if (q.claimed) row.appendChild(el('span', 'rst-ok', '✓'));
      else if (q.progress >= q.target) row.appendChild(btn('rst-quest-' + i, 'rst-mini-btn', K('claim'), () => {
        q.claimed = true; S.coins += q.reward; S.xp += 20; save(); fx.sfx('coin'); renderToday();
      }));
      qs.appendChild(row);
    });
    const allDone = Q.list.every((q) => q.claimed);
    const brow = el('div', 'rst-quest bonus');
    const binfo = el('div', 'rst-grow');
    const bonusReward = BOOSTERS.length ? { type: 'booster', id: BOOSTERS[0].id, n: 2 } : { type: 'coins', n: 150 };
    binfo.appendChild(el('b', null, K('questBonus')));
    binfo.appendChild(el('small', null, rewardLabel(bonusReward) + ' + ' + K('rCoins', { n: 100 })));
    brow.appendChild(binfo);
    if (Q.bonus) brow.appendChild(el('span', 'rst-ok', '✓'));
    else if (allDone) brow.appendChild(btn('rst-questbonus', 'rst-mini-btn', K('claim'), () => {
      Q.bonus = true; grant(bonusReward); S.coins += 100; save(); fx.sfx('win3'); renderToday();
    }));
    qs.appendChild(brow);
    box.appendChild(qs);
    // Şans çarkı
    box.appendChild(wheelSection());
  }
  function section(title) {
    const s = el('section', 'rst-sec');
    s.appendChild(el('h3', null, title));
    return s;
  }

  function wheelSection() {
    const W = E.wheelState(S);
    const sec = section(K('wheelTitle'));
    const wrap = el('div', 'rst-wheelwrap');
    const c = el('canvas', 'rst-wheel');
    const d = Math.min(2, window.devicePixelRatio || 1);
    c.width = 220 * d; c.height = 220 * d;
    wrap.appendChild(c);
    wrap.appendChild(el('div', 'rst-wheelptr'));
    sec.appendChild(wrap);
    let angle = 0;
    drawWheel(c, angle);
    const row = el('div', 'rst-row');
    const freeLeft = W.free < 1;
    const adLeft = E.WHEEL_AD_SPINS - W.ad;
    const spin = async (viaAd) => {
      if (viaAd && !(await watchAd())) return;
      if (viaAd) W.ad++; else W.free++;
      save();
      const idx = E.pickWheel(WHEEL);
      const seg = (Math.PI * 2) / WHEEL.length;
      const target = Math.PI * 2 * 5 + (Math.PI * 1.5 - (idx + 0.5) * seg);
      const t0 = performance.now(), from = angle;
      row.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      const anim = (now) => {
        const k = Math.min(1, (now - t0) / 3000);
        angle = from + (target - from) * (1 - Math.pow(1 - k, 3));
        drawWheel(c, angle);
        if (k < 1) requestAnimationFrame(anim);
        else {
          const label = grant(WHEEL[idx]);
          fx.sfx('win3'); fx.haptic('success');
          toast(K('wheelWon', { r: label }));
          setTimeout(renderToday, 900);
        }
      };
      requestAnimationFrame(anim);
    };
    if (freeLeft) row.appendChild(btn('rst-spinfree', 'rst-big', K('spinFree'), () => spin(false)));
    else if (adLeft > 0) row.appendChild(btn('rst-spinad', 'rst-alt rst-ad', K('spinAd', { n: adLeft }), () => spin(true)));
    else row.appendChild(el('p', 'rst-mini', K('wheelDone')));
    sec.appendChild(row);
    const total = WHEEL.reduce((s, x) => s + x.w, 0);
    const odds = el('details', 'rst-odds');
    odds.appendChild(el('summary', null, K('wheelOdds')));
    odds.appendChild(el('p', 'rst-mini', WHEEL.map((x) => `${rewardLabel(x)}: %${Math.round((x.w / total) * 100)}`).join(' · ')));
    sec.appendChild(odds);
    return sec;
  }
  function drawWheel(c, angle) {
    const g = c.getContext('2d'), w = c.width, r = w / 2 - 4;
    const cols = ['#FFD36B', '#FF8FA3', '#8FD3FF', '#B8F2A0', '#D6C4FF', '#FFB38A', '#F2C94C', '#7AE3B5'];
    g.clearRect(0, 0, w, w);
    const seg = (Math.PI * 2) / WHEEL.length;
    WHEEL.forEach((x, i) => {
      const a0 = angle + i * seg;
      g.beginPath(); g.moveTo(w / 2, w / 2); g.arc(w / 2, w / 2, r, a0, a0 + seg); g.closePath();
      g.fillStyle = cols[i % cols.length]; g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = w * 0.01; g.stroke();
      g.save(); g.translate(w / 2, w / 2); g.rotate(a0 + seg / 2);
      g.fillStyle = '#2B2340'; g.font = `800 ${w * 0.052}px system-ui, sans-serif`; g.textAlign = 'right'; g.textBaseline = 'middle';
      g.fillText(x.type === 'coins' ? String(x.n) : `${x.n}× ${nameOf(boosterDef(x.id)).split(' ')[0]}`, r - w * 0.04, 0);
      g.restore();
    });
    g.beginPath(); g.arc(w / 2, w / 2, w * 0.08, 0, Math.PI * 2); g.fillStyle = '#2B2340'; g.fill();
  }

  /* ---------- Altın Yol ---------- */
  function openRoad() {
    fx.unlock();
    renderRoad();
    $('#rst-road').hidden = false;
  }
  function renderRoad() {
    const box = $('#rst-roadbody');
    box.innerHTML = '';
    const tier = E.passTier(S);
    const into = S.xp % E.XP_PER_TIER;
    const head = el('div', 'rst-roadhead');
    head.appendChild(el('b', null, K('tier', { n: tier })));
    head.appendChild(progress(tier >= E.PASS_TIERS ? 1 : into / E.XP_PER_TIER));
    head.appendChild(el('small', null, tier >= E.PASS_TIERS ? '' : K('xpLine', { a: into, b: E.XP_PER_TIER })));
    box.appendChild(head);
    if (!E.hasPass(S) && iapOn) {
      const o = el('div', 'rst-offer rst-gold');
      o.innerHTML = `<b>${icon('crown')} ${K('roadUnlock')}</b><span>${K('roadBody')}</span>`;
      o.appendChild(btn('rst-buypass', 'rst-buy', K('buy') + ' · ' + priceOf('pass'), () => buy('pass')));
      box.appendChild(o);
    } else if (E.hasPass(S)) {
      box.appendChild(el('p', 'rst-okline', K('roadOwned')));
    }
    const list = el('div', 'rst-roadlist');
    const cols = el('div', 'rst-roadrow rst-roadcols');
    cols.innerHTML = `<span></span><small>${K('roadFree')}</small><small>${K('roadPrem')}</small>`;
    list.appendChild(cols);
    for (let t = 1; t <= E.PASS_TIERS; t++) {
      const row = el('div', 'rst-roadrow' + (t <= tier ? ' reached' : ''));
      row.appendChild(el('b', 'rst-tiernum', String(t)));
      row.appendChild(roadCell(t, 'free'));
      row.appendChild(roadCell(t, 'prem'));
      list.appendChild(row);
    }
    box.appendChild(list);
    const cur = list.children[Math.max(1, tier)];
    if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center' }), 50);
  }
  function roadCell(t, lane) {
    const r = PASS[lane][t - 1];
    const cell = el('div', 'rst-roadcell ' + lane);
    cell.appendChild(el('span', null, rewardLabel(r)));
    const claimed = S.passClaimed[lane].includes(t);
    const reachable = t <= E.passTier(S);
    const locked = lane === 'prem' && !E.hasPass(S);
    if (claimed) cell.appendChild(el('span', 'rst-ok', '✓'));
    else if (locked) cell.insertAdjacentHTML('beforeend', `<span class="rst-lock">${icon('lock')}</span>`);
    else if (reachable) cell.appendChild(btn(`rst-road-${lane}-${t}`, 'rst-mini-btn', K('claim'), () => {
      S.passClaimed[lane].push(t);
      const label = grant(r);
      fx.sfx('coin'); toast(label); renderRoad();
    }));
    return cell;
  }
  const roadClaimable = () => {
    const tier = E.passTier(S);
    for (let t = 1; t <= tier; t++) {
      if (!S.passClaimed.free.includes(t)) return true;
      if (E.hasPass(S) && !S.passClaimed.prem.includes(t)) return true;
    }
    return false;
  };

  /* ---------- Mağaza ---------- */
  let shopTab = 'offers';
  function openShop(tab) {
    fx.unlock();
    if (tab) shopTab = tab;
    renderShop();
    $('#rst-shop').hidden = false;
    iap.prices().then((p) => { if (Object.keys(p).length) { prices = p; renderShop(); } });
  }
  function renderShop() {
    const tabs = $('#rst-tabs');
    tabs.innerHTML = '';
    if (!iapOn && shopTab === 'offers') shopTab = 'coins';
    const tabList = [['offers', K('tabOffers')], ['coins', K('tabCoins')], ['boosters', K('tabBoosters')], ['looks', K('tabLooks')]].filter(([id]) => iapOn || id !== 'offers');
    for (const [id, label] of tabList) {
      const b = btn('rst-tab-' + id, 'rst-tab' + (shopTab === id ? ' on' : ''), label, () => { shopTab = id; renderShop(); });
      b.setAttribute('aria-pressed', String(shopTab === id));
      tabs.appendChild(b);
    }
    const box = $('#rst-shopbody');
    box.innerHTML = '';
    if (shopTab === 'offers') shopOffers(box);
    if (shopTab === 'coins') shopCoins(box);
    if (shopTab === 'boosters') shopBoosters(box);
    if (shopTab === 'looks') shopLooks(box);
    const foot = el('div', 'rst-stack');
    if (iapOn) foot.appendChild(btn('rst-restore', 'rst-alt', K('restore'), async () => {
      const ok = await iap.restore();
      if (ok) { toast(K('restored')); renderShop(); }
    }));
    const m = el('div', 'rst-money');
    m.hidden = isNative() || !/[?&]dev=1/.test(location.search); // yalnızca geliştirici önizlemesinde (?dev=1)
    m.innerHTML = `<b>${K('moneyTitle')}</b><ul><li>${K('money1')}</li><li>${K('money2', { n: (cfg.ads && cfg.ads.interstitialEvery) || 4 })}</li><li>${K('money3')}</li><li>${K('money4')}</li><li>${K('money5')}</li></ul>`;
    foot.appendChild(m);
    box.appendChild(foot);
  }
  function shopOffers(box) {
    const left = E.starterLeftMs(S);
    if (left > 0) box.appendChild(starterCard('rst-buystarter'));
    // VIP
    const v = el('div', 'rst-offer rst-vip');
    v.innerHTML = `<b>${icon('crown')} ${K('vipTitle')}</b>`;
    const ul = el('ul', 'rst-perks');
    for (const k of ['vipPerk1', 'vipPerk2', 'vipPerk3', 'vipPerk4']) ul.appendChild(el('li', null, K(k)));
    v.appendChild(ul);
    if (E.isVip(S)) v.appendChild(el('span', null, K('vipActive')));
    else {
      const r = el('div', 'rst-row');
      r.appendChild(btn('rst-vipw', 'rst-buy', K('vipWeek', { p: priceOf('vip_w') }), () => buy('vip_w')));
      r.appendChild(btn('rst-vipm', 'rst-buy alt', K('vipMonth', { p: priceOf('vip_m') }), () => buy('vip_m')));
      v.appendChild(r);
      v.appendChild(el('small', 'rst-terms', K('vipTerms', { store: platform() === 'android' ? 'Google Play' : 'App Store' })));
      const links = el('small', 'rst-terms');
      links.innerHTML = `<a class="rst-link" href="${TERMS_URL}" target="_blank" rel="noopener">${K('terms')}</a> · <a class="rst-link" href="${cfg.privacyUrl}" target="_blank" rel="noopener">${K('privacy')}</a>`;
      v.appendChild(links);
    }
    box.appendChild(v);
    // Altın Yol
    if (!E.hasPass(S)) {
      const o = el('div', 'rst-offer rst-gold');
      o.innerHTML = `<b>${icon('road')} ${K('roadUnlock')}</b><span>${K('roadBody')}</span>`;
      o.appendChild(btn('rst-shoppass', 'rst-buy', K('buy') + ' · ' + priceOf('pass'), () => buy('pass')));
      box.appendChild(o);
    }
    // Reklamsız
    const n = el('div', 'rst-offer');
    if (E.noAds(S)) n.innerHTML = `<b>${K('noAdsTitle')}</b><span>${K('noAdsOwned')}</span>`;
    else {
      n.innerHTML = `<b>${K('noAdsTitle')}</b><span>${K('noAdsBody')}</span>`;
      n.appendChild(btn('rst-buynoads', 'rst-buy', K('buy') + ' · ' + priceOf('no_ads'), () => buy('no_ads')));
    }
    box.appendChild(n);
  }
  function starterCard(id) {
    const p = P.starter;
    const s = el('div', 'rst-offer rst-starter');
    const skin = cfg.skins.find((x) => x.starter);
    s.innerHTML = `<b>${icon('gift')} ${K('starterTitle')}</b><span>${K('starterBody', { coins: p.coins.toLocaleString(lang), b: p.boosters })}</span>`;
    if (skin) {
      const c = el('canvas', 'rst-skinprev');
      const d = Math.min(2, window.devicePixelRatio || 1);
      c.width = 72 * d; c.height = 54 * d;
      game.drawSkin(c.getContext('2d'), c.width, c.height, skin, performance.now() / 1000);
      s.appendChild(c);
    }
    const cd = el('small', 'rst-countdown');
    cd.dataset.end = String(S.offers.starterAt + E.STARTER_HOURS * 3600e3);
    s.appendChild(cd);
    s.appendChild(btn(id, 'rst-buy', K('buy') + ' · ' + priceOf('starter'), async () => {
      if (await buy('starter')) { $('#rst-offer').hidden = true; }
    }));
    tickCountdowns();
    return s;
  }
  function shopCoins(box) {
    const grid = el('div', 'rst-packs');
    grid.hidden = !iapOn;
    for (const k of ['coins_s', 'coins_m', 'coins_l']) {
      const p = P[k];
      const card = btn('rst-pack-' + k, 'rst-pack' + (p.tag ? ' ' + p.tag : ''), null, () => buy(k));
      if (p.tag) card.appendChild(el('em', null, p.tag === 'best' ? K('bestValue') : K('popular')));
      card.insertAdjacentHTML('beforeend', `<span class="rst-coinstack">${'<i class="rst-coin"></i>'.repeat(k === 'coins_s' ? 1 : k === 'coins_m' ? 2 : 3)}</span>`);
      card.appendChild(el('b', null, p.coins.toLocaleString(lang)));
      if (p.bonus) card.appendChild(el('small', null, K('bonusTag', { n: p.bonus })));
      card.appendChild(el('span', 'rst-price', priceOf(k)));
      grid.appendChild(card);
    }
    box.appendChild(grid);
    // Reklamla ücretsiz altın
    const day = dayKey();
    if (S.freeAds.day !== day) S.freeAds = { day, n: 0 };
    const left = E.FREE_COIN_ADS - S.freeAds.n;
    if (left > 0) {
      box.appendChild(btn('rst-freecoins', 'rst-alt rst-ad', `${K('rCoins', { n: E.FREE_COIN_AMOUNT })} (${left})`, async () => {
        if (!(await watchAd())) return;
        S.freeAds.n++; S.coins += E.FREE_COIN_AMOUNT; save(); fx.sfx('coin'); renderShop();
      }));
    }
  }
  function shopBoosters(box) {
    for (const b of BOOSTERS) {
      const row = el('div', 'rst-boostrow');
      row.innerHTML = `<span class="rst-ico big">${icon(b.icon)}</span>`;
      const info = el('div', 'rst-grow');
      info.appendChild(el('b', null, nameOf(b)));
      info.appendChild(el('small', null, typeof b.desc === 'string' ? b.desc : b.desc[lang] || b.desc.en));
      info.appendChild(el('small', 'rst-have', K('have', { n: S.boosters[b.id] || 0 })));
      row.appendChild(info);
      const col = el('div', 'rst-stack');
      const b1 = btn('rst-buyb1-' + b.id, 'rst-mini-btn', null, () => { if (buyBooster(b.id, 1)) renderShop(); });
      b1.innerHTML = `1 × <i class="rst-coin sm"></i>${E.BOOSTER_PRICE}`;
      const b5 = btn('rst-buyb5-' + b.id, 'rst-mini-btn alt', null, () => { if (buyBooster(b.id, 5)) renderShop(); });
      b5.innerHTML = `5 × <i class="rst-coin sm"></i>${E.BOOSTER_PRICE * 4}`;
      col.appendChild(b1);
      col.appendChild(b5);
      row.appendChild(col);
      box.appendChild(row);
    }
  }
  function shopLooks(box) {
    const grid = el('div', 'rst-skins');
    const d = Math.min(2, window.devicePixelRatio || 1);
    for (const s of cfg.skins) {
      const own = S.owned.includes(s.id) && !(s.vip && !E.isVip(S));
      const b = btn('rst-skin-' + s.id, 'rst-skin' + (S.skin === s.id ? ' eq' : ''), null, () => {
        fx.unlock();
        if (own) { S.skin = s.id; save(); renderShop(); return; }
        if (s.vip || s.starter || s.pack) { shopTab = 'offers'; renderShop(); return; }
        if (s.pass) { $('#rst-shop').hidden = true; openRoad(); return; }
        if (s.calendar) { $('#rst-shop').hidden = true; openToday(); return; }
        if (S.coins < s.price) { toast(K('needCoins', { n: s.price - S.coins })); shopTab = 'coins'; renderShop(); return; }
        S.coins -= s.price; S.owned.push(s.id); S.skin = s.id;
        save(); fx.sfx('buy'); fx.haptic('medium'); renderShop();
      });
      const c = el('canvas');
      c.width = 72 * d; c.height = 54 * d;
      game.drawSkin(c.getContext('2d'), c.width, c.height, s, performance.now() / 1000);
      b.appendChild(c);
      b.appendChild(el('span', null, nameOf(s)));
      const sm = el('small');
      if (S.skin === s.id && own) sm.textContent = K('equipped');
      else if (own) sm.textContent = K('equip');
      else if (s.vip) sm.textContent = K('srcVip');
      else if (s.starter) sm.textContent = K('srcStarter');
      else if (s.pack) sm.textContent = K('srcPack');
      else if (s.pass) sm.textContent = K('srcPass', { n: s.pass });
      else if (s.calendar) sm.textContent = K('srcCalendar');
      else { sm.appendChild(el('i', 'rst-coin')); sm.append(String(s.price)); }
      b.appendChild(sm);
      grid.appendChild(b);
    }
    box.appendChild(grid);
  }
  function openStarterPopup() {
    if (E.starterLeftMs(S) <= 0) return;
    const body = $('#rst-offerbody');
    body.innerHTML = '';
    body.appendChild(starterCard('rst-popbuy'));
    $('#rst-offer').hidden = false;
  }
  function tickCountdowns() {
    document.querySelectorAll('.rst-countdown').forEach((e) => {
      const left = Math.max(0, Number(e.dataset.end) - Date.now());
      const h = Math.floor(left / 3600e3), m = Math.floor((left % 3600e3) / 60e3), s = Math.floor((left % 60e3) / 1e3);
      e.textContent = K('endsIn', { t: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` });
    });
  }
  setInterval(tickCountdowns, 1000);
  function refreshOpenPanels() {
    if (!$('#rst-shop').hidden) renderShop();
    if (!$('#rst-road').hidden) renderRoad();
    if (!$('#rst-today').hidden) renderToday();
    updateHud();
  }

  /* ---------- Paylaşım ---------- */
  function shareLine() {
    const D = S.daily[dayKey()];
    const [, m, d] = dayKey().split('-');
    const head = `${T('title')} · ${K('daily')} ${d}.${m}`;
    const body = D && D.done ? `${cfg.shareEmoji || '🎯'} ${K('tries', { n: D.tries })} ${'⭐'.repeat(D.stars)}` : `${cfg.shareEmoji || '🎯'} ${K('notYet')}`;
    return `${head}\n${body}\n${K('streakLine', { n: S.streak })}`;
  }
  async function doShare() {
    const r = await shareText(shareLine(), T('title'));
    toast(r === 'shared' ? K('shared') : r === 'copied' ? K('copied') : K('copyFail'));
  }

  /* ---------- Bildirimler ---------- */
  function reminders() {
    const D = S.daily[dayKey()];
    scheduleReminders({
      streak: S.streak,
      doneToday: !!(D && D.done),
      texts: { dailyTitle: K('nDailyTitle'), dailyBody: K('nDailyBody'), streakTitle: K('nStreakTitle'), streakBody: K('nStreakBody', { n: S.streak }) },
    });
  }

  /* ---------- Ayarlar ---------- */
  function renderSettings() {
    const b = $('#rst-settingsbody');
    b.innerHTML = '';
    const toggle = (key, label) => {
      const r = el('div', 'rst-setrow');
      r.appendChild(el('span', null, label));
      const t = btn('rst-set-' + key, 'rst-toggle', S.prefs[key] ? K('on') : K('off'), () => {
        S.prefs[key] = !S.prefs[key]; save(); renderSettings();
      });
      t.setAttribute('aria-pressed', String(!!S.prefs[key]));
      r.appendChild(t);
      b.appendChild(r);
    };
    toggle('sound', K('sound'));
    toggle('vibration', K('vibration'));
    const lr = el('div', 'rst-setrow');
    lr.appendChild(el('span', null, K('language')));
    const lsel = el('div', 'rst-seg');
    let chosen = 'auto';
    try { chosen = localStorage.getItem('rst.lang') || 'auto'; } catch (e) { /* yok say */ }
    for (const [v, label] of [['auto', K('langAuto')], ['tr', 'Türkçe'], ['en', 'English']]) {
      const o = btn('rst-lang-' + v, 'rst-toggle' + (chosen === v ? ' on' : ''), label, () => {
        try { if (v === 'auto') localStorage.removeItem('rst.lang'); else localStorage.setItem('rst.lang', v); } catch (e) { /* yok say */ }
        location.reload();
      });
      o.setAttribute('aria-pressed', String(chosen === v));
      lsel.appendChild(o);
    }
    lr.appendChild(lsel);
    b.appendChild(lr);
    const links = el('p', 'rst-mini');
    links.innerHTML = `<a class="rst-link" href="${cfg.privacyUrl}" target="_blank" rel="noopener">${K('privacy')}</a> · <a class="rst-link" href="${TERMS_URL}" target="_blank" rel="noopener">${K('terms')}</a>`;
    b.appendChild(links);
    if (iapOn) b.appendChild(btn('rst-restore2', 'rst-alt', K('restore'), async () => { if (await iap.restore()) toast(K('restored')); }));
    const confirmBox = el('div', 'rst-confirm');
    confirmBox.hidden = true;
    confirmBox.appendChild(el('p', null, K('resetConfirm')));
    const cr = el('div', 'rst-row');
    cr.appendChild(btn('rst-reset-yes', 'rst-big rst-danger', K('yes'), () => {
      S = E.migrate(store.reset(), cfg);
      mode = 'levels'; hintKey = null; cur = S.level;
      $('#rst-settings').hidden = true;
      toast(K('resetDone'));
      startLevel();
    }));
    cr.appendChild(btn('rst-reset-no', 'rst-alt', K('cancel'), () => { confirmBox.hidden = true; }));
    confirmBox.appendChild(cr);
    b.appendChild(btn('rst-reset', 'rst-alt', K('reset'), () => { confirmBox.hidden = false; }));
    b.appendChild(confirmBox);
    b.appendChild(el('small', 'rst-version', T('title') + ' · v' + (cfg.version || '1.0.0')));
  }

  /* ---------- Seviye haritası ---------- */
  function openMap() {
    fx.unlock();
    const box = $('#rst-mapbody');
    box.innerHTML = '';
    const total = Object.values(S.best).reduce((s, v) => s + v, 0);
    box.appendChild(el('p', 'rst-mini', K('starsTotal', { n: total })));
    const groups = (game.chapters && game.chapters(S.level + 5)) || null;
    const maxN = S.level + 5;
    const secs = groups || Array.from({ length: Math.ceil(maxN / 20) }, (_, i) => ({ from: i * 20 + 1, to: i * 20 + 20, name: `${i * 20 + 1}–${i * 20 + 20}` }));
    for (const g of secs) {
      if (g.from > maxN) break;
      const sec = el('section', 'rst-sec');
      sec.appendChild(el('h3', null, g.name));
      const grid = el('div', 'rst-lvlgrid');
      for (let n = g.from; n <= Math.min(g.to, maxN); n++) {
        const open = n <= S.level;
        const b = btn('rst-lv-' + n, 'rst-lvcell' + (open ? '' : ' locked') + (n === cur && mode === 'levels' ? ' cur' : ''), null, () => {
          if (!open) { toast(K('lockedLevel')); return; }
          $('#rst-map').hidden = true;
          mode = 'levels'; cur = n; hintKey = null;
          startLevel();
        });
        b.appendChild(el('b', null, String(n)));
        const st = S.best[n] || 0;
        b.appendChild(el('small', null, open ? '★'.repeat(st) + '☆'.repeat(3 - st) : '🔒'));
        b.setAttribute('aria-label', K('level', { n }) + (open ? ` · ${st}/3` : ''));
        grid.appendChild(b);
      }
      sec.appendChild(grid);
      box.appendChild(sec);
    }
    $('#rst-map').hidden = false;
    const c = $('#rst-lv-' + cur);
    if (c) setTimeout(() => c.scrollIntoView({ block: 'center' }), 30);
  }

  /* ---------- HUD ---------- */
  let toastTimer = 0;
  function toast(m) {
    const e = $('#rst-toast');
    e.textContent = m;
    e.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => e.classList.remove('on'), 2600);
  }
  function todayClaimable() {
    const W = E.wheelState(S);
    const D = S.daily[dayKey()];
    return E.calendarReady(S) || E.questsClaimable(S) || W.free < 1 || !(D && D.done) || (E.isVip(S) && S.vipDay !== dayKey());
  }
  function updateHud() {
    const c = $('#rst-coins');
    if (c) c.textContent = S.coins.toLocaleString(lang);
    const setBadge = (id, on) => { const b = $(id + ' .rst-badge'); if (b) b.hidden = !on; };
    setBadge('#rst-todaybtn', todayClaimable());
    setBadge('#rst-roadbtn', roadClaimable());
    setBadge('#rst-shopbtn', (iapOn && E.starterLeftMs(S) > 0) || S.chestStars >= E.CHEST_STARS);
  }
  const overlays = ['#rst-map', '#rst-offer', '#rst-sim', '#rst-notif', '#rst-shop', '#rst-today', '#rst-road', '#rst-settings', '#rst-welcome'];

  /* ---------- Kabuk HTML ---------- */
  function mountShell() {
    const root = el('div');
    root.id = 'rst-root';
    const ib = (id, name, label) => `<button type="button" class="rst-ibtn" id="${id}" aria-label="${label}">${icon(name)}<i class="rst-badge" hidden></i></button>`;
    root.innerHTML = `
<div id="rst-stage">
  <canvas id="rst-cv" aria-label="${T('canvasLabel')}"></canvas>
  <div class="rst-hud">
    <button type="button" class="rst-lvl" id="rst-lvlbtn" aria-label="${K('levels')}"><b><span id="rst-title"></span><span class="rst-chev" aria-hidden="true">▾</span></b><span id="rst-sub"></span></button>
    <div class="rst-right">
      <button type="button" class="rst-pill" id="rst-coinbtn" aria-label="${K('tabCoins')}"><i class="rst-coin"></i><span id="rst-coins">0</span><span class="rst-plus">+</span></button>
      <div class="rst-icons">
        ${ib('rst-todaybtn', 'gift', K('today'))}
        ${ib('rst-roadbtn', 'road', K('road'))}
        ${ib('rst-shopbtn', 'bag', K('shop'))}
        ${ib('rst-menubtn', 'gear', K('settings'))}
      </div>
    </div>
  </div>
  <div class="rst-boostbar" id="rst-boostbar" hidden></div>
  <div class="rst-tip" id="rst-tip" hidden></div>
  <div class="rst-flash" id="rst-flash"></div>
  <div class="rst-sheet" id="rst-sheet" hidden></div>
</div>
<div class="rst-ov" id="rst-welcome" hidden><div class="rst-panel">
  <h2>${T('title')}</h2>
  ${T('welcomeBody').split('\n\n').map((p) => `<p>${p}</p>`).join('')}
  <div class="rst-row"><button type="button" class="rst-big" id="rst-start">${K('start')}</button></div>
</div></div>
<div class="rst-ov" id="rst-map" hidden><div class="rst-panel">
  <div class="rst-top"><h2>${K('levels')}</h2><button type="button" class="rst-x" id="rst-mapclose">${K('close')}</button></div>
  <div id="rst-mapbody" class="rst-stack"></div>
</div></div>
<div class="rst-ov" id="rst-today" hidden><div class="rst-panel">
  <div class="rst-top"><h2>${K('today')}</h2><button type="button" class="rst-x" id="rst-todayclose">${K('close')}</button></div>
  <div id="rst-todaybody" class="rst-stack"></div>
</div></div>
<div class="rst-ov" id="rst-road" hidden><div class="rst-panel">
  <div class="rst-top"><h2>${K('roadTitle')}</h2><button type="button" class="rst-x" id="rst-roadclose">${K('close')}</button></div>
  <div id="rst-roadbody" class="rst-stack"></div>
</div></div>
<div class="rst-ov" id="rst-shop" hidden><div class="rst-panel">
  <div class="rst-top"><h2>${K('shop')}</h2><button type="button" class="rst-x" id="rst-shopclose">${K('close')}</button></div>
  <div class="rst-tabs" id="rst-tabs" role="tablist"></div>
  <div id="rst-shopbody" class="rst-stack"></div>
</div></div>
<div class="rst-ov" id="rst-offer" hidden><div class="rst-panel">
  <div class="rst-top"><h2>${K('specialOffer')}</h2><button type="button" class="rst-x" id="rst-offerclose">${K('close')}</button></div>
  <div id="rst-offerbody"></div>
</div></div>
<div class="rst-ov" id="rst-settings" hidden><div class="rst-panel">
  <div class="rst-top"><h2>${K('settings')}</h2><button type="button" class="rst-x" id="rst-settingsclose">${K('close')}</button></div>
  <div id="rst-settingsbody" class="rst-stack"></div>
</div></div>
<div class="rst-ov" id="rst-notif" hidden><div class="rst-panel">
  <h2>${K('notifTitle')}</h2><p>${K('notifBody')}</p>
  <div class="rst-row"><button type="button" class="rst-big" id="rst-notifyes">${K('yesPlease')}</button><button type="button" class="rst-alt" id="rst-notifno">${K('notNow')}</button></div>
</div></div>
<div class="rst-ov" id="rst-sim" hidden><div class="rst-panel">
  <h2>${K('simTitle')}</h2><p id="rst-simname" class="rst-strong"></p><p>${K('simBody')}</p>
  <div class="rst-row"><button type="button" class="rst-big" id="rst-simbuy">${K('simBuy')}</button><button type="button" class="rst-alt" id="rst-simcancel">${K('cancel')}</button></div>
</div></div>
<div class="rst-ov" id="rst-ad" hidden><div class="rst-panel">
  <h2>${K('adTitle')}</h2><p>${K('adBody')}</p><div class="rst-adbar"><i id="rst-adfill"></i></div>
</div></div>
<div id="rst-toast" role="status"></div>`;
    document.body.appendChild(root);
  }

  /* ---------- Bağlantılar ---------- */
  $('#rst-coinbtn').onclick = () => openShop('coins');
  $('#rst-todaybtn').onclick = openToday;
  $('#rst-roadbtn').onclick = openRoad;
  $('#rst-shopbtn').onclick = () => openShop(iapOn && E.starterLeftMs(S) > 0 ? 'offers' : shopTab);
  $('#rst-menubtn').onclick = () => { renderSettings(); $('#rst-settings').hidden = false; };
  $('#rst-lvlbtn').onclick = () => openMap();
  for (const id of ['map', 'today', 'road', 'shop', 'offer', 'settings']) {
    $(`#rst-${id}close`).onclick = () => { $(`#rst-${id}`).hidden = true; updateHud(); };
  }
  $('#rst-start').onclick = () => { fx.unlock(); S.welcomed = true; save(); $('#rst-welcome').hidden = true; ads.init(); };
  $('#rst-notifyes').onclick = async () => { $('#rst-notif').hidden = true; if (await askNotifications()) reminders(); };
  $('#rst-notifno').onclick = () => { $('#rst-notif').hidden = true; };

  if (isNative()) {
    loadPlugin('app').then(({ App }) => {
      App.addListener('backButton', () => {
        const open = overlays.map((s) => $(s)).find((e) => e && !e.hidden);
        if (open) open.hidden = true; else if (App.minimizeApp) App.minimizeApp();
      });
    }).catch(() => {});
    iap.init();
    if (S.welcomed) ads.init();
    reminders();
  }

  E.ensureQuests(S);
  save();
  resize();
  startLevel();
  if (!S.welcomed) $('#rst-welcome').hidden = false;
  else if (S.lastOpenDay !== dayKey() && todayClaimable()) openToday(); // günde bir kez otomatik aç
  requestAnimationFrame(frame);
  // Test ve geliştirme için: ?debug=1 ile tarayıcı konsolundan duruma erişim (mağaza sürümünde kapalı)
  if (!isNative() && /[?&]debug=1/.test(location.search)) window.__rst = { get S() { return S; }, save, startLevel: () => { cur = S.level; mode = 'levels'; startLevel(); }, openStarterPopup, game, openMap: () => openMap(), iapOn, get cur() { return cur; }, get mode() { return mode; } };
  return { api, game, get state() { return S; } };
}
