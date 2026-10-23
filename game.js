(() => {
'use strict';

const { RARITIES, ITEMS, RODS, BAITS, LUCK_POWER } = window.GAME_DATA;
const byId = arr => Object.fromEntries(arr.map(o => [o.id, o]));
const ITEM = byId(ITEMS), ROD = byId(RODS), BAIT = byId(BAITS);
const INK = '#1b1b1b';
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const HAND_FONT = '"Patrick Hand", "Comic Sans MS", cursive';

// ============================================================
//  Save data
// ============================================================
const SAVE_KEY = 'lucky-pond-save-v1';
const freshState = () => ({
  money: 0, inventory: {}, ownedRods: [RODS[0].id], rod: RODS[0].id,
  baits: {}, bait: null, discovered: {}, caught: 0,
});
function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = Object.assign(freshState(), JSON.parse(raw));
      if (!ROD[s.rod]) s.rod = RODS[0].id;
      if (s.bait && !BAIT[s.bait]) s.bait = null;
      return s;
    }
  } catch (e) { /* storage unavailable */ }
  return freshState();
}
let S = loadState();
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

// ============================================================
//  Helpers
// ============================================================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, t, k) => v + (t - v) * Math.min(1, k);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const rand = (a, b) => a + Math.random() * (b - a);
const fmt = n => Math.floor(n).toLocaleString();
const article = name => /^[aeiou]/i.test(name) ? 'an' : 'a';
const COIN = () => ItemArt.html('fishcoin', '🪙', 'coin-ic'); // hand-drawn fish coin
function mulberry(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function currentLuck() {
  const b = S.bait && BAIT[S.bait];
  return ROD[S.rod].luck + (b ? b.luck : 0);
}
function rarityOdds() {
  const luck = currentLuck();
  const w = RARITIES.map((r, i) => r.weight * Math.pow(1 + luck, i * LUCK_POWER));
  const total = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / total);
}
function rollItem() {
  const odds = rarityOdds();
  let x = Math.random(), ri = 0;
  for (; ri < odds.length - 1; ri++) { x -= odds[ri]; if (x < 0) break; }
  const pool = ITEMS.filter(it => it.rarity === ri);
  return pool[Math.floor(Math.random() * pool.length)];
}
const invCount = () => Object.values(S.inventory).reduce((a, b) => a + b, 0);

// ============================================================
//  Canvas + hand-drawn line helpers
// ============================================================
const cv = document.getElementById('world');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, K = 1;
const L = {};
let decor = null;
let time = 0, boil = 0;

// Noise that changes ~7 times a second -> "boiling" hand-drawn lines
function nz(i) { const x = Math.sin(i * 127.1 + boil * 311.7) * 43758.5453; return x - Math.floor(x) - 0.5; }

function sketch(c, pts, closed, amp, seed) {
  amp = amp == null ? 1.2 * K : amp;
  let k = (seed || 0) * 97;
  const n = pts.length, segs = closed ? n : n - 1;
  c.beginPath();
  for (let s = 0; s < segs; s++) {
    const a = pts[s], b = pts[(s + 1) % n];
    const steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / (14 * K)));
    for (let j = s === 0 ? 0 : 1; j <= steps; j++) {
      const t = j / steps;
      const x = a[0] + (b[0] - a[0]) * t + nz(k++) * amp * 2;
      const y = a[1] + (b[1] - a[1]) * t + nz(k++) * amp * 2;
      if (s === 0 && j === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
  }
  if (closed) c.closePath();
}
function ellipsePts(cx, cy, rx, ry, n = 36, bump = 0, bumpN = 0, phase = 0) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, r = 1 + bump * Math.sin(a * bumpN + phase);
    p.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return p;
}
function rectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
function ink(c, w, alpha = 1) {
  c.strokeStyle = INK; c.globalAlpha = alpha; c.lineWidth = w;
  c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); c.globalAlpha = 1;
}
function fillInk(c, fill, w) { c.fillStyle = fill; c.fill(); ink(c, w); }

// ============================================================
//  Layout: dock on the left, pond lower and to the right of it
// ============================================================
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  K = clamp(Math.min(W / 1100, H / 720), 0.6, 1.35);
  layout();
  camTarget = clampCam(camTarget); cam = clampCam(cam);
}
function layout() {
  const usable = H - 106; // space above the hotbar
  L.groundY = usable * 0.4;
  L.dockX0 = W * 0.02;
  L.deckY = L.groundY + (usable - L.groundY) * 0.3;

  // Pond sits lower, just right of the dock; the dock's end hangs over the water
  const left = Math.max(W * 0.18, 60 * K);
  const top = L.deckY - 6 * K, bottom = usable - 6 * K;
  const rx = Math.max((W * 0.97 - left) / 2, 130 * K);
  L.pond = { cx: left + rx, cy: (top + bottom) / 2, rx, ry: Math.max((bottom - top) / 2, 50 * K) };
  L.dockX1 = left + rx * 0.4;

  L.cubeS = 62 * K;
  L.cubeX = L.dockX1 - 44 * K;
  L.rodLen = 120 * K;

  L.shopX = -Math.max(W * 0.5, 300 * K);
  L.shopBase = L.groundY + 75 * K;
  L.minCam = L.shopX - W / 2 - 80 * K;
  L.worldL = L.minCam - 120; L.worldR = W + 120;
  buildDecor();
}
const clampCam = v => clamp(v, L.minCam || -1000, 0);
function insidePond(x, y, f = 1) {
  const P = L.pond; const dx = (x - P.cx) / P.rx, dy = (y - P.cy) / P.ry;
  return dx * dx + dy * dy < f * f;
}

function buildDecor() {
  const r = mulberry(1234);
  const P = L.pond;
  decor = { tufts: [], flowers: [], trees: [], reeds: [], pads: [], waves: [], fish: [], ground: [] };
  for (let x = L.worldL; x <= L.worldR + 60 * K; x += 60 * K) decor.ground.push([x, L.groundY + (r() - .5) * 6 * K]);

  const bottom = H - 20;
  for (let x = L.worldL; x < L.worldR; x += (14 + r() * 26) * K) {
    const y = L.groundY + 8 * K + r() * (bottom - L.groundY);
    if (insidePond(x, y, 1.12)) continue;
    if (Math.abs(x - L.shopX) < 150 * K && y < L.shopBase + 12 * K) continue;
    if (x > L.dockX0 - 10 && x < L.dockX1 + 20 * K && y > L.deckY - 16 * K && y < L.deckY + 40 * K) continue;
    decor.tufts.push({ x, y, s: (0.7 + r() * 0.6) * K, ph: r() * 6 });
    if (r() < 0.22) decor.flowers.push({ x: x + r() * 20 * K, y: y + 4 * K, c: ['#ff8fab', '#ffd166', '#ffffff', '#b28dff'][Math.floor(r() * 4)], ph: r() * 6, s: K });
  }
  decor.tufts.sort((a, b) => a.y - b.y);

  const treeXs = [L.shopX - 250 * K, L.shopX + 210 * K, L.shopX + 330 * K, -170 * K, L.shopX - 420 * K];
  for (const tx of treeXs) decor.trees.push({ x: tx, y: L.groundY + (20 + r() * 25) * K, s: (0.85 + r() * 0.35) * K, ph: r() * 6 });
  decor.trees.sort((a, b) => a.y - b.y);

  // Reeds around the pond edge
  for (const a of [-2.75, -2.55, -0.45, -0.3, -0.62, 2.6, 0.5]) {
    const n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const aa = a + (r() - .5) * 0.12;
      decor.reeds.push({ x: P.cx + Math.cos(aa) * P.rx * 0.98, y: P.cy + Math.sin(aa) * P.ry * 0.98, h: (30 + r() * 26) * K, ph: r() * 6 });
    }
  }
  decor.reeds = decor.reeds.filter(rd => rd.x < W + 40);
  decor.reeds.sort((a, b) => a.y - b.y);

  for (let i = 0; i < 4; i++) {
    const a = rand(0, Math.PI * 2), d = 0.55 + r() * 0.3;
    decor.pads.push({ x: P.cx + P.rx * 0.25 + Math.cos(a) * P.rx * d * 0.6, y: P.cy + Math.sin(a) * P.ry * d * 0.7, s: (0.8 + r() * 0.5) * K, rot: r() * 6, flower: r() < 0.5, ph: r() * 6 });
  }
  decor.pads = decor.pads.filter(p => insidePond(p.x, p.y, 0.85));

  for (let i = 0; i < 18; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.85;
    decor.waves.push({ x: P.cx + Math.cos(a) * P.rx * d, y: P.cy + Math.sin(a) * P.ry * d, ph: r() * 6, s: (0.7 + r() * 0.6) * K });
  }
  for (let i = 0; i < 3; i++) decor.fish.push({ ph: r() * 6, v: 0.15 + r() * 0.2, rx: 0.3 + r() * 0.4, ry: 0.2 + r() * 0.4, s: (0.7 + r() * 0.6) * K });

  decor.clouds = [{ x: .15, y: .35, s: 1.1, v: 9, ph: 1 }, { x: .55, y: .2, s: .8, v: 6, ph: 2 }, { x: .85, y: .5, s: 1, v: 11, ph: 3 }, { x: 1.2, y: .28, s: .7, v: 7, ph: 4 }];
}

