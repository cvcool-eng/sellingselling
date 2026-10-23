// ============================================================
//  Title / loading screen: low angle in front of the dock, the
//  happy cube hauling a big glowing fish out of a burst of water.
//  Tap anywhere to start.
// ============================================================
(() => {
'use strict';
const INK = '#1b1b1b';
const HAND = '"Patrick Hand", "Comic Sans MS", cursive';
const root = document.getElementById('title');
const cv = document.getElementById('titleCanvas');
const ctx = cv.getContext('2d');
const bloom = document.createElement('canvas');
const bctx = bloom.getContext('2d');

let W = 0, H = 0, DPR = 1, U = 1;
let t = 0, boil = 0, last = performance.now();
let open = true, closing = false;
let drops = [], ripples = [], mist = [], nextRipple = 0;
let lens = [], fg = [], nextLens = 0, nextFg = 0; // water on the camera lens + spray flying past it
const motes = Array.from({ length: 34 }, () => ({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random(), v: 0.01 + Math.random() * 0.03, ph: Math.random() * 6 }));

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const rand = (a, b) => a + Math.random() * (b - a);
const easeOutCubic = x => 1 - Math.pow(1 - x, 3);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

// ---------- hand-drawn helpers ----------
function nz(i) { const x = Math.sin(i * 127.1 + boil * 311.7) * 43758.5453; return x - Math.floor(x) - 0.5; }
function sketch(pts, closed, amp, seed) {
  amp = amp == null ? 0.3 * U : amp;
  let k = (seed || 0) * 97;
  const n = pts.length, segs = closed ? n : n - 1, step = 3.5 * U;
  ctx.beginPath();
  for (let s = 0; s < segs; s++) {
    const a = pts[s], b = pts[(s + 1) % n];
    const steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let j = s === 0 ? 0 : 1; j <= steps; j++) {
      const f = j / steps;
      const x = a[0] + (b[0] - a[0]) * f + nz(k++) * amp * 2, y = a[1] + (b[1] - a[1]) * f + nz(k++) * amp * 2;
      if (s === 0 && j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  if (closed) ctx.closePath();
}
function ink(w, a = 1) { ctx.strokeStyle = INK; ctx.globalAlpha = a; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); ctx.globalAlpha = 1; }
function fillInk(fill, w) { ctx.fillStyle = fill; ctx.fill(); ink(w); }
function ellPts(cx, cy, rx, ry, n = 30, bump = 0, bn = 0, ph = 0) {
  const p = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = 1 + bump * Math.sin(a * bn + ph); p.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]); }
  return p;
}
function rectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }

// ---------- layout ----------
const L = {};
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  U = Math.min(W, H * 1.15) / 100;
  bloom.width = Math.max(1, Math.round(W / 4)); bloom.height = Math.max(1, Math.round(H / 4));
  // Camera sits low on the water just left of the fish, a bit back from the dock,
  // looking up: low horizon, the cube up on the dock, the fish big on the right.
  const tall = H > W * 1.2;      // phones held upright: pull the scene up so the sky isn't empty
  L.horizon = H * (tall ? 0.8 : 0.9); // camera right down at the water line
  L.deckTop = H * (tall ? 0.5 : 0.6);
  L.cubeX = W * (W > H ? 0.27 : 0.25);
  L.S = 23 * U;                  // a little closer to the dock
  L.sunX = W * 0.52; L.sunY = H * 0.22;
  L.fishX = W * (W > H ? 0.8 : 0.74);
  L.surf = H * (tall ? 0.88 : 0.985);
  L.FS = 1.45; // fish is close to the camera, so it reads big
}

