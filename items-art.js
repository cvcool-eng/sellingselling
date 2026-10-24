// ============================================================
//  Hand-drawn item art. Every item is drawn in a 100x100 box with
//  wobbly ink lines. A few "boil" frames are made per item so the
//  art jiggles like the rest of the game.
// ============================================================
(() => {
'use strict';
const INK = '#1b1b1b';
const SIZE = 192, FRAMES = 3, AMP = 0.85;
let c, seed, k;

function nz() { const x = Math.sin((k++) * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x) - 0.5; }

// ---------- drawing helpers (all in 0..100 units) ----------
function mk(pts, closed) {
  const p = new Path2D(), n = pts.length, segs = closed ? n : n - 1;
  for (let s = 0; s < segs; s++) {
    const a = pts[s], b = pts[(s + 1) % n];
    const steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 7));
    for (let j = s === 0 ? 0 : 1; j <= steps; j++) {
      const t = j / steps;
      const x = a[0] + (b[0] - a[0]) * t + nz() * AMP * 2, y = a[1] + (b[1] - a[1]) * t + nz() * AMP * 2;
      if (s === 0 && j === 0) p.moveTo(x, y); else p.lineTo(x, y);
    }
  }
  if (closed) p.closePath();
  return p;
}
function strokeP(p, lw = 3.2, color = INK) { c.strokeStyle = color; c.lineWidth = lw; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(p); }
function poly(pts, fill, lw = 3.2) { const p = mk(pts, true); if (fill) { c.fillStyle = fill; c.fill(p); } if (lw) strokeP(p, lw); return p; }
function line(pts, lw = 3, color = INK) { const p = mk(pts, false); strokeP(p, lw, color); return p; }
function clip(p, fn) { c.save(); c.clip(p); fn(); c.restore(); }
function ellP(cx, cy, rx, ry, rot = 0) {
  const n = Math.max(14, Math.round((rx + ry) / 1.6)), p = [], cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * cr - y * sr, cy + x * sr + y * cr]); }
  return p;
}
function ell(cx, cy, rx, ry, fill, lw = 3.2, rot = 0) { return poly(ellP(cx, cy, rx, ry, rot), fill, lw); }
function arcP(cx, cy, rx, ry, a0, a1, n = 16) {
  const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p;
}
function qP(p0, p1, p2, n = 12) {
  const p = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; p.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); } return p;
}
function wave(x0, y0, x1, y1, amp, waves, n = 24) {
  const p = [], dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), nx = -dy / d, ny = dx / d;
  for (let i = 0; i <= n; i++) { const t = i / n, o = Math.sin(t * Math.PI * 2 * waves) * amp; p.push([x0 + dx * t + nx * o, y0 + dy * t + ny * o]); }
  return p;
}
function ribbon(spine, w0, w1, fill, lw = 3.2) {
  const Lp = [], Rp = [], n = spine.length;
  for (let i = 0; i < n; i++) {
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const w = (w0 + (w1 - w0) * i / (n - 1)) / 2;
    Lp.push([spine[i][0] - dy * w, spine[i][1] + dx * w]); Rp.push([spine[i][0] + dy * w, spine[i][1] - dx * w]);
  }
  return poly(Lp.concat(Rp.reverse()), fill, lw);
}
function dot(x, y, r, color = INK) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); }
function eye(x, y, r = 3.4) { dot(x, y, r); dot(x - r * 0.35, y - r * 0.4, r * 0.38, '#fff'); }
function smile(x, y, w, d) { line(qP([x - w, y], [x, y + (d == null ? w * 0.8 : d)], [x + w, y], 8), 2.6); }
function blush(x, y, r = 3.6) { c.globalAlpha = .45; dot(x, y, r, '#ff7a9a'); c.globalAlpha = 1; }
function shine(pts, lw = 3) { line(pts, lw, 'rgba(255,255,255,.85)'); }
function drop(x, y, s = 1) { poly([[x, y - 7 * s], [x + 4.5 * s, y + 1 * s], [x + 3.5 * s, y + 4.5 * s], [x, y + 6 * s], [x - 3.5 * s, y + 4.5 * s], [x - 4.5 * s, y + 1 * s]], '#8fd3ff', 2); }
function sparkle(x, y, s, color = '#fff') {
  poly([[x, y - s], [x + s * .25, y - s * .25], [x + s, y], [x + s * .25, y + s * .25], [x, y + s], [x - s * .25, y + s * .25], [x - s, y], [x - s * .25, y - s * .25]], color, 1.8);
}
function starP(cx, cy, R, r, rotA = -Math.PI / 2) {
  const p = []; for (let i = 0; i < 10; i++) { const a = rotA + i * Math.PI / 5, rr = i % 2 ? r : R; p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return p;
}
function rot(cx, cy, a, fn) { c.save(); c.translate(cx, cy); c.rotate(a); c.translate(-cx, -cy); fn(); c.restore(); }
// A side-view fish facing right. Options add the patterns that tell species apart:
// stripes (white bands), bars (dark bands), lateral (side band), spots, backWaves,
// whiskers, teeth, bill (swordfish), lobes (coelacanth fins), tallFin, sparkle.
const SPOTS = [[-.26, -.22, .05], [-.06, -.3, .04], [.12, -.18, .05], [-.18, .04, .04], [.02, -.02, .035], [.2, .08, .04], [-.33, .14, .03], [.3, -.12, .03]];
function fish(o) {
  const { cx, cy, len, h } = o, X = x => cx + x * len, Y = y => cy + y * h;
  if (o.lobes) for (const [fx, fy, a] of [[-.08, .5, .5], [-.22, -.48, -.4], [-.3, .42, .7]]) ell(X(fx), Y(fy), len * .08, h * .16, o.lobes, 2.4, a);
  poly([[X(-.36), Y(0)], [X(-.6), Y(-.62)], [X(-.5), Y(0)], [X(-.6), Y(.62)]], o.tail || o.fin, 3);
  poly([[X(-.22), Y(-.36)], [X(-.06), Y(o.tallFin ? -1.25 : -.88)], [X(.2), Y(-.4)]], o.fin, 3);
  if (o.bill) poly([[X(.4), Y(-.08)], [X(.8), Y(-.02)], [X(.4), Y(.06)]], o.bill, 2.6);
  const body = ell(cx, cy, len * 0.45, h * 0.5, o.body);
  clip(body, () => {
    if (o.belly) ell(cx + len * 0.04, cy + h * 0.42, len * 0.46, h * 0.3, o.belly, 0);
    if (o.lateral) ribbon([[X(-.45), Y(.02)], [X(0), Y(-.02)], [X(.4), Y(-.02)]], h * .2, h * .12, o.lateral, 0);
    if (o.bars) for (const sx of [-.26, -.1, .06, .22]) ribbon([[X(sx), Y(-.6)], [X(sx + .03), Y(0)], [X(sx), Y(.6)]], len * .06, len * .05, o.bars, 0);
    if (o.backWaves) for (let i = 0; i < 6; i++) line(wave(X(-.38 + i * .12), Y(-.5), X(-.34 + i * .12), Y(-.12), 1.6, 1, 6), 2.2, o.backWaves);
    if (o.spots) for (const [sx, sy, sr] of SPOTS) dot(X(sx), Y(sy), sr * len * 0.5 + 0.8, o.spots);
    if (o.bands) o.bands.forEach((col, i) => ribbon([[X(-.45 + (i + .5) * .9 / o.bands.length), Y(-.6)], [X(-.45 + (i + .5) * .9 / o.bands.length), Y(.6)]], len * .9 / o.bands.length + 1, len * .9 / o.bands.length + 1, col, 0));
    if (o.squiggle) for (let i = 0; i < 5; i++) line(wave(X(-.4), Y(-.42 + i * .2), X(.38), Y(-.36 + i * .18), h * .06, 3, 18), 2.6, o.squiggle);
    if (o.stripes) for (const sx of o.stripes) ribbon([[X(sx), Y(-.6)], [X(sx + .04), Y(0)], [X(sx), Y(.6)]], len * .1, len * .1, '#fff', 2.4);
  });
  strokeP(body, 3.2);
  poly([[X(-.04), Y(.06)], [X(.12), Y(.16)], [X(0), Y(.34)]], o.fin, 2.4);
  line(arcP(X(.1), Y(0), len * .05, h * .28, -1.2, 1.2, 6), 2, 'rgba(27,27,27,.55)');
  if (!o.noEye) eye(X(.27), Y(-.1), h * 0.09 + 1.6);
  line([[X(.43), Y(.1)], [X(.36), Y(.18)]], 2.4);
  if (o.teeth) for (let i = 0; i < 3; i++) poly([[X(.36 + i * .025), Y(.12)], [X(.375 + i * .025), Y(.24)], [X(.39 + i * .025), Y(.12)]], '#fff', 1.2);
  if (o.whiskers) for (const [dx, dy] of [[.18, .28], [.12, .42]]) line(qP([X(.42), Y(.14)], [X(.5 + dx * .3), Y(dy)], [X(.4 + dx), Y(dy + .3)], 6), 1.8);
  if (o.sparkle) { sparkle(X(-.2), Y(-1.1), 6); sparkle(X(.5), Y(-.9), 4.5); }
}

// ---------- the items ----------
const ART = {
  boot() {
    poly([[30, 14], [58, 14], [58, 60], [82, 64], [88, 76], [88, 84], [28, 84], [26, 58]], '#8b5a2b');
    poly([[24, 80], [90, 80], [90, 90], [24, 90]], '#4a3020');
    poly([[27, 10], [61, 10], [61, 20], [27, 20]], '#a8703a');
    for (const y of [30, 40, 50]) line([[34, y], [54, y - 3]], 2.4, '#f5e6c8');
    shine([[33, 26], [33, 52]], 2.4);
    drop(72, 40); drop(80, 52, .7);
  },
  can() {
    poly([[28, 22], [72, 22], [72, 82], [28, 82]], '#c9ced6');
    poly([[28, 38], [72, 38], [72, 66], [28, 66]], '#e8574a');
    ell(50, 52, 10, 6, '#fff', 2.2);
    poly([[60, 52], [66, 47], [66, 57]], '#fff', 2.2);
    ell(50, 82, 22, 6, '#aab1bb');
    ell(50, 22, 22, 7, '#e3e6ea');
    ell(56, 20, 5, 2.5, '#c9ced6', 2);
    shine([[34, 26], [34, 78]], 2.6);
    line([[64, 70], [68, 74], [66, 78]], 2);
  },
  seaweed() {
    ribbon(wave(30, 92, 26, 18, 6, 1.5), 12, 4, '#3d8b3a');
    ribbon(wave(52, 92, 56, 8, 7, 1.7), 13, 4, '#6cc36c');
    ribbon(wave(72, 92, 76, 28, 5, 1.2), 11, 4, '#4caf50');
    for (const [x, y] of [[54, 30], [30, 50], [74, 56]]) dot(x, y, 2.2, 'rgba(255,255,255,.7)');
  },
  stick() {
    ribbon(qP([10, 72], [50, 56], [90, 30]), 11, 7, '#9a6234');
    ribbon([[54, 50], [60, 38], [64, 26]], 6, 3, '#9a6234', 2.6);
    ell(70, 22, 9, 5, '#7ccf5a', 2.6, -0.6);
    line([[69, 22], [76, 18]], 1.6);
    for (const [x, y] of [[24, 64], [40, 58], [72, 42]]) line([[x, y], [x + 7, y - 3]], 1.8, 'rgba(27,27,27,.5)');
  },
  sock() {
    const s = poly([[36, 10], [62, 10], [62, 56], [80, 66], [86, 78], [78, 90], [48, 88], [36, 72]], '#fff');
    clip(s, () => {
      poly([[30, 6], [70, 6], [70, 22], [30, 22]], '#e8574a', 0);
      poly([[30, 32], [70, 32], [70, 39], [30, 39]], '#4aa3df', 0);
      poly([[30, 47], [70, 47], [70, 54], [30, 54]], '#4aa3df', 0);
      ell(80, 82, 11, 10, '#e8574a', 0);
    });
    strokeP(s, 3.2);
    line([[36, 22], [62, 22]], 2);
    drop(20, 44); drop(24, 60, .7);
  },
  sardine() { fish({ cx: 52, cy: 52, len: 80, h: 34, body: '#9fb8cc', belly: '#e6eef5', fin: '#7d98ae' }); },
  rock() {
    const r = poly([[18, 66], [24, 42], [44, 28], [68, 30], [84, 48], [86, 68], [70, 80], [32, 80]], '#a8a8a8');
    clip(r, () => ell(56, 78, 40, 12, '#8f8f8f', 0));
    strokeP(r, 3.2);
    shine(qP([30, 48], [38, 36], [52, 33], 6), 3.4);
    for (const [x, y] of [[60, 52], [44, 62], [70, 64], [52, 44]]) dot(x, y, 1.6, 'rgba(27,27,27,.45)');
  },
  ham() {
    ribbon([[60, 40], [84, 18]], 10, 10, '#fff8ea', 3);
    ell(86, 12, 6, 6, '#fff8ea', 2.8); ell(92, 20, 6, 6, '#fff8ea', 2.8);
    const m = ell(42, 56, 32, 28, '#d9604f', 3.2, -0.5);
    clip(m, () => ell(36, 62, 22, 18, '#f08a7e', 0, -0.5));
    strokeP(m, 3.2);
    ell(36, 62, 12, 9, '#ffd0c4', 2.4, -0.5);
    shine(qP([22, 44], [26, 34], [38, 30], 6), 3.4);
  },
  crab() {
    for (const d of [-1, 1]) {
      for (const i of [0, 1, 2]) line(qP([50 + d * 20, 62 + i * 5], [50 + d * 34, 58 + i * 7], [50 + d * 38, 74 + i * 6], 6), 3);
      line([[50 + d * 18, 52], [50 + d * 28, 38]], 3);
      ell(50 + d * 30, 30, 12, 10, '#e8574a', 3, d * 0.4);
      poly([[50 + d * 33, 24], [50 + d * 44, 22], [50 + d * 36, 30]], '#fff', 2.2);
      line([[50 + d * 8, 50], [50 + d * 10, 36]], 2.6);
      ell(50 + d * 10, 32, 5, 5, '#fff', 2.4); dot(50 + d * 10, 32, 2.2);
    }
    ell(50, 60, 26, 17, '#e8574a');
    smile(50, 62, 7); blush(36, 62); blush(64, 62);
  },
  shrimp() {
    const sp = arcP(50, 50, 26, 28, -0.25 * Math.PI, 1.05 * Math.PI, 18);
    ribbon(sp, 22, 8, '#ff9e80');
    for (let i = 3; i < sp.length - 2; i += 3) {
      const [x, y] = sp[i], dx = x - 50, dy = y - 50, d = Math.hypot(dx, dy);
      line([[x - dx / d * 8, y - dy / d * 8], [x + dx / d * 8, y + dy / d * 8]], 2, 'rgba(27,27,27,.5)');
    }
    const [tx, ty] = sp[sp.length - 1];
    poly([[tx, ty], [tx - 12, ty - 10], [tx - 6, ty + 2], [tx - 12, ty + 12]], '#ff8a65', 2.6);
    line(qP([68, 26], [86, 6], [94, 20]), 2); line(qP([66, 24], [76, 4], [62, 4]), 2);
    eye(66, 34, 3);
    for (const i of [0, 1, 2]) line([[44 + i * 8, 76], [42 + i * 8, 86]], 2);
  },
  duck() {
    line(wave(10, 86, 90, 86, 2, 3), 2.4, '#4aa3df');
    const b = ell(54, 64, 32, 20, '#ffd84d');
    poly([[78, 56], [94, 44], [88, 62]], '#ffd84d', 3);
    ell(38, 38, 17, 16, '#ffd84d');
    poly([[22, 38], [8, 42], [10, 47], [24, 46]], '#ff9a2e', 2.8);
    eye(38, 33, 3.2); blush(46, 42);
    line(qP([48, 64], [62, 72], [72, 58], 8), 2.6);
    shine(qP([44, 52], [56, 48], [68, 52], 6));
  },
  frog() {
    ell(30, 82, 12, 6, '#5fb64a'); ell(70, 82, 12, 6, '#5fb64a');
    ell(50, 62, 32, 24, '#7ccf5a');
    for (const d of [-1, 1]) {
      ell(50 + d * 15, 38, 11, 11, '#7ccf5a');
      ell(50 + d * 15, 37, 6.5, 6.5, '#fff', 2.4); eye(50 + d * 15, 38, 3.4);
    }
    smile(50, 60, 16, 9); blush(30, 64); blush(70, 64);
    ell(50, 74, 14, 7, '#c6eda9', 0);
  },
  teddy() {
    for (const d of [-1, 1]) { ell(50 + d * 16, 22, 8, 8, '#c68a52'); ell(50 + d * 16, 22, 4, 4, '#f0d2a8', 2); }
    ell(50, 74, 20, 17, '#c68a52');
    ell(50, 76, 10, 8, '#f0d2a8', 2.4);
    ell(30, 66, 6, 9, '#c68a52', 3, 0.5); ell(70, 66, 6, 9, '#c68a52', 3, -0.5);
    ell(50, 40, 21, 19, '#c68a52');
    ell(50, 47, 9, 6.5, '#f0d2a8', 2.4);
    dot(50, 44.5, 2.6); eye(42, 37, 2.6); eye(58, 37, 2.6);
    line([[50, 47], [50, 50]], 2);
    poly([[60, 68], [66, 68], [66, 74], [60, 74]], '#7fb3e6', 2);
    drop(82, 30); drop(16, 44, .7);
  },
  pizza() {
    const s = poly([[50, 92], [16, 22], [84, 22]], '#ffd166');
    clip(s, () => { for (const [x, y, r] of [[40, 36, 7], [60, 44, 7], [48, 62, 6]]) ell(x, y, r, r, '#d9534f', 2.2); dot(64, 32, 2, '#3d8b3a'); dot(42, 52, 2, '#3d8b3a'); });
    strokeP(s, 3.2);
    poly([[12, 14], [88, 14], [86, 27], [14, 27]], '#d99a4e');
    ribbon([[30, 27], [30, 38]], 6, 4, '#ffd166', 2.4);
    for (const x of [26, 46, 66]) line([[x, 19], [x + 6, 19]], 1.6, 'rgba(27,27,27,.5)');
  },
  puffer() {
    const sp = [];
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; sp.push([50 + Math.cos(a) * 31, 52 + Math.sin(a) * 31]); }
    for (const [x, y] of sp) { const dx = x - 50, dy = y - 52; poly([[x - dy * .12, y + dx * .12], [x + dx * .3, y + dy * .3], [x + dy * .12, y - dx * .12]], '#f2b84b', 2.2); }
    poly([[20, 52], [8, 40], [10, 64]], '#f2b84b', 2.6);
    const b = ell(50, 52, 31, 30, '#ffd27a');
    clip(b, () => ell(52, 70, 30, 16, '#fff3d1', 0));
    strokeP(b, 3.2);
    eye(60, 44, 4.4); eye(76, 46, 3.6);
    ell(76, 60, 4, 4, '#ff8a80', 2.4);
    blush(58, 58);
  },
  octopus() {
    const tc = '#b085f5';
    for (let i = 0; i < 5; i++) {
      const x = 28 + i * 11;
      ribbon(wave(x, 56, x + (i - 2) * 6, 92, 3, 1.2, 14), 10, 4, tc, 2.8);
    }
    const h = ell(50, 40, 27, 26, tc);
    clip(h, () => { for (const [x, y, r] of [[36, 26, 4], [62, 22, 3], [66, 34, 2.5]]) dot(x, y, r, '#9668e0'); });
    strokeP(h, 3.2);
    eye(41, 44, 3.6); eye(59, 44, 3.6);
    smile(50, 52, 6); blush(34, 52); blush(66, 52);
  },
  lobster() {
    const red = '#d9442f';
    line(qP([44, 30], [20, 6], [8, 20]), 2); line(qP([56, 30], [80, 6], [92, 20]), 2);
    for (const d of [-1, 1]) {
      line(qP([50 + d * 10, 40], [50 + d * 22, 40], [50 + d * 24, 30], 6), 4);
      ell(50 + d * 26, 20, 11, 13, red, 3, d * -0.3);
      poly([[50 + d * 26, 8], [50 + d * 30, 16], [50 + d * 22, 14]], '#fff', 2);
      for (const i of [0, 1]) line([[50 + d * 12, 52 + i * 7], [50 + d * 22, 58 + i * 8]], 2.4);
    }
    poly([[50, 82], [38, 96], [62, 96]], red, 2.8);
    for (let i = 3; i >= 0; i--) ell(50, 58 + i * 7, 13 - i * 1.5, 6, red, 2.6);
    ell(50, 42, 13, 15, red);
    eye(45, 36, 2.6); eye(55, 36, 2.6); smile(50, 44, 4);
  },
  squid() {
    const pink = '#f4a3b8';
    for (let i = 0; i < 6; i++) { const x = 34 + i * 6.4; ribbon(wave(x, 60, x + (i - 2.5) * 4, 94 - (i % 2) * 6, 2.4, 1.3, 12), 5, 2, pink, 2.4); }
    poly([[30, 22], [20, 34], [34, 36]], pink, 2.6); poly([[70, 22], [80, 34], [66, 36]], pink, 2.6);
    const m = poly([[50, 6], [66, 28], [68, 62], [32, 62], [34, 28]], pink);
    clip(m, () => { for (const [x, y] of [[44, 22], [56, 30], [46, 36]]) dot(x, y, 2, '#e07a98'); });
    strokeP(m, 3.2);
    ell(42, 50, 5, 6, '#fff', 2.2); eye(42, 51, 3); ell(58, 50, 5, 6, '#fff', 2.2); eye(58, 51, 3);
    smile(50, 57, 4, 3);
  },
  turtle() {
    for (const x of [30, 66]) ell(x, 78, 8, 6, '#a7d676');
    poly([[16, 66], [8, 70], [16, 72]], '#a7d676', 2.6);
    ell(86, 60, 11, 10, '#a7d676'); eye(89, 57, 2.6); smile(88, 63, 4, 2.5);
    const sh = poly(arcP(48, 70, 34, 38, Math.PI, Math.PI * 2, 20), '#6aa84f');
    clip(sh, () => {
      poly([[40, 46], [56, 46], [62, 58], [56, 70], [40, 70], [34, 58]], '#8cc56f', 2.4);
      line([[34, 58], [16, 58]], 2.4); line([[62, 58], [80, 58]], 2.4);
      line([[40, 46], [34, 34]], 2.4); line([[56, 46], [62, 34]], 2.4);
    });
    strokeP(sh, 3.2);
    poly([[12, 68], [84, 68], [84, 74], [12, 74]], '#d9c27a', 2.6);
  },
  bottle() {
    rot(50, 50, -0.45, () => {
      poly([[42, 6], [58, 6], [58, 16], [42, 16]], '#c68a52', 2.8);
      const g = poly([[42, 16], [58, 16], [58, 30], [70, 42], [70, 90], [30, 90], [30, 42], [42, 30]], 'rgba(150,215,190,.55)');
      clip(g, () => {
        rot(50, 62, 0.15, () => {
          poly([[38, 44], [62, 44], [62, 80], [38, 80]], '#fff3d1', 2.4);
          for (const y of [52, 60, 68]) line([[42, y], [58, y]], 1.6, 'rgba(27,27,27,.5)');
          dot(54, 74, 3, '#d9534f');
        });
      });
      strokeP(g, 3.2);
      shine([[36, 46], [36, 82]], 3);
    });
  },
  tropical() { fish({ cx: 52, cy: 52, len: 74, h: 46, body: '#ff9f3f', fin: '#ff7f2a', stripes: [-.18, .1] }); },
  shades() {
    line(qP([12, 40], [10, 30], [4, 26]), 3.4); line(qP([88, 40], [90, 30], [96, 26]), 3.4);
    line(qP([44, 42], [50, 36], [56, 42], 6), 3.6);
    for (const x of [28, 72]) {
      poly([[x - 18, 36], [x + 16, 36], [x + 14, 54], [x + 4, 62], [x - 10, 60], [x - 17, 50]], '#2b2b33');
      shine([[x - 10, 42], [x - 4, 42]], 3); shine([[x - 12, 48], [x - 10, 46]], 2.4);
    }
  },
  skate() {
    for (const x of [26, 72]) { poly([[x - 6, 52], [x + 6, 52], [x + 4, 60], [x - 4, 60]], '#9aa3ad', 2.4); }
    ribbon(qP([10, 38], [50, 52], [90, 38]), 13, 13, '#e8574a');
    line(qP([16, 38], [50, 49], [84, 38]), 2, 'rgba(255,255,255,.6)');
    for (const x of [22, 30, 68, 76]) { ell(x, 66, 6, 6, '#ffd84d', 2.8); dot(x, 66, 1.6); }
  },
  guitar() {
    rot(50, 50, 0.6, () => {
      ribbon([[50, 50], [50, 8]], 8, 8, '#8b5a2b', 2.8);
      poly([[44, 2], [56, 2], [58, 10], [42, 10]], '#2b2b33', 2.6);
      for (const y of [4, 8]) { dot(41, y, 1.6); dot(59, y, 1.6); }
      const red = '#e8574a';
      ell(50, 76, 22, 20, red); ell(50, 50, 16, 15, red);
      ell(50, 76, 20.4, 18.4, red, 0); ell(50, 50, 14.4, 13.4, red, 0);
      poly([[38, 58], [48, 54], [56, 80], [40, 84]], '#fff', 2.2);
      poly([[44, 62], [56, 62], [56, 66], [44, 66]], '#2b2b33', 1.8);
      poly([[44, 72], [56, 72], [56, 76], [44, 76]], '#2b2b33', 1.8);
      for (const x of [47, 50, 53]) line([[x, 10], [x, 86]], 0.9, 'rgba(255,255,255,.9)');
      poly([[42, 86], [58, 86], [58, 90], [42, 90]], '#2b2b33', 1.8);
    });
  },
  gamepad() {
    const g = '#7b8a9a';
    ell(24, 64, 14, 16, g); ell(76, 64, 14, 16, g);
    ell(50, 52, 36, 20, g);
    ell(24, 64, 12.4, 14.4, g, 0); ell(76, 64, 12.4, 14.4, g, 0);
    poly([[24, 44], [30, 44], [30, 50], [36, 50], [36, 56], [30, 56], [30, 62], [24, 62], [24, 56], [18, 56], [18, 50], [24, 50]], '#2b2b33', 2);
    for (const [x, y, col] of [[72, 46, '#ffd84d'], [80, 53, '#e8574a'], [64, 53, '#4aa3df'], [72, 60, '#6cc36c']]) ell(x, y, 4.2, 4.2, col, 2.2);
    poly([[42, 54], [48, 54], [48, 57], [42, 57]], '#2b2b33', 1.4); poly([[52, 54], [58, 54], [58, 57], [52, 57]], '#2b2b33', 1.4);
    shine(qP([24, 40], [40, 34], [56, 36], 6));
  },
  coin() {
    ell(52, 54, 34, 34, '#d9a514');
    ell(48, 50, 34, 34, '#ffcf3f');
    ell(48, 50, 25, 25, null, 2.2);
    poly(starP(48, 50, 15, 6.5), '#ffe27a', 2.6);
    shine(arcP(48, 50, 29, 29, -2.6, -1.8, 6));
  },
  shark() {
    const gr = '#8aa0b4';
    poly([[18, 50], [4, 28], [10, 50], [6, 72]], gr);
    poly([[40, 34], [52, 10], [62, 36]], gr);
    const b = poly([[14, 50], [30, 34], [60, 30], [84, 38], [96, 52], [84, 64], [56, 72], [30, 66]], gr);
    clip(b, () => poly([[30, 56], [60, 54], [96, 52], [84, 66], [56, 76], [28, 70]], '#eef3f7', 0));
    strokeP(b, 3.2);
    poly([[48, 64], [62, 70], [50, 80]], gr, 2.6);
    const m = poly([[64, 54], [90, 54], [84, 62], [70, 62]], '#5a2230', 2.6);
    clip(m, () => { for (let x = 66; x < 90; x += 5) poly([[x, 53], [x + 4, 53], [x + 2, 58]], '#fff', 1.2); });
    eye(80, 44, 3);
    for (const x of [48, 53, 58]) line([[x, 42], [x - 2, 50]], 2);
  },
  gold() {
    for (const [x, y] of [[40, 22], [52, 18], [62, 24]]) ell(x, y, 8, 5, '#ffcf3f', 2.4);
    const sack = poly([[36, 30], [64, 30], [60, 40], [80, 56], [84, 76], [72, 90], [28, 90], [16, 76], [20, 56], [40, 40]], '#c9a063');
    clip(sack, () => ell(36, 64, 10, 18, 'rgba(255,255,255,.25)', 0));
    strokeP(sack, 3.2);
    ribbon(qP([38, 40], [50, 44], [62, 40], 6), 5, 5, '#8b5a2b', 2.4);
    line([[52, 52], [52, 82]], 2.6);
    line(qP([60, 58], [44, 52], [46, 64], 8).concat(qP([46, 64], [62, 68], [56, 76], 8)).concat([[42, 76]]), 3.2);
  },
  diamond() {
    poly([[28, 28], [72, 28], [88, 44], [12, 44]], '#bdf0ff');
    poly([[12, 44], [88, 44], [50, 90]], '#7fd8f7');
    line([[34, 44], [50, 90], [66, 44]], 2.2); line([[40, 28], [34, 44]], 2.2); line([[60, 28], [66, 44]], 2.2);
    line([[50, 28], [42, 44]], 1.6); line([[50, 28], [58, 44]], 1.6);
    sparkle(84, 18, 7); sparkle(16, 22, 5);
    shine([[22, 46], [36, 66]], 2.6);
  },
  trophy() {
    const gold = '#ffcf3f';
    line(arcP(22, 32, 11, 12, Math.PI * .5, Math.PI * 1.5, 10), 8); line(arcP(22, 32, 11, 12, Math.PI * .5, Math.PI * 1.5, 10), 4, gold);
    line(arcP(78, 32, 11, 12, -Math.PI * .5, Math.PI * .5, 10), 8); line(arcP(78, 32, 11, 12, -Math.PI * .5, Math.PI * .5, 10), 4, gold);
    poly([[44, 56], [56, 56], [58, 72], [42, 72]], gold);
    poly([[30, 72], [70, 72], [72, 80], [28, 80]], '#8b5a2b');
    poly([[24, 80], [76, 80], [78, 90], [22, 90]], '#6e4420');
    poly([[26, 14], [74, 14], [70, 42], [58, 56], [42, 56], [30, 42]], gold);
    poly(starP(50, 34, 10, 4.5), '#fff2a8', 2.2);
    shine([[34, 20], [36, 38]]);
  },
  robot() {
    line([[50, 20], [50, 8]], 3); ell(50, 7, 4.5, 4.5, '#e8574a', 2.4);
    ell(18, 66, 6, 10, '#aab6c2'); ell(82, 66, 6, 10, '#aab6c2');
    poly([[28, 58], [72, 58], [72, 92], [28, 92]], '#aab6c2');
    poly([[38, 66], [62, 66], [62, 80], [38, 80]], '#e3e9ee', 2.2);
    dot(44, 73, 2.6, '#6cc36c'); dot(50, 73, 2.6, '#ffd84d'); dot(56, 73, 2.6, '#e8574a');
    poly([[24, 20], [76, 20], [76, 58], [24, 58]], '#c9d3dc');
    ell(18, 38, 4, 7, '#aab6c2', 2.4); ell(82, 38, 4, 7, '#aab6c2', 2.4);
    ell(38, 36, 7, 7, '#7fe0ff', 2.6); ell(62, 36, 7, 7, '#7fe0ff', 2.6); dot(38, 36, 2.6); dot(62, 36, 2.6);
    poly([[38, 46], [62, 46], [62, 52], [38, 52]], '#fff', 2.2);
    for (const x of [44, 50, 56]) line([[x, 46], [x, 52]], 1.4);
  },
  rocket() {
    rot(50, 50, 0.7, () => {
      poly([[42, 76], [58, 76], [56, 84], [62, 96], [50, 90], [38, 96], [44, 84]], '#ffb347', 2.4);
      poly([[45, 78], [55, 78], [50, 90]], '#ffe27a', 1.6);
      poly([[36, 60], [24, 78], [38, 76]], '#e8574a'); poly([[64, 60], [76, 78], [62, 76]], '#e8574a');
      const b = poly([[50, 6], [62, 22], [64, 76], [36, 76], [38, 22]], '#f5f5f5');
      clip(b, () => poly([[30, 4], [70, 4], [70, 24], [30, 24]], '#e8574a', 2.4));
      strokeP(b, 3.2);
      ell(50, 40, 7, 7, '#7fd8f7', 2.8); shine([[47, 37], [49, 36]], 2);
      poly([[46, 62], [54, 62], [54, 76], [46, 76]], '#e8574a', 2.2);
    });
  },
  crown() {
    const gold = '#ffcf3f';
    for (const [x, y] of [[14, 26], [50, 14], [86, 26]]) ell(x, y, 5, 5, gold, 2.4);
    poly([[18, 78], [14, 30], [34, 52], [50, 20], [66, 52], [86, 30], [82, 78]], gold);
    poly([[16, 70], [84, 70], [84, 82], [16, 82]], '#f2b51c');
    ell(50, 54, 6, 7, '#e8574a', 2.4); ell(30, 76, 4, 4, '#4aa3df', 2); ell(50, 76, 4, 4, '#6cc36c', 2); ell(70, 76, 4, 4, '#b085f5', 2);
    shine([[24, 44], [26, 64]]);
    sparkle(90, 50, 5);
  },
  whale() {
    for (const d of [-1, 0, 1]) line(qP([56, 22], [56 + d * 6, 10], [56 + d * 14, 8], 6), 2.6, '#4aa3df');
    for (const [x, y] of [[44, 8], [70, 6], [56, 4]]) drop(x, y, .55);
    poly([[18, 52], [4, 34], [8, 48], [2, 60]], '#5b8fd9');
    const b = poly([[12, 54], [30, 34], [60, 26], [86, 34], [96, 54], [86, 72], [56, 78], [26, 70]], '#5b8fd9');
    clip(b, () => {
      poly([[40, 62], [70, 58], [98, 56], [90, 76], [50, 82], [30, 74]], '#cfe3fb', 0);
      for (const x of [52, 60, 68, 76]) line([[x, 64], [x + 2, 74]], 1.6, 'rgba(27,27,27,.4)');
    });
    strokeP(b, 3.2);
    eye(78, 46, 3.2); smile(84, 56, 6, 3); blush(72, 54);
    poly([[50, 66], [42, 80], [58, 72]], '#5b8fd9', 2.6);
  },
  trident() {
    const gold = '#ffcf3f';
    ribbon([[50, 96], [50, 40]], 7, 7, '#c9920c', 2.8);
    ribbon(qP([24, 46], [26, 30], [24, 16], 8), 6, 4, gold, 2.6);
    ribbon(qP([76, 46], [74, 30], [76, 16], 8), 6, 4, gold, 2.6);
    poly([[24, 6], [30, 18], [18, 18]], gold, 2.4); poly([[76, 6], [82, 18], [70, 18]], gold, 2.4);
    ribbon([[50, 46], [50, 12]], 8, 6, gold, 2.6);
    poly([[50, 0], [57, 14], [43, 14]], gold, 2.4);
    poly(qP([22, 40], [50, 56], [78, 40], 10).concat(qP([78, 48], [50, 64], [22, 48], 10)), gold, 2.8);
    ell(50, 52, 4.5, 4.5, '#4aa3df', 2.2);
  },
  dolphin() {
    const bl = '#7fa8d6';
    poly([[16, 76], [2, 70], [8, 82], [6, 94]], bl, 2.8);
    const b = poly(qP([14, 80], [36, 18], [80, 26], 14).concat([[96, 34], [84, 40]]).concat(qP([76, 40], [42, 38], [22, 84], 14)), bl);
    clip(b, () => poly(qP([84, 40], [46, 44], [24, 84], 10).concat(qP([30, 80], [52, 50], [90, 38], 10)), '#dcebf9', 0));
    strokeP(b, 3.2);
    poly([[52, 24], [58, 8], [64, 28]], bl, 2.8);
    poly([[50, 46], [44, 60], [58, 48]], bl, 2.6);
    eye(72, 31, 2.6); line(qP([82, 37], [88, 38], [94, 35], 4), 2);
  },
  unicorn() {
    for (const [i, col] of ['#ff8fab', '#b28dff', '#7fd8f7'].entries()) ribbon(wave(30 - i * 4, 22 + i * 4, 18 - i * 6, 84, 5, 1, 14), 12, 6, col, 2.6);
    const h = poly([[30, 30], [52, 20], [64, 36], [86, 58], [84, 74], [70, 78], [56, 70], [40, 76], [26, 60]], '#fff');
    clip(h, () => ell(80, 70, 12, 10, '#f3e6ff', 0));
    strokeP(h, 3.2);
    poly([[36, 26], [34, 8], [46, 22]], '#fff', 2.8);
    poly([[46, 24], [62, 2], [56, 30]], '#ffd84d', 2.8);
    line([[50, 18], [58, 16]], 1.6); line([[52, 12], [59, 10]], 1.6);
    line(qP([46, 44], [52, 50], [58, 44], 6), 2.6);
    for (const [x, y] of [[48, 46], [52, 49], [56, 46]]) line([[x, y], [x - 1, y + 4]], 1.6);
    dot(80, 68, 1.8); blush(62, 56, 4.2);
    sparkle(88, 18, 6, '#ffe27a'); sparkle(76, 32, 3.5, '#ffe27a');
  },
  star() {
    for (const [i, col] of ['#ff8fab', '#ffd84d', '#7fd8f7'].entries()) ribbon(qP([40, 50 + i * 8], [22, 64 + i * 6], 4, 80 + i * 6, 8), 6, 2, col, 2.2);
    poly(starP(58, 46, 34, 15, -Math.PI / 2 + 0.2), '#ffd84d');
    eye(52, 44, 3.2); eye(66, 46, 3.2);
    smile(58, 54, 6, 4); blush(46, 52); blush(72, 56);
    sparkle(90, 14, 6); sparkle(24, 20, 4.5, '#ffe27a');
  },
  ufo() {
    poly([[38, 72], [62, 72], [76, 98], [24, 98]], 'rgba(255,240,140,.45)', 0);
    line([[30, 72], [24, 82]], 2.6); line([[70, 72], [76, 82]], 2.6);
    const d = poly(arcP(50, 48, 22, 26, Math.PI, Math.PI * 2, 16), '#c8f0ff');
    clip(d, () => {
      ell(50, 40, 9, 10, '#8fe07a', 2.4); eye(46, 38, 2.2); eye(54, 38, 2.2); smile(50, 44, 3, 2);
      line([[46, 31], [43, 22]], 1.8); line([[54, 31], [57, 22]], 1.8);
    });
    strokeP(d, 3.2);
    shine(arcP(50, 48, 16, 20, -2.6, -2.0, 4));
    ell(50, 60, 42, 13, '#b0bec5');
    ell(50, 56, 30, 6, '#cfd8dc', 2.2);
    for (const [x, col] of [[20, '#ff6b6b'], [35, '#ffd84d'], [50, '#6cc36c'], [65, '#4aa3df'], [80, '#ff8fab']]) ell(x, 64, 3.6, 3.6, col, 1.8);
  },
  rainbow() {
    const cols = ['#ff6b6b', '#ffb347', '#ffe066', '#7ed957', '#4fc3f7', '#b28dff'];
    for (let i = 0; i < cols.length; i++) line(arcP(50, 74, 42 - i * 5, 44 - i * 5, Math.PI, Math.PI * 2, 24), 5.6, cols[i]);
    line(arcP(50, 74, 44.8, 46.8, Math.PI, Math.PI * 2, 24), 2.6);
    line(arcP(50, 74, 14.2, 16.2, Math.PI, Math.PI * 2, 14), 2.6);
    for (const x of [14, 86]) { ell(x - 6, 78, 10, 8, '#fff', 2.8); ell(x + 6, 78, 10, 8, '#fff', 2.8); ell(x, 72, 10, 9, '#fff', 2.8); }
  },

  // ---------- fish & sea creatures ----------
  plankton() {
    for (const [x, y, s, c] of [[36, 38, 1.1, '#9be7c4'], [66, 30, 0.8, '#b5ff7a'], [60, 62, 1.15, '#7fd8f7'], [30, 72, 0.8, '#b5ff7a'], [78, 52, 0.65, '#9be7c4']]) {
      line(qP([x - 8 * s, y - 3 * s], [x - 16 * s, y - 13 * s], [x - 23 * s, y - 9 * s], 5), 1.6);
      line(qP([x - 7 * s, y + 3 * s], [x - 15 * s, y + 12 * s], [x - 21 * s, y + 10 * s], 5), 1.6);
      ell(x, y, 9 * s, 6 * s, c, 2.4, 0.3);
      dot(x + 3 * s, y - 1 * s, 1.5 * s + 0.6);
    }
    sparkle(84, 20, 4.5, '#e8fff4'); sparkle(18, 50, 3.5, '#e8fff4');
  },
  anchovy() {
    fish({ cx: 52, cy: 52, len: 86, h: 26, body: '#9fb0c4', belly: '#eef3f8', fin: '#7d8ea3', lateral: 'rgba(230,240,255,.95)' });
  },
  minnow() {
    fish({ cx: 52, cy: 54, len: 72, h: 28, body: '#c9b98a', belly: '#f4ecd6', fin: '#a99a6a', lateral: 'rgba(60,50,30,.45)' });
  },
  seasnail() {
    ribbon(qP([12, 80], [50, 86], [86, 78], 8), 12, 7, '#d9c2a0');
    line(qP([20, 76], [16, 66], [14, 58], 5), 2.4); line(qP([28, 76], [28, 66], [26, 56], 5), 2.4);
    dot(14, 56, 2.6); dot(26, 54, 2.6);
    ell(56, 56, 25, 23, '#c98a4b');
    line(arcP(57, 57, 17, 16, -0.4, 4.8, 14), 2.4); line(arcP(59, 55, 9, 8, 0.4, 5.6, 10), 2.4);
    shine(arcP(56, 56, 20, 18, 3.6, 4.4, 5));
    smile(16, 70, 3, 2);
  },
  clam() {
    const bot = poly(arcP(50, 60, 36, 26, 0, Math.PI, 18), '#e9c2a6');
    clip(bot, () => { for (let i = 1; i < 6; i++) { const a = Math.PI * i / 6; line([[50, 60], [50 + Math.cos(a) * 36, 60 + Math.sin(a) * 26]], 1.6, 'rgba(120,60,40,.45)'); } });
    strokeP(bot, 3.2);
    ell(50, 58, 28, 7, '#ffb3c1', 2.2);
    ell(50, 55, 7, 7, '#ffffff', 2.4); dot(48, 53, 2, '#e8f4ff');
    const top = poly(arcP(50, 50, 36, 30, Math.PI, Math.PI * 2, 18).map(([x, y]) => [x, y - 4]), '#f2d2b8');
    clip(top, () => { for (let i = 1; i < 6; i++) { const a = Math.PI + Math.PI * i / 6; line([[50, 46], [50 + Math.cos(a) * 36, 46 + Math.sin(a) * 30]], 1.6, 'rgba(120,60,40,.45)'); } });
    strokeP(top, 3.2);
    sparkle(80, 30, 5);
  },
  jellyfish() {
    for (let i = 0; i < 5; i++) { const x = 32 + i * 9; line(wave(x, 54, x + (i - 2) * 3, 92, 3, 1.4, 12), 2.4, '#e07ab0'); }
    const bell = poly(arcP(50, 56, 28, 34, Math.PI, Math.PI * 2, 18).concat(wave(78, 56, 22, 56, 2.5, 3, 12)), 'rgba(255,170,215,.85)');
    clip(bell, () => ell(46, 34, 14, 10, 'rgba(255,255,255,.35)', 0));
    strokeP(bell, 3.2);
    eye(42, 44, 2.8); eye(58, 44, 2.8); smile(50, 50, 4, 2.5); blush(36, 50); blush(64, 50);
  },
  herring() {
    fish({ cx: 52, cy: 52, len: 84, h: 30, body: '#8fb3c9', belly: '#eef4f8', fin: '#6f93a9' });
  },
  perch() {
    fish({ cx: 52, cy: 54, len: 78, h: 38, body: '#c9c25a', belly: '#f2efc8', fin: '#e8743b', bars: 'rgba(60,90,30,.6)', tallFin: true });
  },
  cod() {
    fish({ cx: 52, cy: 54, len: 84, h: 36, body: '#b5a37a', belly: '#efe6cf', fin: '#94845e', spots: 'rgba(90,70,40,.5)', whiskers: true });
  },
  mackerel() {
    fish({ cx: 52, cy: 52, len: 84, h: 30, body: '#4f8fa8', belly: '#eef4f8', fin: '#3a6f86', backWaves: '#1f4f66' });
  },
  trout() {
    fish({ cx: 52, cy: 52, len: 84, h: 32, body: '#9fb88a', belly: '#f3e9d2', fin: '#7f9a6a', lateral: 'rgba(255,140,170,.85)', spots: 'rgba(40,50,30,.65)' });
  },
  catfish() {
    fish({ cx: 50, cy: 54, len: 84, h: 36, body: '#7a6f62', belly: '#cfc4b0', fin: '#5f554a', whiskers: true });
    line(qP([88, 52], [96, 40], [98, 30], 6), 1.8); line(qP([88, 54], [99, 58], [99, 70], 6), 1.8);
  },
  salmon() {
    fish({ cx: 52, cy: 52, len: 86, h: 34, body: '#e8846a', belly: '#ffd8c8', fin: '#c9654e', spots: 'rgba(90,40,30,.5)' });
  },
  seahorse() {
    c.translate(50, 56); c.scale(1.35, 1.35); c.translate(-54, -56); // draw it bigger, centered
    const orange = '#ffb347';
    ribbon(qP([46, 56], [40, 80], [56, 88], 10).concat(arcP(54, 80, 6, 6, 1.6, 6, 8)), 8, 3, orange, 2.6);
    poly([[40, 34], [50, 30], [58, 40], [60, 56], [52, 66], [42, 60], [38, 46]], orange);
    poly([[48, 26], [58, 22], [62, 28], [52, 34]], orange, 2.6);
    ribbon([[56, 30], [76, 30]], 6, 4, orange, 2.6);
    poly([[60, 42], [70, 48], [62, 54]], '#ffd27a', 2.2);
    for (let y = 40; y < 62; y += 6) line([[42, y], [56, y + 1]], 1.4, 'rgba(160,90,20,.5)');
    eye(53, 30, 2.8); blush(48, 36, 3);
  },
  stingray() {
    line(qP([50, 72], [60, 88], [86, 94], 8), 2.6);
    poly([[50, 14], [86, 46], [50, 76], [14, 46]], '#9a8f8a');
    for (const [x, y] of [[38, 44], [56, 38], [48, 56], [62, 52], [34, 54]]) dot(x, y, 2.2, 'rgba(60,50,45,.45)');
    eye(44, 34, 2.6); eye(56, 34, 2.6);
    shine(qP([30, 38], [40, 26], [50, 20], 5));
  },
  swordfish() {
    fish({ cx: 40, cy: 54, len: 70, h: 30, body: '#4a6fa5', belly: '#dfe8f3', fin: '#36578a', bill: '#2f4c78', tallFin: true });
  },
  tuna() {
    fish({ cx: 52, cy: 54, len: 84, h: 38, body: '#2f4f8a', belly: '#dfe8f3', fin: '#ffd84d' });
    for (let i = 0; i < 4; i++) poly([[22 + i * 6, 40], [25 + i * 6, 36], [28 + i * 6, 40]], '#ffd84d', 1.4);
  },
  eel() {
    const sp = wave(10, 70, 76, 36, 8, 1.5, 22);
    ribbon(sp, 7, 14, '#6b8f3a');
    ribbon(sp.map(([x, y]) => [x, y - 6]), 3, 4, '#9fc56a', 1.6);
    const [hx, hy] = sp[sp.length - 1];
    ell(hx + 6, hy, 11, 8, '#6b8f3a', 3, -0.4);
    eye(hx + 8, hy - 3, 2.6); line([[hx + 12, hy + 3], [hx + 16, hy + 1]], 2);
  },
  lionfish() {
    for (let i = 0; i < 9; i++) { const a = -2.6 + i * 0.32; line([[46, 44], [46 + Math.cos(a) * 34, 44 + Math.sin(a) * 34]], 1.8); dot(46 + Math.cos(a) * 34, 44 + Math.sin(a) * 34, 2, '#e8574a'); }
    for (const [x, y, a] of [[38, 66, 2.2], [44, 70, 1.9]]) poly([[x, y], [x + Math.cos(a) * 24 - 6, y + Math.sin(a) * 24], [x + Math.cos(a) * 24 + 6, y + Math.sin(a) * 24]], 'rgba(255,200,180,.85)', 2);
    fish({ cx: 52, cy: 56, len: 72, h: 38, body: '#fff3e6', fin: '#ffb59a', bars: '#e8574a' });
  },
  barracuda() {
    fish({ cx: 50, cy: 52, len: 92, h: 22, body: '#a7b4bf', belly: '#eef2f5', fin: '#7d8a96', bars: 'rgba(40,60,80,.35)', teeth: true });
  },
  hammerhead() {
    const gr = '#8aa0b4';
    poly([[14, 50], [2, 30], [8, 50], [4, 72]], gr);
    poly([[38, 36], [48, 10], [58, 38]], gr);
    const b = poly([[12, 50], [30, 36], [60, 32], [80, 40], [80, 62], [56, 70], [28, 66]], gr);
    clip(b, () => poly([[30, 56], [60, 54], [82, 52], [80, 64], [56, 74], [26, 70]], '#eef3f7', 0));
    strokeP(b, 3.2);
    poly([[76, 36], [86, 22], [96, 22], [94, 32], [86, 46], [94, 62], [96, 74], [86, 76], [76, 62]], gr);
    eye(91, 26, 2.8); eye(91, 70, 2.8);
    poly([[48, 62], [62, 68], [50, 78]], gr, 2.6);
    for (const x of [46, 51, 56]) line([[x, 42], [x - 2, 50]], 2);
    line(qP([82, 52], [86, 56], [82, 60], 4), 2.4);
  },
  anglerfish() {
    line(qP([60, 30], [70, 6], [86, 16], 8), 2.4);
    const g = c.createRadialGradient(86, 18, 1, 86, 18, 16); g.addColorStop(0, 'rgba(255,250,170,.95)'); g.addColorStop(1, 'rgba(255,250,170,0)');
    c.fillStyle = g; c.fillRect(70, 2, 32, 32);
    ell(86, 18, 5, 5, '#fff7a8', 2.2);
    poly([[16, 50], [4, 34], [8, 52], [4, 70]], '#4a3d5c');
    const b = ell(46, 54, 34, 28, '#5a4a6b');
    clip(b, () => ell(50, 70, 30, 12, '#6f5f82', 0));
    strokeP(b, 3.2);
    const m = poly([[54, 52], [82, 46], [80, 66], [56, 64]], '#2a1d33', 2.8);
    clip(m, () => { for (let x = 58; x < 82; x += 5) { poly([[x, 47], [x + 3, 47], [x + 1.5, 55]], '#fff', 1); poly([[x, 65], [x + 3, 65], [x + 1.5, 58]], '#fff', 1); } });
    ell(52, 40, 6, 6, '#fff', 2.2); eye(53, 41, 3.2);
  },
  mantaray() {
    line(qP([50, 70], [52, 86], [62, 96], 6), 2.4);
    poly([[50, 30], [92, 44], [70, 56], [50, 72], [30, 56], [8, 44]], '#3d4f6b');
    poly([[36, 52], [50, 46], [64, 52], [50, 66]], '#e6ecf2', 2);
    poly([[42, 30], [46, 22], [50, 30]], '#3d4f6b', 2.2); poly([[50, 30], [54, 22], [58, 30]], '#3d4f6b', 2.2);
    eye(42, 36, 2.6); eye(58, 36, 2.6); smile(50, 42, 4, 2);
    shine(qP([20, 44], [32, 38], [44, 34], 5));
  },
  giantsquid() {
    const red = '#d9443f';
    for (let i = 0; i < 6; i++) { const x = 34 + i * 6.4; ribbon(wave(x, 60, x + (i - 2.5) * 4, 92 - (i % 2) * 6, 2.4, 1.3, 12), 5, 2, red, 2.4); }
    for (const d of [-1, 1]) ribbon(wave(50 + d * 6, 62, 50 + d * 40, 98, 4, 1.6, 14), 4, 6, red, 2.2);
    poly([[30, 22], [20, 34], [34, 36]], red, 2.6); poly([[70, 22], [80, 34], [66, 36]], red, 2.6);
    const m = poly([[50, 4], [66, 28], [68, 62], [32, 62], [34, 28]], red);
    clip(m, () => { for (const [x, y] of [[44, 22], [56, 30], [46, 38], [58, 48]]) dot(x, y, 2.2, '#a82f2b'); });
    strokeP(m, 3.2);
    ell(42, 50, 6, 7, '#fff', 2.2); eye(42, 51, 3.4); ell(58, 50, 6, 7, '#fff', 2.2); eye(58, 51, 3.4);
  },
  oarfish() {
    const sp = wave(8, 84, 90, 22, 6, 1.2, 24);
    for (let i = 2; i < sp.length - 1; i += 2) { const [x, y] = sp[i]; poly([[x - 2, y - 4], [x + 1, y - 13], [x + 4, y - 4]], '#e8574a', 1.4); }
    ribbon(sp, 6, 14, '#dfe6ee');
    ribbon(sp.map(([x, y]) => [x, y + 2]), 1.5, 2.5, 'rgba(120,140,170,.6)', 0);
    const [hx, hy] = sp[sp.length - 1];
    ell(hx + 2, hy, 9, 8, '#dfe6ee');
    poly([[hx - 2, hy - 7], [hx + 4, hy - 22], [hx + 8, hy - 6]], '#e8574a', 2);
    eye(hx + 4, hy - 1, 2.6);
  },
  sunfish() {
    poly([[46, 26], [54, 2], [64, 26]], '#8fa1ae'); poly([[46, 74], [54, 98], [64, 74]], '#8fa1ae');
    const b = ell(54, 50, 30, 30, '#a9b8c4');
    clip(b, () => { ell(56, 66, 30, 14, '#dfe7ee', 0); for (const [x, y] of [[44, 40], [60, 34], [50, 56]]) dot(x, y, 2.4, 'rgba(90,110,125,.4)'); });
    strokeP(b, 3.2);
    poly([[26, 36], [18, 42], [20, 50], [18, 58], [26, 64]], '#8fa1ae', 2.6);
    eye(72, 44, 3.4); ell(83, 52, 3, 3.5, '#5a2230', 2);
    poly([[58, 50], [66, 56], [58, 60]], '#8fa1ae', 2.2);
  },
  coelacanth() {
    fish({ cx: 52, cy: 52, len: 82, h: 40, body: '#3d5a80', belly: '#6f8fb3', fin: '#2c4363', spots: 'rgba(255,255,255,.85)', lobes: '#2c4363' });
  },
  narwhal() {
    line([[78, 30], [98, 6]], 4.5); line([[78, 30], [98, 6]], 2, '#f5efe0');
    for (let i = 1; i < 5; i++) { const t = i / 5; line([[78 + 20 * t - 1.5, 30 - 24 * t - 1], [78 + 20 * t + 1.5, 30 - 24 * t + 1]], 1.2); }
    poly([[18, 52], [4, 36], [8, 50], [2, 62]], '#9fb3c8');
    const b = poly([[14, 54], [30, 36], [58, 30], [80, 36], [90, 50], [82, 64], [56, 70], [28, 66]], '#9fb3c8');
    clip(b, () => { poly([[30, 58], [60, 56], [92, 52], [84, 68], [50, 76], [26, 70]], '#e6edf4', 0); for (const [x, y] of [[40, 42], [54, 38], [66, 44], [46, 50], [32, 50]]) dot(x, y, 2.4, 'rgba(60,80,100,.45)'); });
    strokeP(b, 3.2);
    eye(74, 46, 3); smile(80, 54, 5, 2.5); blush(68, 52);
    poly([[48, 62], [40, 76], [56, 68]], '#9fb3c8', 2.6);
  },
  goldenkoi() {
    for (const [i, col] of ['#ffe680', '#ffcf3f'].entries()) ribbon(wave(14 - i * 2, 52, 2, 52 + (i ? 22 : -22), 3, 1, 8), 10, 3, col, 2);
    fish({ cx: 54, cy: 52, len: 82, h: 36, body: '#ffcf3f', belly: '#fff2a8', fin: '#ffb000', spots: 'rgba(255,255,255,.75)', whiskers: true, sparkle: true });
  },

  // ---------- more sea creatures ----------
  neontetra() {
    fish({ cx: 52, cy: 52, len: 80, h: 30, body: '#d8e2ec', belly: '#ff4a5a', fin: 'rgba(220,232,245,.9)', lateral: '#2fd4ff' });
  },
  guppy() {
    const t = poly([[40, 52], [6, 20], [0, 52], [6, 86]], '#ff7ab8', 3);
    clip(t, () => { for (const [x, y] of [[14, 36], [22, 52], [12, 64], [28, 42], [26, 64]]) dot(x, y, 2.6, '#ffd84d'); });
    fish({ cx: 60, cy: 52, len: 60, h: 26, body: '#9fd4e8', belly: '#eaf6fb', fin: '#ff9ad0', tail: '#ff7ab8' });
  },
  starfish() {
    const s = poly(starP(50, 54, 44, 19), '#ff8a5c');
    clip(s, () => { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; for (const d of [16, 26, 34]) dot(50 + Math.cos(a) * d, 54 + Math.sin(a) * d, 2, '#ffd0b0'); } });
    strokeP(s, 3.2);
    eye(44, 50, 2.8); eye(56, 50, 2.8); smile(50, 57, 4, 2.5); blush(39, 57); blush(61, 57);
  },
  seaurchin() {
    for (let i = 0; i < 22; i++) { const a = i * Math.PI * 2 / 22; line([[50 + Math.cos(a) * 22, 54 + Math.sin(a) * 20], [50 + Math.cos(a) * 44, 54 + Math.sin(a) * 40]], 2.6, '#3d1f4f'); }
    const b = ell(50, 54, 27, 25, '#7b3fa0');
    clip(b, () => { for (const [x, y] of [[38, 40], [60, 42], [44, 66], [64, 62], [50, 34]]) dot(x, y, 2.4, '#a868cc'); });
    strokeP(b, 3.2);
    eye(43, 52, 2.8); eye(57, 52, 2.8); smile(50, 59, 4, 2.5);
  },
  sanddollar() {
    ell(50, 52, 40, 38, '#efe2c4');
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; ell(50 + Math.cos(a) * 16, 52 + Math.sin(a) * 16, 4, 10, '#d9c49a', 2, a + Math.PI / 2); }
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; dot(50 + Math.cos(a) * 32, 52 + Math.sin(a) * 30, 1.4, 'rgba(140,110,60,.5)'); }
    dot(50, 52, 2.4, 'rgba(140,110,60,.7)');
    shine(arcP(50, 52, 34, 32, 3.5, 4.4, 6));
  },
  hermitcrab() {
    for (const i of [0, 1, 2]) line(qP([30 + i * 6, 70], [24 + i * 8, 82], [18 + i * 10, 90], 5), 2.6);
    line([[28, 60], [26, 46]], 2.4); line([[34, 60], [36, 46]], 2.4);
    ell(26, 44, 4, 4, '#fff', 2); dot(26, 44, 1.8); ell(36, 44, 4, 4, '#fff', 2); dot(36, 44, 1.8);
    ell(30, 66, 13, 10, '#e8574a');
    ell(18, 74, 9, 7, '#e8574a', 2.8, 0.4); poly([[10, 70], [4, 66], [10, 76]], '#fff', 2);
    const sh = ell(62, 50, 28, 26, '#d9a066');
    clip(sh, () => ell(66, 60, 26, 14, '#c58a50', 0));
    strokeP(sh, 3.2);
    line(arcP(64, 50, 18, 16, -0.4, 4.8, 14), 2.4); line(arcP(66, 48, 9, 8, 0.4, 5.6, 10), 2.4);
    shine(arcP(62, 50, 22, 20, 3.6, 4.4, 5));
  },
  bluetang() {
    fish({ cx: 52, cy: 52, len: 80, h: 46, body: '#2f6fe0', fin: '#1b3f9a', tail: '#ffd84d', lateral: 'rgba(15,25,70,.85)' });
  },
  yellowtang() {
    fish({ cx: 52, cy: 52, len: 74, h: 52, body: '#ffd23f', fin: '#ffc21a', tail: '#ffe680', tallFin: true });
    poly([[26, 52], [30, 49], [30, 55]], '#fff', 1.6);
  },
  butterflyfish() {
    fish({ cx: 52, cy: 54, len: 72, h: 54, body: '#fff3c8', fin: '#ffd23f', tail: '#ffd23f', bars: 'rgba(80,60,30,.3)' });
    ell(36, 62, 5, 5, '#1b1b1b', 2); dot(36, 62, 2, '#fff');
    line([[66, 34], [70, 76]], 4, 'rgba(27,27,27,.75)');
  },
  boxfish() {
    poly([[20, 54], [6, 42], [8, 54], [6, 66]], '#ffc21a', 2.8);
    const b = poly([[22, 34], [74, 32], [84, 44], [84, 64], [74, 76], [22, 74], [16, 62], [16, 46]], '#ffd84d');
    clip(b, () => { for (let x = 26; x < 76; x += 11) for (let y = 40; y < 74; y += 10) dot(x + (y % 20 ? 5 : 0), y, 2.4, '#1b1b1b'); });
    strokeP(b, 3.2);
    ell(70, 46, 6, 6, '#fff', 2.2); eye(71, 46, 3.2);
    ell(85, 56, 3, 3.5, '#ff9a9a', 2);
    poly([[50, 58], [60, 64], [50, 68]], '#ffc21a', 2.2); blush(66, 58);
  },
  seacucumber() {
    const sp = wave(12, 64, 80, 54, 4, 1, 16);
    ribbon(sp, 18, 22, '#8a5a3c');
    for (let i = 1; i < sp.length - 1; i += 2) dot(sp[i][0], sp[i][1] - 6, 2.6, '#c08a5a');
    for (let i = 0; i < 6; i++) { const a = -1.2 + i * 0.5; line([[84, 54], [84 + Math.cos(a) * 12, 54 + Math.sin(a) * 12]], 2.2, '#e8c9a0'); }
    eye(70, 50, 2.6); eye(76, 51, 2.6); smile(73, 58, 3, 2);
  },
  mudskipper() {
    fish({ cx: 50, cy: 62, len: 84, h: 28, body: '#9a8a6a', belly: '#d9cfb4', fin: '#7a6a4a', spots: 'rgba(60,190,230,.8)', noEye: true });
    poly([[56, 68], [64, 82], [70, 72]], '#7a6a4a', 2.4);
    ell(70, 44, 6, 7, '#fff', 2.4); eye(71, 43, 3); ell(80, 46, 6, 7, '#fff', 2.4); eye(81, 45, 3);
  },
  angelfish() {
    poly([[42, 30], [30, 0], [60, 28]], '#f0e6c4', 2.6); poly([[42, 74], [30, 100], [60, 76]], '#f0e6c4', 2.6);
    fish({ cx: 54, cy: 52, len: 62, h: 50, body: '#f5efd8', fin: '#e8d9a8', bars: 'rgba(30,30,30,.75)', tallFin: true });
  },
  parrotfish() {
    fish({ cx: 50, cy: 52, len: 84, h: 42, body: '#3fc9a8', belly: '#9be7d4', fin: '#ff7ab8', backWaves: '#ff9ad0' });
    poly([[84, 46], [94, 52], [84, 58]], '#f5efe0', 2.2);
  },
  moorishidol() {
    line(qP([46, 30], [40, 6], [14, 8], 10), 3);
    fish({ cx: 52, cy: 54, len: 60, h: 58, body: '#fff8e0', belly: '#ffd84d', fin: '#ffd84d', tail: '#1b1b1b', bars: '#1b1b1b', tallFin: true });
    poly([[78, 52], [92, 56], [78, 60]], '#ff9a2e', 2.2);
  },
  cuttlefish() {
    for (let i = 0; i < 5; i++) ribbon(wave(80, 44 + i * 3, 98, 36 + i * 7, 2, 1, 8), 4, 2, '#c9a37a', 2);
    ell(54, 50, 36, 24, '#f0d4ae', 2.4);
    const b = ell(54, 50, 29, 18, '#c9a37a');
    clip(b, () => { for (let x = 30; x < 80; x += 7) line(wave(x, 32, x + 2, 68, 2, 1.5, 8), 2, 'rgba(90,60,30,.45)'); });
    strokeP(b, 3.2);
    ell(74, 44, 6, 5, '#fff', 2.2); line([[71, 45], [73, 43], [75, 46], [77, 43]], 1.8);
  },
  nautilus() {
    for (let i = 0; i < 6; i++) line(qP([28, 54 + i * 3], [16, 62 + i * 4], [8, 58 + i * 7], 5), 2.2, '#c98a5a');
    const s = ell(58, 50, 34, 32, '#f5ece0');
    clip(s, () => { for (let i = 0; i < 5; i++) line(qP([38 + i * 11, 16], [46 + i * 11, 50], [38 + i * 11, 84], 8), 6, '#c0643a'); });
    strokeP(s, 3.2);
    line(arcP(60, 50, 18, 17, -0.6, 4.6, 14), 2.4); line(arcP(62, 48, 8, 8, 0.4, 5.6, 10), 2.4);
    ell(30, 56, 9, 13, '#6a3f2a');
    eye(30, 48, 2.6);
  },
  axolotl() {
    poly([[24, 60], [2, 48], [6, 66]], '#ffc9d6', 2.6);
    for (const [x, d] of [[38, 1], [56, 1]]) { line([[x, 70], [x - 4, 82]], 3); line([[x, 70], [x + 4, 82]], 3); }
    ell(46, 62, 28, 13, '#ffb6c8');
    for (const [dx, dy] of [[-8, -14], [-2, -18], [4, -16], [-8, 14], [-2, 18], [4, 16]]) ribbon([[74, 52 + Math.sign(dy) * 6], [74 + dx, 52 + dy + Math.sign(dy) * 6]], 5, 2, '#ff6f9a', 2);
    ell(76, 52, 17, 14, '#ffb6c8');
    eye(72, 48, 2.6); eye(84, 48, 2.6); smile(78, 56, 5, 2.5); blush(70, 56); blush(88, 55);
  },
  mandarin() {
    fish({ cx: 52, cy: 52, len: 76, h: 44, body: '#ff8a2e', fin: '#2f6fe0', tail: '#3fc9a8', squiggle: '#2f6fe0', tallFin: true });
  },
  frogfish() {
    ell(34, 88, 9, 5, '#ffb347', 2.6); ell(62, 88, 9, 5, '#ffb347', 2.6);
    line(qP([50, 30], [56, 16], [66, 18], 6), 2.2); ell(68, 18, 4, 4, '#ff7ab8', 2);
    const b = ell(50, 58, 36, 30, '#ffb347');
    clip(b, () => { for (const [x, y, r] of [[30, 44, 4], [44, 36, 3], [62, 42, 4], [30, 70, 3], [70, 68, 4], [52, 50, 3]]) dot(x, y, r, '#e8892a'); });
    strokeP(b, 3.2);
    poly([[56, 66], [86, 60], [82, 74], [58, 74]], '#7a2a20', 2.6);
    ell(60, 40, 5, 5, '#fff', 2.2); eye(61, 40, 2.6); ell(76, 44, 5, 5, '#fff', 2.2); eye(77, 44, 2.6);
  },
  seadragon() {
    c.translate(50, 56); c.scale(1.3, 1.3); c.translate(-54, -56);
    const g = '#c9d65a', leaf = '#8fbf3a';
    for (const [x, y, a] of [[38, 40, -2.4], [44, 62, 2.6], [52, 72, 1.8], [58, 44, -0.6], [40, 54, 3.2], [48, 82, 2.2]]) ell(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 7, 3.5, leaf, 2, a);
    ribbon(qP([46, 56], [40, 80], [56, 88], 10).concat(arcP(54, 80, 6, 6, 1.6, 6, 8)), 8, 3, g, 2.6);
    poly([[40, 34], [50, 30], [58, 40], [60, 56], [52, 66], [42, 60], [38, 46]], g);
    poly([[48, 26], [58, 22], [62, 28], [52, 34]], g, 2.6);
    ribbon([[56, 30], [80, 32]], 5, 3, g, 2.6);
    for (let y = 40; y < 62; y += 6) line([[42, y], [56, y + 1]], 1.4, 'rgba(120,130,30,.5)');
    eye(53, 30, 2.8); blush(48, 36, 3);
  },
  moray() { eelArt('#5b8a3a', '#c9e08a'); },
  electriceel() {
    eelArt('#3a4a5a', null);
    for (const [x, y] of [[20, 40], [48, 76], [86, 70]]) poly([[x, y - 10], [x + 6, y - 2], [x + 1, y - 1], [x + 5, y + 9], [x - 4, y], [x + 1, y - 1]], '#ffe14d', 1.8);
  },
  flyingfish() {
    poly([[54, 54], [26, 12], [72, 40]], 'rgba(170,205,255,.95)', 2.4);
    poly([[50, 58], [22, 28], [64, 50]], 'rgba(140,185,250,.95)', 2.4);
    fish({ cx: 52, cy: 58, len: 80, h: 26, body: '#4f7fc9', belly: '#e6eef8', fin: '#9fc4ff' });
    drop(86, 82, .6); drop(14, 80, .5);
  },
  piranha() {
    fish({ cx: 52, cy: 54, len: 76, h: 46, body: '#8a9aa8', belly: '#e8574a', fin: '#6f7f8d', teeth: true, spots: 'rgba(255,255,255,.45)' });
    line([[66, 40], [78, 44]], 3);
  },
  arowana() {
    fish({ cx: 50, cy: 52, len: 92, h: 28, body: '#e8c25a', belly: '#fff2c8', fin: '#d9a13a', backWaves: 'rgba(160,110,30,.6)', whiskers: true, sparkle: true });
  },
  sailfish() {
    const s = poly([[20, 56]].concat(qP([22, 30], [30, 6], [50, 14], 8), qP([50, 14], [66, 24], [64, 52], 6)), '#3f7fe0');
    clip(s, () => { for (const [x, y] of [[32, 26], [44, 22], [38, 40], [52, 32]]) dot(x, y, 2.4, '#1b3f9a'); });
    strokeP(s, 3.2);
    fish({ cx: 44, cy: 60, len: 70, h: 26, body: '#2f4f8a', belly: '#dfe8f3', fin: '#2f6fe0', bill: '#22385f' });
  },
  tigershark() { sharkArt({ body: '#8f9aa6', belly: '#eef3f7', stripes: 'rgba(50,60,70,.6)' }); },
  blobfish() {
    poly([[18, 60], [8, 52], [10, 66]], '#f2b3b8', 2.4);
    const b = poly([[16, 62], [24, 36], [50, 26], [76, 32], [88, 52], [82, 76], [56, 86], [28, 80]], '#f2b3b8');
    clip(b, () => ell(54, 80, 34, 12, '#e89aa2', 0));
    strokeP(b, 3.2);
    ell(62, 58, 12, 10, '#e88a96');
    line(qP([50, 76], [62, 70], [74, 76], 6), 2.6);
    dot(52, 46, 2.6); dot(72, 46, 2.6); line([[48, 40], [55, 42]], 2); line([[69, 42], [76, 40]], 2);
    shine(qP([30, 44], [36, 36], [46, 32], 5));
  },
  lanternfish() {
    fish({ cx: 52, cy: 52, len: 80, h: 32, body: '#2a3550', belly: '#3a4a6a', fin: '#1f2840' });
    for (const [x, y] of [[30, 60], [40, 63], [50, 64], [60, 63], [70, 60], [76, 48]]) {
      const g = c.createRadialGradient(x, y, 0, x, y, 7); g.addColorStop(0, 'rgba(160,250,255,.9)'); g.addColorStop(1, 'rgba(160,250,255,0)');
      c.fillStyle = g; c.fillRect(x - 7, y - 7, 14, 14); dot(x, y, 1.8, '#dffcff');
    }
  },
  sawfish() {
    const col = '#a39070';
    poly([[18, 52], [4, 34], [10, 52], [6, 68]], col);
    poly([[40, 42], [50, 22], [58, 42]], col);
    const b = poly([[14, 52], [30, 40], [56, 38], [74, 44], [76, 58], [56, 64], [30, 62]], col);
    clip(b, () => ell(46, 64, 34, 8, '#e8dcc4', 0));
    strokeP(b, 3.2);
    for (let x = 78; x < 98; x += 5) { poly([[x, 47], [x + 1.5, 41], [x + 3, 47]], '#fff', 1.2); poly([[x, 56], [x + 1.5, 62], [x + 3, 56]], '#fff', 1.2); }
    poly([[72, 47], [100, 48], [100, 55], [72, 56]], '#c9b58a', 2.4);
    eye(66, 46, 2.8);
  },
  whaleshark() { sharkArt({ body: '#3d5a80', belly: '#e6edf4', spots: '#fff', wide: true }); },
  goblinshark() { sharkArt({ body: '#e8a5b0', belly: '#fbe3e6', snout: '#e08a98' }); },
  orca() {
    const k = '#22262b';
    poly([[18, 52], [4, 34], [8, 48], [2, 60]], k);
    poly([[44, 32], [50, 2], [60, 30]], k);
    const b = poly([[12, 54], [30, 34], [60, 26], [86, 34], [96, 54], [86, 72], [56, 78], [26, 70]], k);
    clip(b, () => { poly([[40, 62], [70, 58], [98, 56], [90, 76], [50, 82], [30, 74]], '#ffffff', 0); ell(72, 40, 10, 5, '#fff', 0, -0.2); ell(40, 40, 9, 4, 'rgba(200,205,210,.8)', 0); });
    strokeP(b, 3.2);
    ell(82, 46, 3.6, 3.6, '#fff', 1.6); eye(82, 46, 2.4); smile(86, 58, 5, 2.5);
    poly([[50, 66], [42, 82], [58, 72]], k, 2.6);
  },
  colossalsquid() { squidArt('#8f2a4f', '#6a1d3a'); },
  ghostfish() {
    for (const i of [0, 1, 2]) line(wave(22, 46 + i * 6, 2, 40 + i * 12, 3, 1.5, 10), 2, 'rgba(200,220,255,.8)');
    fish({ cx: 54, cy: 52, len: 80, h: 36, body: 'rgba(235,245,255,.8)', belly: 'rgba(255,255,255,.7)', fin: 'rgba(205,222,255,.75)', sparkle: true });
    line(arcP(54, 52, 18, 10, 0.3, 2.8, 8), 1.6, 'rgba(120,150,200,.5)');
  },
  rainbowfish() {
    fish({ cx: 52, cy: 52, len: 82, h: 40, body: '#fff', fin: '#b98aff', tail: '#ff7ab8', bands: ['#ff5a5a', '#ff9f3f', '#ffd84d', '#6cd36c', '#4aa3df', '#9b6cff'], sparkle: true });
  },
  crystalfish() {
    fish({ cx: 52, cy: 52, len: 80, h: 40, body: '#bdf3ff', belly: '#e8fbff', fin: '#7fe0f5', sparkle: true });
    line([[30, 44], [46, 36], [58, 50], [72, 40]], 1.8, 'rgba(60,150,190,.7)');
    line([[34, 60], [50, 56], [64, 64]], 1.8, 'rgba(60,150,190,.7)');
    line([[46, 36], [50, 56]], 1.8, 'rgba(60,150,190,.7)');
    shine([[36, 40], [44, 36]], 2.6);
  },
  kraken() {
    const p = '#7b3fa0';
    for (let i = 0; i < 8; i++) { const x0 = 28 + i * 6.3, dir = i < 4 ? -1 : 1; ribbon(wave(x0, 52, x0 + dir * (10 + (i % 4) * 8), 96, 4, 1.6, 14), 7, 2, p, 2.4); }
    const h = ell(50, 36, 30, 28, p);
    clip(h, () => { for (const [x, y, r] of [[38, 20, 3], [60, 18, 4], [66, 34, 3], [34, 34, 3]]) dot(x, y, r, '#a868cc'); });
    strokeP(h, 3.2);
    ell(40, 42, 6, 6, '#ffe14d', 2.2); dot(40, 43, 2.6); ell(60, 42, 6, 6, '#ffe14d', 2.2); dot(60, 43, 2.6);
    line([[33, 33], [45, 37]], 2.6); line([[67, 33], [55, 37]], 2.6);
    line(qP([42, 54], [50, 50], [58, 54], 6), 2.4);
  },
  megalodon() { sharkArt({ body: '#5a6672', belly: '#dfe6ec', bigMouth: true }); },

  // ---------- even more sea creatures ----------
  tadpole() {
    ribbon(wave(54, 56, 6, 48, 5, 1.5, 14), 14, 2, '#5a6b3a');
    const b = ell(64, 54, 22, 17, '#5a6b3a');
    clip(b, () => ell(66, 64, 20, 9, '#8a9a6a', 0));
    strokeP(b, 3.2);
    eye(70, 48, 3); eye(80, 50, 3); smile(76, 58, 4, 2.5);
    shine(arcP(64, 54, 16, 12, 3.6, 4.4, 5));
  },
  barnacle() {
    ell(50, 80, 42, 12, '#9a958c');
    for (const [x, y, s] of [[30, 66, 0.9], [70, 64, 1], [50, 52, 1.2]]) {
      poly([[x - 16 * s, y + 14 * s], [x - 8 * s, y - 12 * s], [x + 8 * s, y - 12 * s], [x + 16 * s, y + 14 * s]], '#e2dbcb');
      for (const dx of [-8, 0, 8]) line([[x + dx * s * 1.4, y + 13 * s], [x + dx * s * 0.8, y - 10 * s]], 1.4, 'rgba(120,110,90,.5)');
      ell(x, y - 12 * s, 8 * s, 3 * s, '#4a4038', 2);
    }
    for (let i = 0; i < 4; i++) line(qP([50, 38], [44 + i * 4, 24], [38 + i * 8, 22], 5), 1.6);
  },
  mussel() {
    const s = ell(50, 52, 40, 20, '#2b3550', 3.2, -0.45);
    clip(s, () => { for (let i = 1; i < 5; i++) line(arcP(30, 64, 12 + i * 9, 8 + i * 5, -1.5, 0.2, 8), 1.8, 'rgba(110,130,180,.6)'); });
    strokeP(s, 3.2);
    shine(arcP(50, 52, 32, 14, 3.4, 4.2, 5).map(([x, y]) => [x, y - 4]));
    eye(58, 46, 2.6); eye(68, 42, 2.6); smile(65, 52, 4, 2);
  },
  goldfish() {
    poly([[34, 52], [6, 30], [14, 50]], '#ff8a1a', 2.6); poly([[34, 52], [6, 76], [14, 54]], '#ffb04a', 2.6);
    fish({ cx: 58, cy: 52, len: 64, h: 40, body: '#ff9a2e', belly: '#ffd08a', fin: '#ffb85c', tail: '#ff8a1a' });
  },
  anemone() {
    const cols = ['#ff7ab8', '#ff9ad0', '#ff5aa0'];
    for (let i = 0; i < 9; i++) { const x = 24 + i * 6.5; ribbon(wave(x, 56, x + (i - 4) * 4, 14 + (i % 2) * 8, 3, 1.2, 10), 6, 3, cols[i % 3], 2.2); }
    poly([[24, 58], [76, 58], [70, 90], [30, 90]], '#c9a0ff');
    ell(50, 58, 26, 6, '#e0c4ff', 2.4);
    eye(42, 72, 2.6); eye(58, 72, 2.6); smile(50, 79, 4, 2.5);
  },
  seasponge() {
    const b = poly([[22, 22], [40, 14], [56, 22], [76, 16], [82, 40], [76, 60], [84, 82], [60, 90], [40, 84], [18, 88], [22, 60], [14, 40]], '#f2d24a');
    clip(b, () => { for (const [x, y, r] of [[30, 30, 4], [64, 28, 5], [72, 70, 4], [28, 74, 5], [48, 82, 3], [76, 48, 3]]) ell(x, y, r, r * 0.8, '#c9a82a', 1.6); });
    strokeP(b, 3.2);
    eye(42, 48, 3.2); eye(58, 48, 3.2); smile(50, 58, 6); blush(36, 56); blush(64, 56);
  },
  betta() {
    const t = poly([[40, 50], [8, 14], [2, 50], [8, 88]], '#9b2040');
    clip(t, () => { for (let i = 0; i < 5; i++) line([[40, 50], [2, 18 + i * 16]], 1.6, 'rgba(255,150,180,.6)'); });
    strokeP(t, 3);
    poly([[44, 34], [56, 6], [74, 34]], '#e8506a', 2.6); poly([[44, 66], [50, 96], [70, 66]], '#e8506a', 2.6);
    fish({ cx: 60, cy: 50, len: 58, h: 30, body: '#c0304a', fin: '#e8506a', tail: '#9b2040' });
  },
  damselfish() {
    fish({ cx: 52, cy: 52, len: 74, h: 44, body: '#1f5fd0', fin: '#2f7fe0', tail: '#ffd84d', spots: 'rgba(140,220,255,.9)', tallFin: true });
  },
  triggerfish() {
    fish({ cx: 52, cy: 54, len: 78, h: 46, body: '#f0e6d0', belly: '#ffffff', fin: '#c9b890', lateral: '#2f6fe0', backWaves: '#ffb000' });
    line([[62, 44], [80, 40]], 3, '#2f6fe0'); line([[62, 50], [82, 50]], 3, '#ffb000');
  },
  nudibranch() {
    ribbon(qP([12, 74], [50, 82], [86, 70], 10), 16, 12, '#9b6cff');
    for (let x = 20; x < 80; x += 8) { line([[x, 70], [x + 2, 60]], 4, '#ff9a2e'); dot(x + 2, 59, 3, '#ffd84d'); }
    for (const a of [-0.6, -0.2, 0.2]) line([[26, 64], [26 + Math.cos(a - 1.6) * 16, 64 + Math.sin(a - 1.6) * 16]], 2.4, '#ff9a2e');
    line([[78, 66], [82, 50]], 3, '#ff9a2e'); line([[84, 66], [90, 52]], 3, '#ff9a2e');
    eye(80, 72, 2.4); eye(86, 70, 2.4);
  },
  mantisshrimp() {
    const cols = ['#3fae4a', '#4aa3df', '#e8574a', '#ffb000', '#3fae4a', '#9b4de0'];
    for (let i = 5; i >= 0; i--) ell(20 + i * 11, 58 - i * 2, 9, 12, cols[i], 2.6);
    poly([[12, 58], [2, 46], [4, 70]], '#e8574a', 2.4);
    for (const d of [0, 1]) { line([[78 + d * 4, 52], [90 + d * 2, 70]], 3.4, '#ff7ab8'); ell(92 + d * 2, 72, 4, 4, '#ff7ab8', 2); }
    line([[82, 44], [86, 30]], 2.2); line([[86, 46], [94, 34]], 2.2);
    ell(86, 30, 4, 3, '#3fd4c0', 2); dot(86, 30, 1.6); ell(94, 34, 4, 3, '#3fd4c0', 2); dot(94, 34, 1.6);
  },
  horseshoecrab() {
    line(qP([20, 58], [8, 66], [2, 82], 6), 3.4);
    const b = poly(arcP(56, 62, 38, 40, Math.PI, Math.PI * 2, 18), '#8a6a3a');
    clip(b, () => { ell(56, 58, 20, 22, '#a8844c', 0); line([[56, 22], [56, 62]], 2, 'rgba(60,40,20,.5)'); });
    strokeP(b, 3.2);
    poly([[20, 62], [92, 62], [86, 70], [26, 70]], '#6a4f2a', 2.6);
    dot(44, 40, 2.6); dot(68, 40, 2.6);
  },
  discus() {
    fish({ cx: 52, cy: 52, len: 66, h: 62, body: '#e8574a', fin: '#c9403a', squiggle: '#4ac0e0' });
  },
  seaotter() {
    line(wave(4, 74, 96, 74, 2.5, 3), 2.6, '#4aa3df');
    const br = '#8a5a3a';
    ell(46, 64, 32, 13, br);
    ell(18, 70, 9, 5, br, 2.6, 0.5);
    const h = ell(76, 50, 17, 16, br);
    clip(h, () => ell(78, 56, 13, 10, '#d9b48a', 0));
    strokeP(h, 3.2);
    ell(64, 38, 5, 5, br, 2.4); ell(88, 38, 5, 5, br, 2.4);
    eye(72, 48, 2.6); eye(84, 48, 2.6); dot(78, 55, 2.4); smile(78, 59, 3, 2);
    ell(52, 52, 9, 6, '#f5e6c8', 2.4); line([[47, 52], [57, 52]], 1.4, 'rgba(120,90,60,.6)');
    ell(44, 54, 4, 4, br, 2.2); ell(60, 54, 4, 4, br, 2.2);
  },
  penguin() {
    ell(38, 90, 8, 4, '#ff9a2e', 2.4); ell(62, 90, 8, 4, '#ff9a2e', 2.4);
    ell(24, 58, 7, 18, '#22262b', 2.6, 0.4); ell(76, 58, 7, 18, '#22262b', 2.6, -0.4);
    const b = ell(50, 56, 26, 34, '#22262b');
    clip(b, () => ell(50, 64, 18, 28, '#ffffff', 0));
    strokeP(b, 3.2);
    ell(42, 36, 5, 5, '#fff', 0); ell(58, 36, 5, 5, '#fff', 0);
    eye(42, 36, 2.6); eye(58, 36, 2.6);
    poly([[44, 44], [56, 44], [50, 52]], '#ff9a2e', 2.2); blush(36, 46); blush(64, 46);
  },
  coconutcrab() {
    const col = '#5a4fa0';
    for (const d of [-1, 1]) {
      for (const i of [0, 1, 2]) line(qP([50 + d * 18, 64 + i * 5], [50 + d * 34, 60 + i * 7], [50 + d * 40, 78 + i * 5], 6), 3.2, col);
      line([[50 + d * 16, 54], [50 + d * 28, 38]], 3.4, col);
      ell(50 + d * 32, 28, 15, 12, col, 3, d * 0.4);
      poly([[50 + d * 36, 22], [50 + d * 48, 20], [50 + d * 40, 30]], '#ffb000', 2.2);
      line([[50 + d * 7, 50], [50 + d * 9, 36]], 2.6);
      ell(50 + d * 9, 32, 5, 5, '#fff', 2.4); dot(50 + d * 9, 32, 2.2);
    }
    const b = ell(50, 62, 26, 18, col);
    clip(b, () => ell(50, 70, 22, 8, '#8a7fd0', 0));
    strokeP(b, 3.2);
    smile(50, 62, 6);
  },
  lamprey() {
    eelArt('#7a6a5a', 'rgba(60,45,35,.5)');
    ell(88, 34, 8, 8, '#e8a5b0', 2.6); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; dot(88 + Math.cos(a) * 5, 34 + Math.sin(a) * 5, 1.2, '#fff'); }
  },
  hatchetfish() {
    poly([[22, 46], [8, 34], [12, 48], [8, 60]], '#aeb8c4', 2.6);
    const b = poly([[20, 44], [52, 30], [80, 36], [86, 46], [66, 56], [50, 86], [30, 66]], '#cfd8e0');
    clip(b, () => { for (let x = 36; x < 70; x += 6) dot(x, 52 + (x - 36) * 0.6, 2, 'rgba(160,250,255,.9)'); });
    strokeP(b, 3.2);
    shine(qP([30, 46], [44, 38], [60, 36], 5));
    ell(72, 40, 6, 6, '#fff', 2.2); eye(72, 40, 3.4);
  },
  lumpsucker() {
    poly([[24, 58], [12, 50], [14, 66]], '#7fbf5a', 2.4);
    const b = ell(52, 56, 30, 27, '#8fcf6a');
    clip(b, () => { for (const [x, y] of [[38, 40], [56, 36], [68, 46], [34, 60], [62, 70], [46, 74]]) ell(x, y, 3.5, 3, '#a8e08a', 1.6); });
    strokeP(b, 3.2);
    poly([[46, 30], [52, 22], [58, 30]], '#7fbf5a', 2.2);
    ell(62, 50, 6, 6, '#fff', 2.2); eye(63, 50, 3.4); smile(72, 62, 4, 2.5); blush(60, 62);
  },
  seapig() {
    for (const x of [30, 42, 54, 66]) ribbon([[x, 68], [x - 2, 82]], 5, 3, '#f2b3c8', 2.2);
    const b = ell(50, 58, 34, 16, 'rgba(250,190,210,.95)');
    clip(b, () => ell(46, 52, 22, 6, 'rgba(255,255,255,.45)', 0));
    strokeP(b, 3.2);
    for (const [x, a] of [[34, -2], [46, -1.6], [58, -1.2]]) ribbon([[x, 44], [x + Math.cos(a) * 14, 44 + Math.sin(a) * 14]], 4, 2, '#f2b3c8', 2);
    eye(72, 54, 2.6); eye(80, 55, 2.6); smile(77, 61, 3, 2); blush(70, 60);
  },
  harborseal() { sealArt({ body: '#9aa3ad', belly: '#c9d0d8', spots: 'rgba(60,70,80,.5)' }); },
  manatee() {
    poly([[22, 56], [2, 42], [2, 72]], '#8f8a86', 2.6);
    const b = ell(50, 56, 34, 22, '#9f9a96');
    clip(b, () => ell(50, 70, 30, 10, '#b8b3ae', 0));
    strokeP(b, 3.2);
    ell(50, 76, 8, 5, '#8f8a86', 2.4, 0.4);
    ell(84, 58, 11, 10, '#b8b3ae');
    for (const [x, y] of [[82, 60], [86, 62], [88, 58]]) dot(x, y, 1, INK);
    eye(76, 48, 2.6); blush(78, 56);
  },
  gar() {
    fish({ cx: 44, cy: 54, len: 84, h: 22, body: '#8a9a5a', belly: '#d8dcb8', fin: '#6a7a3a', spots: 'rgba(40,40,20,.5)', bill: '#6a7a3a', teeth: true });
  },
  viperfish() {
    fish({ cx: 48, cy: 52, len: 80, h: 30, body: '#2a3a4a', belly: '#3a4f62', fin: '#1a2a3a', noEye: true });
    for (const [x, dir] of [[78, 1], [84, 1], [80, -1]]) poly([[x - 1.5, 54], [x + 1.5, 54], [x + 3, 54 + dir * 18]], '#fff', 1.4);
    ell(70, 46, 5, 5, '#bdf3ff', 2); dot(70, 46, 2.4);
    for (let x = 24; x < 68; x += 7) dot(x, 60, 1.6, '#9ff7ff');
  },
  barreleye() {
    fish({ cx: 50, cy: 58, len: 80, h: 30, body: '#3a4a5a', belly: '#5a6a7a', fin: '#2a3a4a', noEye: true });
    ell(62, 42, 18, 14, 'rgba(200,245,255,.45)', 2.4);
    for (const x of [58, 66]) { ell(x, 42, 3.5, 6, '#3fd46a', 1.8); dot(x, 38, 1.8); }
    shine(arcP(62, 42, 14, 10, 3.6, 4.6, 5), 2.4);
  },
  gulpereel() {
    ribbon(wave(40, 54, 2, 86, 6, 1.5, 18), 12, 2, '#1f1f2a');
    const g = c.createRadialGradient(4, 86, 0, 4, 86, 8); g.addColorStop(0, 'rgba(255,120,200,.9)'); g.addColorStop(1, 'rgba(255,120,200,0)');
    c.fillStyle = g; c.fillRect(-4, 78, 16, 16);
    poly([[36, 52], [96, 20], [86, 52]], '#2a2a38');
    poly([[36, 56], [96, 88], [86, 56]], '#3a2a3a');
    poly([[86, 52], [96, 20], [96, 88], [86, 56]], '#5a2a40', 2.4);
    eye(44, 48, 2.2);
  },
  dumbo() {
    for (let i = 0; i < 6; i++) { const x = 30 + i * 8; ribbon(qP([x, 62], [x + (i - 2.5) * 3, 76], [x + (i - 2.5) * 5, 86], 6), 8, 4, '#ffb38a', 2); }
    ell(18, 40, 12, 8, '#ff9a6a', 2.6, -0.4); ell(82, 40, 12, 8, '#ff9a6a', 2.6, 0.4);
    const b = ell(50, 46, 30, 26, '#ffb38a');
    clip(b, () => ell(44, 34, 12, 8, 'rgba(255,255,255,.35)', 0));
    strokeP(b, 3.2);
    eye(40, 50, 3.2); eye(60, 50, 3.2); smile(50, 58, 5, 3); blush(34, 58); blush(66, 58);
  },
  vampiresquid() {
    const web = poly([[18, 56], [82, 56], [92, 90], [70, 82], [50, 94], [30, 82], [8, 90]], '#7a1a2a');
    clip(web, () => { for (let i = 0; i < 6; i++) line([[50, 58], [10 + i * 16, 94]], 1.6, 'rgba(255,255,255,.25)'); });
    strokeP(web, 3);
    for (let i = 0; i < 6; i++) { const x = 16 + i * 14; poly([[x, 72], [x + 2, 64], [x + 4, 72]], '#fff', 1.2); }
    ell(24, 24, 9, 6, '#7a1a2a', 2.4, -0.6); ell(76, 24, 9, 6, '#7a1a2a', 2.4, 0.6);
    const b = poly([[50, 6], [70, 30], [72, 58], [28, 58], [30, 30]], '#9a2a3a');
    strokeP(b, 3.2);
    for (const x of [40, 60]) { ell(x, 42, 6, 6, '#7fd8f7', 2.2); dot(x, 42, 2.6); }
  },
  isopod() {
    for (let i = 0; i < 7; i++) { line([[24 + i * 9, 72], [20 + i * 9, 84]], 2.4); }
    line(qP([84, 46], [96, 34], [98, 22], 6), 2); line(qP([84, 50], [98, 50], [100, 40], 6), 2);
    const b = ell(52, 56, 36, 20, '#b8a8c8');
    clip(b, () => { for (let x = 24; x < 84; x += 8) line(qP([x, 36], [x + 3, 56], [x, 76], 6), 2, 'rgba(90,70,110,.55)'); ell(52, 46, 30, 6, 'rgba(255,255,255,.3)', 0); });
    strokeP(b, 3.2);
    poly([[18, 56], [8, 48], [8, 64]], '#a898b8', 2.4);
    eye(80, 52, 2.6);
  },
  beluga() {
    const w = '#f2f5f8';
    poly([[18, 52], [4, 36], [8, 50], [2, 64]], w);
    const b = poly([[12, 54], [28, 38], [54, 34], [74, 30], [92, 40], [96, 56], [84, 70], [56, 74], [26, 68]], w);
    clip(b, () => ell(80, 34, 14, 10, '#ffffff', 0));
    strokeP(b, 3.2);
    eye(80, 48, 3); smile(88, 58, 6, 3); blush(76, 56);
    poly([[50, 66], [42, 82], [58, 72]], w, 2.6);
  },
  thresher() { sharkArt({ body: '#7a8fa8', belly: '#eef3f7', longTail: true }); },
  leopardseal() { sealArt({ body: '#7a828c', belly: '#c9d0d8', spots: 'rgba(30,35,40,.7)', teeth: true }); },
  humpback() {
    const k = '#3a4a6a';
    poly([[18, 52], [2, 34], [8, 50], [2, 66]], k);
    const b = poly([[12, 54], [30, 36], [62, 30], [86, 38], [96, 52], [86, 66], [56, 74], [26, 70]], k);
    clip(b, () => { poly([[40, 60], [96, 54], [86, 70], [50, 80]], '#dfe6ee', 0); for (const y of [62, 66, 70]) line([[50, y], [92, y - 6]], 1.4, 'rgba(60,70,90,.5)'); });
    strokeP(b, 3.2);
    ribbon(qP([52, 64], [44, 82], [30, 94], 8), 10, 5, '#dfe6ee', 2.6);
    for (const [x, y] of [[80, 34], [70, 32], [90, 42]]) dot(x, y, 1.8, '#dfe6ee');
    eye(80, 48, 3); smile(88, 56, 5, 2.5);
  },
  spermwhale() {
    const k = '#5a6470';
    poly([[16, 56], [2, 40], [6, 54], [2, 70]], k);
    const b = poly([[12, 58], [30, 44], [48, 34], [96, 32], [96, 66], [70, 70], [40, 72], [24, 68]], k);
    clip(b, () => { for (const [x, y] of [[40, 50], [58, 44], [76, 48], [50, 60]]) line([[x, y], [x + 6, y + 2]], 1.4, 'rgba(255,255,255,.3)'); });
    strokeP(b, 3.2);
    line([[60, 70], [94, 66]], 2.6);
    for (let x = 64; x < 92; x += 5) poly([[x, 68], [x + 2, 72], [x + 4, 68]], '#fff', 1);
    eye(58, 56, 2.6);
  },
  lavafish() {
    const g = c.createRadialGradient(52, 52, 10, 52, 52, 50); g.addColorStop(0, 'rgba(255,140,40,.5)'); g.addColorStop(1, 'rgba(255,140,40,0)');
    c.fillStyle = g; c.fillRect(0, 0, 100, 100);
    fish({ cx: 52, cy: 52, len: 82, h: 40, body: '#3a2424', belly: '#5a2a1a', fin: '#ff6a2a', squiggle: '#ff8a2a' });
    sparkle(20, 22, 4.5, '#ffd84d'); sparkle(84, 80, 4, '#ff8a2a');
  },
  seaserpent() { serpentArt({ body: '#3fae7a', belly: '#c9f0d8', fin: '#2f7d5a' }); },
  galaxyfish() {
    fish({ cx: 52, cy: 52, len: 82, h: 40, body: '#2a1f5a', belly: '#4a2f8a', fin: '#7a5fe0', spots: '#ffffff', sparkle: true });
    sparkle(30, 46, 3.2); sparkle(58, 60, 2.6);
  },
  dragonfish() {
    for (const d of [-1, 1]) line(qP([76, 44], [80, 44 + d * 4], [88, 34 + d * 2], 5), 3, '#c9302c');
    fish({ cx: 50, cy: 54, len: 86, h: 32, body: '#ffcf3f', belly: '#fff2a8', fin: '#e8574a', tail: '#e8574a', backWaves: '#e8a020', whiskers: true, sparkle: true });
  },
  leviathan() { serpentArt({ body: '#1f3a6a', belly: '#4a7fc9', fin: '#5ad4ff', glow: true }); },

  // ---------- head accessories: the cube's top edge is at y=80, from x=22 to x=78 ----------
  h_beanie() {
    ell(50, 46, 8, 8, '#fff', 2.6);
    const d = poly(arcP(50, 78, 30, 28, Math.PI, Math.PI * 2, 16), '#e8574a');
    clip(d, () => { for (let x = 26; x < 76; x += 7) line([[x, 78], [x + 2, 50]], 1.6, 'rgba(120,30,30,.4)'); });
    strokeP(d, 3.2);
    poly([[18, 72], [82, 72], [82, 86], [18, 86]], '#c9403a');
  },
  h_cap() {
    const d = poly(arcP(50, 80, 28, 24, Math.PI, Math.PI * 2, 16), '#3f7fe0');
    line([[50, 56], [50, 80]], 1.6, 'rgba(20,40,90,.5)'); dot(50, 56, 3, '#2f5fb0');
    poly([[64, 76], [96, 80], [94, 86], [62, 84]], '#2f5fb0');
  },
  h_backcap() {
    poly(arcP(50, 80, 28, 24, Math.PI, Math.PI * 2, 16), '#3fae4a');
    dot(50, 56, 3, '#2f8a3a');
    poly([[36, 76], [4, 80], [6, 86], [38, 84]], '#2f8a3a');
    ell(68, 74, 6, 4, '#fff', 2);
  },
  h_bucket() {
    poly([[30, 56], [70, 56], [76, 78], [24, 78]], '#d9c49a');
    ell(50, 80, 40, 7, '#c9b38a');
    line([[26, 72], [74, 72]], 2.4, '#8a6a3a');
  },
  h_sailor() {
    ell(50, 64, 30, 12, '#ffffff');
    poly([[20, 66], [80, 66], [82, 84], [18, 84]], '#ffffff');
    line([[20, 72], [80, 72]], 3, '#3f7fe0');
    line([[50, 74], [50, 82]], 2); line(arcP(50, 78, 5, 4, 0.2, Math.PI - 0.2, 6), 2);
  },
  h_straw() {
    ell(50, 80, 46, 9, '#efd68a');
    const cr = poly([[30, 78], [32, 54], [68, 54], [70, 78]], '#efd68a');
    clip(cr, () => { for (let y = 58; y < 78; y += 5) line([[28, y], [72, y]], 1.2, 'rgba(160,120,40,.45)'); });
    strokeP(cr, 3.2);
    poly([[31, 70], [69, 70], [70, 76], [30, 76]], '#e8574a', 2.4);
  },
  h_headband() {
    poly([[18, 80], [82, 80], [82, 92], [18, 92]], '#fff');
    line([[18, 86], [82, 86]], 3, '#e8574a');
    ribbon([[82, 86], [92, 96]], 5, 3, '#fff', 2); ribbon([[82, 86], [94, 88]], 5, 3, '#fff', 2);
  },
  h_bow() {
    poly([[50, 74], [24, 58], [22, 84]], '#ff7ab8'); poly([[50, 74], [76, 58], [78, 84]], '#ff7ab8');
    for (const d of [-1, 1]) line(qP([50 + d * 6, 72], [50 + d * 16, 68], [50 + d * 22, 70], 5), 1.6, 'rgba(160,30,90,.5)');
    ell(50, 74, 7, 7, '#ff5aa0', 2.6);
  },
  h_beret() {
    ell(46, 74, 34, 11, '#c9403a', 3.2, -0.12);
    line([[52, 63], [54, 56]], 3);
  },
  h_fez() {
    poly([[34, 80], [38, 50], [62, 50], [66, 80]], '#c9302c');
    ell(50, 50, 12, 3, '#a8241f', 2.4);
    line(qP([50, 50], [58, 54], [64, 70], 6), 2, '#1b1b1b'); ell(64, 72, 3, 4, '#1b1b1b', 1.6);
  },
  h_bowler() {
    ell(50, 80, 36, 7, '#2a2a2a');
    ell(50, 70, 24, 18, '#2a2a2a');
    poly([[26, 72], [74, 72], [74, 78], [26, 78]], '#5a2230', 2);
  },
  h_party() {
    const cone = poly([[28, 82], [50, 16], [72, 82]], '#4aa3df');
    clip(cone, () => { for (let i = 0; i < 5; i++) line([[20, 74 - i * 14], [80, 64 - i * 14]], 5, ['#ffd84d', '#ff7ab8', '#3fae4a', '#ffd84d', '#ff7ab8'][i]); });
    strokeP(cone, 3.2);
    ell(50, 14, 7, 7, '#ff5aa0', 2.6);
  },
  h_propeller() {
    const d = poly(arcP(50, 80, 28, 22, Math.PI, Math.PI * 2, 16), '#ffd84d');
    clip(d, () => { poly([[22, 80], [50, 58], [50, 80]], '#e8574a', 0); poly([[50, 58], [78, 80], [64, 80]], '#4aa3df', 0); });
    strokeP(d, 3.2);
    line([[50, 58], [50, 46]], 2.4);
    ell(38, 44, 12, 4, '#3fae4a', 2.4, -0.1); ell(62, 46, 12, 4, '#e8574a', 2.4, -0.1);
    dot(50, 45, 2.6);
  },
  h_chef() {
    for (const [x, y, r] of [[34, 50, 13], [50, 42, 15], [66, 50, 13]]) ell(x, y, r, r, '#fff', 2.8);
    poly([[28, 54], [72, 54], [70, 84], [30, 84]], '#fff');
    line([[30, 74], [70, 74]], 1.6, 'rgba(27,27,27,.4)');
  },
  h_hardhat() {
    poly(arcP(50, 80, 28, 26, Math.PI, Math.PI * 2, 16), '#ffc21a');
    poly([[18, 78], [82, 78], [84, 84], [16, 84]], '#ffb000');
    line([[50, 56], [50, 78]], 4, '#e8a000');
  },
  h_catears() {
    for (const d of [-1, 1]) { poly([[50 + d * 12, 82], [50 + d * 22, 50], [50 + d * 30, 82]], '#3a3a3a'); poly([[50 + d * 16, 80], [50 + d * 22, 60], [50 + d * 26, 80]], '#ff9ab8', 1.6); }
  },
  h_bunny() {
    for (const d of [-1, 1]) { ell(50 + d * 14, 46, 9, 34, '#fff', 3, d * 0.15); ell(50 + d * 14, 48, 4, 24, '#ffb3c8', 0, d * 0.15); }
  },
  h_flowercrown() {
    line(qP([18, 82], [50, 72], [82, 82], 10), 4, '#3fae4a');
    for (const [x, col] of [[22, '#ff7ab8'], [36, '#ffd84d'], [50, '#fff'], [64, '#b98aff'], [78, '#ff9a2e']]) {
      const y = 82 - Math.sin((x - 18) / 64 * Math.PI) * 8;
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ell(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.5, 3.5, col, 1.4); }
      dot(x, y, 2.4, '#ffb000');
    }
  },
  h_santa() {
    poly([[24, 76], [44, 40], [70, 34], [86, 50], [76, 76]], '#e8574a');
    ell(88, 54, 7, 7, '#fff', 2.6);
    ribbon([[18, 80], [82, 80]], 12, 12, '#fff', 3);
  },
  h_fishinghat() {
    poly([[30, 56], [70, 56], [76, 78], [24, 78]], '#7a8a4a');
    ell(50, 80, 40, 7, '#6a7a3a');
    for (const [x, y, col] of [[34, 64, '#e8574a'], [50, 62, '#ffd84d'], [64, 66, '#4aa3df']]) {
      ell(x, y, 5, 3, col, 1.8); line(qP([x + 4, y + 1], [x + 7, y + 6], [x + 4, y + 8], 4), 1.4);
    }
    line([[26, 72], [74, 72]], 2.4, '#4a5a2a');
  },
  h_cowboy() {
    poly(qP([6, 70], [50, 92], [94, 70], 14).concat(qP([94, 70], [90, 80], [50, 86], 6).slice(1), qP([50, 86], [10, 80], [6, 70], 6).slice(1)), '#a8703a');
    const cr = poly([[30, 78], [32, 52], [44, 46], [50, 54], [56, 46], [68, 52], [70, 78]], '#a8703a');
    strokeP(cr, 3.2);
    poly([[31, 70], [69, 70], [70, 76], [30, 76]], '#5a3a20', 2.4);
  },
  h_tophat() {
    poly([[32, 78], [32, 28], [68, 28], [68, 78]], '#2a2a2a');
    ell(50, 28, 18, 4, '#3a3a3a', 2.6);
    poly([[32, 66], [68, 66], [68, 74], [32, 74]], '#c9302c', 2.4);
    ell(50, 80, 34, 6, '#2a2a2a');
    shine([[38, 34], [38, 62]], 2.4);
  },
  h_graduation() {
    poly(arcP(50, 80, 24, 14, Math.PI, Math.PI * 2, 12), '#2a2a2a');
    poly([[50, 52], [90, 62], [50, 72], [10, 62]], '#2a2a2a');
    line([[50, 62], [80, 64], [82, 82]], 2, '#ffd84d'); ell(82, 84, 3, 5, '#ffd84d', 1.6);
  },
  h_pirate() {
    poly(qP([10, 78], [50, 30], [90, 78], 14).concat(qP([90, 78], [50, 62], [10, 78], 10).slice(1)), '#2a2a2a');
    ell(50, 60, 7, 6, '#fff', 2); dot(47, 59, 1.4); dot(53, 59, 1.4);
    line([[42, 68], [58, 74]], 2, '#fff'); line([[58, 68], [42, 74]], 2, '#fff');
    line(qP([14, 76], [50, 66], [86, 76], 10), 2, '#ffd84d');
  },
  h_viking() {
    for (const d of [-1, 1]) ribbon(qP([50 + d * 22, 70], [50 + d * 40, 64], [50 + d * 40, 38], 10), 12, 3, '#f5efe0', 2.6);
    poly(arcP(50, 80, 28, 28, Math.PI, Math.PI * 2, 16), '#9aa3ad');
    poly([[22, 76], [78, 76], [78, 84], [22, 84]], '#c9a050', 2.6);
    for (const x of [30, 42, 58, 70]) dot(x, 80, 1.8, '#5a4a2a');
  },
  h_sombrero() {
    ell(50, 80, 48, 10, '#e8b84a');
    const cr = poly([[34, 78], [38, 40], [50, 34], [62, 40], [66, 78]], '#e8b84a');
    strokeP(cr, 3.2);
    line(qP([35, 70], [50, 74], [65, 70], 6), 4, '#e8574a');
    line(wave(6, 80, 94, 80, 2, 6), 1.8, '#3fae4a');
  },
  h_witch() {
    poly([[30, 80], [46, 44], [40, 26], [64, 10], [56, 30], [70, 80]], '#6a3fa0');
    ell(50, 80, 42, 8, '#5a2f90');
    poly([[32, 70], [68, 70], [69, 76], [31, 76]], '#3fae4a', 2.2);
    poly([[46, 68], [54, 68], [54, 78], [46, 78]], '#ffd84d', 1.8);
  },
  h_antenna() {
    for (const d of [-1, 1]) { line(qP([50 + d * 10, 82], [50 + d * 14, 60], [50 + d * 24, 46], 6), 2.8); ell(50 + d * 25, 44, 6, 6, '#7ee07a', 2.4); }
  },
  h_mushroom() {
    const cap = poly(arcP(50, 80, 36, 34, Math.PI, Math.PI * 2, 18), '#e8402c');
    clip(cap, () => { for (const [x, y, r] of [[36, 62, 6], [56, 54, 7], [70, 70, 5], [44, 74, 4]]) ell(x, y, r, r * 0.8, '#fff', 0); });
    strokeP(cap, 3.2);
    line([[14, 80], [86, 80]], 3);
  },
  h_traffic() {
    poly([[16, 76], [84, 76], [84, 84], [16, 84]], '#ff7a1a');
    const c1 = poly([[32, 76], [46, 14], [54, 14], [68, 76]], '#ff7a1a');
    clip(c1, () => { poly([[20, 38], [80, 38], [80, 48], [20, 48]], '#fff', 0); poly([[20, 58], [80, 58], [80, 66], [20, 66]], '#fff', 0); });
    strokeP(c1, 3.2);
  },
  h_cheese() {
    const w = poly([[18, 80], [82, 80], [82, 62], [24, 44]], '#ffd23f');
    clip(w, () => { for (const [x, y, r] of [[40, 64, 5], [62, 70, 4], [70, 60, 3], [30, 72, 3]]) ell(x, y, r, r, '#e8b020', 1.6); });
    strokeP(w, 3.2);
    poly([[24, 44], [82, 62], [70, 56], [30, 42]], '#ffe680', 2);
  },
  h_fishhat() {
    fish({ cx: 50, cy: 64, len: 70, h: 30, body: '#ff9a2e', belly: '#ffd08a', fin: '#ffb85c' });
  },
  h_crabhat() { c.save(); c.translate(50, 82); c.scale(0.62, 0.62); c.translate(-50, -80); ART.crab(); c.restore(); },
  h_octohat() { c.save(); c.translate(50, 86); c.scale(0.65, 0.65); c.translate(-50, -88); ART.octopus(); c.restore(); },
  h_chick() {
    const sh = poly([[24, 70], [32, 64], [38, 72], [46, 62], [54, 72], [62, 62], [70, 72], [76, 66], [78, 84], [22, 84]], '#fff8ea');
    strokeP(sh, 3);
    ell(50, 54, 18, 17, '#ffd84d');
    poly([[66, 54], [76, 56], [66, 60]], '#ff9a2e', 2);
    eye(58, 50, 2.6); blush(56, 58);
    line([[46, 38], [44, 32]], 2); line([[50, 37], [52, 31]], 2);
  },
  h_icecream() {
    const co = poly([[30, 66], [50, 10], [70, 66]], '#e8b06a');
    clip(co, () => { for (let i = 0; i < 6; i++) { line([[20 + i * 10, 70], [50 + i * 10, 0]], 1.4, 'rgba(140,90,40,.5)'); line([[80 - i * 10, 70], [50 - i * 10, 0]], 1.4, 'rgba(140,90,40,.5)'); } });
    strokeP(co, 3.2);
    poly(arcP(50, 70, 30, 12, Math.PI, Math.PI * 2, 14).concat(wave(80, 72, 20, 72, 3, 3, 12)), '#ffb3c8');
    for (const [x, len] of [[32, 14], [60, 18]]) ribbon([[x, 74], [x, 74 + len]], 6, 5, '#ffb3c8', 2);
    for (const [x, y, col] of [[40, 64, '#4aa3df'], [56, 62, '#ffd84d'], [64, 68, '#3fae4a']]) line([[x, y], [x + 3, y - 2]], 2.4, col);
  },
  h_cake() {
    poly([[22, 60], [78, 60], [78, 84], [22, 84]], '#ffb3c8');
    poly([[30, 42], [70, 42], [70, 60], [30, 60]], '#fff2f6');
    line(wave(22, 64, 78, 64, 2, 4), 3, '#fff');
    for (const x of [38, 50, 62]) { poly([[x - 2, 42], [x - 2, 28], [x + 2, 28], [x + 2, 42]], ['#4aa3df', '#ffd84d', '#3fae4a'][(x - 38) / 12], 1.6); poly([[x, 18], [x + 3, 24], [x, 28], [x - 3, 24]], '#ff9a2e', 1.4); }
  },
  h_jester() {
    poly([[22, 78], [8, 34], [40, 62]], '#e8574a'); poly([[78, 78], [92, 34], [60, 62]], '#3fae4a');
    poly([[34, 72], [50, 22], [66, 72]], '#9b6cff');
    for (const [x, y] of [[8, 32], [92, 32], [50, 20]]) ell(x, y, 5, 5, '#ffd84d', 2.2);
    poly([[18, 74], [82, 74], [82, 84], [18, 84]], '#ffd84d');
  },
  h_mohawk() {
    const cols = ['#e8574a', '#ff9a2e', '#ffd84d', '#3fae4a', '#4aa3df', '#9b6cff'];
    for (let i = 0; i < 6; i++) { const x = 26 + i * 9.6; poly([[x - 6, 82], [x + 2, 36 + Math.abs(i - 2.5) * 8], [x + 6, 82]], cols[i], 2.4); }
  },
  h_afro() {
    for (const [x, y, r] of [[26, 66, 16], [74, 66, 16], [36, 46, 18], [64, 46, 18], [50, 36, 18], [50, 60, 20]]) ell(x, y, r, r, '#3a2416', 3);
    ell(50, 58, 30, 22, '#3a2416', 0);
    for (const [x, y] of [[40, 50], [58, 44], [50, 64], [32, 62], [68, 60]]) line(arcP(x, y, 4, 3, 0, 4, 6), 1.4, 'rgba(255,255,255,.25)');
    line([[70, 70], [78, 40]], 3, '#e8574a'); for (const dx of [0, 3, 6]) line([[76 + dx * 0.3, 44], [80 + dx, 36]], 1.6, '#e8574a');
  },
  h_devil() {
    for (const d of [-1, 1]) poly([[50 + d * 14, 84], [50 + d * 20, 64], [50 + d * 30, 52], [50 + d * 26, 70], [50 + d * 26, 84]], '#e8302c');
  },
  h_unicorn() {
    const hn = poly([[42, 80], [54, 10], [60, 80]], '#fff2a8');
    clip(hn, () => { for (let y = 20; y < 80; y += 10) line([[36, y + 6], [66, y]], 3, '#ffb3d8'); });
    strokeP(hn, 3.2);
    for (const d of [-1, 1]) poly([[50 + d * 20, 82], [50 + d * 26, 64], [50 + d * 32, 82]], '#fff', 2.4);
    sparkle(76, 30, 5, '#ffe14d'); sparkle(28, 40, 4, '#b98aff');
  },
  h_halo() {
    const g = c.createRadialGradient(50, 56, 4, 50, 56, 40); g.addColorStop(0, 'rgba(255,240,150,.6)'); g.addColorStop(1, 'rgba(255,240,150,0)');
    c.fillStyle = g; c.fillRect(0, 16, 100, 80);
    ell(50, 56, 30, 8, null, 7); ell(50, 56, 30, 8, null, 4.5);
    line(arcP(50, 56, 30, 8, 0, Math.PI * 2, 24), 3.6, '#ffd84d');
  },
  h_cloud() {
    for (const [x, y] of [[30, 76], [44, 82], [60, 80], [72, 74]]) drop(x, y, 0.7);
    for (const [x, y, r] of [[32, 54, 14], [50, 44, 18], [68, 52, 15]]) ell(x, y, r, r, '#b8c2cc', 3);
    poly([[20, 58], [82, 58], [80, 66], [22, 66]], '#b8c2cc', 0);
    line([[20, 66], [80, 66]], 3);
    dot(44, 54, 2.4); dot(58, 54, 2.4); line(qP([46, 61], [51, 58], [56, 61], 4), 2);
  },
  h_lightbulb() {
    const g = c.createRadialGradient(50, 40, 4, 50, 40, 40); g.addColorStop(0, 'rgba(255,240,120,.8)'); g.addColorStop(1, 'rgba(255,240,120,0)');
    c.fillStyle = g; c.fillRect(0, 0, 100, 90);
    for (let i = 0; i < 7; i++) { const a = Math.PI + 0.3 + i * 0.42; line([[50 + Math.cos(a) * 28, 40 + Math.sin(a) * 28], [50 + Math.cos(a) * 38, 40 + Math.sin(a) * 38]], 2.4, '#ffb000'); }
    ell(50, 40, 18, 18, '#fff27a');
    poly([[42, 54], [58, 54], [58, 70], [42, 70]], '#aab1bb');
    for (const y of [58, 63]) line([[42, y], [58, y]], 1.6);
    line(qP([46, 46], [50, 34], [54, 46], 5), 1.6, '#e8a000');
  },
  h_wizard() {
    const hat = poly([[24, 80], [52, 6], [76, 80]], '#2f4fa8');
    clip(hat, () => { sparkle(44, 50, 5, '#ffe14d'); sparkle(58, 34, 4, '#ffe14d'); sparkle(52, 64, 3.5, '#fff'); poly(arcP(46, 30, 6, 6, 0.6, 5.6, 10), '#ffe14d', 0); });
    strokeP(hat, 3.2);
    ell(50, 80, 40, 8, '#2a4598');
  },
  h_ufo() {
    c.fillStyle = 'rgba(160,255,160,.35)'; c.beginPath(); c.moveTo(40, 52); c.lineTo(60, 52); c.lineTo(74, 84); c.lineTo(26, 84); c.closePath(); c.fill();
    ell(50, 40, 14, 12, 'rgba(180,240,255,.85)');
    ell(50, 48, 34, 9, '#aab1bb');
    for (const x of [30, 42, 58, 70]) dot(x, 49, 2.4, '#ffe14d');
    eye(46, 38, 2); eye(54, 38, 2);
  },
  h_tiara() {
    poly([[22, 82], [26, 66], [36, 72], [44, 54], [50, 64], [56, 54], [64, 72], [74, 66], [78, 82]], '#e6ecf2');
    for (const [x, y, col] of [[50, 70, '#ff5aa0'], [36, 76, '#7fe0f5'], [64, 76, '#7fe0f5']]) poly([[x, y - 5], [x + 4, y], [x, y + 5], [x - 4, y]], col, 1.6);
    sparkle(44, 48, 4); sparkle(76, 58, 3.5);
  },
  h_crown() {
    const cr = poly([[20, 82], [18, 50], [34, 64], [50, 40], [66, 64], [82, 50], [80, 82]], '#ffcf3f');
    clip(cr, () => ell(50, 80, 34, 8, '#e8a020', 0));
    strokeP(cr, 3.2);
    for (const [x, y] of [[18, 48], [50, 38], [82, 48]]) ell(x, y, 4, 4, '#fff2a8', 2);
    for (const [x, col] of [[32, '#e8302c'], [50, '#3f7fe0'], [68, '#3fae4a']]) ell(x, 72, 4, 5, col, 2);
    shine([[26, 60], [26, 76]], 2.4);
  },
  h_dragon() {
    for (const d of [-1, 1]) poly([[50 + d * 6, 60], [50 + d * 30, 34], [50 + d * 26, 50], [50 + d * 34, 52], [50 + d * 14, 70]], '#5ab85a', 2.4);
    ribbon(qP([62, 78], [84, 82], [92, 66], 8), 8, 3, '#3fae4a', 2.4);
    ell(50, 68, 18, 14, '#3fae4a');
    ell(50, 72, 10, 8, '#c9f0a8', 2);
    const hd = ell(36, 48, 12, 10, '#3fae4a');
    poly([[30, 40], [28, 28], [36, 38]], '#ffd84d', 2); poly([[40, 38], [42, 26], [46, 38]], '#ffd84d', 2);
    eye(34, 46, 2.4);
    poly([[24, 52], [10, 46], [14, 54], [8, 60], [24, 56]], '#ff9a2e', 2);
  },

  // ---------- face accessories: the cube's face is the box 10..90, eyes at (36,40) and (64,40), mouth at (50,58) ----------
  f_freckles() { for (const [x, y] of [[28, 50], [32, 54], [26, 55], [34, 49], [68, 50], [72, 54], [74, 49], [66, 55]]) dot(x, y, 1.6, '#b0603a'); },
  f_blush() { for (const x of [24, 76]) poly(heartP(x, 54, 7), '#ff7a9a', 1.8); },
  f_bandaid() {
    rot(66, 22, -0.4, () => { poly([[52, 18], [80, 18], [80, 27], [52, 27]], '#f2c9a0', 2); poly([[61, 18], [71, 18], [71, 27], [61, 27]], '#e8b088', 1.4); for (const [x, y] of [[64, 21], [68, 21], [64, 24], [68, 24]]) dot(x, y, 0.8, '#a8704a'); });
  },
  f_roundglasses() { glasses(x => ell(x, 40, 11, 11, 'rgba(220,240,255,.35)', 2.6), '#1b1b1b'); },
  f_nerd() {
    glasses(x => poly([[x - 12, 32], [x + 12, 32], [x + 12, 48], [x - 12, 48]], 'rgba(220,240,255,.3)', 4), '#1b1b1b');
    poly([[46, 37], [54, 37], [54, 43], [46, 43]], '#fff', 1.6);
  },
  f_sunglasses() {
    glasses(x => poly([[x - 13, 33], [x + 13, 33], [x + 11, 47], [x - 11, 47]], '#1b1b1b', 2.6), '#1b1b1b');
    for (const x of [30, 58]) line([[x, 36], [x + 5, 36]], 2, 'rgba(255,255,255,.7)');
  },
  f_mustache() { stache('#5a3a20', 1); },
  f_pencil() { line(qP([38, 52], [50, 49], [62, 52], 6), 2, '#3a2416'); },
  f_clownnose() { ell(50, 50, 7, 7, '#e8302c', 2.4); dot(48, 48, 1.8, 'rgba(255,255,255,.8)'); },
  f_pignose() { ell(50, 50, 9, 7, '#ffb3c8', 2.4); ell(47, 50, 1.6, 2.4, '#c9607a', 0); ell(53, 50, 1.6, 2.4, '#c9607a', 0); },
  f_whiskers() {
    poly([[46, 48], [54, 48], [50, 53]], '#ff9ab8', 1.6);
    for (const d of [-1, 1]) for (const dy of [-3, 1, 5]) line([[50 + d * 10, 52 + dy * 0.5], [50 + d * 34, 50 + dy * 1.6]], 1.6);
  },
  f_lollipop() {
    line([[54, 60], [76, 74]], 3, '#fff'); line([[54, 60], [76, 74]], 1.4, 'rgba(27,27,27,.4)');
    ell(80, 76, 9, 9, '#ff7ab8', 2.4); line(arcP(80, 76, 5, 5, 0, 5.5, 10), 2, '#fff'); line(arcP(80, 76, 2, 2, 0, 5, 6), 1.6, '#fff');
  },
  f_bubblegum() { ell(54, 64, 14, 13, 'rgba(255,150,200,.85)', 2.4); shine(arcP(54, 64, 9, 8, 3.6, 4.4, 4), 2.4); },
  f_monocle() {
    ell(64, 40, 11, 11, 'rgba(220,240,255,.3)', 3, 0); line(arcP(64, 40, 11, 11, 0, Math.PI * 2, 20), 2, '#ffcf3f');
    line(qP([74, 44], [84, 62], [76, 84], 8), 1.6, '#ffcf3f');
  },
  f_eyepatch() {
    line([[12, 26], [90, 52]], 2.4); ell(36, 40, 10, 9, '#1b1b1b', 2.4);
  },
  f_heartglasses() { glasses(x => poly(heartP(x, 40, 12), 'rgba(255,70,110,.85)', 2.6), '#e8302c'); },
  f_starglasses() { glasses(x => poly(starP(x, 40, 14, 7), 'rgba(255,215,60,.85)', 2.4), '#ff9a2e'); },
  f_3d() {
    poly([[18, 31], [82, 31], [82, 49], [18, 49]], '#fff', 2.6);
    poly([[24, 34], [46, 34], [46, 46], [24, 46]], 'rgba(230,40,40,.75)', 2); poly([[54, 34], [76, 34], [76, 46], [54, 46]], 'rgba(40,140,230,.75)', 2);
  },
  f_aviators() {
    glasses(x => poly([[x - 13, 33], [x + 13, 33], [x + 10, 44], [x, 50], [x - 10, 44]], 'rgba(90,60,30,.75)', 2), '#ffcf3f');
    line([[44, 34], [56, 34]], 2, '#ffcf3f');
  },
  f_shutter() {
    glasses(x => { poly([[x - 13, 32], [x + 13, 32], [x + 12, 48], [x - 12, 48]], null, 3.4); for (const y of [36, 40, 44]) line([[x - 12, y], [x + 12, y]], 2.4, '#ff5aa0'); }, '#ff5aa0');
  },
  f_handlebar() {
    stache('#3a2416', 1.1);
    for (const d of [-1, 1]) line(arcP(50 + d * 26, 46, 5, 5, d < 0 ? 0.5 : -3.6, d < 0 ? 3.8 : -0.4, 8), 2.6, '#3a2416');
  },
  f_walrus() {
    const m = poly([[30, 52], [40, 46], [50, 48], [60, 46], [70, 52], [68, 64], [32, 64]], '#8a8580');
    clip(m, () => { for (let x = 32; x < 70; x += 4) line([[x, 48], [x - 1, 66]], 1.2, 'rgba(40,40,40,.4)'); });
    strokeP(m, 2.6);
  },
  f_goatee() { poly([[44, 70], [56, 70], [50, 86]], '#5a3a20', 2.4); },
  f_beard() {
    const b = poly([[14, 50], [24, 74], [38, 88], [50, 96], [62, 88], [76, 74], [86, 50], [72, 66], [50, 72], [28, 66]], '#8a5a3a');
    clip(b, () => { for (let x = 18; x < 86; x += 5) line(wave(x, 54, x + 2, 94, 1.4, 1, 6), 1.2, 'rgba(60,35,20,.5)'); });
    strokeP(b, 2.8);
    stache('#8a5a3a', 1);
  },
  f_fangs() { for (const x of [40, 58]) poly([[x, 59], [x + 4, 59], [x + 2, 70]], '#fff', 1.6); },
  f_bucktooth() { poly([[44, 60], [56, 60], [56, 70], [44, 70]], '#fff', 2); line([[50, 60], [50, 70]], 1.4); },
  f_tongue() { const t = poly([[44, 62], [56, 62], [57, 74], [50, 80], [43, 74]], '#ff7a8a', 2.2); line([[50, 64], [50, 74]], 1.4, 'rgba(160,30,50,.5)'); },
  f_pacifier() { ell(50, 62, 14, 8, '#7fd8f7', 2.4); ell(50, 72, 7, 7, null, 3); line(arcP(50, 72, 7, 7, 0, Math.PI * 2, 14), 2, '#ff7ab8'); dot(50, 62, 2.4, '#fff'); },
  f_pipe() {
    line([[54, 60], [72, 66]], 4, '#5a3a20');
    poly([[70, 58], [82, 58], [82, 72], [70, 72]], '#7a4a24', 2.4);
    for (const [x, y, r] of [[82, 46, 4], [88, 36, 5.5], [80, 24, 4]]) ell(x, y, r, r, 'rgba(200,235,255,.55)', 1.6);
  },
  f_snorkel() {
    poly([[18, 28], [82, 28], [84, 50], [16, 50]], 'rgba(160,220,255,.4)', 3);
    line([[16, 40], [8, 38]], 3); line([[84, 40], [92, 38]], 3);
    ribbon([[86, 60], [90, 30], [90, 8]], 6, 6, '#ffb000', 2.4);
    line(qP([86, 60], [74, 66], [58, 60], 6), 5, '#ffb000');
  },
  f_swimgoggles() {
    line([[10, 38], [90, 38]], 3, '#3f7fe0');
    glasses(x => ell(x, 40, 11, 9, 'rgba(90,200,255,.55)', 3), '#3f7fe0');
  },
  f_skigoggles() {
    line([[8, 40], [92, 40]], 6, '#e8574a');
    const lens = poly([[18, 30], [82, 30], [80, 52], [56, 50], [50, 44], [44, 50], [20, 52]], 'rgba(255,170,60,.85)', 3);
    shine([[24, 34], [40, 34]], 2.4);
  },
  f_zorro() {
    const m = poly([[10, 34], [28, 30], [50, 34], [72, 30], [90, 34], [86, 48], [62, 50], [50, 44], [38, 50], [14, 48]], '#1b1b1b', 2.4);
    for (const x of [36, 64]) { ell(x, 40, 7, 5, '#fff', 0); c.fillStyle = INK; c.beginPath(); c.ellipse(x, 40, 2.2, 3.4, 0, 0, Math.PI * 2); c.fill(); }
    ribbon([[10, 38], [2, 52]], 4, 2, '#1b1b1b', 0);
  },
  f_sleepmask() {
    poly([[14, 30], [86, 30], [84, 50], [16, 50]], '#9b6cff', 2.8);
    for (const x of [36, 64]) { line(arcP(x, 38, 9, 6, 0.2, Math.PI - 0.2, 8), 2.2); for (const dx of [-6, 0, 6]) line([[x + dx, 44], [x + dx * 1.3, 48]], 1.6); }
  },
  f_googly() { for (const [x, dx, dy] of [[36, 3, 4], [64, -2, 5]]) { ell(x, 40, 12, 12, '#fff', 2.6); dot(x + dx, 40 + dy, 5); } },
  f_groucho() {
    for (const x of [36, 64]) line(qP([x - 12, 28], [x, 20], [x + 12, 28], 6), 5, '#2a1a10');
    glasses(x => ell(x, 40, 11, 10, 'rgba(220,240,255,.3)', 3), '#1b1b1b');
    ell(50, 52, 8, 9, '#f2b9a0', 2.4);
    stache('#2a1a10', 1.1);
  },
  f_carrot() { poly([[46, 46], [52, 54], [86, 56]], '#ff8a1a', 2.4); for (const x of [58, 68]) line([[x, 52], [x + 2, 54.5]], 1.2, 'rgba(120,50,0,.5)'); },
  f_beak() { const b = poly([[30, 54], [50, 48], [70, 54], [66, 64], [50, 68], [34, 64]], '#ffb000', 2.6); line([[32, 58], [68, 58]], 1.6, 'rgba(120,70,0,.6)'); },
  f_clownpaint() {
    for (const x of [36, 64]) poly([[x, 22], [x + 9, 40], [x, 58], [x - 9, 40]], 'rgba(60,140,255,.55)', 1.6);
    const sm = poly(qP([26, 54], [50, 82], [74, 54], 12).concat(qP([74, 54], [50, 70], [26, 54], 10).slice(1)), 'rgba(230,40,50,.6)', 1.6);
  },
  f_warpaint() { for (const [x, col] of [[22, '#e8302c'], [28, '#ffffff'], [72, '#e8302c'], [78, '#ffffff']]) line([[x, 46], [x - 3, 60]], 4.5, col); },
  f_butterfly() {
    for (const d of [-1, 1]) { ell(50 + d * 18, 34, 16, 12, 'rgba(255,120,200,.55)', 2, d * 0.4); ell(50 + d * 14, 52, 10, 8, 'rgba(120,160,255,.55)', 2, -d * 0.4); }
    line([[50, 26], [50, 58]], 3);
  },
  f_partyblower() {
    const t = poly([[54, 58], [78, 54], [80, 64], [56, 64]], '#ffd84d', 2.2);
    line([[60, 56], [60, 64]], 2, '#e8574a'); line([[68, 55], [68, 63]], 2, '#3f7fe0');
    ribbon(arcP(88, 64, 8, 8, -1.6, 3.4, 12), 8, 6, '#ff5aa0', 2);
  },
  f_masquerade() {
    ribbon(qP([86, 30], [96, 10], [92, 0], 8), 8, 2, '#3fd4c0', 2);
    poly([[12, 34], [30, 28], [50, 36], [70, 28], [88, 34], [84, 48], [62, 52], [50, 44], [38, 52], [16, 48]], '#9b4de0', 2.4);
    for (const x of [36, 64]) { ell(x, 40, 7, 5, '#fff', 0); c.fillStyle = INK; c.beginPath(); c.ellipse(x, 40, 2.2, 3.4, 0, 0, Math.PI * 2); c.fill(); }
    for (const [x, y] of [[22, 36], [50, 38], [78, 36]]) dot(x, y, 2, '#ffd84d');
  },
  f_vr() {
    line([[6, 38], [94, 38]], 5);
    poly([[16, 26], [84, 26], [84, 54], [56, 54], [50, 48], [44, 54], [16, 54]], '#2a2a2a', 3);
    line([[22, 46], [78, 46]], 3, '#4ac0ff'); dot(76, 32, 2, '#3fd46a');
  },
  f_robotvisor() {
    const g = c.createLinearGradient(16, 0, 84, 0); g.addColorStop(0, 'rgba(255,60,60,.9)'); g.addColorStop(0.5, 'rgba(255,200,80,.9)'); g.addColorStop(1, 'rgba(255,60,60,.9)');
    poly([[12, 32], [88, 32], [88, 48], [12, 48]], '#4a4f58', 3);
    c.fillStyle = g; c.fillRect(18, 36, 64, 8);
  },
  f_laser() {
    for (const x of [36, 64]) {
      const g = c.createLinearGradient(x, 40, x + 30, 100); g.addColorStop(0, 'rgba(255,40,40,.95)'); g.addColorStop(1, 'rgba(255,40,40,0)');
      c.strokeStyle = g; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, 40); c.lineTo(x + 30, 104); c.stroke();
      ell(x, 40, 7, 7, 'rgba(255,80,80,.9)', 2);
    }
  },
  f_sparkleeyes() { for (const x of [36, 64]) { sparkle(x, 40, 11, '#ffe14d'); sparkle(x + 10, 30, 4, '#fff'); } },
  f_goldgrill() {
    poly([[34, 58], [66, 58], [64, 66], [36, 66]], '#ffcf3f', 2.2);
    for (const x of [42, 50, 58]) line([[x, 58], [x, 66]], 1.4, 'rgba(120,80,0,.6)');
    sparkle(68, 56, 4);
  },
  f_diamondmonocle() {
    ell(64, 40, 12, 12, 'rgba(180,240,255,.4)', 3); line(arcP(64, 40, 12, 12, 0, Math.PI * 2, 20), 2.2, '#bdf3ff');
    poly([[78, 74], [84, 68], [90, 74], [84, 84]], '#7fe0f5', 1.8);
    line(qP([74, 46], [82, 58], [84, 68], 6), 1.6, '#bdf3ff');
    sparkle(54, 28, 4.5); sparkle(88, 64, 3.5);
  },
  f_rainbowshades() {
    glasses(x => {
      const l = poly([[x - 13, 33], [x + 13, 33], [x + 11, 47], [x - 11, 47]], '#fff', 0);
      clip(l, () => ['#e8574a', '#ff9a2e', '#ffd84d', '#3fae4a', '#4aa3df', '#9b6cff'].forEach((col, i) => poly([[x - 14, 33 + i * 2.5], [x + 14, 33 + i * 2.5], [x + 14, 36 + i * 2.5], [x - 14, 36 + i * 2.5]], col, 0)));
      strokeP(l, 2.6);
    }, '#1b1b1b');
    sparkle(80, 26, 4);
  },

  // ---------- bait ----------
  worm() { drawWorm('#ff9eb0', '#ff7f98'); },
  goldbait() { drawWorm('#ffd84d', '#e6b800'); sparkle(80, 20, 7); sparkle(18, 30, 5); sparkle(86, 66, 4); },
  cricket() {
    line([[60, 46], [76, 30], [90, 56]], 3); line([[54, 50], [62, 34], [74, 60]], 3);
    line([[36, 56], [30, 70]], 2.6); line([[46, 58], [44, 72]], 2.6);
    ell(50, 50, 22, 11, '#8bbf4a');
    line(qP([34, 46], [50, 40], [68, 48], 8), 2, 'rgba(27,27,27,.5)');
    ell(26, 44, 10, 10, '#8bbf4a');
    eye(23, 42, 2.8);
    line(qP([24, 34], [30, 14], [44, 6], 8), 2); line(qP([20, 36], [16, 16], [24, 4], 8), 2);
  },
  cheese() {
    for (const [i, x] of [30, 50, 70].entries()) line(wave(x, 30 - i % 2 * 4, x + 2, 6, 3, 1.2, 10), 2.4, '#7ccf5a');
    const w = poly([[10, 74], [86, 42], [90, 82], [12, 90]], '#ffd84d');
    clip(w, () => { for (const [x, y, r] of [[34, 78, 6], [62, 70, 7], [78, 82, 4], [54, 86, 3.5]]) ell(x, y, r, r * .8, '#e6b800', 2); });
    strokeP(w, 3.2);
    poly([[10, 74], [86, 42], [90, 46], [14, 78]], '#ffe680', 2.4);
  },
  glow() {
    const g = c.createRadialGradient(50, 58, 4, 50, 58, 44);
    g.addColorStop(0, 'rgba(190,255,130,.9)'); g.addColorStop(1, 'rgba(190,255,130,0)');
    c.fillStyle = g; c.fillRect(0, 0, 100, 100);
    const j = poly([[30, 30], [70, 30], [74, 44], [74, 86], [26, 86], [26, 44]], 'rgba(200,240,255,.45)');
    clip(j, () => { for (const [x, y, r] of [[40, 70, 7], [56, 64, 8], [48, 78, 6], [62, 78, 5], [44, 54, 5]]) ell(x, y, r, r, '#b5ff7a', 2); });
    strokeP(j, 3.2);
    poly([[26, 20], [74, 20], [74, 30], [26, 30]], '#b085f5', 2.8);
    shine([[32, 48], [32, 78]]);
    sparkle(84, 18, 6, '#e8ffd0'); sparkle(14, 50, 4, '#e8ffd0');
  },
  stardust() {
    for (const [x, y, s, col] of [[78, 30, 8, '#ffe27a'], [88, 54, 5, '#ff8fab'], [70, 14, 4, '#7fd8f7'], [62, 40, 4, '#ffe27a']]) sparkle(x, y, s, col);
    ribbon(qP([50, 44], [62, 36], [72, 30], 6), 6, 2, 'rgba(255,226,122,.8)', 0);
    const p = poly([[34, 40], [52, 40], [50, 48], [64, 60], [66, 80], [56, 92], [28, 92], [18, 80], [20, 60], [36, 48]], '#6b4fa0');
    clip(p, () => { for (const [x, y] of [[30, 66], [50, 74], [40, 84], [56, 62]]) dot(x, y, 1.8, '#ffe27a'); });
    strokeP(p, 3.2);
    ribbon(qP([34, 48], [43, 52], [52, 48], 6), 5, 5, '#ffd84d', 2.2);
  },
  // ---------- merchant bait ----------
  mystery() {
    const j = poly([[28, 30], [72, 30], [76, 44], [76, 88], [24, 88], [24, 44]], 'rgba(200,180,255,.55)');
    clip(j, () => { for (const [x, y, r] of [[38, 74, 7], [56, 68, 9], [46, 82, 6], [64, 82, 5]]) ell(x, y, r, r, '#b085f5', 1.8); });
    strokeP(j, 3.2);
    poly([[24, 20], [76, 20], [76, 30], [24, 30]], '#6b4fa0', 2.8);
    line(qP([42, 46], [50, 36], [58, 46], 6).concat([[58, 50], [50, 56], [50, 62]]), 4, '#fff');
    line(qP([42, 46], [50, 36], [58, 46], 6).concat([[58, 50], [50, 56], [50, 62]]), 1.6, INK);
    dot(50, 70, 3, '#fff');
    sparkle(86, 18, 6, '#e8dcff'); sparkle(14, 40, 4, '#e8dcff');
  },
  goldlure() {
    line(qP([50, 4], [52, 12], [50, 18], 4), 1.8);
    ell(50, 22, 4, 4, '#c9ced6', 2);
    const b = poly([[50, 26], [66, 40], [64, 62], [50, 72], [36, 62], [34, 40]], '#ffcf3f');
    clip(b, () => { for (let y = 34; y < 70; y += 8) line([[34, y], [66, y - 4]], 1.6, 'rgba(160,110,0,.5)'); });
    strokeP(b, 3.2);
    dot(44, 40, 3.2, INK); dot(43, 39, 1, '#fff');
    shine([[40, 46], [42, 58]], 3);
    for (const d of [-1, 1]) line(qP([50, 74], [50 + d * 14, 86], [50 + d * 6, 94], 6), 2.4, '#8d939b');
    line([[50, 72], [50, 92]], 2.4, '#8d939b');
    sparkle(80, 30, 6); sparkle(20, 74, 4.5);
  },
  krakenink() {
    const b = poly([[38, 28], [62, 28], [62, 38], [74, 52], [74, 86], [26, 86], [26, 52], [38, 38]], 'rgba(60,40,90,.85)');
    clip(b, () => { ell(50, 76, 30, 14, '#24123d', 0); for (const [x, y] of [[40, 70], [58, 62], [48, 80]]) ell(x, y, 3, 3, '#7b3fe4', 0); });
    strokeP(b, 3.2);
    poly([[36, 18], [64, 18], [64, 28], [36, 28]], '#c68a52', 2.6);
    for (const [x, dir] of [[30, -1], [70, 1]]) ribbon(wave(x, 60, x + dir * 18, 92, 3, 1.2, 10), 7, 2, '#b085f5', 2.4);
    shine([[32, 56], [32, 78]]);
    eye(44, 56, 3); eye(56, 56, 3);
  },

  // ---------- money ----------
  fishcoin() {
    ell(54, 54, 40, 40, '#d9a514', 4);
    ell(48, 48, 40, 40, '#ffcf3f', 4);
    ell(48, 48, 30, 30, null, 2.6);
    // fish stamped in the middle
    poly([[62, 48], [76, 36], [73, 48], [76, 60]], '#f2b51c', 3);
    ell(44, 48, 20, 12, '#f2b51c', 3);
    dot(34, 45, 3.2, INK);
    line(qP([46, 38], [50, 48], [46, 58], 6), 2.2, 'rgba(27,27,27,.6)');
    shine(arcP(48, 48, 35, 35, -2.7, -1.8, 6), 4);
  },

  // ---------- accessories ----------
  ring() {
    const band = ell(50, 62, 28, 26, '#ffcf3f');
    ell(50, 64, 19, 17, '#fff');
    shine(arcP(50, 62, 23, 21, 2.3, 3.4, 6), 3);
    poly([[38, 36], [44, 26], [56, 26], [62, 36], [50, 46]], '#bdf0ff');
    line([[38, 36], [62, 36]], 2); line([[44, 26], [47, 36], [50, 46]], 1.6); line([[56, 26], [53, 36], [50, 46]], 1.6);
    sparkle(72, 18, 7); sparkle(26, 22, 4.5);
  },
  tophat() {
    ell(50, 78, 40, 11, '#2b2b33');
    const crown = poly([[28, 76], [30, 20], [70, 20], [72, 76]], '#2b2b33');
    clip(crown, () => poly([[20, 58], [80, 58], [80, 70], [20, 70]], '#e8574a', 0));
    strokeP(crown, 3.2);
    line([[29, 58], [71, 58]], 2.4); line([[29, 70], [71, 70]], 2.4);
    ell(50, 20, 20, 5, '#3d3d47');
    shine([[36, 28], [36, 52]], 3);
    sparkle(84, 30, 5);
  },
  clover() {
    ribbon(qP([50, 52], [52, 76], [64, 94], 8), 6, 4, '#3d8b3a', 2.6);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4, x = 50 + Math.cos(a) * 17, y = 44 + Math.sin(a) * 17;
      rot(x, y, a + Math.PI / 2, () => {
        ell(x - 7, y, 10, 12, '#6cc36c', 3, -0.3);
        ell(x + 7, y, 10, 12, '#6cc36c', 3, 0.3);
        ell(x - 7, y, 8.4, 10.4, '#6cc36c', 0, -0.3);
        ell(x + 7, y, 8.4, 10.4, '#6cc36c', 0, 0.3);
        line([[x, y - 8], [x, y + 8]], 1.6, 'rgba(27,27,27,.45)');
      });
    }
    dot(50, 44, 3, '#3d8b3a');
    sparkle(84, 16, 6, '#ffe27a'); sparkle(16, 80, 4.5, '#ffe27a');
  },
  jelly() {
    ell(50, 86, 34, 6, 'rgba(0,0,0,.12)', 0);
    const cols = ['#ff6b6b', '#ffb347', '#ffe066', '#7ed957', '#4fc3f7', '#b28dff'];
    const j = poly([[22, 84], [18, 50], [26, 26], [50, 18], [74, 26], [82, 50], [78, 84]], '#fff');
    clip(j, () => { cols.forEach((col, i) => poly([[0, 90 - i * 13], [100, 84 - i * 13], [100, 98 - i * 13], [0, 104 - i * 13]], col, 0)); });
    strokeP(j, 3.2);
    shine(qP([28, 52], [28, 34], [40, 26], 6), 3.4);
    eye(40, 56, 3.4); eye(60, 56, 3.4);
    smile(50, 64, 6, 4); blush(32, 64); blush(68, 64);
    sparkle(88, 18, 6); sparkle(14, 24, 4.5);
  },
  comet() {
    for (const [i, col] of ['#4fc3f7', '#9be7ff', '#e6fbff'].entries()) {
      ribbon(qP([52 - i * 2, 40 + i * 3], [30, 26], [6, 6 + i * 6], 8), 26 - i * 7, 2, col, i === 0 ? 2.6 : 0);
    }
    const r = poly([[46, 50], [58, 36], [76, 38], [88, 54], [84, 74], [66, 84], [48, 76]], '#8d7b9e');
    clip(r, () => { ell(72, 78, 20, 10, '#6f5f80', 0); for (const [x, y, s] of [[62, 52, 5], [76, 64, 4], [58, 68, 3]]) ell(x, y, s, s * 0.8, '#6f5f80', 1.8); });
    strokeP(r, 3.2);
    shine(qP([54, 46], [60, 40], [70, 40], 5), 3);
    sparkle(90, 22, 6, '#e6fbff'); sparkle(30, 82, 4, '#e6fbff');
  },
};
// creatures that reuse an existing drawing
ART.krill = ART.shrimp;
ART.clownfish = ART.tropical;
ART.greatwhite = ART.shark;
ART.seaturtle = ART.turtle;
ART.bluewhale = ART.whale;
ART.bottlenose = ART.dolphin;