// ============================================================
//  Game state (fishing state machine)
// ============================================================
const F = { state: 'idle', t: 0, angle: -1.05, bend: 0.02, aStart: 0, bob: { x: 0, y: 0 }, from: null, target: null, reelFrom: null, wait: 0, nextNibble: 0, item: null, fly: null, ranOut: null, reelSpin: 0 };
const C = { tilt: 0, sx: 1, sy: 1, hop: 0, blinkT: 2, blink: 0, poke: 0 };
let particles = [], ripples = [], crowns = [];
let cam = 0, camTarget = 0;
let modalOpen = null, revealOpen = false, revealAt = 0, pendingStash = 0;
let shopHover = false, cubeHover = false;

function go(s) { F.state = s; F.t = 0; }

function rodPoint(px, py, ang, len, bend, u) {
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  return [px + dx * len * u + nx * bend * len * u * u, py + dy * len * u + ny * bend * len * u * u];
}
function rodPivot() {
  const s = L.cubeS, lx = s * 0.4 * C.sx, ly = -s * 0.42 * C.sy;
  const c = Math.cos(C.tilt), sn = Math.sin(C.tilt);
  return [L.cubeX + lx * c - ly * sn, L.deckY - 3 * K - C.hop + lx * sn + ly * c];
}
function rodTip() { const [px, py] = rodPivot(); return rodPoint(px, py, F.angle, L.rodLen, F.bend, 1); }

function startFishing() {
  if (F.state !== 'idle' || modalOpen || revealOpen) { C.poke = 0.25; return; }
  F.item = rollItem(); // roll with current luck (before bait is used up)
  F.ranOut = null;
  F.baitSpeed = S.bait ? (BAIT[S.bait].speed || 1) : 1;
  if (S.bait) {
    S.baits[S.bait] = (S.baits[S.bait] || 0) - 1;
    if (S.baits[S.bait] <= 0) { delete S.baits[S.bait]; F.ranOut = BAIT[S.bait].name; S.bait = null; }
    save(); refreshHUD();
  }
  const P = L.pond;
  let tx, ty, tries = 0;
  do {
    tx = rand(Math.max(L.cubeX + 150 * K, P.cx - P.rx * 0.45), Math.min(P.cx + P.rx * 0.65, W - 40));
    ty = P.cy + rand(-0.45, 0.45) * P.ry;
    tries++;
  } while (!insidePond(tx, ty, 0.82) && tries < 40);
  F.target = [tx, ty];
  F.wait = rand(1.4, 3.2) * ROD[S.rod].speed * (F.baitSpeed || 1);
  F.aStart = F.angle;
  go('windup');
}

function splash(x, y, p) {
  const n = Math.round(10 + 16 * p);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + rand(-1.1, 1.1), sp = rand(120, 320) * p * K;
    particles.push({ x, y, vx: Math.cos(a) * sp * 0.8, vy: Math.sin(a) * sp, life: rand(.5, .9), r: rand(2, 4.5) * K * (0.7 + p * 0.4), y0: y });
  }
  crowns.push({ x, y, t: 0, s: (18 + 24 * p) * K });
  ripple(x, y, (40 + 50 * p) * K);
  ripple(x, y, (24 + 30 * p) * K, 0.15);
}
function ripple(x, y, max, delay = 0) { ripples.push({ x, y, t: -delay, dur: 1.1, max }); }

// ============================================================
//  Update
// ============================================================
let shownMoney = S.money;
function update(dt) {
  time += dt; boil = Math.floor(time * 7);
  cam += (camTarget - cam) * Math.min(1, dt * 9);
  F.t += dt;

  let tTilt = 0, tsx = 1, tsy = 1, tBend = 0.02, tHop = 0;
  switch (F.state) {
    case 'idle':
    case 'cooldown': {
      F.angle = approach(F.angle, -1.05 + Math.sin(time * 1.7) * 0.04, dt * 5);
      const br = Math.sin(time * 2.2) * 0.02; tsx = 1 + br; tsy = 1 - br;
      if (cubeHover && F.state === 'idle') { tsx += 0.03; tsy -= 0.03; }
      break;
    }
    case 'windup': {
      // small lift (no backswing): the rod never swings behind the cube
      const u = clamp(F.t / 0.18, 0, 1);
      F.angle = lerp(F.aStart, -1.25, easeInOut(u));
      tTilt = -0.06; tsx = 1.05; tsy = 0.95; tBend = 0;
      if (u >= 1) go('cast');
      break;
    }
    case 'cast': {
      const u = clamp(F.t / 0.22, 0, 1);
      F.angle = lerp(-1.25, -0.5, easeInOut(u));
      tTilt = 0.15; tsx = 0.93; tsy = 1.08; tBend = 0.14;
      // launch from wherever the swinging bobber is right now, so it never jumps
      if (u >= 1) { F.from = [F.dangle.x, F.dangle.y]; go('flying'); }
      break;
    }
    case 'flying': {
      const u = clamp(F.t / 0.6, 0, 1);
      const [x0, y0] = F.from, [x1, y1] = F.target;
      F.bob.x = lerp(x0, x1, u);
      F.bob.y = lerp(y0, y1, u) - Math.sin(Math.PI * u) * 80 * K;
      tTilt = 0.06; tBend = 0.03;
      if (u >= 1) { splash(x1, y1, 0.45); go('waiting'); F.nextNibble = 0.7; }
      break;
    }
    case 'waiting': {
      F.bob.x = F.target[0]; F.bob.y = F.target[1] + Math.sin(time * 3) * 1.6 * K;
      F.angle = approach(F.angle, -0.55 + Math.sin(time * 1.3) * 0.03, dt * 4);
      tBend = 0.06;
      if (F.t > F.nextNibble) { ripple(F.bob.x, F.bob.y, 22 * K); F.nextNibble += rand(0.7, 1.3); }
      if (F.t >= F.wait) { go('bite'); ripple(F.bob.x, F.bob.y, 34 * K); }
      break;
    }
    case 'bite': {
      const dip = Math.min(1, F.t / 0.12) * 7 * K + Math.sin(F.t * 45) * 2.5 * K;
      F.bob.x = F.target[0] + Math.sin(F.t * 30) * 2 * K;
      F.bob.y = F.target[1] + dip;
      F.angle = -0.5 + Math.sin(F.t * 40) * 0.03;
      tBend = 0.22 + Math.sin(F.t * 38) * 0.07;
      tTilt = Math.sin(F.t * 50) * 0.05;
      if (F.t >= 0.55) {
        splash(F.bob.x, F.bob.y, 1.3);
        F.reelFrom = [F.bob.x, F.bob.y];
        F.fly = { x0: F.bob.x - cam, y0: F.bob.y, t: 0 };
        go('reel');
      }
      break;
    }
    case 'reel': {
      const u = clamp(F.t / 0.38, 0, 1);
      // smooth pull back that stops where the lift pose starts (no overshoot / snap back)
      F.angle = lerp(-0.5, -1.5, easeOutCubic(u));
      tTilt = -0.2; tsx = 0.92; tsy = 1.1; tBend = lerp(0.32, -0.06, u);
      F.reelSpin += dt * 30;
      const tp = rodTip();
      F.bob.x = lerp(F.reelFrom[0], tp[0], easeOutCubic(u));
      F.bob.y = lerp(F.reelFrom[1], tp[1] + 24 * K, easeOutCubic(u)) - Math.sin(Math.PI * u) * 60 * K;
      if (u >= 1) go('lift');
      break;
    }
    case 'lift':
      F.angle = approach(F.angle, -1.45, dt * 3); tTilt = -0.06; tHop = Math.abs(Math.sin(F.t * 9)) * 8 * K;
      break;
    case 'reveal':
      F.angle = approach(F.angle, -1.3, dt * 4); tHop = Math.abs(Math.sin(time * 7)) * 7 * K;
      break;
  }
  if (F.fly) {
    F.fly.t += dt;
    if (F.fly.t >= 0.8 && F.state !== 'reveal') { F.fly = null; showReveal(F.item); go('reveal'); }
  }
  if (C.poke > 0) { C.poke -= dt; tsx += Math.sin(C.poke * 40) * 0.05; tsy -= Math.sin(C.poke * 40) * 0.05; }

  // The bobber hanging off the tip eases toward its spot under the tip (a short,
  // tight follow, never a loose swing); while flying or in the water it follows F.bob.
  const tipNow = rodTip(), ropeLen = 24 * K;
  const D = F.dangle || (F.dangle = { x: tipNow[0], y: tipNow[1] + ropeLen });
  if (['flying', 'waiting', 'bite', 'reel'].includes(F.state)) {
    D.x = F.bob.x; D.y = F.bob.y;
  } else {
    const k = Math.min(1, dt * 22);
    D.x += (tipNow[0] + Math.sin(time * 2) * 2 * K - D.x) * k;
    D.y += (tipNow[1] + ropeLen - D.y) * k;
  }
  const sagTarget = F.state === 'waiting' ? 26 * K : F.state === 'flying' ? 14 * K : (F.state === 'bite' || F.state === 'reel') ? 0 : 3 * K;
  F.sag = approach(F.sag == null ? sagTarget : F.sag, sagTarget, dt * 10);

  F.bend = approach(F.bend, tBend, dt * 18);
  C.tilt = approach(C.tilt, tTilt, dt * 14);
  C.sx = approach(C.sx, tsx, dt * 16);
  C.sy = approach(C.sy, tsy, dt * 16);
  C.hop = approach(C.hop, tHop, dt * 20);
  C.blinkT -= dt;
  if (C.blinkT <= 0) { C.blink = 0.13; C.blinkT = rand(2, 5); }
  C.blink -= dt;

  const g = 900 * K;
  for (const p of particles) {
    p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.vy > 0 && p.y > p.y0 + 4 * K) { p.life = 0; if (Math.random() < 0.3) ripple(p.x, p.y, 10 * K); }
  }
  particles = particles.filter(p => p.life > 0);
  for (const r of ripples) r.t += dt;
  ripples = ripples.filter(r => r.t < r.dur);
  for (const c of crowns) c.t += dt;
  crowns = crowns.filter(c => c.t < 0.45);

  if (Math.abs(shownMoney - S.money) > 0.5) {
    shownMoney += (S.money - shownMoney) * Math.min(1, dt * 8);
    if (Math.abs(shownMoney - S.money) < 1) shownMoney = S.money;
    setMoneyText(shownMoney);
  }
  const away = cam < -W * 0.3;
  navShop.classList.toggle('hidden', away);
  navDock.classList.toggle('hidden', !away);
}