// ---------- scene pieces ----------
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, L.horizon);
  g.addColorStop(0, '#bfe6ff'); g.addColorStop(0.55, '#fff6dc'); g.addColorStop(1, '#ffe1a6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, L.horizon + 2);

  // sun glow + rotating light rays
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = Math.max(W, H) * 0.9;
  for (let i = 0; i < 16; i++) {
    const a = t * 0.06 + i * Math.PI * 2 / 16, w = 0.07 + 0.03 * Math.sin(i * 3.1);
    ctx.beginPath(); ctx.moveTo(L.sunX, L.sunY);
    ctx.lineTo(L.sunX + Math.cos(a - w) * R, L.sunY + Math.sin(a - w) * R);
    ctx.lineTo(L.sunX + Math.cos(a + w) * R, L.sunY + Math.sin(a + w) * R);
    ctx.closePath();
    const rg = ctx.createRadialGradient(L.sunX, L.sunY, 0, L.sunX, L.sunY, R * 0.7);
    rg.addColorStop(0, 'rgba(255,240,200,0.22)'); rg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = rg; ctx.fill();
  }
  const sg = ctx.createRadialGradient(L.sunX, L.sunY, 0, L.sunX, L.sunY, 40 * U);
  sg.addColorStop(0, 'rgba(255,250,220,0.95)'); sg.addColorStop(0.35, 'rgba(255,225,150,0.45)'); sg.addColorStop(1, 'rgba(255,210,120,0)');
  ctx.fillStyle = sg; ctx.fillRect(L.sunX - 40 * U, L.sunY - 40 * U, 80 * U, 80 * U);
  ctx.restore();
  sketch(ellPts(L.sunX, L.sunY, 9 * U, 9 * U, 26), true, 0.25 * U, 5);
  fillInk('#fff3b0', 0.5 * U);

  // clouds with glowing rims
  for (const [cx, cy, s, v, ph] of [[0.15, 0.2, 1.2, 4, 1], [0.85, 0.14, 0.9, 3, 2], [0.45, 0.1, 0.7, 5, 3]]) {
    const span = W + 60 * U;
    const x = ((cx * W + t * v * U) % span + span) % span - 30 * U, y = cy * H;
    const pts = ellPts(x, y, 15 * U * s, 6 * U * s, 30, 0.14, 6, ph);
    ctx.save(); ctx.shadowColor = 'rgba(255,220,140,0.9)'; ctx.shadowBlur = 4 * U;
    sketch(pts, true, 0.25 * U, 10 + ph); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
    sketch(pts, true, 0.25 * U, 10 + ph); ink(0.5 * U, 0.65);
  }

  // far shore
  const hp = [];
  for (let x = -20; x <= W + 20; x += 6 * U) hp.push([x, L.horizon - 2.2 * U - Math.sin(x * 0.01) * 1.6 * U - Math.sin(x * 0.033) * 0.8 * U]);
  hp.push([W + 20, L.horizon + 1], [-20, L.horizon + 1]);
  sketch(hp, true, 0.25 * U, 20); fillInk('#bfe3a0', 0.45 * U);
}