function drawWorm(col, seg) {
  const sp = wave(16, 70, 74, 52, 9, 1.4, 20);
  ribbon(sp, 12, 10, col);
  for (let i = 3; i < sp.length - 3; i += 3) line([[sp[i][0] - 1, sp[i][1] - 5], [sp[i][0] + 1, sp[i][1] + 5]], 1.8, seg);
  const [hx, hy] = sp[sp.length - 1];
  ell(hx + 4, hy, 9, 8, col);
  eye(hx + 2, hy - 2, 2.4); eye(hx + 8, hy - 1, 2.4);
  smile(hx + 6, hy + 3, 3, 2);
}

// shark body in any colors. o: body, belly, stripes, spots, snout (goblin nose),
// wide (whale shark: flat mouth, no teeth), bigMouth (megalodon)
function sharkArt(o) {
  const gr = o.body;
  if (o.longTail) ribbon(qP([20, 48], [6, 34], [4, 2], 10), 10, 2, gr, 3);
  else poly([[18, 50], [4, 28], [10, 50], [6, 72]], gr);
  poly([[40, 34], [52, 10], [62, 36]], gr);
  const b = poly([[14, 50], [30, 34], [60, 30], [84, 38], [96, 52], [84, 64], [56, 72], [30, 66]], gr);
  clip(b, () => {
    poly([[30, 56], [60, 54], [96, 52], [84, 66], [56, 76], [28, 70]], o.belly, 0);
    if (o.stripes) for (const x of [26, 36, 46, 56, 66]) line(wave(x, 34, x + 4, 52, 2, 1, 6), 3, o.stripes);
    if (o.spots) for (let x = 22; x < 86; x += 8) for (let y = 38; y < 56; y += 7) dot(x + (y % 14 ? 4 : 0), y, 1.8, o.spots);
  });
  strokeP(b, 3.2);
  poly([[48, 64], [62, 70], [50, 80]], gr, 2.6);
  if (o.snout) poly([[82, 38], [100, 36], [98, 44], [86, 48]], o.snout, 2.6);
  if (o.wide) line([[78, 58], [96, 54]], 3);
  else {
    const m = poly(o.bigMouth ? [[60, 50], [96, 48], [88, 68], [66, 66]] : [[64, 54], [90, 54], [84, 62], [70, 62]], '#5a2230', 2.6);
    clip(m, () => { for (let x = o.bigMouth ? 62 : 66; x < (o.bigMouth ? 94 : 90); x += 5) { poly([[x, 48], [x + 4, 48], [x + 2, o.bigMouth ? 56 : 58]], '#fff', 1.2); if (o.bigMouth) poly([[x, 68], [x + 4, 68], [x + 2, 60]], '#fff', 1.2); } });
  }
  eye(80, 42, 3);
  for (const x of [48, 53, 58]) line([[x, 42], [x - 2, 50]], 2);
}
// wiggly eel in any color, with optional spots
function eelArt(col, spots) {
  const sp = wave(10, 74, 72, 36, 8, 1.5, 22);
  ribbon(sp, 7, 16, col);
  if (spots) for (let i = 2; i < sp.length - 1; i += 3) dot(sp[i][0], sp[i][1] - 2, 2, spots);
  const [hx, hy] = sp[sp.length - 1];
  ell(hx + 8, hy, 13, 9, col, 3, -0.4);
  poly([[hx + 12, hy + 2], [hx + 22, hy - 2], [hx + 20, hy + 6]], '#5a2230', 2);
  eye(hx + 8, hy - 4, 2.6);
}
// big deep-sea squid in any color
function squidArt(col, spot) {
  for (let i = 0; i < 6; i++) { const x = 34 + i * 6.4; ribbon(wave(x, 60, x + (i - 2.5) * 4, 92 - (i % 2) * 6, 2.4, 1.3, 12), 5, 2, col, 2.4); }
  for (const d of [-1, 1]) ribbon(wave(50 + d * 6, 62, 50 + d * 42, 98, 4, 1.6, 14), 4, 7, col, 2.2);
  poly([[30, 22], [18, 36], [34, 36]], col, 2.6); poly([[70, 22], [82, 36], [66, 36]], col, 2.6);
  const m = poly([[50, 2], [68, 28], [70, 62], [30, 62], [32, 28]], col);
  clip(m, () => { for (const [x, y] of [[44, 20], [56, 28], [46, 36], [58, 44]]) dot(x, y, 2.4, spot); });
  strokeP(m, 3.2);
  for (const x of [41, 59]) {
    const g = c.createRadialGradient(x, 50, 0, x, 50, 11); g.addColorStop(0, 'rgba(160,240,255,.8)'); g.addColorStop(1, 'rgba(160,240,255,0)');
    c.fillStyle = g; c.fillRect(x - 11, 39, 22, 22);
    ell(x, 50, 7, 8, '#dffcff', 2.2); eye(x, 51, 3.6);
  }
}

