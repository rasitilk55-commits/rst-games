// Olay Ufku gökyüzü: tek bir WebGL parça gölgelendiricisiyle (fragment shader) çizilir.
//  - Kütleçekimsel mercekleme: her kara delik arkasındaki yıldızları ve nebulayı büker (Einstein halkası)
//  - Yığılma diski: dönen, Doppler etkisiyle bir yanı parlayan sıcak gaz halkası
//  - Foton halkası ve olay ufku gölgesi
//  - Portal: merceklenen, spiral ışıklı hedef
// WebGL yoksa 2B yedek çizim kullanılır.

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uPx;          // dünya biriminin piksel karşılığı
uniform vec4 uHoles[4];     // x, y, rh (piksel), mercek gücü (piksel^2)
uniform float uTilt[4];     // her diskin eğim açısı
uniform vec4 uWhite[2];     // beyaz delikler: x, y, çekirdek r (piksel), ıraksak mercek gücü
uniform int uWCount;
uniform int uCount;
uniform vec4 uPortal;       // x, y, r (piksel), parlaklık
uniform float uFlash;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = h21(i), b = h21(i + vec2(1.0, 0.0)), c = h21(i + vec2(0.0, 1.0)), d = h21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
vec3 stars(vec2 p) {
  vec3 col = vec3(0.0);
  for (int l = 0; l < 3; l++) {
    float sc = uPx * (9.0 + float(l) * 11.0);
    vec2 g = p / sc;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float r = h21(id + float(l) * 7.13);
    if (r > 0.86) {
      vec2 o = vec2(h21(id + 3.3), h21(id + 8.1)) - 0.5;
      float d = length(f - o * 0.7);
      float tw = 0.65 + 0.35 * sin(uTime * (0.8 + r * 3.0) + r * 40.0);
      float b = smoothstep(0.09, 0.0, d) * tw * (r - 0.86) * 9.0;
      col += b * mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.85, 0.7), h21(id + 1.7));
    }
  }
  return col;
}
vec3 nebula(vec2 p) {
  vec2 q = p / (uPx * 260.0);
  float n = fbm(q + vec2(0.0, uTime * 0.01));
  float n2 = fbm(q * 1.7 + n * 1.4 - vec2(uTime * 0.008, 0.0));
  vec3 c = vec3(0.012, 0.01, 0.035);
  c = mix(c, vec3(0.22, 0.05, 0.32), smoothstep(0.38, 0.9, n2));
  c = mix(c, vec3(0.03, 0.16, 0.32), smoothstep(0.52, 0.95, n) * 0.7);
  c += vec3(0.35, 0.12, 0.18) * pow(smoothstep(0.62, 1.0, n2), 3.0);
  return c;
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 disp = vec2(0.0);
  float shadow = 0.0;
  vec3 ring = vec3(0.0), back = vec3(0.0), front = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    if (i >= uCount) break;
    vec4 H = uHoles[i];
    vec2 rel = p - H.xy;
    float r = length(rel);
    float rh = H.z;
    disp += -rel / max(r, 1.0) * (H.w / max(r, rh * 0.6));
    float s = 1.0 - smoothstep(rh * 0.97, rh * 1.05, r);
    shadow = max(shadow, s);
    ring += vec3(1.0, 0.86, 0.62) * exp(-pow((r - rh * 1.08) / (rh * 0.055), 2.0)) * 1.4;
    float tl = uTilt[i];
    vec2 rr = vec2(cos(tl) * rel.x + sin(tl) * rel.y, -sin(tl) * rel.x + cos(tl) * rel.y);
    float ang = atan(rel.y, rel.x);
    float sw = fbm(vec2(ang * 2.2 - uTime * 1.6 + r / uPx * 0.05, r / uPx * 0.08));
    float arc = exp(-pow((r - rh * 1.45) / (rh * 0.26), 2.0)) * (0.35 + 0.65 * clamp(-rr.y / max(r, 1.0), 0.0, 1.0));
    back += vec3(1.0, 0.55, 0.2) * arc * (0.5 + sw) * 1.1;
    vec2 e = vec2(rr.x, rr.y * 3.2);
    float er = length(e);
    float ea = atan(e.y, e.x);
    float band = smoothstep(rh * 1.45, rh * 1.9, er) * (1.0 - smoothstep(rh * 2.6, rh * 4.6, er));
    float swirl = fbm(vec2(ea * 2.5 - uTime * 1.9 + er / uPx * 0.04, er / uPx * 0.06));
    float dop = 0.45 + 0.55 * (0.5 + 0.5 * cos(ea));
    float heat = band * swirl * dop;
    vec3 dc = mix(vec3(1.0, 0.38, 0.1), vec3(1.0, 0.92, 0.75), smoothstep(0.35, 0.8, heat));
    float isFront = step(-rh * 0.12, rr.y);
    front += dc * heat * 2.2 * isFront;
    back += dc * heat * 1.6 * (1.0 - isFront);
  }
  // Beyaz delikler: ıraksak mercek (ışığı dışarı iter) ve parlak korona
  vec3 wglow = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    if (i >= uWCount) break;
    vec4 Wh = uWhite[i];
    vec2 rel = p - Wh.xy;
    float r = length(rel);
    float rw = Wh.z;
    disp += rel / max(r, 1.0) * (Wh.w / max(r, rw * 1.2));
    float ang = atan(rel.y, rel.x);
    float core = exp(-pow(r / (rw * 1.15), 2.0)) * 2.4;
    float corona = exp(-r / (rw * 2.6)) * (0.55 + 0.45 * noise(vec2(ang * 3.0 + uTime * 0.7, r / uPx * 0.08)));
    float rays = pow(max(0.0, sin(ang * 12.0 + uTime * 0.6)), 10.0) * exp(-r / (rw * 5.5)) * 0.7;
    wglow += vec3(0.85, 0.93, 1.0) * core + vec3(0.45, 0.7, 1.0) * corona + vec3(0.7, 0.85, 1.0) * rays;
  }
  vec2 sp = p + disp;
  // renk sapması: bükülme güçlü olduğunda yıldızlar gökkuşağı saçaklarıyla ayrışır
  vec2 ca = disp * 0.035;
  vec3 st = vec3(stars(sp - ca).r, stars(sp).g, stars(sp + ca).b);
  vec3 col = nebula(sp) + st;
  vec2 pd = sp - uPortal.xy;
  float pr = length(pd);
  float pa = atan(pd.y, pd.x);
  float core = exp(-pow(pr / (uPortal.z * 0.5), 2.0));
  float halo = exp(-pr / (uPortal.z * 1.4)) * 0.55;
  float rim = exp(-pow((pr - uPortal.z) / (uPortal.z * 0.1), 2.0));
  float spiral = 0.5 + 0.5 * sin(pa * 5.0 + pr / uPx * 0.18 - uTime * 3.0);
  col += (vec3(0.85, 0.95, 1.0) * core + vec3(0.45, 0.7, 1.0) * halo + vec3(0.75, 0.9, 1.0) * rim * (0.5 + 0.5 * spiral)) * uPortal.w;
  col = col * (1.0 - shadow) + back * (1.0 - shadow) + ring * (1.0 - shadow * 0.7) + front + wglow;
  vec2 uv = gl_FragCoord.xy / uRes;
  col *= mix(0.55, 1.0, smoothstep(1.0, 0.25, length((uv - 0.5) * vec2(1.0, 0.8)) * 1.3));
  col = 1.0 - exp(-col * 1.25);
  col = pow(col, vec3(0.92));
  col = mix(col, vec3(1.0), uFlash);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createSky() {
  const canvas = document.createElement('canvas');
  let gl = null;
  try { gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, alpha: false }); } catch (e) { gl = null; }
  if (!gl) return { ok: false, canvas, render() {} };

  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) {
    console.warn('Olay Ufku shader:', e);
    return { ok: false, canvas, render() {} };
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const n of ['uRes', 'uTime', 'uPx', 'uHoles', 'uTilt', 'uCount', 'uWhite', 'uWCount', 'uPortal', 'uFlash']) U[n] = gl.getUniformLocation(prog, n);
  const holes = new Float32Array(16);
  const tilts = new Float32Array(4);
  const whites = new Float32Array(8);

  return {
    ok: true,
    canvas,
    /** s: { w, h (piksel), time, px, holes:[{x,y,rh,k,tilt}], whites:[{x,y,r,k}], portal:{x,y,r,glow}, flash } — koordinatlar bu tuvalin pikselleri */
    render(s) {
      if (canvas.width !== s.w || canvas.height !== s.h) { canvas.width = s.w; canvas.height = s.h; }
      gl.viewport(0, 0, s.w, s.h);
      holes.fill(0);
      tilts.fill(0);
      s.holes.slice(0, 4).forEach((h, i) => { holes[i * 4] = h.x; holes[i * 4 + 1] = h.y; holes[i * 4 + 2] = h.rh; holes[i * 4 + 3] = h.k; tilts[i] = h.tilt || 0; });
      gl.uniform2f(U.uRes, s.w, s.h);
      gl.uniform1f(U.uTime, s.time);
      gl.uniform1f(U.uPx, s.px);
      gl.uniform4fv(U.uHoles, holes);
      gl.uniform1fv(U.uTilt, tilts);
      whites.fill(0);
      const ws = (s.whites || []).slice(0, 2);
      ws.forEach((w, i) => { whites[i * 4] = w.x; whites[i * 4 + 1] = w.y; whites[i * 4 + 2] = w.r; whites[i * 4 + 3] = w.k; });
      gl.uniform4fv(U.uWhite, whites);
      gl.uniform1i(U.uWCount, ws.length);
      gl.uniform1i(U.uCount, Math.min(4, s.holes.length));
      gl.uniform4f(U.uPortal, s.portal.x, s.portal.y, s.portal.r, s.portal.glow);
      gl.uniform1f(U.uFlash, s.flash || 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
