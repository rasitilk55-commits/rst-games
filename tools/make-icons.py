#!/usr/bin/env python3
"""Oyun ikonlarını ve açılış ekranlarını üretir (Pillow ile, kod tabanlı çizim).
Olay Ufku ikonu gerçek oyun shaderıyla üretilir: tools/shader-icon.cjs
Kullanım: python3 tools/make-icons.py
Çıktı: apps/<oyun>/assets/{icon-only,icon-foreground,icon-background,splash,splash-dark}.png
Bu dosyalar `npx @capacitor/assets generate` ile bütün iOS/Android boyutlarına çevrilir."""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
S = 2048  # yüksek çözünürlükte çiz, sonra küçült (kenar yumuşatma)


def hexc(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def vgrad(size, top, bottom):
    img = Image.new('RGBA', (size, size))
    d = ImageDraw.Draw(img)
    t, b = hexc(top), hexc(bottom)
    for y in range(size):
        k = y / (size - 1)
        d.line([(0, y), (size, y)], fill=tuple(int(t[i] + (b[i] - t[i]) * k) for i in range(4)))
    return img


def radial(size, inner, outer):
    img = Image.new('RGBA', (size, size), hexc(outer))
    d = ImageDraw.Draw(img)
    a, b = hexc(inner), hexc(outer)
    steps = 120
    for i in range(steps, 0, -1):
        k = i / steps
        r = int(size * 0.75 * k)
        col = tuple(int(a[j] + (b[j] - a[j]) * k) for j in range(4))
        d.ellipse([size / 2 - r, size / 2 - r, size / 2 + r, size / 2 + r], fill=col)
    return img


def glow(img, xy, r, color, blur):
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([xy[0] - r, xy[1] - r, xy[0] + r, xy[1] + r], fill=color)
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))


# ---------------- Kelebek Sarkaç ----------------
def pendulum_motif(img, scale=1.0, ox=0, oy=0):
    d = ImageDraw.Draw(img)
    s = S * scale
    X = lambda v: ox + v * s
    Y = lambda v: oy + v * s
    # iz (kübik eğri, kelebeğe doğru kalınlaşır)
    P = [(0.9, 0.5), (0.98, 0.95), (0.58, 0.96), (0.42, 0.66)]
    pts = []
    for i in range(160):
        t = i / 159
        mt = 1 - t
        x = mt**3 * P[0][0] + 3 * mt * mt * t * P[1][0] + 3 * mt * t * t * P[2][0] + t**3 * P[3][0]
        y = mt**3 * P[0][1] + 3 * mt * mt * t * P[1][1] + 3 * mt * t * t * P[2][1] + t**3 * P[3][1]
        pts.append((X(x), Y(y)))
    for i in range(len(pts) - 1):
        k = i / len(pts)
        d.line([pts[i], pts[i + 1]], fill=(255, 107, 90, int(30 + 200 * k)), width=max(2, int((8 + 46 * k) * scale)))
    # sarkaç
    p0 = (X(0.5), Y(0.13)); p1 = (X(0.68), Y(0.37)); p2 = pts[-1]
    d.line([p0, p1, p2], fill=hexc('#2B2340'), width=int(30 * scale), joint='curve')
    for (x, y), r in ((p0, 36), (p1, 46)):
        d.ellipse([x - r * scale, y - r * scale, x + r * scale, y + r * scale], fill=hexc('#2B2340'))
    # kelebek
    bx, by, bs = p2[0], p2[1] - 30 * scale, 330 * scale
    for side in (-1, 1):
        wing = Image.new('RGBA', img.size, (0, 0, 0, 0))
        wd = ImageDraw.Draw(wing)
        cx, cy = bx + side * bs * 0.55, by - bs * 0.25
        wd.ellipse([cx - bs * 0.62, cy - bs * 0.46, cx + bs * 0.62, cy + bs * 0.46], fill=hexc('#FF6B5A'))
        cx2, cy2 = bx + side * bs * 0.42, by + bs * 0.32
        wd.ellipse([cx2 - bs * 0.42, cy2 - bs * 0.32, cx2 + bs * 0.42, cy2 + bs * 0.32], fill=hexc('#FFB38A'))
        wd.ellipse([cx + side * bs * 0.05 - bs * 0.12, cy - bs * 0.12 - bs * 0.1, cx + side * bs * 0.05 + bs * 0.12, cy - bs * 0.12 + bs * 0.14], fill=(255, 255, 255, 170))
        wing = wing.rotate(side * -12, center=(bx, by), resample=Image.BICUBIC)
        img.alpha_composite(wing)
    d = ImageDraw.Draw(img)
    d.ellipse([bx - bs * 0.1, by - bs * 0.52, bx + bs * 0.1, by + bs * 0.52], fill=hexc('#2B2340'))
    d.line([(bx, by - bs * 0.45), (bx - bs * 0.24, by - bs * 0.85)], fill=hexc('#2B2340'), width=int(16 * scale))
    d.line([(bx, by - bs * 0.45), (bx + bs * 0.24, by - bs * 0.85)], fill=hexc('#2B2340'), width=int(16 * scale))


def pendulum_bg():
    img = vgrad(S, '#FFE3D3', '#D9D2F5')
    glow(img, (S * 0.82, S * 0.16), S * 0.12, (255, 241, 210, 200), S * 0.05)
    return img


GAMES = {
    'kelebek-sarkac': (pendulum_bg, pendulum_motif, '#FFE3D3', '#2B2340'),
}

for slug, (bgf, motif, splash_col, splash_dark) in GAMES.items():
    out = ROOT / 'apps' / slug / 'assets'
    out.mkdir(parents=True, exist_ok=True)
    icon = bgf()
    motif(icon)
    icon.convert('RGB').resize((1024, 1024), Image.LANCZOS).save(out / 'icon-only.png')
    bgf().convert('RGB').resize((1024, 1024), Image.LANCZOS).save(out / 'icon-background.png')
    fg = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    motif(fg, 0.62, S * 0.19, S * 0.19)
    fg.resize((1024, 1024), Image.LANCZOS).save(out / 'icon-foreground.png')
    for name, col in (('splash', splash_col), ('splash-dark', splash_dark)):
        sp = Image.new('RGBA', (2732, 2732), hexc(col))
        m = bgf().resize((900, 900), Image.LANCZOS)
        motif_layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        motif(motif_layer)
        m.alpha_composite(motif_layer.resize((900, 900), Image.LANCZOS))
        mask = Image.new('L', (900, 900), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, 899, 899], radius=200, fill=255)
        sp.paste(m, (916, 916), mask)
        sp.convert('RGB').save(out / f'{name}.png')
    print('ikonlar hazır:', slug)


# ---------------- Olay Ufku (shader ile üretilen görselleri tamamlar) ----------------
ou = ROOT / 'apps' / 'olay-ufku' / 'assets'
raw = ou / 'splash-raw.png'
if raw.exists():
    big = Image.open(raw).convert('RGB').resize((2732, 2732), Image.LANCZOS)
    big.save(ou / 'splash.png')
    big.save(ou / 'splash-dark.png')
    Image.new('RGBA', (1024, 1024), (0, 0, 0, 0)).save(ou / 'icon-foreground.png')
    raw.unlink()
    print('açılış ekranı hazır: olay-ufku')