// seal lying down. o: body, belly, spots, teeth (leopard seal grin)
function sealArt(o) {
  poly([[20, 66], [4, 56], [6, 80]], o.body, 2.6);
  const b = poly([[16, 68], [30, 52], [56, 46], [70, 36], [84, 34], [94, 44], [92, 56], [76, 66], [50, 76], [26, 76]], o.body);
  clip(b, () => {
    ell(54, 76, 36, 10, o.belly, 0);
    for (const [x, y] of [[34, 62], [48, 56], [60, 52], [42, 68], [66, 60], [76, 44]]) dot(x, y, 2.2, o.spots);
  });
  strokeP(b, 3.2);
  ell(54, 74, 10, 5, o.body, 2.4, 0.5);
  eye(84, 42, 3); dot(93, 48, 2.2);
  for (const d of [-1, 1]) line([[90, 50], [98, 50 + d * 4]], 1.2);
  if (o.teeth) { line(qP([82, 52], [88, 56], [93, 52], 6), 2.2); for (const x of [84, 88]) poly([[x, 53], [x + 1.5, 57], [x + 3, 53]], '#fff', 1); }
  else smile(88, 52, 3, 2);
}
// sea serpent with humps out of the water. o: body, belly, fin, glow (leviathan)
function serpentArt(o) {
  line(wave(2, 84, 98, 84, 2, 3), 2.4, '#4aa3df');
  const sp = wave(6, 80, 74, 34, 14, 1.6, 26);
  for (let i = 2; i < sp.length - 3; i += 3) { const [x, y] = sp[i]; poly([[x - 3, y - 5], [x, y - 14], [x + 3, y - 5]], o.fin, 1.6); }
  ribbon(sp, 8, 16, o.body);
  ribbon(sp.map(([x, y]) => [x, y + 3]), 2, 4, o.belly, 0);
  const [hx, hy] = sp[sp.length - 1];
  poly([[hx - 4, hy - 6], [hx - 10, hy - 22], [hx + 2, hy - 8]], o.fin, 2); poly([[hx + 2, hy - 8], [hx + 2, hy - 24], [hx + 8, hy - 8]], o.fin, 2);
  const h = poly([[hx - 8, hy - 6], [hx + 10, hy - 10], [hx + 24, hy - 2], [hx + 22, hy + 8], [hx, hy + 10]], o.body);
  strokeP(h, 3);
  for (const x of [hx + 12, hx + 16, hx + 20]) poly([[x, hy + 6], [x + 1.5, hy + 11], [x + 3, hy + 6]], '#fff', 1);
  if (o.glow) {
    const g = c.createRadialGradient(hx + 6, hy - 4, 0, hx + 6, hy - 4, 10); g.addColorStop(0, 'rgba(120,230,255,.9)'); g.addColorStop(1, 'rgba(120,230,255,0)');
    c.fillStyle = g; c.fillRect(hx - 4, hy - 14, 20, 20);
    ell(hx + 6, hy - 4, 3.5, 3, '#bdf6ff', 1.6); dot(hx + 6, hy - 4, 1.4);
    sparkle(20, 20, 5, '#bdf6ff'); sparkle(90, 70, 4, '#bdf6ff');
  } else eye(hx + 6, hy - 3, 2.6);
}

