// __TITLE_TR__ — yeni oyun şablonu. Bu örnek çalışan basit bir zamanlama oyunudur:
// gidip gelen top yeşil bölgedeyken dokun. Kendi mekaniğini yazarken aynı arayüzü koru:
// start(spec), resize(w,h,dpr), pointer(type,x,y), frame(ctx,dt,t), drawSkin(ctx,w,h,skin,t)
// ve sonuçta api.win({stars, base}) ya da api.fail({title, lead, msg, hintAvailable}) çağır.

export function createGame(api) {
  let W = 0, H = 0, DPR = 1, spec = null, x = 0, dir = 1, speed = 0, zone = null, state = 'idle', readyAt = 0, hint = false;

  function begin() {
    const r = api.rng(spec.seed ?? spec.level * 131 + 7);
    speed = 0.45 + spec.level * 0.08;
    const w = Math.max(0.06, 0.24 - spec.level * 0.012);
    zone = { a: 0.1 + r() * (0.8 - w), w };
    x = 0; dir = 1; state = 'play'; hint = !!spec.hint;
    readyAt = performance.now() + 300;
    api.hud(null, api.t('sub'));
    api.tip(api.t('tip'));
  }

  return {
    start(s) { spec = s; if (W) begin(); },
    resize(w, h, dpr) { W = w; H = h; DPR = dpr; if (spec && state !== 'done') begin(); },
    pointer(type) {
      if (type !== 'down' || state !== 'play' || performance.now() < readyAt) return;
      state = 'done';
      api.tip(null);
      const c = zone.a + zone.w / 2, d = Math.abs(x - c);
      if (d <= zone.w / 2) {
        const q = d / (zone.w / 2), stars = q < 0.25 ? 3 : q < 0.6 ? 2 : 1;
        api.win({ stars, base: stars * 10 });
      } else {
        api.fail({ lead: api.t('miss'), msg: api.t('missMsg'), hintAvailable: true });
      }
    },
    frame(ctx, dt, t) {
      if (!zone) return;
      if (state === 'play') {
        x += dir * speed * dt * (hint ? 0.6 : 1);
        if (x > 1) { x = 1; dir = -1; }
        if (x < 0) { x = 0; dir = 1; }
      }
      const w = W * DPR, h = H * DPR, pad = 40 * DPR, y = h * 0.5, len = w - pad * 2;
      ctx.fillStyle = '#1F2233'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#34384F'; ctx.fillRect(pad, y - 10 * DPR, len, 20 * DPR);
      ctx.fillStyle = '#3FCB8E'; ctx.fillRect(pad + zone.a * len, y - 10 * DPR, zone.w * len, 20 * DPR);
      const sk = api.skin();
      ctx.fillStyle = sk.a;
      ctx.beginPath(); ctx.arc(pad + x * len, y, 16 * DPR, 0, Math.PI * 2); ctx.fill();
    },
    drawSkin(c, w, h, skin) { c.fillStyle = skin.a; c.beginPath(); c.arc(w / 2, h / 2, h * 0.3, 0, Math.PI * 2); c.fill(); },
  };
}