// ============================================================
//  Drawing
// ============================================================
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  drawSky();

  ctx.save();
  ctx.translate(-cam, 0);
  drawGround();
  for (const t of decor.tufts) drawTuft(t);
  for (const f of decor.flowers) drawFlower(f);
  drawPath();
  for (const t of decor.trees) drawTree(t);
  drawFence();
  drawSignpost();
  drawShop();
  drawPond();
  for (const rd of decor.reeds) drawReed(rd);
  drawDock();
  drawCube();
  drawRodAndLine();
  for (const c of crowns) drawCrown(c);
  drawParticles();
  drawBubbles();
  ctx.restore();

  drawItemFly();
}

function drawSky() {
  // sun
  const sx = W * 0.6 - cam * 0.05, sy = 70 * K;
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(time * 0.15);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, r0 = 34 * K, r1 = (46 + (i % 2) * 8) * K;
    sketch(ctx, [[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r1, Math.sin(a) * r1]], false, 0.8 * K, 600 + i);
    ink(ctx, 2.4 * K, 0.8);
  }
  ctx.restore();
  sketch(ctx, ellipsePts(sx, sy, 26 * K, 26 * K, 22), true, 1 * K, 650);
  fillInk(ctx, '#ffe27a', 2.6 * K);

  // clouds
  for (const c of decor.clouds) {
    const span = W + 400;
    const x = (((c.x * W - cam * 0.25 + time * c.v * K) % span) + span) % span - 200;
    const y = c.y * L.groundY;
    sketch(ctx, ellipsePts(x, y, 62 * K * c.s, 24 * K * c.s, 30, 0.14, 6, c.ph), true, 1 * K, 700 + c.ph * 10);
    ctx.fillStyle = '#fff'; ctx.fill(); ink(ctx, 2.4 * K, 0.75);
  }

  // distant hills (parallax)
  const pts = [];
  for (let sx2 = -60; sx2 <= W + 60; sx2 += 30) {
    const wx = sx2 + cam * 0.5;
    pts.push([sx2, L.groundY - 14 * K - (Math.sin(wx * 0.0035) * 0.5 + 0.5) * 46 * K - Math.sin(wx * 0.011) * 7 * K]);
  }
  pts.push([W + 60, L.groundY + 10], [-60, L.groundY + 10]);
  sketch(ctx, pts, true, 1 * K, 900);
  ctx.fillStyle = '#eef8e6'; ctx.fill(); ink(ctx, 2 * K, 0.35);
}

function drawGround() {
  const pts = decor.ground.slice();
  pts.push([L.worldR + 60 * K, H + 10], [L.worldL, H + 10]);
  sketch(ctx, pts, true, 1.2 * K, 10);
  ctx.fillStyle = '#c9eaa8'; ctx.fill();
  sketch(ctx, decor.ground, false, 1.2 * K, 10); ink(ctx, 3 * K);
}