function drawWater() {
  const g = ctx.createLinearGradient(0, L.horizon, 0, H);
  g.addColorStop(0, '#b3e5ff'); g.addColorStop(1, '#3a8ad4');
  ctx.fillStyle = g; ctx.fillRect(0, L.horizon, W, H - L.horizon);
  sketch([[-10, L.horizon], [W + 10, L.horizon]], false, 0.25 * U, 30); ink(0.6 * U);

  // glittering sun reflection
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 22; i++) {
    const f = i / 22, y = lerp(L.horizon + 1 * U, H, f * f);
    const w = (2 + f * 14) * U * (0.6 + 0.4 * Math.sin(t * 3 + i * 1.7));
    const x = L.sunX + Math.sin(t * 1.3 + i) * (2 + f * 6) * U;
    ctx.strokeStyle = `rgba(255,245,210,${0.75 - f * 0.4})`; ctx.lineWidth = (0.5 + f * 1.3) * U; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x + w, y); ctx.stroke();
  }
  ctx.restore();

  // wave squiggles
  for (let i = 0; i < 26; i++) {
    const f = ((i * 0.618) % 1), row = (i % 7) / 7;
    const y = lerp(L.horizon + 2 * U, H - 2 * U, row * row + 0.05);
    const s = (0.6 + row * 1.6) * U;
    const x = ((f * W + t * (4 + row * 10) * U) % (W + 20 * U)) - 10 * U;
    sketch([[x - 4 * s, y], [x - 2 * s, y - s], [x, y], [x + 2 * s, y - s], [x + 4 * s, y]], false, 0.12 * U, 40 + i);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.5 * U + row * 0.4 * U; ctx.stroke();
  }
  for (const r of ripples) {
    const u = r.t / 1.4, rad = r.max * easeOutCubic(u);
    ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * 0.28, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${(1 - u) * 0.9})`; ctx.lineWidth = 0.7 * U; ctx.stroke();
  }
}

function drawDock() {
  const S = L.S, l = L.cubeX - 1.5 * S, r = L.cubeX + 1.25 * S, top = L.deckTop, th = 0.3 * S, bot = L.horizon + (H - L.horizon) * 0.35;
  // underside of the deck, seen from below
  sketch([[l + U, top + th], [r - U, top + th], [r - 4 * U, top + th + 3 * U], [l + 4 * U, top + th + 3 * U]], true, 0.2 * U, 49);
  fillInk('#5a3a20', 0.5 * U);
  for (const px of [l + 9 * U, r - 9 * U]) {
    sketch(rectPts(px - 4.5 * U, top + th - U, 9 * U, bot - top - th), true, 0.3 * U, 50 + px);
    fillInk('#7d5029', 0.8 * U);
    sketch([[px - 2 * U, top + th + 4 * U], [px - 2.5 * U, bot - 4 * U]], false, 0.2 * U, 52 + px); ink(0.3 * U, 0.4);
    ctx.beginPath(); ctx.ellipse(px, bot - 0.5 * U, 7 * U, 1.8 * U, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 0.6 * U; ctx.stroke();
  }
  sketch([[l + 12 * U, top + th + 4 * U], [r - 12 * U, bot - 14 * U], [r - 12 * U, bot - 10 * U], [l + 12 * U, top + th + 8 * U]], true, 0.25 * U, 55);
  fillInk('#8f5f33', 0.6 * U);
  sketch(rectPts(l, top - 2 * U, r - l, 2.4 * U), true, 0.25 * U, 56); fillInk('#d9a066', 0.6 * U);
  sketch(rectPts(l, top, r - l, th), true, 0.3 * U, 57); fillInk('#b77a43', 0.8 * U);
  sketch([[l + U, top + th / 2], [r - U, top + th / 2]], false, 0.2 * U, 58); ink(0.35 * U, 0.5);
  for (const x of [l + 4 * U, r - 4 * U]) for (const y of [top + 1.8 * U, top + th - 1.8 * U]) { ctx.beginPath(); ctx.arc(x, y, 0.55 * U, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill(); }
}

// cube local -> world
function cubeTf() { return { x: L.cubeX, y: L.deckTop - 2 * U, a: -0.3 + Math.sin(t * 9) * 0.025 + Math.sin(t * 2.3) * 0.03 }; }
function toWorld(tf, lx, ly) { const c = Math.cos(tf.a), s = Math.sin(tf.a); return [tf.x + lx * c - ly * s, tf.y + lx * s + ly * c]; }

function drawCube() {
  const S = L.S, h = S / 2, tf = cubeTf();
  ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(tf.x - 2 * U, L.deckTop - U, S * 0.55, 1.2 * U, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(tf.x, tf.y); ctx.rotate(tf.a);
  const sq = 1 + Math.sin(t * 9) * 0.02;
  ctx.scale(1 / sq, sq);
  const body = [[-h - 0.4 * U, -S + 0.5 * U], [h + 0.6 * U, -S - 0.4 * U], [h - 0.2 * U, 0], [-h + 0.4 * U, 0.2 * U]];
  // warm rim light from the sun side
  ctx.save(); ctx.shadowColor = 'rgba(255,214,120,.95)'; ctx.shadowBlur = 5 * U;
  sketch(body, true, 0.35 * U, 60); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
  sketch(body, true, 0.35 * U, 60); ink(1.1 * U);
  sketch(body, true, 0.6 * U, 61); ink(0.45 * U, 0.4);
  sketch([[h - U, -S - 0.4 * U], [h + 2.4 * U, -S - U]], false, 0.15 * U, 62); ink(0.55 * U, 0.7);
  sketch([[-h - 1.4 * U, -U], [-h + 0.4 * U, 1.6 * U]], false, 0.15 * U, 63); ink(0.55 * U, 0.7);

  // happy face: big open shiny eyes and a big open grin
  const ey = -S * 0.64, ex = S * 0.19;
  for (const d of [-1, 1]) {
    sketch(ellPts(d * ex, ey, S * 0.075, S * 0.11, 16), true, 0.1 * U, 64 + d);
    ctx.fillStyle = INK; ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(d * ex - S * 0.025, ey - S * 0.045, S * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(d * ex + S * 0.02, ey + S * 0.035, S * 0.014, 0, Math.PI * 2); ctx.fill();
  }
  const my = -S * 0.42, mw = S * 0.3, mh = S * 0.22;
  const mouth = [[-mw, my]];
  for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12; mouth.push([Math.cos(a) * mw, my + Math.sin(a) * mh]); }
  sketch(mouth, true, 0.15 * U, 66); fillInk(INK, 0.8 * U);
  ctx.save(); sketch(mouth, true, 0.15 * U, 66); ctx.clip();
  ctx.fillStyle = '#ff7a8a'; ctx.beginPath(); ctx.ellipse(S * 0.04, my + mh * 0.85, mw * 0.5, mh * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawRodAndFish() {
  const tf = cubeTf(), S = L.S;
  const [px, py] = toWorld(tf, S * 0.42, -S * 0.5);
  // rod bent into a real arc: starts pointing up, curls down toward the fish
  const ang = -1.4 + Math.sin(t * 13) * 0.05 + Math.sin(t * 5.1) * 0.04;
  const turn = 2.0 + Math.sin(t * 17) * 0.12 + Math.sin(t * 6.3) * 0.08;
  const len = 42 * U, R = len / turn;
  const P = u => u <= 0
    ? [px + Math.cos(ang) * len * u, py + Math.sin(ang) * len * u]
    : [px + R * (Math.sin(ang + turn * u) - Math.sin(ang)), py + R * (Math.cos(ang) - Math.cos(ang + turn * u))];
  const tip = P(1);

  // fish (behind the line so the line meets its mouth); head tilted up toward the cube
  const fx = L.fishX + Math.sin(t * 3) * 1.5 * U, fy = L.surf - 22 * U + Math.sin(t * 6) * 2.6 * U;
  const fr = 0.32 + Math.sin(t * 7) * 0.2;
  drawWaterColumn(fx, fy);
  const mouth = drawFish(fx, fy, fr);

  // line: long and snaking through the air like a dragon-dance ribbon,
  // a wide side-to-side sweep with waves rolling down it toward the fish
  const dx = mouth[0] - tip[0], dy = mouth[1] - tip[1], dl = Math.hypot(dx, dy) || 1;
  const lnx = -dy / dl, lny = dx / dl;
  const linePts = [];
  for (let i = 0; i <= 80; i++) {
    const s = i / 80, env = Math.sin(Math.PI * s);
    const sweep = Math.sin(t * 1.9) * 26 * U * env;                     // big swing left/right
    const wave = Math.sin((s * 3.2 - t * 1.6) * Math.PI * 2) * 9 * U * Math.pow(env, 0.8); // rolling S-curves
    const lift = -Math.sin(Math.PI * s) * 14 * U;                        // arcs up so it reads long
    const o = sweep + wave;
    linePts.push([tip[0] + dx * s + lnx * o, tip[1] + dy * s + lny * o + lift]);
  }
  const strokeLine = (w, color) => {
    ctx.beginPath(); ctx.moveTo(linePts[0][0], linePts[0][1]);
    for (let i = 1; i < linePts.length - 1; i++) {
      const mxp = (linePts[i][0] + linePts[i + 1][0]) / 2, myp = (linePts[i][1] + linePts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(linePts[i][0], linePts[i][1], mxp, myp);
    }
    const lp = linePts[linePts.length - 1]; ctx.lineTo(lp[0], lp[1]);
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  };
  ctx.save(); ctx.shadowColor = 'rgba(255,236,180,.9)'; ctx.shadowBlur = 2 * U;
  strokeLine(0.6 * U, 'rgba(27,27,27,.85)');
  ctx.restore();
  strokeLine(0.2 * U, 'rgba(255,255,255,.55)');

  // smooth rod
  const N = 22, u0 = 0.14;
  const grad = ctx.createLinearGradient(P(u0)[0], P(u0)[1], tip[0], tip[1]);
  grad.addColorStop(0, '#8b5a2b'); grad.addColorStop(1, '#d9aa72');
  ctx.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < N; i++) {
      const a = P(u0 + (1 - u0) * i / N), b = P(u0 + (1 - u0) * (i + 1) / N), w = lerp(1.7, 0.5, i / N) * U;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      if (pass === 0) { ctx.strokeStyle = INK; ctx.lineWidth = w + 0.8 * U; }
      else if (pass === 1) { ctx.strokeStyle = grad; ctx.lineWidth = w; }
      else { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = w * 0.3; }
      ctx.stroke();
    }
  }
  const g0 = P(-0.06), g1 = P(0.15);
  ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]);
  ctx.strokeStyle = INK; ctx.lineWidth = 3.4 * U; ctx.stroke();
  ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2.5 * U; ctx.stroke();
  const nx = -Math.sin(ang), ny = Math.cos(ang), rp = P(0.08), rc = [rp[0] + nx * 3 * U, rp[1] + ny * 3 * U];
  ctx.beginPath(); ctx.arc(rc[0], rc[1], 2.1 * U, 0, Math.PI * 2); ctx.fillStyle = '#c9c9c9'; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 0.6 * U; ctx.stroke();
  const sa = t * 30;
  ctx.beginPath(); ctx.moveTo(rc[0], rc[1]); ctx.lineTo(rc[0] + Math.cos(sa) * 2.4 * U, rc[1] + Math.sin(sa) * 2.4 * U); ctx.stroke();
  ctx.beginPath(); ctx.arc(px, py, 1.9 * U, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ink(0.8 * U);

  // motion streaks around the bending tip
  for (let i = 0; i < 2; i++) {
    const a = ang + turn - 1.9 + i * 0.5;
    sketch([[tip[0] + Math.cos(a) * 3 * U, tip[1] + Math.sin(a) * 3 * U], [tip[0] + Math.cos(a) * 6 * U, tip[1] + Math.sin(a) * 6 * U]], false, 0.1 * U, 90 + i);
    ink(0.45 * U, 0.6);
  }
}

function drawFish(x, y, rot) {
  const len = 30 * U, hh = 17 * U, fs = L.FS;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(fs, fs);
  const X = v => v * len, Y = v => v * hh;
  const wag = Math.sin(t * 14) * 0.12;
  sketch([[X(0.36), 0], [X(0.62), Y(-0.6 + wag)], [X(0.52), 0], [X(0.62), Y(0.6 + wag)]], true, 0.25 * U, 100);
  fillInk('#ff8a2a', 0.8 * U);
  sketch([[X(0.2), Y(-0.36)], [X(0.04), Y(-0.9)], [X(-0.18), Y(-0.42)]], true, 0.25 * U, 101);
  fillInk('#ff8a2a', 0.8 * U);
  const body = ellPts(0, 0, len * 0.45, hh * 0.5, 34);
  ctx.save(); ctx.shadowColor = 'rgba(255,200,80,1)'; ctx.shadowBlur = 7 * U;
  const g = ctx.createLinearGradient(0, -hh * 0.5, 0, hh * 0.5);
  g.addColorStop(0, '#ffb238'); g.addColorStop(1, '#ffe08a');
  sketch(body, true, 0.3 * U, 102); ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  ctx.save(); sketch(body, true, 0.3 * U, 102); ctx.clip();
  for (const sx of [-0.05, 0.16]) { sketch([[X(sx), Y(-0.6)], [X(sx - 0.04), 0], [X(sx), Y(0.6)]], false, 0.15 * U, 103); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.2 * U; ctx.stroke(); }
  ctx.restore();
  sketch(body, true, 0.3 * U, 102); ink(1 * U);
  sketch([[X(0.02), Y(0.08)], [X(-0.12), Y(0.18)], [X(0), Y(0.36)]], true, 0.2 * U, 104); fillInk('#ff8a2a', 0.6 * U);
  sketch([[X(-0.2), Y(-0.28)], [X(-0.05), Y(-0.36)], [X(0.12), Y(-0.33)]], false, 0.1 * U, 105);
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 0.8 * U; ctx.stroke();
  ctx.beginPath(); ctx.arc(X(-0.26), Y(-0.1), 2.6 * U, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ink(0.6 * U);
  ctx.beginPath(); ctx.arc(X(-0.28), Y(-0.08), 1.4 * U, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
  sketch(ellPts(X(-0.42), Y(0.1), 1.8 * U, 2.2 * U, 12), true, 0.12 * U, 106); fillInk('#5a2230', 0.6 * U);
  ctx.restore();
  const c = Math.cos(rot), s = Math.sin(rot), lx = X(-0.42) * fs, ly = Y(0.05) * fs;
  return [x + lx * c - ly * s, y + lx * s + ly * c];
}

// sheets of water pulled up off the surface with the fish
function drawWaterColumn(fx, fy) {
  const base = L.surf;
  const k = L.FS;
  for (const [ox, wd, hgt, ph] of [[-7, 3, 0.35, 0], [0, 5, 0.5, 1.3], [7, 3, 0.3, 2.1]]) {
    const top = lerp(base, fy + 4 * U, hgt) + Math.sin(t * 11 + ph) * 1.2 * U;
    const x = fx + ox * U * 0.9 * k;
    const pts = [[x - wd * U * k, base], [x - wd * 0.35 * U * k + Math.sin(t * 9 + ph) * U, (base + top) / 2], [x, top], [x + wd * 0.35 * U * k + Math.sin(t * 8 + ph) * U, (base + top) / 2], [x + wd * U * k, base]];
    ctx.save(); ctx.shadowColor = 'rgba(200,240,255,.9)'; ctx.shadowBlur = 2 * U;
    sketch(pts, true, 0.2 * U, 120 + ox); ctx.fillStyle = 'rgba(225,245,255,.85)'; ctx.fill(); ctx.restore();
    sketch(pts, true, 0.2 * U, 120 + ox); ink(0.45 * U, 0.8);
  }
}

function drawSplashes() {
  const x = L.fishX, y = L.surf, k = L.FS;
  // two layers of crown: a tall back wall and a shorter front lip
  for (const [w, hMin, hMax, seed, alpha] of [[20 * U * k, 3.5 * k, 8 * k, 110, 0.9], [24 * U * k, 2 * k, 4.5 * k, 111, 0.97]]) {
    const pts = [[x - w, y]];
    for (let i = 0; i <= 14; i++) {
      const fx = -w + 2 * w * i / 14;
      const edge = 1 - Math.abs(fx / w) * 0.55;
      const tall = i % 2 ? (hMin + (hMax - hMin) * Math.abs(Math.sin(t * 8 + i * 1.3))) * U * edge : 1.4 * U;
      pts.push([x + fx * (0.85 + (i % 2) * 0.12), y - tall]);
    }
    pts.push([x + w, y]);
    ctx.save(); ctx.shadowColor = 'rgba(200,240,255,.95)'; ctx.shadowBlur = 3 * U;
    sketch(pts, true, 0.2 * U, seed); ctx.fillStyle = `rgba(225,245,255,${alpha})`; ctx.fill(); ctx.restore();
    sketch(pts, true, 0.2 * U, seed); ink(0.6 * U);
  }
  // foam ring
  ctx.beginPath(); ctx.ellipse(x, y + 0.6 * U, 30 * U * k, 2.6 * U * k, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1 * U; ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + t * 0.5;
    ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 27 * U * k, y + 0.6 * U + Math.sin(a) * 2.3 * U * k, 2.2 * U, 0.8 * U, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
  }
  // soft spray mist
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const m of mist) {
    const a = clamp(m.life / m.max, 0, 1) * 0.35;
    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
    g.addColorStop(0, `rgba(235,248,255,${a})`); g.addColorStop(1, 'rgba(235,248,255,0)');
    ctx.fillStyle = g; ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
  }
  ctx.restore();
}
function drawDrops() {
  for (const d of drops) {
    ctx.globalAlpha = clamp(d.life * 2, 0, 1);
    const sp = Math.hypot(d.vx, d.vy), st = clamp(sp / (60 * U), 1, 1.8);
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(Math.atan2(d.vy, d.vx)); ctx.scale(st, 1);
    ctx.beginPath(); ctx.arc(0, 0, d.r, 0, Math.PI * 2);
    ctx.fillStyle = d.glow ? '#ffffff' : '#a8dcff'; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * st, d.r, Math.atan2(d.vy, d.vx), 0, Math.PI * 2);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.35 * U; ctx.stroke();
    if (d.r > 1.1 * U) { ctx.beginPath(); ctx.arc(d.x - d.r * 0.35, d.y - d.r * 0.35, d.r * 0.3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}

function spawnLens(initial) {
  const max = rand(2.5, 5);
  lens.push({
    // mostly on the splash side; on the left only low down, so the cube's face stays clear
    ...(Math.random() < 0.75 ? { x: rand(W * 0.5, W), y: rand(-0.05, 0.95) * H } : { x: rand(0, W * 0.5), y: rand(0.72, 0.98) * H }),
    r: rand(1.8, 6) * U, life: initial ? rand(0.6, max) : max, max, vy: rand(0.3, 2.5) * U, trail: 0,
  });
}
function drawLensWater() {
  // out-of-focus spray flying right past the camera
  for (const f of fg) {
    const a = clamp(f.life / 0.4, 0, 1) * 0.5;
    const g = ctx.createRadialGradient(f.x - f.r * 0.3, f.y - f.r * 0.3, 0, f.x, f.y, f.r);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.7, `rgba(200,232,255,${a * 0.6})`); g.addColorStop(1, 'rgba(200,232,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
  }
  // drops stuck on the lens are turned off (lens stays empty); kept for easy re-enabling
  for (const d of lens) {
    const a = clamp(Math.min(d.life, d.max - d.life) / 0.3, 0, 1);
    if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha = a;
    const tr = Math.min(d.trail, 12 * U);
    if (tr > d.r * 0.5) {
      const g = ctx.createLinearGradient(d.x, d.y - tr, d.x, d.y);
      g.addColorStop(0, 'rgba(220,240,255,0)'); g.addColorStop(1, 'rgba(220,240,255,0.3)');
      ctx.fillStyle = g; ctx.fillRect(d.x - d.r * 0.35, d.y - tr, d.r * 0.7, tr);
    }
    ctx.save();
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 1.08, 0, 0, Math.PI * 2); ctx.clip();
    const s = d.r * 2 * 1.6 * DPR;
    try {
      ctx.translate(d.x, d.y); ctx.scale(-1, -1);
      ctx.drawImage(cv, d.x * DPR - s / 2, d.y * DPR - s / 2, s, s, -d.r, -d.r * 1.08, d.r * 2, d.r * 2.16);
    } catch (e) { /* source outside the canvas */ }
    ctx.restore();
    const g = ctx.createRadialGradient(d.x, d.y + d.r * 0.2, d.r * 0.1, d.x, d.y, d.r);
    g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(0.7, 'rgba(160,210,240,0.15)'); g.addColorStop(1, 'rgba(30,70,120,0.45)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 1.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 0.35 * U;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 0.72, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(d.x - d.r * 0.35, d.y - d.r * 0.42, d.r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(27,27,27,.35)'; ctx.lineWidth = 0.25 * U;
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 1.08, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawMotes() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const m of motes) {
    const x = m.x * W + Math.sin(t * 0.7 + m.ph) * 2 * U, y = ((m.y - t * m.v) % 1 + 1) % 1 * H;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + m.ph)), r = (0.8 + m.s) * U;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
    g.addColorStop(0, `rgba(255,240,190,${0.8 * tw})`); g.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r * 2.5, y - r * 2.5, r * 5, r * 5);
  }
  ctx.restore();
}

function drawText(intro) {
  // small game name in the top-left corner
  const ti = clamp((t - 0.5) / 0.7, 0, 1);
  if (ti > 0) {
    const size = clamp(4.5 * U, 18, 32);
    const x = Math.max(16, 3 * U), y = Math.max(16, 3 * U) + size * 0.55 - (1 - easeOutBack(ti)) * size * 1.5;
    ctx.save();
    ctx.globalAlpha = clamp(ti * 2, 0, 1);
    ctx.font = `${size}px ${HAND}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.translate(x, y); ctx.rotate(-0.03);
    ctx.shadowColor = 'rgba(255,200,90,.9)'; ctx.shadowBlur = 3 * U;
    ctx.strokeStyle = INK; ctx.lineWidth = size * 0.16; ctx.strokeText('SellingSelling', 0, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.fillText('SellingSelling', 0, 0);
    ctx.restore();
  }
  // tap to start
  const ta = clamp((t - 1.6) / 0.6, 0, 1);
  if (ta > 0 && !closing) {
    const a = ta * (0.6 + 0.4 * Math.sin(t * 4));
    const size = Math.min(6 * U, 30);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `${size}px ${HAND}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,255,255,1)'; ctx.shadowBlur = 3 * U;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = size * 0.16; ctx.lineJoin = 'round';
    const y = H - Math.max(7 * U, 36);
    ctx.strokeText('Tap anywhere to start', W / 2, y); ctx.fillText('Tap anywhere to start', W / 2, y);
    ctx.restore();
  }
  // shine-in: white flash fading out plus a light sweep
  if (intro < 1) {
    ctx.fillStyle = `rgba(255,255,255,${1 - easeOutCubic(intro)})`; ctx.fillRect(0, 0, W, H);
  }
  const sw = clamp((t - 0.3) / 1.1, 0, 1);
  if (sw > 0 && sw < 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const cx = lerp(-W * 0.3, W * 1.3, sw);
    const g = ctx.createLinearGradient(cx - 18 * U, 0, cx + 18 * U, 0);
    g.addColorStop(0, 'rgba(255,245,210,0)'); g.addColorStop(0.5, 'rgba(255,245,210,.45)'); g.addColorStop(1, 'rgba(255,245,210,0)');
    ctx.translate(cx, H / 2); ctx.transform(1, 0, -0.35, 1, 0, 0); ctx.translate(-cx, -H / 2);
    ctx.fillStyle = g; ctx.fillRect(cx - 18 * U, -H * 0.2, 36 * U, H * 1.4);
    ctx.restore();
  }
}

// ---------- update + render ----------
function update(dt) {
  t += dt; boil = 3; // lines hold still: frozen frame
  // a few small, low splashes of water from the surface and off the fish
  if (Math.random() < 0.35) {
    const fromFish = Math.random() < 0.2;
    const x = fromFish ? L.fishX + rand(-12, 12) * U * L.FS : L.fishX + rand(-20, 20) * U * L.FS;
    const y = fromFish ? L.surf - rand(10, 26) * U : L.surf - U;
    const a = -Math.PI / 2 + rand(-1.2, 1.2), sp = rand(18, 40) * U;
    drops.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(0.5, 1.5) * U, life: rand(0.6, 1.1), y0: L.surf, glow: Math.random() < 0.3 });
  }
  if (Math.random() < 0.12) mist.push({ x: L.fishX + rand(-24, 24) * U, y: L.surf - rand(0, 14) * U, r: rand(5, 11) * U, life: 1.2, max: 1.2, vy: -rand(3, 8) * U });
  for (const d of drops) {
    d.vy += 90 * U * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt;
    if (d.vy > 0 && d.y > d.y0 && d.y0 < H) { d.life = 0; if (Math.random() < 0.3) ripples.push({ x: d.x, y: d.y, t: 0, max: 4 * U }); }
  }
  drops = drops.filter(d => d.life > 0 && d.y < H + 20);
  for (const m of mist) { m.life -= dt; m.y += m.vy * dt; m.r += 4 * U * dt; }
  mist = mist.filter(m => m.life > 0);
  if (t > nextRipple) { ripples.push({ x: L.fishX, y: L.surf + U, t: 0, max: 36 * U * L.FS }); nextRipple = t + 0.5; }
  for (const r of ripples) r.t += dt;
  ripples = ripples.filter(r => r.t < 1.4);

  // lens drops slide down slowly; new ones keep landing from the splash
  for (const d of lens) { d.life -= dt; const m = d.vy * dt * (d.r / (4 * U)); d.y += m; d.trail += m; }
  lens = lens.filter(d => d.life > 0);
  if (t > nextFg) {
    fg.push({ x: rand(W * 0.6, W * 1.05), y: H + 5 * U, vx: -rand(15, 40) * U, vy: -rand(35, 60) * U, r: rand(3, 8) * U, life: 1.4 });
    nextFg = t + rand(0.5, 1.1);
  }
  for (const f of fg) { f.vy += 60 * U * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt; }
  fg = fg.filter(f => f.life > 0);
}

// The scene is a frozen frame: everything is drawn at one fixed moment,
// and only the water particles (drops, ripples, lens water) keep moving.
const FREEZE = 0.8;
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const realT = t;
  t = FREEZE;
  drawSky();
  drawWater();
  drawSplashes();
  drawDock();
  drawRodAndFish();
  drawCube();
  t = realT;
  drawDrops();
  drawMotes();

  // bloom: blurred, high-contrast copy screened back over the scene
  try {
    bctx.globalCompositeOperation = 'copy';
    bctx.filter = 'contrast(2.2) brightness(1.15) blur(3px)';
    bctx.drawImage(cv, 0, 0, bloom.width, bloom.height);
    bctx.filter = 'none';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.24;
    ctx.drawImage(bloom, 0, 0, cv.width, cv.height);
    ctx.restore();
  } catch (e) { /* no filter support: skip bloom */ }

  // soft warm vignette
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, Math.max(W, H) * 0.8);
  vg.addColorStop(0, 'rgba(90,50,0,0)'); vg.addColorStop(1, 'rgba(90,50,0,0.22)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  drawLensWater();
  drawText(clamp(t / 1.2, 0, 1));
}

function frame(now) {
  if (!open) return;
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); render();
  requestAnimationFrame(frame);
}

// ---------- start / close ----------
const openedAt = performance.now();
function start() {
  if (closing || performance.now() - openedAt < 400) return;
  closing = true;
  root.classList.add('out');
  setTimeout(() => { open = false; root.remove(); }, 1000);
}
root.addEventListener('click', start);
window.addEventListener('keydown', e => {
  if (!open) return;
  e.stopImmediatePropagation(); e.preventDefault();
  start();
}, true);
window.addEventListener('resize', () => { if (open) resize(); });

// Pre-draw all item art while the title screen is up, so the game never hitches later
(function prewarm() {
  if (!window.ItemArt || !window.GAME_DATA) return;
  const jobs = [];
  for (const it of [...GAME_DATA.ITEMS, ...GAME_DATA.BAITS]) for (let f = 0; f < ItemArt.FRAMES; f++) jobs.push([it.id, f]);
  (function step() {
    for (let i = 0; i < 3 && jobs.length; i++) { const [id, f] = jobs.shift(); ItemArt.url(id, f); }
    if (jobs.length) setTimeout(step, 16);
  })();
})();

resize();
requestAnimationFrame(frame);
})();