// heart outline centered on (cx, cy), about s wide
function heartP(cx, cy, s) {
  const p = []; for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2; p.push([cx + 16 * Math.pow(Math.sin(t), 3) * s / 32, cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s / 32]); } return p;
}
// a pair of glasses: arms to the sides of the face, a bridge, and lens(x) drawn at each eye
function glasses(lens, frame) {
  line([[10, 37], [24, 38]], 2.4, frame); line([[76, 38], [90, 37]], 2.4, frame);
  line(qP([46, 39], [50, 35], [54, 39], 4), 2.4, frame);
  lens(36); lens(64);
}
// curly mustache under the nose
function stache(col, s) {
  for (const d of [-1, 1]) poly([[50, 50], [50 + d * 8 * s, 48], [50 + d * 20 * s, 50], [50 + d * 26 * s, 46], [50 + d * 22 * s, 56], [50 + d * 10 * s, 58], [50, 55]], col, 2.4);
}

// ---------- caching + public API ----------
const cache = {};
function render(id, frame) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE;
  c = cv.getContext('2d'); seed = frame * 7 + 1; k = 0;
  c.scale(SIZE / 100, SIZE / 100);
  // small inset so wobbly outlines never get clipped
  c.translate(5, 5); c.scale(0.9, 0.9);
  ART[id]();
  return cv;
}
function entry(id) {
  if (!ART[id]) return null;
  if (!cache[id]) cache[id] = { canvases: [], urls: [] };
  return cache[id];
}
function canvas(id, frame) {
  const e = entry(id); if (!e) return null;
  return e.canvases[frame] || (e.canvases[frame] = render(id, frame));
}
function url(id, frame = 0) {
  const e = entry(id); if (!e) return null;
  return e.urls[frame] || (e.urls[frame] = canvas(id, frame).toDataURL());
}
// HTML markup for an item's art (falls back to the emoji for items with no drawing yet)
function html(id, emoji, cls = '') {
  const u = url(id, frameNow);
  return u ? `<img class="art ${cls}" data-art="${id}" src="${u}" alt="" draggable="false">` : `<span class="${cls}">${emoji || '?'}</span>`;
}
// Boil: cycle frames on every drawn image on the page
let frameNow = 0;
setInterval(() => {
  frameNow = (frameNow + 1) % FRAMES;
  document.querySelectorAll('img.art[data-art]').forEach(img => { const u = url(img.dataset.art, frameNow); if (u) img.src = u; });
}, 150);

window.ItemArt = { has: id => !!ART[id], canvas, url, html, get frame() { return frameNow; }, FRAMES };
})();