function drawTuft(t) {
  const sw = Math.sin(time * 2 + t.ph) * 2 * t.s, x = t.x, y = t.y, s = t.s;
  ctx.beginPath();
  ctx.moveTo(x - 5 * s, y); ctx.quadraticCurveTo(x - 6 * s, y - 6 * s, x - 9 * s + sw, y - 11 * s);
  ctx.moveTo(x, y); ctx.quadraticCurveTo(x, y - 8 * s, x + sw, y - 16 * s);
  ctx.moveTo(x + 5 * s, y); ctx.quadraticCurveTo(x + 6 * s, y - 6 * s, x + 10 * s + sw, y - 10 * s);
  ctx.strokeStyle = '#3d8b3a'; ctx.lineWidth = 2 * s; ctx.lineCap = 'round'; ctx.stroke();
}
function drawFlower(f) {
  const sw = Math.sin(time * 2 + f.ph) * 2 * f.s;
  ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x, f.y - 8 * f.s, f.x + sw, f.y - 14 * f.s);
  ctx.strokeStyle = '#3d8b3a'; ctx.lineWidth = 1.8 * f.s; ctx.stroke();
  const cx = f.x + sw, cy = f.y - 15 * f.s;
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + f.ph;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 3.4 * f.s, cy + Math.sin(a) * 3.4 * f.s, 2.6 * f.s, 0, Math.PI * 2);
    ctx.fillStyle = f.c; ctx.fill(); ink(ctx, 1.1 * f.s);
  }
  ctx.beginPath(); ctx.arc(cx, cy, 2 * f.s, 0, Math.PI * 2); ctx.fillStyle = '#f4a300'; ctx.fill();
}
function drawPath() {
  const y0 = L.shopBase - 6 * K, y1 = L.shopBase + 22 * K;
  const xs = L.shopX + 40 * K, xe = L.dockX0 + 30 * K;
  const top = [], bot = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, x = lerp(xs, xe, t), wob = Math.sin(t * 6) * 10 * K;
    const yy = lerp(0, L.deckY - L.shopBase - 6 * K, t * t);
    top.push([x, y0 + wob + yy]); bot.unshift([x, y1 + wob + yy + 6 * K]);
  }
  sketch(ctx, top.concat(bot), true, 1 * K, 40);
  ctx.fillStyle = '#efe0bd'; ctx.fill(); ink(ctx, 1.8 * K, 0.4);
}
function drawTree(t) {
  const s = t.s, sway = Math.sin(time * 1.2 + t.ph) * 3 * K;
  sketch(ctx, [[t.x - 8 * s, t.y], [t.x - 5 * s, t.y - 64 * s], [t.x + 5 * s, t.y - 64 * s], [t.x + 8 * s, t.y]], true, 1 * K, 80 + t.ph * 5);
  fillInk(ctx, '#9a6234', 2.6 * K);
  sketch(ctx, ellipsePts(t.x + sway, t.y - 92 * s, 50 * s, 42 * s, 28, 0.08, 7, t.ph), true, 1.2 * K, 90 + t.ph * 5);
  fillInk(ctx, '#9fdc7c', 3 * K);
  sketch(ctx, [[t.x + sway - 28 * s, t.y - 104 * s], [t.x + sway - 16 * s, t.y - 118 * s], [t.x + sway - 2 * s, t.y - 122 * s]], false, 0.6 * K, 95);
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4 * K; ctx.stroke();
  for (const [ax, ay] of [[-18, -88], [14, -100], [22, -78]]) {
    ctx.beginPath(); ctx.arc(t.x + sway + ax * s, t.y + ay * s, 4 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6b6b'; ctx.fill(); ink(ctx, 1.4 * K);
  }
}
function drawFence() {
  const y = L.groundY + 26 * K, x0 = L.worldL, x1 = L.minCam + 140 * K;
  for (let x = x0; x < x1; x += 34 * K) {
    sketch(ctx, rectPts(x, y - 40 * K, 9 * K, 44 * K), true, 0.8 * K, 120 + x);
    fillInk(ctx, '#fff7e8', 2.2 * K);
  }
  for (const yy of [y - 30 * K, y - 14 * K]) {
    sketch(ctx, rectPts(x0, yy, x1 - x0, 6 * K), true, 0.8 * K, 130 + yy);
    fillInk(ctx, '#fff7e8', 2.2 * K);
  }
}
function drawSignpost() {
  const x = -70 * K, y = L.groundY + 40 * K;
  sketch(ctx, rectPts(x - 4 * K, y - 70 * K, 8 * K, 70 * K), true, 0.8 * K, 140);
  fillInk(ctx, '#9a6234', 2.4 * K);
  const by = y - 66 * K;
  sketch(ctx, [[x - 58 * K, by + 12 * K], [x - 42 * K, by], [x + 40 * K, by], [x + 40 * K, by + 24 * K], [x - 42 * K, by + 24 * K]], true, 0.9 * K, 141);
  fillInk(ctx, '#e9c48d', 2.6 * K);
  ctx.fillStyle = INK; ctx.font = `${18 * K}px ${HAND_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('SHOP', x - 4 * K, by + 13 * K);
}

function drawShop() {
  const x = L.shopX, by = L.shopBase, w = 210 * K, h = 125 * K;
  const sc = shopHover ? 1.04 + Math.sin(time * 8) * 0.01 : 1;
  ctx.save(); ctx.translate(x, by); ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.ellipse(0, 4 * K, w * 0.62, 10 * K, 0, 0, Math.PI * 2); ctx.fill();

  sketch(ctx, rectPts(-w / 2, -h, w, h), true, 1.1 * K, 501);
  fillInk(ctx, '#fbeed3', 3 * K);
  for (let yy = -h + 40 * K; yy < -6 * K; yy += 16 * K) {
    sketch(ctx, [[-w / 2 + 4 * K, yy], [w / 2 - 4 * K, yy]], false, 0.8 * K, 510 + yy);
    ink(ctx, 1.2 * K, 0.18);
  }
  // roof
  sketch(ctx, [[-w / 2 - 18 * K, -h + 2 * K], [0, -h - 80 * K], [w / 2 + 18 * K, -h + 2 * K]], true, 1.2 * K, 502);
  fillInk(ctx, '#e0605a', 3 * K);
  // awning
  const aw = w + 8 * K, ay = -h + 2 * K, ah = 22 * K, n = 7;
  for (let i = 0; i < n; i++) {
    const x0 = -aw / 2 + i * aw / n, x1 = x0 + aw / n;
    sketch(ctx, [[x0, ay], [x1, ay], [x1, ay + ah], [(x0 + x1) / 2, ay + ah + 8 * K], [x0, ay + ah]], true, 0.7 * K, 520 + i);
    fillInk(ctx, i % 2 ? '#ffffff' : '#3fa7d6', 2 * K);
  }
  // sign
  const sw = 110 * K, sh = 34 * K, sy = -h - 40 * K;
  sketch(ctx, rectPts(-sw / 2, sy - sh / 2, sw, sh), true, 1 * K, 530);
  fillInk(ctx, '#fff', 2.6 * K);
  ctx.fillStyle = INK; ctx.font = `${26 * K}px ${HAND_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('SHOP', 0, sy + 1 * K);

  // window with a shopkeeper cube
  const wx = -w / 2 + 20 * K, wy = -h + 42 * K, ww = 74 * K, wh = 52 * K;
  sketch(ctx, rectPts(wx, wy, ww, wh), true, 0.9 * K, 540);
  ctx.fillStyle = '#d6f0ff'; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
  const kb = Math.sin(time * 2.5) * 2 * K, ks = 34 * K, kx = wx + ww / 2, ky = wy + wh + 4 * K + kb;
  sketch(ctx, rectPts(kx - ks / 2, ky - ks, ks, ks), true, 0.8 * K, 545);
  fillInk(ctx, '#fff', 2.4 * K);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(kx - 6 * K, ky - ks * 0.65, 2 * K, 3 * K, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(kx + 6 * K, ky - ks * 0.65, 2 * K, 3 * K, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(kx, ky - ks * 0.45, 6 * K, 0.15 * Math.PI, 0.85 * Math.PI); ink(ctx, 2 * K);
  ctx.restore();
  sketch(ctx, rectPts(wx, wy, ww, wh), true, 0.9 * K, 540); ink(ctx, 2.6 * K);
  sketch(ctx, [[wx + ww / 2, wy], [wx + ww / 2, wy + wh * 0.45]], false, 0.6 * K, 546); ink(ctx, 2 * K);
  sketch(ctx, rectPts(wx - 6 * K, wy + wh, ww + 12 * K, 8 * K), true, 0.6 * K, 547);
  fillInk(ctx, '#9a6234', 2.2 * K);

  // door
  const dx = w / 2 - 64 * K, dw = 44 * K, dh = 74 * K;
  sketch(ctx, rectPts(dx, -dh, dw, dh), true, 0.9 * K, 550);
  fillInk(ctx, '#9a6234', 2.6 * K);
  ctx.beginPath(); ctx.arc(dx + dw - 9 * K, -dh / 2, 3.2 * K, 0, Math.PI * 2); ctx.fillStyle = '#f2c94c'; ctx.fill(); ink(ctx, 1.5 * K);
  sketch(ctx, rectPts(dx + 7 * K, -dh + 10 * K, dw - 14 * K, 14 * K), true, 0.5 * K, 551);
  fillInk(ctx, '#fff', 1.6 * K);
  ctx.fillStyle = '#2e9e3e'; ctx.font = `${11 * K}px ${HAND_FONT}`; ctx.fillText('OPEN', dx + dw / 2, -dh + 17.5 * K);
  ctx.restore();

  if (shopHover) bubble(x, by - h - 110 * K, 'Open shop!');
}

function drawPond() {
  const P = L.pond;
  sketch(ctx, ellipsePts(P.cx, P.cy + 3 * K, P.rx + 10 * K, P.ry + 8 * K, 44), true, 1.2 * K, 300);
  ctx.fillStyle = '#dcc9a0'; ctx.fill(); ink(ctx, 2 * K, 0.5);

  const g = ctx.createLinearGradient(0, P.cy - P.ry, 0, P.cy + P.ry);
  g.addColorStop(0, '#93d5ff'); g.addColorStop(1, '#4fa5e6');
  sketch(ctx, ellipsePts(P.cx, P.cy, P.rx, P.ry, 48, 0.01, 5, time * 0.8), true, 1.2 * K, 301);
  ctx.fillStyle = g; ctx.fill(); ink(ctx, 3 * K);

  ctx.save();
  ctx.beginPath(); ctx.ellipse(P.cx, P.cy, P.rx - 2, P.ry - 2, 0, 0, Math.PI * 2); ctx.clip();
  ctx.beginPath(); ctx.ellipse(P.cx, P.cy - 5 * K, P.rx - 14 * K, P.ry - 12 * K, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 10 * K; ctx.stroke();

  // fish shadows swimming around
  for (const f of decor.fish) {
    const a = time * f.v + f.ph;
    const x = P.cx + Math.cos(a) * P.rx * f.rx, y = P.cy + Math.sin(a * 1.3) * P.ry * f.ry;
    const dir = -Math.sin(a) >= 0 ? 1 : -1;
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * f.s, f.s);
    ctx.fillStyle = 'rgba(20,60,110,.18)';
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
    const wag = Math.sin(time * 8 + f.ph) * 3;
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-24, -6 + wag); ctx.lineTo(-24, 6 + wag); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // wavy lines
  for (const w of decor.waves) {
    const x = w.x + Math.sin(time * 0.9 + w.ph) * 10 * K, y = w.y, s = w.s;
    sketch(ctx, [[x - 12 * s, y], [x - 6 * s, y - 3 * s], [x, y], [x + 6 * s, y - 3 * s], [x + 12 * s, y]], false, 0.5 * K, 320 + w.ph * 10);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.2 * K; ctx.lineCap = 'round'; ctx.stroke();
  }
  // twinkles
  for (let i = 0; i < 6; i++) {
    const tw = (Math.sin(time * 2 + i * 1.7) + 1) / 2;
    if (tw < 0.6) continue;
    const x = P.cx + Math.cos(i * 2.1) * P.rx * 0.6, y = P.cy + Math.sin(i * 1.3) * P.ry * 0.5, r = 4 * K * tw;
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6 * K;
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
  }
  ctx.restore();

  for (const p of decor.pads) {
    const y = p.y + Math.sin(time * 1.5 + p.ph) * 1.2 * K;
    ctx.save(); ctx.translate(p.x, y); ctx.scale(p.s, p.s);
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 7, 0, 0.25, Math.PI * 2 - 0.05); ctx.lineTo(0, 0); ctx.closePath();
    ctx.fillStyle = '#6cc56c'; ctx.fill(); ink(ctx, 2);
    if (p.flower) {
      ctx.beginPath(); ctx.ellipse(-3, -3, 4, 3, 0, 0, Math.PI * 2); ctx.fillStyle = '#ffb3c7'; ctx.fill(); ink(ctx, 1.4);
    }
    ctx.restore();
  }

  for (const r of ripples) {
    if (r.t < 0) continue;
    const u = r.t / r.dur, rad = r.max * easeOutCubic(u);
    ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * 0.35, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${(1 - u) * 0.9})`; ctx.lineWidth = 2.6 * K; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(r.x, r.y + 1.5 * K, rad, rad * 0.35, 0, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.strokeStyle = `rgba(27,27,27,${(1 - u) * 0.35})`; ctx.lineWidth = 1.4 * K; ctx.stroke();
  }
}
function drawReed(rd) {
  const sw = Math.sin(time * 1.6 + rd.ph) * 4 * K;
  const tx = rd.x + sw, ty = rd.y - rd.h;
  ctx.beginPath(); ctx.moveTo(rd.x, rd.y); ctx.quadraticCurveTo(rd.x, rd.y - rd.h * 0.6, tx, ty);
  ctx.strokeStyle = '#3d8b3a'; ctx.lineWidth = 2.4 * K; ctx.lineCap = 'round'; ctx.stroke();
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(sw * 0.02);
  ctx.beginPath(); ctx.ellipse(0, 6 * K, 3.4 * K, 8 * K, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#8a5a30'; ctx.fill(); ink(ctx, 1.6 * K);
  ctx.restore();
}

function drawDock() {
  const x0 = L.dockX0 - 30 * K, x1 = L.dockX1 + 10 * K, y = L.deckY, th = 14 * K;
  for (let x = x1 - 14 * K; x > x0 + 10 * K; x -= 70 * K) {
    const wet = insidePond(x, y + 20 * K, 1.02);
    const ph = wet ? 40 * K : 22 * K;
    sketch(ctx, rectPts(x - 6 * K, y, 12 * K, ph), true, 0.8 * K, 200 + x);
    fillInk(ctx, '#87582e', 2.4 * K);
    if (wet) {
      ctx.beginPath(); ctx.ellipse(x, y + ph - 2 * K, 12 * K, 3.5 * K, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2 * K; ctx.stroke();
    }
  }
  // top surface
  sketch(ctx, rectPts(x0, y - 10 * K, x1 - x0, 10 * K), true, 0.9 * K, 210);
  fillInk(ctx, '#d9a066', 2.6 * K);
  for (let x = x0 + 26 * K; x < x1 - 4 * K; x += 26 * K) {
    sketch(ctx, [[x, y - 9 * K], [x, y - 1 * K]], false, 0.4 * K, 220 + x); ink(ctx, 1.4 * K, 0.5);
  }
  // side
  sketch(ctx, rectPts(x0, y, x1 - x0, th), true, 0.9 * K, 230);
  fillInk(ctx, '#b77a43', 2.8 * K);
  for (let x = x0 + 14 * K; x < x1; x += 52 * K) {
    ctx.beginPath(); ctx.arc(x, y + th / 2, 1.6 * K, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
  }
}

function moodNow() {
  switch (F.state) {
    case 'windup': case 'cast': case 'flying': case 'waiting': return 'focus';
    case 'bite': return 'surprised';
    case 'reel': case 'lift': case 'reveal': return 'excited';
    default: return 'happy';
  }
}
function drawCube() {
  const s = L.cubeS, h = s / 2;
  ctx.fillStyle = 'rgba(0,0,0,.14)';
  ctx.beginPath(); ctx.ellipse(L.cubeX, L.deckY - 4 * K, s * 0.55 * (1 - C.hop / (70 * K)), 4 * K, 0, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(L.cubeX, L.deckY - 4 * K - C.hop);
  ctx.rotate(C.tilt); ctx.scale(C.sx, C.sy);
  const body = [[-h - 1 * K, -s + 1.5 * K], [h + 1.5 * K, -s - 1 * K], [h - 0.5 * K, 0], [-h + 1 * K, 0.5 * K]];
  sketch(ctx, body, true, 1.1 * K, 7);
  ctx.fillStyle = '#fff'; ctx.fill(); ink(ctx, 3.4 * K);
  sketch(ctx, body, true, 1.9 * K, 13); ink(ctx, 1.4 * K, 0.4);
  // overshoot scribbles at corners (messy hand-drawn look)
  sketch(ctx, [[h - 4 * K, -s - 1 * K], [h + 7 * K, -s - 3 * K]], false, 0.5 * K, 21); ink(ctx, 1.8 * K, 0.7);
  sketch(ctx, [[-h - 4 * K, -3 * K], [-h + 1 * K, 5 * K]], false, 0.5 * K, 22); ink(ctx, 1.8 * K, 0.7);
  sketch(ctx, [[h + 3 * K, -s * 0.55], [h + 1 * K, -s * 0.3]], false, 0.5 * K, 23); ink(ctx, 1.4 * K, 0.5);
  drawFace(s);
  ctx.restore();

  if (S.caught === 0 && F.state === 'idle') {
    const by = L.deckY - s - 44 * K + Math.sin(time * 4) * 4 * K;
    ctx.fillStyle = INK; ctx.font = `${22 * K}px ${HAND_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('tap me to fish!', L.cubeX, by);
    sketch(ctx, [[L.cubeX, by + 12 * K], [L.cubeX + 2 * K, by + 28 * K]], false, 0.5 * K, 31); ink(ctx, 2.2 * K);
    sketch(ctx, [[L.cubeX - 5 * K, by + 21 * K], [L.cubeX + 2 * K, by + 29 * K], [L.cubeX + 8 * K, by + 21 * K]], false, 0.5 * K, 32); ink(ctx, 2.2 * K);
  }
}
function drawFace(s) {
  const mood = moodNow(), ey = -s * 0.63, ex = s * 0.17;
  ctx.fillStyle = INK;
  const blink = C.blink > 0 ? 0.15 : 1;
  if (mood === 'excited') {
    for (const d of [-1, 1]) {
      sketch(ctx, [[d * ex - 5 * K, ey + 3 * K], [d * ex, ey - 3 * K], [d * ex + 5 * K, ey + 3 * K]], false, 0.4 * K, 30 + d);
      ink(ctx, 2.8 * K);
    }
    const my = -s * 0.4, mw = s * 0.29, mh = s * 0.19;
    const pts = [[-mw, my]];
    for (let i = 0; i <= 10; i++) { const a = Math.PI * i / 10; pts.push([Math.cos(a) * mw, my + Math.sin(a) * mh]); }
    sketch(ctx, pts, true, 0.5 * K, 35);
    ctx.fillStyle = INK; ctx.fill(); ink(ctx, 2.4 * K);
    ctx.beginPath(); ctx.ellipse(s * 0.04, my + mh * 0.72, mw * 0.45, mh * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ff7a8a'; ctx.fill();
    return;
  }
  const big = mood === 'surprised' ? 1.3 : 1;
  ctx.beginPath(); ctx.ellipse(-ex + nz(40) * 0.6 * K, ey, 3.4 * K * big, 5.2 * K * big * blink, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(ex + nz(41) * 0.6 * K, ey + 1 * K, 3.1 * K * big, 5.6 * K * big * blink, 0.1, 0, Math.PI * 2); ctx.fill();

  if (mood === 'surprised') {
    sketch(ctx, ellipsePts(0, -s * 0.33, s * 0.07, s * 0.09, 14), true, 0.4 * K, 36); ink(ctx, 2.6 * K);
  } else if (mood === 'focus') {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([lerp(-s * 0.2, s * 0.2, t), -s * 0.36 + Math.sin(t * Math.PI) * s * 0.04]); }
    sketch(ctx, pts, false, 0.4 * K, 37); ink(ctx, 2.6 * K);
    ctx.beginPath(); ctx.ellipse(s * 0.17, -s * 0.33, s * 0.045, s * 0.06, 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff7a8a'; ctx.fill(); ink(ctx, 1.6 * K);
  } else {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([lerp(-s * 0.3, s * 0.32, t), -s * 0.4 + Math.sin(t * Math.PI) * s * 0.15 + t * s * 0.02]); }
    sketch(ctx, pts, false, 0.5 * K, 38); ink(ctx, 2.8 * K);
  }
}

// Smooth, non-wobbly fishing rod
function drawRod(c, px, py, ang, len, bend, rod, k, spin) {
  const P = u => rodPoint(px, py, ang, len, bend, u);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const N = 16, u0 = 0.18;
  const base = P(u0), tip = P(1);
  const grad = c.createLinearGradient(base[0], base[1], tip[0], tip[1]);
  grad.addColorStop(0, rod.colors[0]); grad.addColorStop(1, rod.colors[1]);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const width = i => lerp(5.4, 1.6, i / N) * k;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < N; i++) {
      const a = P(u0 + (1 - u0) * i / N), b = P(u0 + (1 - u0) * (i + 1) / N);
      const off = pass === 2 ? -width(i) * 0.22 : 0;
      c.beginPath(); c.moveTo(a[0] + nx * off, a[1] + ny * off); c.lineTo(b[0] + nx * off, b[1] + ny * off);
      if (pass === 0) { c.strokeStyle = INK; c.lineWidth = width(i) + 2.6 * k; }
      else if (pass === 1) { c.strokeStyle = grad; c.lineWidth = width(i); }
      else { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = width(i) * 0.3; }
      c.stroke();
    }
  }
  // grip
  const g0 = P(-0.06), g1 = P(0.2);
  c.beginPath(); c.moveTo(g0[0], g0[1]); c.lineTo(g1[0], g1[1]);
  c.strokeStyle = INK; c.lineWidth = 11 * k; c.stroke();
  c.strokeStyle = rod.grip; c.lineWidth = 8 * k; c.stroke();
  for (let u = -0.03; u < 0.19; u += 0.035) {
    const p = P(u);
    c.beginPath(); c.moveTo(p[0] - nx * 3.6 * k, p[1] - ny * 3.6 * k); c.lineTo(p[0] + nx * 3.6 * k, p[1] + ny * 3.6 * k);
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1.3 * k; c.stroke();
  }
  c.beginPath(); c.arc(g0[0], g0[1], 4.6 * k, 0, Math.PI * 2); c.fillStyle = rod.accent; c.fill();
  c.strokeStyle = INK; c.lineWidth = 2 * k; c.stroke();
  // reel
  const rp = P(0.12), rc = [rp[0] + nx * 10 * k, rp[1] + ny * 10 * k];
  c.beginPath(); c.moveTo(rp[0], rp[1]); c.lineTo(rc[0], rc[1]); c.strokeStyle = INK; c.lineWidth = 3 * k; c.stroke();
  c.beginPath(); c.arc(rc[0], rc[1], 6.8 * k, 0, Math.PI * 2); c.fillStyle = rod.accent; c.fill();
  c.lineWidth = 2 * k; c.stroke();
  c.beginPath(); c.arc(rc[0], rc[1], 3 * k, 0, Math.PI * 2); c.fillStyle = 'rgba(0,0,0,.25)'; c.fill();
  const ha = spin || 0, hx = rc[0] + Math.cos(ha) * 7 * k, hy = rc[1] + Math.sin(ha) * 7 * k;
  c.beginPath(); c.moveTo(rc[0], rc[1]); c.lineTo(hx, hy); c.strokeStyle = INK; c.lineWidth = 2 * k; c.stroke();
  c.beginPath(); c.arc(hx, hy, 2.2 * k, 0, Math.PI * 2); c.fillStyle = INK; c.fill();
  // line guides
  for (const u of [0.42, 0.62, 0.8, 0.94]) {
    const p = P(u);
    c.beginPath(); c.arc(p[0] + nx * 3.2 * k, p[1] + ny * 3.2 * k, 1.8 * k, 0, Math.PI * 2);
    c.strokeStyle = INK; c.lineWidth = 1.3 * k; c.stroke();
  }
  c.beginPath(); c.arc(tip[0], tip[1], 2.2 * k, 0, Math.PI * 2); c.fillStyle = rod.accent; c.fill();
  c.strokeStyle = INK; c.lineWidth = 1.2 * k; c.stroke();
  if (rod.sparkle) {
    for (let i = 0; i < 3; i++) {
      const tw = (Math.sin(time * 3 + i * 2.1) + 1) / 2, p = P(0.35 + i * 0.25), r = 4 * k * tw;
      c.strokeStyle = rod.accent; c.lineWidth = 1.5 * k;
      c.beginPath(); c.moveTo(p[0] - r, p[1]); c.lineTo(p[0] + r, p[1]); c.moveTo(p[0], p[1] - r); c.lineTo(p[0], p[1] + r); c.stroke();
    }
  }
  return tip;
}

function drawRodAndLine() {
  const [px, py] = rodPivot();
  const tip = drawRod(ctx, px, py, F.angle, L.rodLen, F.bend, ROD[S.rod], K, F.reelSpin);
  // little nub "hand"
  ctx.beginPath(); ctx.arc(px, py, 6 * K, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ink(ctx, 2.6 * K);

  const inWater = F.state === 'waiting' || F.state === 'bite';
  const flying = F.state === 'flying' || F.state === 'reel';
  let bx, by;
  if (inWater || flying || !F.dangle) { bx = F.bob.x; by = F.bob.y; }
  else { bx = F.dangle.x; by = F.dangle.y; }

  const sag = F.sag || 0;
  ctx.beginPath(); ctx.moveTo(tip[0], tip[1]);
  ctx.quadraticCurveTo((tip[0] + bx) / 2, (tip[1] + by) / 2 + sag, bx, by);
  ctx.strokeStyle = 'rgba(27,27,27,.75)'; ctx.lineWidth = 1.3 * K; ctx.stroke();

  const r = 6.5 * K;
  if (inWater) {
    ctx.beginPath(); ctx.ellipse(bx, by + 1 * K, r * 1.8, r * 0.6, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2 * K; ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, r, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = '#ff4d4d'; ctx.fill(); ink(ctx, 2 * K);
  } else {
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, r, Math.PI, 0); ctx.fillStyle = '#ff4d4d'; ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ink(ctx, 2 * K);
  }
  ctx.beginPath(); ctx.moveTo(bx, by - r); ctx.lineTo(bx, by - r - 4 * K); ink(ctx, 2 * K);
}

function drawCrown(c) {
  const u = c.t / 0.45, h = c.s * Math.sin(Math.PI * u) * 1.1, w = c.s * (0.6 + u * 0.6);
  const pts = [[c.x - w, c.y]];
  const n = 7;
  for (let i = 0; i <= n * 2; i++) {
    const fx = -w + (2 * w) * i / (n * 2);
    const tall = i % 2 === 1 ? h * (0.6 + 0.4 * Math.abs(Math.sin(i * 1.7))) : h * 0.22;
    pts.push([c.x + fx * 0.85, c.y - tall]);
  }
  pts.push([c.x + w, c.y]);
  sketch(ctx, pts, true, 0.7 * K, 77);
  ctx.fillStyle = 'rgba(222,243,255,.95)'; ctx.fill(); ink(ctx, 2.2 * K, 1 - u * 0.6);
}
function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life * 2, 0, 1);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = '#a8dcff'; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.3 * K; ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
function bubble(x, y, text, color = INK, pop = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
  ctx.font = `${22 * K}px ${HAND_FONT}`;
  const w = Math.max(ctx.measureText(text).width + 24 * K, 36 * K), h = 34 * K;
  sketch(ctx, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [8 * K, h / 2], [0, h / 2 + 10 * K], [-6 * K, h / 2], [-w / 2, h / 2]], true, 0.8 * K, 60);
  fillInk(ctx, '#fff', 2.6 * K);
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1 * K);
  ctx.restore();
}
function drawBubbles() {
  if (F.state === 'bite') {
    const pop = easeOutBack(clamp(F.t / 0.18, 0, 1));
    bubble(L.cubeX, L.deckY - L.cubeS - 34 * K, '!', '#e5383b', pop);
  }
}
function drawItemFly() {
  const f = F.fly; if (!f) return;
  const u = clamp(f.t / 0.8, 0, 1), e = easeInOut(u);
  const x0 = f.x0, y0 = f.y0, x2 = W / 2, y2 = H * 0.36;
  const x1 = lerp(x0, x2, 0.4), y1 = Math.min(y0, y2) - 160 * K;
  const x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * x1 + e * e * x2;
  const y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * y1 + e * e * y2;
  const size = lerp(26 * K, 110, easeOutCubic(u));
  const rc = RARITIES[F.item.rarity].color;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, size);
  glow.addColorStop(0, rc + '88'); glow.addColorStop(1, rc + '00');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate((1 - u) * Math.PI * 2.5);
  const art = ItemArt.canvas(F.item.id, Math.floor(time * 7) % ItemArt.FRAMES);
  if (art) {
    const s = size * 1.35;
    ctx.drawImage(art, -s / 2, -s / 2, s, s);
  } else {
    ctx.font = `${size}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(F.item.emoji, 0, 0);
  }
  ctx.restore();
}

function drawRodIcon(canvas, rod, mode) {
  const c = canvas.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);
  if (mode === 'shop') drawRod(c, 44, 136, -0.62, 210, 0.05, rod, 2.1, 0.8);
  else drawRod(c, 30, 92, -0.88, 104, 0.04, rod, 1.5, 0.8);
}

// ============================================================
//  HUD + UI
// ============================================================
const $ = s => document.querySelector(s);
const moneyEl = $('#money'), moneyVal = $('#moneyVal'), luckVal = $('#luckVal'), bagCount = $('#bagCount');
const backpackEl = $('#backpack'), revealEl = $('#reveal'), flashEl = $('#flash'), toastEl = $('#toast');
const shopEl = $('#shop'), shopBody = $('#shopBody'), bagEl = $('#bag'), bagBody = $('#bagBody');
const navShop = $('#navShop'), navDock = $('#navDock');
const rodIconCv = $('#rodIcon'), baitEmoji = $('#baitEmoji'), baitCount = $('#baitCount'), slotBait = $('#slotBait'), slotRod = $('#slotRod');

function setMoneyText(v) {
  moneyVal.textContent = fmt(v);
  document.querySelectorAll('.moneyMirror').forEach(e => e.textContent = fmt(v));
}
function refreshHUD() {
  luckVal.textContent = '+' + Math.round(currentLuck() * 100) + '%';
  const cnt = invCount() - pendingStash;
  bagCount.textContent = cnt;
  bagCount.classList.toggle('hidden', cnt <= 0);
  drawRodIcon(rodIconCv, ROD[S.rod], 'slot');
  slotRod.title = ROD[S.rod].name;
  if (S.bait) {
    baitEmoji.innerHTML = ItemArt.html(S.bait, BAIT[S.bait].emoji);
    baitCount.textContent = 'x' + S.baits[S.bait];
    slotBait.classList.remove('empty'); slotBait.title = BAIT[S.bait].name;
  } else {
    baitEmoji.innerHTML = ItemArt.html('worm', '🪱'); baitCount.textContent = '';
    slotBait.classList.add('empty'); slotBait.title = 'No bait equipped';
  }
}
let toastTimer = 0;
function toast(msg) {
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}
function floaty(text, x, y, color) {
  const el = document.createElement('div');
  el.className = 'floaty'; el.innerHTML = text; el.style.left = x + 'px'; el.style.top = y + 'px';
  if (color) el.style.color = color;
  document.body.appendChild(el); setTimeout(() => el.remove(), 1200);
}
function bumpMoney() { moneyEl.classList.remove('bump'); void moneyEl.offsetWidth; moneyEl.classList.add('bump'); }

function openModal(el) {
  modalOpen = el; el.classList.remove('hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
}
function closeModal(el) {
  el.classList.remove('show');
  setTimeout(() => { if (!el.classList.contains('show')) el.classList.add('hidden'); }, 280);
  if (modalOpen === el) modalOpen = null;
  if (el === shopEl) for (const k in sellSel) delete sellSel[k];
}
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(m); });
});

// ---------- Reveal ----------
function showReveal(item) {
  const r = RARITIES[item.rarity];
  const isNew = !S.discovered[item.id];
  S.discovered[item.id] = true;
  S.inventory[item.id] = (S.inventory[item.id] || 0) + 1;
  S.caught++; pendingStash = 1; save();

  revealEl.style.setProperty('--rc', r.color);
  revealEl.dataset.r = item.rarity;
  let sparks = '';
  if (item.rarity >= 3) {
    for (let i = 0; i < 6 + item.rarity * 3; i++) {
      sparks += `<span class="spark" style="left:${rand(10, 90)}%;top:${rand(10, 85)}%;font-size:${rand(14, 34)}px;animation-delay:${rand(0, 1.6).toFixed(2)}s">✦</span>`;
    }
  }
  revealEl.innerHTML = `
    <div class="rays"></div>${sparks}
    <div class="reveal-card">
      ${isNew ? '<div class="reveal-new">NEW!</div>' : ''}
      <div class="reveal-item">${ItemArt.html(item.id, item.emoji)}</div>
      <div class="reveal-text">You found ${article(item.name)} <b>${item.name}</b>!</div>
      <div class="reveal-rarity">${r.name}</div>
      <div class="reveal-worth">Worth ${COIN()} ${fmt(item.price)}</div>
      <div class="reveal-hint">tap anywhere to continue</div>
    </div>`;
  revealEl.classList.remove('hidden', 'closing');
  requestAnimationFrame(() => requestAnimationFrame(() => revealEl.classList.add('show')));
  revealOpen = true; revealAt = performance.now();
  if (item.rarity >= 5) {
    flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go');
    document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 500);
  }
}
function closeReveal() {
  if (!revealOpen || performance.now() - revealAt < 450) return;
  revealOpen = false;
  const itemEl = revealEl.querySelector('.reveal-item');
  const r = itemEl.getBoundingClientRect(), bp = backpackEl.getBoundingClientRect();
  const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
  const fly = document.createElement('div');
  fly.className = 'flyer'; fly.innerHTML = ItemArt.html(F.item.id, F.item.emoji);
  fly.style.left = sx + 'px'; fly.style.top = sy + 'px';
  fly.style.width = r.width + 'px';
  fly.style.fontSize = getComputedStyle(itemEl).fontSize;
  document.body.appendChild(fly);
  revealEl.classList.add('closing'); revealEl.classList.remove('show');
  setTimeout(() => { if (!revealOpen) revealEl.classList.add('hidden'); }, 500);
  backpackEl.classList.add('open');
  go('cooldown');

  const dx = bp.left + bp.width / 2 - sx, dy = bp.top + bp.height * 0.3 - sy;
  const anim = fly.animate([
    { transform: 'translate(-50%,-50%) translate(0,0) scale(1) rotate(0deg)' },
    { transform: `translate(-50%,-50%) translate(${dx * 0.45}px, ${dy * 0.45 - 140}px) scale(.65) rotate(-25deg)`, offset: 0.45 },
    { transform: `translate(-50%,-50%) translate(${dx}px, ${dy}px) scale(.12) rotate(15deg)`, opacity: 0.7 },
  ], { duration: 800, easing: 'cubic-bezier(.45,0,.55,1)' });
  anim.onfinish = () => {
    fly.remove();
    backpackEl.classList.remove('open');
    backpackEl.classList.remove('gulp'); void backpackEl.offsetWidth; backpackEl.classList.add('gulp');
    pendingStash = 0; refreshHUD();
    setTimeout(() => { backpackEl.classList.remove('gulp'); if (F.state === 'cooldown') go('idle'); }, 350);
    if (F.ranOut) { toast(`You ran out of ${F.ranOut}!`); F.ranOut = null; }
  };
}
revealEl.addEventListener('click', closeReveal);

// ---------- Item tiles ----------
function sortedIds(counts) {
  return Object.keys(counts).filter(id => counts[id] > 0 && ITEM[id])
    .sort((a, b) => ITEM[b].rarity - ITEM[a].rarity || ITEM[b].price - ITEM[a].price);
}
function tileHTML(id, count, attrs = '') {
  const it = ITEM[id], r = RARITIES[it.rarity];
  return `<div class="tile" style="--rc:${r.color}" data-id="${id}" ${attrs} title="${it.name} (${r.name})">
    <span class="c">${count > 1 ? 'x' + count : ''}</span>
    <span class="e">${ItemArt.html(id, it.emoji)}</span><span class="n">${it.name}</span>
    <span class="p">${COIN()} ${fmt(it.price)}</span></div>`;
}

// ---------- Shop ----------
let shopTab = 'sell';
const sellSel = {};
const avail = id => (S.inventory[id] || 0) - (sellSel[id] || 0);
const sellTotal = () => Object.entries(sellSel).reduce((t, [id, c]) => t + ITEM[id].price * c, 0);

function openShop() { shopTab = shopTab || 'sell'; renderShop(); openModal(shopEl); setMoneyText(shownMoney); }
function renderShop(popId) {
  shopEl.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === shopTab));
  if (shopTab === 'sell') renderSell();
  else if (shopTab === 'rods') renderRods();
  else renderBait();
  if (popId) shopBody.querySelectorAll(`[data-id="${popId}"]`).forEach(t => t.classList.add('pop'));
}
function renderSell() {
  const invMap = {}; for (const id in S.inventory) invMap[id] = avail(id);
  const invIds = sortedIds(invMap), selIds = sortedIds(sellSel);
  const total = sellTotal();
  shopBody.innerHTML = `
    <div class="sell-wrap">
      <div class="sell-col">
        <h3>Your Backpack</h3>
        <div class="grid">${invIds.length ? invIds.map(id => tileHTML(id, invMap[id], 'data-add draggable="true"')).join('') : '<div class="empty-note">Nothing left to sell. Go fishing!</div>'}</div>
        <div class="row">
          <button class="btn sketch" data-act="addCommon">+ All Common</button>
          <button class="btn sketch" data-act="addAll">+ Everything</button>
        </div>
      </div>
      <div class="sell-col sell-zone" id="sellZone">
        <h3>Sell Area</h3>
        <div class="grid">${selIds.length ? selIds.map(id => tileHTML(id, sellSel[id], 'data-remove')).join('') : '<div class="empty-note">Click or drag items here to sell them</div>'}</div>
        <div class="sell-total">Total: ${COIN()} <b>${fmt(total)}</b></div>
        <button class="big-btn sketch" data-act="sell" ${total ? '' : 'disabled'}>SELL!</button>
      </div>
    </div>`;
  const zone = shopBody.querySelector('#sellZone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('over');
    const id = e.dataTransfer.getData('text/plain');
    if (ITEM[id] && avail(id) > 0) { sellSel[id] = (sellSel[id] || 0) + avail(id); renderShop(id); }
  });
  shopBody.querySelectorAll('[draggable]').forEach(t => t.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', t.dataset.id)));
}
function doSell(btn) {
  const total = sellTotal(); if (!total) return;
  for (const [id, c] of Object.entries(sellSel)) {
    S.inventory[id] -= c;
    if (S.inventory[id] <= 0) delete S.inventory[id];
    delete sellSel[id];
  }
  S.money += total; save();
  const r = btn.getBoundingClientRect();
  floaty('+' + COIN() + ' ' + fmt(total), r.left + r.width / 2, r.top);
  bumpMoney(); refreshHUD(); renderShop();
}
function speedText(r) { return r.speed && r.speed < 1 ? `${+(1 / r.speed).toFixed(1)}x faster` : 'normal speed'; }
function renderRods() {
  shopBody.innerHTML = `<p class="tab-intro">Fancier poles = better luck and faster bites!</p><div class="cards">` + RODS.map(r => {
    const owned = S.ownedRods.includes(r.id), eq = S.rod === r.id;
    let btn;
    if (eq) btn = `<button class="btn sketch btn-equipped" disabled>Equipped ✓</button>`;
    else if (owned) btn = `<button class="btn sketch btn-equip" data-equip-rod="${r.id}">Equip</button>`;
    else btn = `<button class="btn sketch ${S.money >= r.price ? 'btn-buy' : 'btn-poor'}" data-buy-rod="${r.id}">Buy · ${COIN()} ${fmt(r.price)}</button>`;
    return `<div class="card ${eq ? 'equipped' : ''}">
      <canvas width="240" height="160" data-rod="${r.id}"></canvas>
      <div class="card-name">${r.name}</div><div class="card-desc">${r.desc}</div>
      <div class="stats"><span>🍀 +${Math.round(r.luck * 100)}% luck</span><span>⚡ ${speedText(r)}</span></div>${btn}</div>`;
  }).join('') + '</div>';
  shopBody.querySelectorAll('canvas[data-rod]').forEach(c => drawRodIcon(c, ROD[c.dataset.rod], 'shop'));
}
function renderBait() {
  shopBody.innerHTML = `<p class="tab-intro">Bait adds luck and faster bites to every cast until it runs out.</p><div class="cards">` + BAITS.map(b => {
    const have = S.baits[b.id] || 0, eq = S.bait === b.id;
    let btns = `<button class="btn sketch ${S.money >= b.price ? 'btn-buy' : 'btn-poor'}" data-buy-bait="${b.id}">Buy x${b.uses} · ${COIN()} ${fmt(b.price)}</button>`;
    if (eq) btns += `<button class="btn sketch btn-equipped" data-unequip-bait>Equipped ✓ (tap to remove)</button>`;
    else if (have) btns += `<button class="btn sketch btn-equip" data-equip-bait="${b.id}">Equip</button>`;
    return `<div class="card ${eq ? 'equipped' : ''}">
      <div class="icon">${ItemArt.html(b.id, b.emoji)}</div>
      <div class="card-name">${b.name}</div><div class="card-desc">${b.desc}</div>
      <div class="stats"><span>🍀 +${Math.round(b.luck * 100)}% luck</span><span>⚡ ${speedText(b)}</span><span>🎒 You have ${have}</span></div>${btns}</div>`;
  }).join('') + '</div>';
}
function cantAfford(btn) { toast('Not enough coins!'); btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake'); }

shopEl.addEventListener('click', e => {
  const t = e.target.closest('button, .tile'); if (!t) return;
  if (t.dataset.tab) { shopTab = t.dataset.tab; renderShop(); shopBody.scrollTop = 0; return; }
  if (t.matches('.tile[data-add]')) { const id = t.dataset.id; if (avail(id) > 0) { sellSel[id] = (sellSel[id] || 0) + 1; renderShop(id); } return; }
  if (t.matches('.tile[data-remove]')) { const id = t.dataset.id; if (--sellSel[id] <= 0) delete sellSel[id]; renderShop(id); return; }
  const act = t.dataset.act;
  if (act === 'addAll' || act === 'addCommon') {
    for (const id in S.inventory) if (act === 'addAll' || ITEM[id].rarity === 0) sellSel[id] = S.inventory[id];
    renderShop(); return;
  }
  if (act === 'sell') { doSell(t); return; }
  if (t.dataset.buyRod) {
    const r = ROD[t.dataset.buyRod];
    if (S.money < r.price) return cantAfford(t);
    S.money -= r.price; S.ownedRods.push(r.id); S.rod = r.id; save();
    toast(`You bought the ${r.name}!`); bumpMoney(); refreshHUD(); renderShop(); return;
  }
  if (t.dataset.equipRod) { S.rod = t.dataset.equipRod; save(); refreshHUD(); renderShop(); return; }
  if (t.dataset.buyBait) {
    const b = BAIT[t.dataset.buyBait];
    if (S.money < b.price) return cantAfford(t);
    S.money -= b.price; S.baits[b.id] = (S.baits[b.id] || 0) + b.uses;
    if (!S.bait) S.bait = b.id;
    save(); toast(`+${b.uses} ${b.name}!`); bumpMoney(); refreshHUD(); renderShop(); return;
  }
  if (t.dataset.equipBait) { S.bait = t.dataset.equipBait; save(); refreshHUD(); renderShop(); return; }
  if (t.hasAttribute('data-unequip-bait')) { S.bait = null; save(); refreshHUD(); renderShop(); return; }
});

// ---------- Backpack panel ----------
function openBag() { renderBag(); openModal(bagEl); }
function renderBag() {
  const ids = sortedIds(S.inventory);
  const found = ITEMS.filter(i => S.discovered[i.id]).length;
  const bait = S.bait ? `${ItemArt.html(S.bait, BAIT[S.bait].emoji)} ${BAIT[S.bait].name} (x${S.baits[S.bait]})` : 'No bait';
  bagBody.innerHTML = `
    <div class="equip-row">
      <div class="sketch">🎣 ${ROD[S.rod].name}</div>
      <div class="sketch">${bait}</div>
      <div class="sketch">🐟 Caught: ${fmt(S.caught)}</div>
    </div>
    <h3>Items (${invCount()})</h3>
    <div class="grid">${ids.length ? ids.map(id => tileHTML(id, S.inventory[id])).join('') : '<div class="empty-note">Your backpack is empty. Tap the cube to fish!</div>'}</div>
    <div class="section"><h3>Collection (${found}/${ITEMS.length})</h3>
      <div class="grid">${ITEMS.slice().sort((a, b) => a.rarity - b.rarity).map(it => S.discovered[it.id]
        ? `<div class="tile" style="--rc:${RARITIES[it.rarity].color}" title="${it.name}"><span class="e">${ItemArt.html(it.id, it.emoji)}</span><span class="n">${it.name}</span><span class="r">${RARITIES[it.rarity].name}</span></div>`
        : `<div class="tile unknown" title="Not found yet"><span class="e">${ItemArt.html(it.id, it.emoji)}</span><span class="n">???</span><span class="r">${RARITIES[it.rarity].name}</span></div>`).join('')}</div>
    </div>
    <button class="reset" data-reset>Reset all progress</button>`;
}
bagEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-reset]'); if (!btn) return;
  if (!btn.dataset.armed) {
    btn.dataset.armed = '1'; btn.textContent = 'Tap again to erase ALL progress';
    setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = 'Reset all progress'; } }, 3000);
    return;
  }
  S = freshState(); save(); shownMoney = 0; setMoneyText(0); refreshHUD(); renderBag(); toast('Progress reset');
});

backpackEl.addEventListener('click', openBag);
slotRod.addEventListener('click', openBag);
slotBait.addEventListener('click', openBag);
document.querySelectorAll('[data-art-slot]').forEach(s => { s.innerHTML = ItemArt.html(s.dataset.artSlot, ''); });
document.querySelectorAll('[data-acc]').forEach(s => s.addEventListener('click', () => toast('Accessories are coming soon!')));
navShop.addEventListener('click', () => { camTarget = clampCam(L.shopX - W / 2); });
navDock.addEventListener('click', () => { camTarget = 0; });

// ============================================================
//  Input on the world
// ============================================================
function hitCube(wx, wy) {
  const s = L.cubeS;
  return wx > L.cubeX - s / 2 - 14 * K && wx < L.cubeX + s / 2 + 14 * K && wy > L.deckY - s - 18 * K && wy < L.deckY + 6 * K;
}
function hitShop(wx, wy) {
  const w = 210 * K, h = 125 * K;
  return wx > L.shopX - w / 2 - 20 * K && wx < L.shopX + w / 2 + 20 * K && wy > L.shopBase - h - 90 * K && wy < L.shopBase + 8 * K;
}
let ptr = null;
cv.addEventListener('pointerdown', e => {
  ptr = { x: e.clientX, cam: camTarget, moved: false };
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
});
cv.addEventListener('pointermove', e => {
  if (ptr) {
    const dx = e.clientX - ptr.x;
    if (Math.abs(dx) > 8) ptr.moved = true;
    if (ptr.moved) camTarget = clampCam(ptr.cam - dx);
  }
  const wx = e.clientX + cam, wy = e.clientY;
  cubeHover = hitCube(wx, wy); shopHover = hitShop(wx, wy);
  cv.style.cursor = (cubeHover || shopHover) ? 'pointer' : (ptr && ptr.moved ? 'grabbing' : 'default');
});
cv.addEventListener('pointerup', e => {
  if (ptr && !ptr.moved) {
    const wx = e.clientX + cam, wy = e.clientY;
    if (hitCube(wx, wy)) startFishing();
    else if (hitShop(wx, wy)) openShop();
  }
  ptr = null;
});
cv.addEventListener('pointercancel', () => { ptr = null; });
cv.addEventListener('pointerleave', () => { shopHover = cubeHover = false; });
window.addEventListener('wheel', e => {
  if (modalOpen || revealOpen) return;
  e.preventDefault();
  camTarget = clampCam(camTarget + e.deltaX - e.deltaY);
}, { passive: false });
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalOpen) closeModal(modalOpen);
  if (e.code === 'Space' || e.key === 'Enter') {
    if (revealOpen) { e.preventDefault(); closeReveal(); }
    else if (!modalOpen && e.code === 'Space') { e.preventDefault(); startFishing(); }
  }
});
window.addEventListener('resize', resize);

// ============================================================
//  Boot
// ============================================================
resize();
setMoneyText(S.money);
refreshHUD();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
