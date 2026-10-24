(() => {
'use strict';

const { RARITIES, ITEMS, RODS, BAITS, LUCK_POWER } = window.GAME_DATA;
const byId = arr => Object.fromEntries(arr.map(o => [o.id, o]));
const ITEM = byId(ITEMS), ROD = byId(RODS), BAIT = byId(BAITS);
const INK = '#1b1b1b';
const STACK_MAX = window.GAME_DATA.STACK_MAX || 20; // most of one item the backpack holds
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const HAND_FONT = '"Patrick Hand", "Comic Sans MS", cursive';

// ============================================================
//  Save data
// ============================================================
const SAVE_KEY = 'lucky-pond-save-v1';
const freshState = () => ({
  money: 0, inventory: {}, ownedRods: [RODS[0].id], rod: RODS[0].id,
  baits: {}, bait: null, discovered: {}, caught: 0, customRods: [],
});
function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = Object.assign(freshState(), JSON.parse(raw));
      for (const r of s.customRods || []) ROD[r.id] = r; // merged rods live in the save
      if (!ROD[s.rod]) s.rod = RODS[0].id;
      if (s.bait && !BAIT[s.bait]) s.bait = null;
      // old junk items became fish: move them over to the fish that replaced them
      for (const it of ITEMS) {
        if (!it.replaces) continue;
        if (s.inventory[it.replaces]) { s.inventory[it.id] = (s.inventory[it.id] || 0) + s.inventory[it.replaces]; delete s.inventory[it.replaces]; }
        if (s.discovered[it.replaces]) { s.discovered[it.id] = true; delete s.discovered[it.replaces]; }
      }
      for (const id in s.inventory) s.inventory[id] = Math.min(s.inventory[id], STACK_MAX);
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
//  Day / night clock + traveling merchant schedule
//  Runs on the real clock, so every player shares the same days, and a
//  reload never re-rolls whether the merchant came today.
// ============================================================
const DAY_S = window.GAME_DATA.DAY_SECONDS || 600, NIGHT_S = window.GAME_DATA.NIGHT_SECONDS || 600;
const CYCLE_S = DAY_S + NIGHT_S, FADE_S = 60; // sunrise / sunset length
const MERCHANT = window.GAME_DATA.MERCHANT || { chance: 0.1, rods: 2, baits: 2 };
let clockOffset = 0; // seconds; test hook only
function clock() {
  const s = Date.now() / 1000 + clockOffset + (S.timeSkip || 0); // timeSkip: nights slept through
  const day = Math.floor(s / CYCLE_S), t = s - day * CYCLE_S;
  return { day, t, isDay: t < DAY_S, left: t < DAY_S ? DAY_S - t : CYCLE_S - t };
}
// 0 = full day, 1 = full night, with a short sunrise / sunset in between
function darknessAt(t) {
  if (t < FADE_S) return 1 - t / FADE_S;
  if (t < DAY_S) return 0;
  if (t < DAY_S + FADE_S) return (t - DAY_S) / FADE_S;
  return 1;
}
// The merchant isn't on a fixed schedule: the game rolls for him the moment it
// sees a new morning (sunrise, waking up in the cabin, or opening the game that
// day). One roll per morning, saved so reloading can't re-roll it.
function merchantVisits(ck) {
  if (!ck.isDay) return false;
  if (S.merchantRollDay !== ck.day) {
    S.merchantRollDay = ck.day;
    if (Math.random() < MERCHANT.chance) S.merchantDay = ck.day;
    save();
  }
  return S.merchantDay === ck.day;
}
function merchantStock(day) {
  const r = mulberry(day * 31337 + 7);
  const pick = (arr, n) => arr.map(x => [r(), x]).sort((a, b) => a[0] - b[0]).slice(0, n).map(p => p[1]);
  return {
    rods: pick(RODS.filter(x => x.merchant && !x.deal), MERCHANT.rods),
    baits: pick(BAITS.filter(x => x.merchant), MERCHANT.baits),
    deals: RODS.filter(x => x.deal).slice(0, MERCHANT.deals || 0), // cheapest deal first
  };
}
const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
window.SellingSelling = { setClockOffset: s => { clockOffset = s; }, sleep: () => goToSleep(), merchantHere: () => merchant.here, tick: () => updateClock(0) }; // test hooks

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
  // scale of the world; narrow phones get a bigger scale so the cube and shop aren't tiny
  K = clamp(Math.min(W / (W < 600 ? 520 : 1100), H / 720), 0.6, 1.35);
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
  // far enough left to show the merchant's stall (just left of the shop) even on phones
  L.minCam = Math.min(L.shopX - W / 2 - 80 * K, L.shopX - 240 * K - 110 * K);
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
    if (x > L.shopX - 325 * K && x < L.shopX - 155 * K && y < L.shopBase + 12 * K) continue; // merchant stall spot
    if (Math.abs(x - propX()) < 150 * K && Math.abs(y - propY()) < 60 * K) continue; // property plot
    if (x > L.dockX0 - 10 && x < L.dockX1 + 20 * K && y > L.deckY - 16 * K && y < L.deckY + 40 * K) continue;
    decor.tufts.push({ x, y, s: (0.7 + r() * 0.6) * K, ph: r() * 6 });
    if (r() < 0.22) decor.flowers.push({ x: x + r() * 20 * K, y: y + 4 * K, c: ['#ff8fab', '#ffd166', '#ffffff', '#b28dff'][Math.floor(r() * 4)], ph: r() * 6, s: K });
  }
  decor.tufts.sort((a, b) => a.y - b.y);

  // trees leave room for the merchant's stall just left of the shop
  const treeXs = [L.shopX - 400 * K, L.shopX + 210 * K, L.shopX + 330 * K, -170 * K, L.shopX - 540 * K];
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
  // night: stars in the sky and fireflies over the grass
  decor.stars = Array.from({ length: 70 }, () => ({ x: r(), y: r(), s: 0.6 + r() * 1.4, ph: r() * 6 }));
  decor.fireflies = Array.from({ length: 18 }, () => ({ x: lerp(L.worldL, W, r()), y: L.groundY + (12 + r() * 50) * K + r() * (H - 140 - L.groundY) * 0.6, v: 0.4 + r() * 0.6, ph: r() * 6 }));
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
      // set F.bob right away too: the 'flying' case only runs next frame, and drawing
      // the line to the old F.bob for one frame made it flash off behind the cube
      if (u >= 1) { F.from = [F.dangle.x, F.dangle.y]; F.bob.x = F.from[0]; F.bob.y = F.from[1]; go('flying'); }
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
      // bobber comes straight in and always stays below the tip, so the string never flips over the rod
      F.bob.y = Math.max(lerp(F.reelFrom[1], tp[1] + 24 * K, easeOutCubic(u)) - Math.sin(Math.PI * u) * 12 * K, tp[1] + 8 * K);
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
  navShop.classList.toggle('hidden', away || insideCabin);
  navDock.classList.toggle('hidden', !away || insideCabin);
  updateClock(dt);
}

// ---------- day / night + merchant arrivals ----------
const world = { dark: 0, t: 0, glow: 0 };
const merchant = { here: null, walk: 0 };
let pendingToast = null, pendingBell = false, lastClockText = '';

// ---------- sound: a little shop bell (synthesized, no audio files) ----------
// Browsers only allow sound after the player taps or presses a key, so the
// audio context is created on the first interaction.
let audioCtx = null;
function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { /* no audio available */ }
}
window.addEventListener('pointerdown', unlockAudio, true);
window.addEventListener('keydown', unlockAudio, true);
// When the tab is in the background the game loop pauses, so keep checking the
// clock on a timer: the merchant's bell still rings if you're looking away.
setInterval(() => { if (document.hidden) updateClock(0); }, 1000);
// A normal ringing bell: one bell rung back and forth for about a second
// ("ring-a-ring-a-ring"), then it rings out. Bell overtones are uneven (that's
// what makes it sound like a bell and not a beep).
const BELL_OVERTONES = [ // [ratio, loudness, ring time (s)]
  [1, 1, 1.3], [2.0, 0.45, 0.9], [2.76, 0.32, 0.65], [3.7, 0.18, 0.4], [5.4, 0.1, 0.25], [6.8, 0.05, 0.15],
];
function strikeBell(t0, freq, strength, out) {
  for (const [ratio, vol, ring] of BELL_OVERTONES) {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = freq * ratio;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol * strength, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ring);
    o.connect(g).connect(out);
    o.start(t0); o.stop(t0 + ring + 0.05);
  }
}
function playBell() {
  if (!audioCtx || audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime, freq = 1046.5; // C6
  const master = audioCtx.createGain(); master.gain.value = 0.14;
  master.connect(audioCtx.destination);
  const strikes = 2; // "ring... ring", each one ringing out
  for (let i = 0; i < strikes; i++) strikeBell(now + i * 0.25, freq, i === 0 ? 1 : 0.85, master);
}
window.__playBell = () => { unlockAudio(); setTimeout(playBell, 60); }; // for the sound test page
function updateClock(dt) {
  const ck = clock();
  world.dark = darknessAt(ck.t);
  world.t = ck.t;
  // sunrise / sunset glow: strongest right at dawn and dusk
  const toEdge = Math.min(ck.t, CYCLE_S - ck.t, Math.abs(ck.t - DAY_S));
  world.glow = clamp(1 - toEdge / 90, 0, 1);
  const here = merchantVisits(ck);
  if (here !== merchant.here) {
    if (merchant.here === null) { if (here) { pendingToast = 'A traveling merchant is visiting the shop today!'; pendingBell = true; } }
    else if (here) { pendingToast = 'A traveling merchant arrived by the shop!'; pendingBell = true; }
    else {
      pendingToast = 'The traveling merchant packed up and left.';
      if (modalOpen === merchantEl) closeModal(merchantEl);
    }
    merchant.here = here;
    navShop.textContent = here ? '← Shop + Merchant!' : '← Shop';
  }
  // walks in at sunrise and out at sunset
  const target = here ? clamp(Math.min(ck.t, DAY_S - ck.t) / 4, 0, 1) : 0;
  merchant.walk = here ? target : Math.max(0, merchant.walk - dt / 2);
  if (pendingToast && !document.getElementById('title') && !sleeping) {
    toast(pendingToast); pendingToast = null;
    if (pendingBell) { playBell(); pendingBell = false; }
  }
  const txt = (ck.isDay ? 'Day ' : 'Night ') + mmss(ck.left);
  if (txt !== lastClockText) {
    lastClockText = txt; clockVal.textContent = txt; clockEl.classList.toggle('night', !ck.isDay);
    if (modalOpen === merchantEl) { const el = document.getElementById('merchantLeft'); if (el) el.textContent = mmss(ck.left); }
  }
}

// ============================================================
//  Drawing
// ============================================================
function draw() {
  if (insideCabin) { drawInterior(); return; }
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
  drawMerchant();
  drawProperty();
  drawPond();
  for (const rd of decor.reeds) drawReed(rd);
  drawDock();
  drawCube();
  drawRodAndLine();
  for (const c of crowns) drawCrown(c);
  drawParticles();
  drawBubbles();
  ctx.restore();

  drawNight();
  drawItemFly();
}

// Night: tint the whole scene (warm at sunset, deep blue at night), then add
// stars, the moon, glowing windows and fireflies on top.
function glowAt(x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function drawNight() {
  const d = world.dark;
  if (d <= 0.001) return;
  const dusk = Math.sin(Math.PI * d) * 0.55;
  const mix = (day, warm, night) => Math.round(lerp(lerp(day, warm, dusk), night, d));
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgb(${mix(255, 255, 72)},${mix(255, 168, 88)},${mix(255, 120, 165)})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // stars
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of decor.stars) {
    const tw = 0.55 + 0.45 * Math.sin(time * 2 + s.ph);
    const x = ((s.x * W - cam * 0.03) % W + W) % W, y = s.y * L.groundY * 0.85;
    ctx.fillStyle = `rgba(255,250,225,${d * tw})`;
    ctx.beginPath(); ctx.arc(x, y, s.s * K * (0.6 + 0.4 * tw), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // moon travels across the night sky (fades out near the horizon)
  const q = (world.t - DAY_S) / NIGHT_S;
  const [mx, my] = skyArc(clamp(q, 0, 1));
  const ma = d * clamp(Math.sin(Math.PI * clamp(q, 0, 1)) / 0.12, 0, 1);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowAt(mx, my, 70 * K, '255,240,190', 0.35 * ma); ctx.restore();
  ctx.save(); ctx.globalAlpha = ma;
  sketch(ctx, ellipsePts(mx, my, 24 * K, 24 * K, 22), true, 0.8 * K, 655);
  ctx.fillStyle = '#fdf3c4'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.4 * K; ctx.stroke();
  ctx.fillStyle = 'rgba(200,180,120,.5)';
  for (const [cx, cy, cr] of [[-8, -6, 5], [7, 4, 6], [-4, 10, 3.5]]) { ctx.beginPath(); ctx.arc(mx + cx * K, my + cy * K, cr * K, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();

  // warm lights + fireflies in the world
  ctx.save(); ctx.translate(-cam, 0); ctx.globalCompositeOperation = 'lighter';
  const sw = 210 * K, sh = 125 * K;
  glowAt(L.shopX - sw / 2 + 57 * K, L.shopBase - sh + 68 * K, 80 * K, '255,200,110', 0.55 * d);
  if (merchant.walk > 0) { const [lx, ly] = merchantLantern(); glowAt(lx, ly, 60 * K, '255,190,90', 0.7 * d * merchant.walk); }
  if (S.property && cabinRise() >= 1) { const [cx2, cy2] = cabinWindow(); glowAt(cx2, cy2, 70 * K, '255,200,110', 0.6 * d); }
  for (const f of decor.fireflies) {
    const blink = Math.max(0, Math.sin(time * 1.7 + f.ph * 3));
    if (blink <= 0) continue;
    const x = f.x + Math.sin(time * f.v + f.ph) * 22 * K, y = f.y + Math.cos(time * f.v * 1.3 + f.ph) * 12 * K;
    glowAt(x, y, 9 * K, '230,255,140', 0.9 * d * blink);
  }
  ctx.restore();
}

// Sun and moon travel across the sky in an arc: rising on the left, setting on the right.
function skyArc(p) {
  const x = lerp(-0.08 * W, 1.08 * W, p) - cam * 0.05;
  const y = L.groundY + 10 * K - Math.sin(Math.PI * clamp(p, 0, 1)) * (L.groundY - 70 * K);
  return [x, y];
}
function drawSky() {
  // warm sunrise / sunset band along the horizon
  if (world.glow > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, L.groundY + 10);
    g.addColorStop(0, 'rgba(255,190,150,0)');
    g.addColorStop(0.55, `rgba(255,170,190,${0.35 * world.glow})`);
    g.addColorStop(1, `rgba(255,150,80,${0.75 * world.glow})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, L.groundY + 10);
  }
  // the sun is up during the day (plus a little either side, for rising / setting)
  let tt = world.t;
  if (tt > CYCLE_S - FADE_S * 0.5) tt -= CYCLE_S; // just before dawn: start rising from below the hills
  const p = (tt + FADE_S * 0.5) / (DAY_S + FADE_S);
  if (p >= 0 && p <= 1) drawSun(p);
  drawClouds();
}
function drawSun(p) {
  const [sx, sy] = skyArc(p);
  const low = clamp(1 - Math.sin(Math.PI * p) / 0.45, 0, 1); // 1 when near the horizon
  const col = `rgb(255,${Math.round(lerp(226, 150, low))},${Math.round(lerp(122, 70, low))})`;
  const size = 1 + low * 0.25;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 90 * K * size);
  g.addColorStop(0, `rgba(255,${Math.round(lerp(230, 160, low))},120,${0.35 + low * 0.25})`); g.addColorStop(1, 'rgba(255,180,100,0)');
  ctx.fillStyle = g; ctx.fillRect(sx - 90 * K * size, sy - 90 * K * size, 180 * K * size, 180 * K * size);
  ctx.restore();
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(time * 0.15);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, r0 = 34 * K * size, r1 = (46 + (i % 2) * 8) * K * size;
    sketch(ctx, [[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r1, Math.sin(a) * r1]], false, 0.8 * K, 600 + i);
    ink(ctx, 2.4 * K, 0.8);
  }
  ctx.restore();
  sketch(ctx, ellipsePts(sx, sy, 26 * K * size, 26 * K * size, 22), true, 1 * K, 650);
  fillInk(ctx, col, 2.6 * K);
}
function drawClouds() {
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

// ---------- property for sale (paved plot, lower down, just left of the shop) ----------
const PROPERTY_PRICE = (window.GAME_DATA.PROPERTY || {}).price || 500000;
const propX = () => L.shopX - 170 * K;
const propY = () => L.shopBase + 200 * K;
const CABIN_SCALE = 1.25; // the cabin is drawn a bit bigger than its base size
let propHover = false;
function hitProperty(wx, wy) { return Math.abs(wx - propX()) < 140 * K && wy > propY() - (S.property ? 200 : 95) * K && wy < propY() + 44 * K; }
function drawProperty() {
  const x = propX(), y = propY(), u = K, owned = !!S.property;
  ctx.save(); ctx.translate(x, y);
  if (propHover) ctx.scale(1.03, 1.03);
  // paved slab, a little perspective (back edge narrower)
  const slab = [[-118 * u, -38 * u], [118 * u, -38 * u], [134 * u, 38 * u], [-134 * u, 38 * u]];
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.ellipse(0, 42 * u, 140 * u, 9 * u, 0, 0, Math.PI * 2); ctx.fill();
  // same look as the dirt walkway to the shop: sandy tan, soft outline, a few pebbles
  sketch(ctx, slab, true, 1 * u, 900);
  ctx.fillStyle = '#efe0bd'; ctx.fill(); ink(ctx, 1.8 * u, 0.4);
  for (const [px, py] of [[-80, -18], [-30, 12], [40, -24], [90, 16], [10, 26], [-100, 20], [70, -6]]) {
    ctx.beginPath(); ctx.ellipse(px * u, py * u, 3 * u, 2 * u, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(160,130,90,.35)'; ctx.fill();
  }
  if (!owned) {
    // "for sale" sign on the back edge
    sketch(ctx, rectPts(-4 * u, -92 * u, 8 * u, 58 * u), true, 0.5 * u, 920); fillInk(ctx, '#87582e', 2.4 * u);
    const bw = 132 * u, bh = 46 * u, by = -100 * u;
    sketch(ctx, rectPts(-bw / 2, by, bw, bh), true, 0.8 * u, 921); fillInk(ctx, '#fff', 2.8 * u);
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${20 * u}px ${HAND_FONT}`; ctx.fillText('Property', 0, by + 15 * u);
    ctx.font = `${15 * u}px ${HAND_FONT}`; ctx.fillStyle = '#c0392b';
    ctx.fillText(`${fmt(PROPERTY_PRICE)} coins`, 0, by + 34 * u);
  } else {
    ctx.save(); ctx.scale(CABIN_SCALE, CABIN_SCALE); drawCabin(u); ctx.restore();
  }
  ctx.restore();
  if (propHover) bubble(x, y - (owned ? 228 : 124) * K, owned ? 'Go inside!' : 'Buy this land!');
}

// The cabin that builds itself on the property once it's bought (log version of the shop).
let cabinBuiltAt = -99;
function cabinRise() { return clamp((time - cabinBuiltAt) / 1.2, 0, 1); }
function cabinWindow() { return [propX() - 55 * K, propY() - 70 * K]; }
function drawCabin(u) {
  const rise = cabinRise(), p = rise >= 1 ? 1 : easeOutBack(rise);
  ctx.save(); ctx.translate(0, -6 * u); ctx.scale(1, Math.max(0.02, p)); // grows up out of the slab
  const w = 156 * u, h = 82 * u, logs = 5, lh = h / logs;
  // log walls
  for (let i = 0; i < logs; i++) {
    const y0 = -h + i * lh;
    sketch(ctx, rectPts(-w / 2, y0, w, lh), true, 0.6 * u, 940 + i); fillInk(ctx, i % 2 ? '#8b5a2b' : '#a0683a', 2.2 * u);
    for (const ex of [-w / 2, w / 2]) { ctx.beginPath(); ctx.ellipse(ex, y0 + lh / 2, 5 * u, lh / 2 - 0.5 * u, 0, 0, Math.PI * 2); ctx.fillStyle = '#c99a62'; ctx.fill(); ink(ctx, 1.8 * u); ctx.beginPath(); ctx.arc(ex, y0 + lh / 2, 2 * u, 0, Math.PI * 2); ink(ctx, 1 * u, 0.6); }
  }
  // chimney + roof
  sketch(ctx, rectPts(36 * u, -h - 66 * u, 20 * u, 44 * u), true, 0.6 * u, 950); fillInk(ctx, '#9aa3ad', 2.4 * u);
  for (const yy of [-h - 52, -h - 38]) { sketch(ctx, [[36 * u, yy * u], [56 * u, yy * u]], false, 0.3 * u, 951 + yy); ink(ctx, 1.2 * u, 0.5); }
  const roof = [[-w / 2 - 16 * u, -h + 2 * u], [0, -h - 66 * u], [w / 2 + 16 * u, -h + 2 * u]];
  sketch(ctx, roof, true, 1 * u, 952); fillInk(ctx, '#5b3a22', 3 * u);
  for (let r = 1; r < 4; r++) { const t = r / 4; sketch(ctx, [[-(w / 2 + 16 * u) * (1 - t), -h + 2 * u - 68 * u * t], [(w / 2 + 16 * u) * (1 - t), -h + 2 * u - 68 * u * t]], false, 0.4 * u, 953 + r); ink(ctx, 1.4 * u, 0.4); }
  // sign above the door, like the shop's
  sketch(ctx, rectPts(-34 * u, -h - 30 * u, 68 * u, 22 * u), true, 0.5 * u, 960); fillInk(ctx, '#fff', 2.2 * u);
  ctx.fillStyle = INK; ctx.font = `${14 * u}px ${HAND_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('MY CABIN', 0, -h - 18 * u);
  // window with shutters + warm light
  const wx = -64 * u, wy = -h + 18 * u, ww = 40 * u, wh = 34 * u;
  sketch(ctx, rectPts(wx - 9 * u, wy, 8 * u, wh), true, 0.4 * u, 961); fillInk(ctx, '#3f7d4a', 1.8 * u);
  sketch(ctx, rectPts(wx + ww + 1 * u, wy, 8 * u, wh), true, 0.4 * u, 962); fillInk(ctx, '#3f7d4a', 1.8 * u);
  sketch(ctx, rectPts(wx, wy, ww, wh), true, 0.5 * u, 963); fillInk(ctx, '#ffe08a', 2.4 * u);
  sketch(ctx, [[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], false, 0.3 * u, 964); ink(ctx, 1.8 * u);
  sketch(ctx, [[wx, wy + wh / 2], [wx + ww, wy + wh / 2]], false, 0.3 * u, 965); ink(ctx, 1.8 * u);
  // door + step
  const dx = 14 * u, dw = 38 * u, dh = 58 * u;
  sketch(ctx, rectPts(dx, -dh, dw, dh), true, 0.5 * u, 966); fillInk(ctx, '#6e4426', 2.6 * u);
  for (const lx of [dx + 12 * u, dx + 26 * u]) { sketch(ctx, [[lx, -dh + 4 * u], [lx, -4 * u]], false, 0.3 * u, 967 + lx); ink(ctx, 1.2 * u, 0.4); }
  ctx.beginPath(); ctx.arc(dx + dw - 7 * u, -dh / 2, 2.8 * u, 0, Math.PI * 2); ctx.fillStyle = '#f2c94c'; ctx.fill(); ink(ctx, 1.4 * u);
  sketch(ctx, rectPts(dx - 6 * u, -2 * u, dw + 12 * u, 8 * u), true, 0.4 * u, 970); fillInk(ctx, '#9aa3ad', 2 * u);
  ctx.restore();
  // chimney smoke (once it's standing)
  if (rise >= 1) for (let i = 0; i < 3; i++) {
    const k = (time * 0.5 + i / 3) % 1, sx = 46 * u + Math.sin(time + i) * 6 * u + k * 14 * u, sy = -6 * u - h - 70 * u - k * 50 * u;
    ctx.globalAlpha = 0.55 * (1 - k);
    sketch(ctx, ellipsePts(sx, sy, (6 + k * 10) * u, (5 + k * 8) * u, 14), true, 0.4 * u, 980 + i); ctx.fillStyle = '#fff'; ctx.fill(); ink(ctx, 1.4 * u, 0.5 * (1 - k));
    ctx.globalAlpha = 1;
  }
  // building dust while it rises
  if (rise < 1) for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + time * 3, r = (60 + rise * 50) * u;
    ctx.globalAlpha = 0.6 * (1 - rise);
    ctx.beginPath(); ctx.ellipse(Math.cos(a) * r, 20 * u + Math.sin(a) * 10 * u, 12 * u, 8 * u, 0, 0, Math.PI * 2); ctx.fillStyle = '#e8dcc6'; ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------- inside the cabin: a cozy room with a bed and a desk ----------
let insideCabin = false, bedHover = false, deskHover = false;
// Stardew-style room drawn in perspective so it reads as 3D: a back wall, side walls
// angling in, and a floor that widens toward you. Darker wood; the door is on the right.
function room() {
  const avail = H - 110;
  const R = clamp(Math.min((W - 24) / 860, (avail - 24) / 580), 0.4, 1.5);
  const rw = 860 * R, rh = 580 * R, x = (W - rw) / 2, y = Math.max(12, (avail - rh) / 2);
  const inset = 80 * R, wallH = 190 * R, floorTop = y + wallH;
  return {
    R, x, y, rw, rh, inset, wallH, floorTop,
    bx: x + inset, bw: rw - inset * 2, cx: x + rw / 2,
    // bed lies sideways: head against the left wall, foot pointing right toward the door
    // (in the bottom-left corner of the room)
    bed: { x: x + inset * 0.22 + 22 * R, y: y + rh - 140 * R, w: 200 * R, d: 104 * R },
    desk: { x: x + rw - inset - 270 * R, y: floorTop - 10 * R, w: 230 * R, d: 70 * R, h: 44 * R },
  };
}
function hitBed(sx, sy) { const r = room(), b = r.bed; return sx > b.x - 24 * r.R && sx < b.x + b.w + 10 * r.R && sy > b.y - 50 * r.R && sy < b.y + b.d + 30 * r.R; }
function hitDesk(sx, sy) { const r = room(), d = r.desk; return sx > d.x - 10 * r.R && sx < d.x + d.w + 10 * r.R && sy > d.y - 50 * r.R && sy < d.y + d.d + d.h + 50 * r.R; }

// a little framed photo of the cube out fishing (variant picks the scene)
function drawPhoto(px, py, pw, ph, variant, R) {
  sketch(ctx, rectPts(px - 5 * R, py - 5 * R, pw + 10 * R, ph + 10 * R), true, 0.4 * R, 1100 + variant); fillInk(ctx, '#c9924a', 2.4 * R);
  ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
  const sky = variant === 2 ? ['#ffb37a', '#ffd9a8'] : ['#bfe6ff', '#fff6dc'];
  const g = ctx.createLinearGradient(0, py, 0, py + ph); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
  ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
  if (variant === 2) { ctx.fillStyle = '#ffdf6e'; ctx.beginPath(); ctx.arc(px + pw * 0.72, py + ph * 0.55, ph * 0.18, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#5aa7e6'; ctx.fillRect(px, py + ph * 0.62, pw, ph * 0.38);
  ctx.fillStyle = '#b77a43'; ctx.fillRect(px, py + ph * 0.58, pw * 0.45, ph * 0.07);
  const cs = ph * 0.26, cx = px + pw * 0.28, cb = py + ph * 0.58;
  ctx.fillStyle = '#fff'; ctx.fillRect(cx - cs / 2, cb - cs, cs, cs);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4 * R; ctx.strokeRect(cx - cs / 2, cb - cs, cs, cs);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(cx - cs * 0.18, cb - cs * 0.62, 0.9 * R + 0.4, 0, Math.PI * 2); ctx.arc(cx + cs * 0.18, cb - cs * 0.62, 0.9 * R + 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cb - cs * 0.42, cs * 0.18, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 1 * R; ctx.stroke();
  ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 1.6 * R;
  ctx.beginPath(); ctx.moveTo(cx + cs * 0.5, cb - cs * 0.5); ctx.quadraticCurveTo(cx + pw * 0.3, cb - ph * 0.55, cx + pw * 0.45, cb - ph * 0.45); ctx.stroke();
  ctx.strokeStyle = 'rgba(27,27,27,.7)'; ctx.lineWidth = 0.8 * R;
  ctx.beginPath(); ctx.moveTo(cx + pw * 0.45, cb - ph * 0.45); ctx.lineTo(cx + pw * 0.48, py + ph * (variant === 1 ? 0.3 : 0.7)); ctx.stroke();
  if (variant === 1) { ctx.fillStyle = '#ff9f3f'; ctx.beginPath(); ctx.ellipse(cx + pw * 0.5, py + ph * 0.4, pw * 0.09, ph * 0.08, 0.6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1 * R; ctx.stroke(); }
  else { ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(cx + pw * 0.48, py + ph * 0.7, 1.8 * R, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  sketch(ctx, rectPts(px, py, pw, ph), true, 0.3 * R, 1110 + variant); ink(ctx, 1.6 * R);
}

// a 3D-looking block: top face (seen from above) + front face
function block(x, y, w, d, h, top, front, R, seed) {
  sketch(ctx, rectPts(x, y, w, d), true, 0.4 * R, seed); fillInk(ctx, top, 2.4 * R);
  sketch(ctx, rectPts(x, y + d, w, h), true, 0.4 * R, seed + 1); fillInk(ctx, front, 2.4 * R);
}

function drawInterior() {
  const r = room(), R = r.R, d = world.dark, { x, y, rw, rh, inset, floorTop, bx, bw } = r;
  const fb = y + rh; // front (bottom) edge of the floor
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#140d08'; ctx.fillRect(0, 0, W, H);

  const LOG_A = '#6e4426', LOG_B = '#5a3720', FLOOR = '#a8743f';
  // back wall (logs)
  const logs = 6, lh = (floorTop - y) / logs;
  for (let i = 0; i < logs; i++) { sketch(ctx, rectPts(bx, y + i * lh, bw, lh), true, 0.5 * R, 1000 + i); fillInk(ctx, i % 2 ? LOG_B : LOG_A, 2 * R); }
  // side walls angling toward you (logs drawn as slanted seams)
  const leftWall = [[x, y], [bx, y], [bx, floorTop], [x, fb]];
  const rightWall = [[x + rw, y], [bx + bw, y], [bx + bw, floorTop], [x + rw, fb]];
  for (const [wall, seed] of [[leftWall, 1010], [rightWall, 1011]]) {
    sketch(ctx, wall, true, 0.5 * R, seed); fillInk(ctx, '#4f301b', 2.4 * R);
    for (let i = 1; i < logs + 3; i++) {
      const t = i / (logs + 3), outerX = wall[0][0], innerX = wall[1][0];
      sketch(ctx, [[innerX, y + (floorTop - y) * t], [outerX, y + (fb - y) * t]], false, 0.3 * R, seed * 10 + i); ink(ctx, 1.6 * R, 0.55);
    }
  }
  // door in the right wall (the entrance), drawn in perspective
  const dt0 = 0.3, dt1 = 0.78; // how far along the wall (back -> front)
  const pX = t => lerp(bx + bw, x + rw, t), pB = t => lerp(floorTop, fb, t), pT = t => y + (lerp(floorTop, fb, t) - y) * 0.34;
  const door = [[pX(dt0), pT(dt0)], [pX(dt1), pT(dt1)], [pX(dt1), pB(dt1)], [pX(dt0), pB(dt0)]];
  const frame = [[pX(dt0 - 0.03), pT(dt0 - 0.03) - 6 * R], [pX(dt1 + 0.03), pT(dt1 + 0.03) - 6 * R], [pX(dt1 + 0.03), pB(dt1 + 0.03)], [pX(dt0 - 0.03), pB(dt0 - 0.03)]];
  sketch(ctx, frame, true, 0.4 * R, 1014); fillInk(ctx, '#3d2414', 2.4 * R);
  sketch(ctx, door, true, 0.4 * R, 1015); fillInk(ctx, '#a0683a', 3 * R);
  for (const tt of [0.35, 0.65]) { const t = lerp(dt0, dt1, tt); sketch(ctx, [[pX(t), pT(t) + 10 * R], [pX(t), pB(t) - 8 * R]], false, 0.3 * R, 1017 + tt * 10); ink(ctx, 1.2 * R, 0.35); }
  sketch(ctx, [[pX((dt0 + dt1) / 2), pT((dt0 + dt1) / 2)], [pX((dt0 + dt1) / 2), pB((dt0 + dt1) / 2)]], false, 0.3 * R, 1016); ink(ctx, 1.4 * R, 0.5);
  ctx.beginPath(); ctx.arc(pX(dt0 + 0.04), lerp(pT(dt0 + 0.04), pB(dt0 + 0.04), 0.55), 3.5 * R, 0, Math.PI * 2); ctx.fillStyle = '#f2c94c'; ctx.fill(); ink(ctx, 1.4 * R);

  // window + photos on the back wall
  const ww = 120 * R, wh = 92 * R, wx = r.cx - ww / 2 - 10 * R, wy = y + 32 * R;
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, d > 0.5 ? '#1b2550' : '#bfe6ff'); sky.addColorStop(1, d > 0.5 ? '#3a4a8a' : '#fff6dc');
  sketch(ctx, rectPts(wx, wy, ww, wh), true, 0.5 * R, 1020); ctx.fillStyle = sky; ctx.fill();
  ctx.fillStyle = d > 0.5 ? '#fdf3c4' : '#ffe27a';
  ctx.beginPath(); ctx.arc(wx + ww * 0.72, wy + wh * 0.32, 12 * R, 0, Math.PI * 2); ctx.fill();
  if (d > 0.5) for (const [sx, sy] of [[.2, .25], [.4, .15], [.3, .55], [.55, .45]]) { ctx.beginPath(); ctx.arc(wx + ww * sx, wy + wh * sy, 1.5 * R, 0, Math.PI * 2); ctx.fill(); }
  sketch(ctx, rectPts(wx, wy, ww, wh), true, 0.5 * R, 1020); ink(ctx, 5 * R); ctx.strokeStyle = '#4a2f1a'; ctx.lineWidth = 3 * R; ctx.stroke();
  sketch(ctx, [[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], false, 0.3 * R, 1021); ink(ctx, 3.5 * R);
  sketch(ctx, [[wx, wy + wh / 2], [wx + ww, wy + wh / 2]], false, 0.3 * R, 1022); ink(ctx, 3.5 * R);
  sketch(ctx, rectPts(wx - 8 * R, wy + wh, ww + 16 * R, 8 * R), true, 0.3 * R, 1023); fillInk(ctx, '#8b5a2b', 2 * R);
  drawPhoto(wx - 100 * R, y + 36 * R, 64 * R, 48 * R, 0, R); // left of the window, clear of it
  drawPhoto(wx + ww + 26 * R, y + 30 * R, 74 * R, 54 * R, 2, R);
  drawPhoto(wx + ww + 40 * R, y + 100 * R, 50 * R, 38 * R, 1, R);

  // floor (trapezoid) with planks running toward you
  const floor = [[bx, floorTop], [bx + bw, floorTop], [x + rw, fb], [x, fb]];
  sketch(ctx, floor, true, 0.5 * R, 1030); fillInk(ctx, FLOOR, 2.4 * R);
  ctx.save(); sketch(ctx, floor, true, 0.5 * R, 1030); ctx.clip();
  for (let i = 0; i <= 12; i++) { const t = i / 12; sketch(ctx, [[lerp(bx, bx + bw, t), floorTop], [lerp(x, x + rw, t), fb]], false, 0.3 * R, 1032 + i); ink(ctx, 1.2 * R, 0.35); }
  for (let k = 1; k < 7; k++) { const t = Math.pow(k / 7, 1.4), yy = lerp(floorTop, fb, t); sketch(ctx, [[x, yy], [x + rw, yy]], false, 0.3 * R, 1050 + k); ink(ctx, 1 * R, 0.22); }
  ctx.restore();
  // baseboard where the back wall meets the floor
  sketch(ctx, rectPts(bx, floorTop - 7 * R, bw, 8 * R), true, 0.3 * R, 1006); fillInk(ctx, '#3d2414', 1.8 * R);
  // doormat on the floor by the door
  const mx = lerp(bx + bw, x + rw, 0.64) - 70 * R, my = lerp(floorTop, fb, 0.64) - 6 * R;
  sketch(ctx, [[mx, my - 16 * R], [mx + 60 * R, my - 18 * R], [mx + 66 * R, my + 18 * R], [mx - 4 * R, my + 16 * R]], true, 0.3 * R, 1060); fillInk(ctx, '#7a9c4a', 2 * R);

  // rug
  const rugY = lerp(floorTop, fb, 0.55);
  sketch(ctx, ellipsePts(r.cx, rugY, 170 * R, 62 * R, 32), true, 0.6 * R, 1040); fillInk(ctx, '#c0453f', 2.6 * R);
  sketch(ctx, ellipsePts(r.cx, rugY, 130 * R, 44 * R, 28), true, 0.4 * R, 1041); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3 * R; ctx.stroke();

  // bed lying sideways: headboard against the left wall, foot toward the door
  const b = r.bed, fh = 22 * R; // fh = side (front face) height
  block(b.x, b.y, b.w, b.d, fh, '#7a4a24', '#5a3720', R, 1072); // frame
  sketch(ctx, rectPts(b.x + 6 * R, b.y + 8 * R, b.w - 14 * R, b.d - 16 * R), true, 0.4 * R, 1074); fillInk(ctx, '#fffaf0', 2.2 * R); // mattress
  sketch(ctx, rectPts(b.x + 14 * R, b.y + 16 * R, 40 * R, b.d - 32 * R), true, 0.5 * R, 1075); fillInk(ctx, '#ffffff', 2.2 * R); // pillow
  sketch(ctx, [[b.x + 20 * R, b.y + b.d / 2], [b.x + 48 * R, b.y + b.d / 2]], false, 0.2 * R, 1076); ink(ctx, 1.2 * R, 0.3);
  const blX = b.x + 70 * R, bl = rectPts(blX, b.y + 4 * R, b.w - 74 * R, b.d - 8 * R);
  sketch(ctx, bl, true, 0.5 * R, 1077); fillInk(ctx, '#3f86c4', 2.4 * R);
  ctx.save(); sketch(ctx, bl, true, 0.5 * R, 1077); ctx.clip();
  for (let k = 0; k < 8; k++) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(blX + 10 * R + k * 20 * R, b.y, 9 * R, b.d); ctx.fillRect(blX, b.y + 10 * R + k * 20 * R, b.w, 9 * R); }
  ctx.restore();
  sketch(ctx, rectPts(blX - 6 * R, b.y + 4 * R, 14 * R, b.d - 8 * R), true, 0.4 * R, 1078); fillInk(ctx, '#ffffff', 2 * R); // folded sheet edge
  sketch(ctx, rectPts(blX, b.y + b.d, b.w - 74 * R, fh * 0.75), true, 0.3 * R, 1079); fillInk(ctx, '#3f86c4', 1.8 * R); // blanket hanging over the side
  // headboard standing against the left wall
  sketch(ctx, rectPts(b.x - 18 * R, b.y - 44 * R, 20 * R, b.d + fh + 44 * R), true, 0.4 * R, 1070); fillInk(ctx, '#4f301b', 2.6 * R);
  sketch(ctx, rectPts(b.x - 22 * R, b.y - 50 * R, 28 * R, 10 * R), true, 0.3 * R, 1071); fillInk(ctx, '#3d2414', 2 * R);
  // low footboard at the end facing the door
  sketch(ctx, rectPts(b.x + b.w - 8 * R, b.y - 10 * R, 12 * R, b.d + fh + 10 * R), true, 0.3 * R, 1073); fillInk(ctx, '#4f301b', 2.2 * R);

  // workbench against the back wall (3D block) with a rod and tools on it
  const dk = r.desk;
  block(dk.x, dk.y, dk.w, dk.d, dk.h, '#8b5a2b', '#5a3720', R, 1080);
  for (const lx of [dk.x + 8 * R, dk.x + dk.w - 20 * R]) { sketch(ctx, rectPts(lx, dk.y + dk.d + dk.h, 12 * R, 20 * R), true, 0.3 * R, 1082 + lx); fillInk(ctx, '#3d2414', 2 * R); }
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 7 * R; ctx.beginPath(); ctx.moveTo(dk.x + 26 * R, dk.y + 50 * R); ctx.lineTo(dk.x + 150 * R, dk.y + 18 * R); ctx.stroke();
  ctx.strokeStyle = '#d9aa72'; ctx.lineWidth = 4 * R; ctx.stroke();
  ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 6 * R; ctx.beginPath(); ctx.moveTo(dk.x + 26 * R, dk.y + 50 * R); ctx.lineTo(dk.x + 52 * R, dk.y + 43 * R); ctx.stroke();
  sketch(ctx, rectPts(dk.x + 160 * R, dk.y + 14 * R, 26 * R, 18 * R), true, 0.3 * R, 1085); fillInk(ctx, '#9aa3ad', 2 * R);
  sketch(ctx, [[dk.x + 118 * R, dk.y + 52 * R], [dk.x + 144 * R, dk.y + 45 * R]], false, 0.2 * R, 1086); ink(ctx, 3 * R);
  sketch(ctx, rectPts(dk.x + 140 * R, dk.y + 38 * R, 10 * R, 14 * R), true, 0.2 * R, 1087); fillInk(ctx, '#6b7280', 1.6 * R);
  const lx = dk.x + dk.w - 30 * R, ly = dk.y + 22 * R;
  sketch(ctx, ellipsePts(lx, ly, 14 * R, 10 * R, 14), true, 0.3 * R, 1088); fillInk(ctx, '#ffd166', 2 * R);
  // stool (little 3D block) in front of the bench
  block(dk.x + 80 * R, dk.y + dk.d + dk.h + 40 * R, 46 * R, 30 * R, 18 * R, '#8b5a2b', '#5a3720', R, 1089);

  // plant in the back-left corner
  const plx = bx + 14 * R, ply = floorTop + 16 * R;
  block(plx, ply, 34 * R, 14 * R, 26 * R, '#b85f3f', '#9a4b30', R, 1090);
  for (const [ox, oy] of [[-10, -14], [8, -18], [0, -26], [16, -6], [-16, -4]]) { sketch(ctx, ellipsePts(plx + 17 * R + ox * R, ply - 4 * R + oy * R, 10 * R, 7 * R, 10), true, 0.3 * R, 1092 + ox); fillInk(ctx, '#6cbf4a', 1.8 * R); }

  // the cube on the rug
  const cs = 56 * R, ccx = r.cx, cy = rugY + 10 * R + Math.sin(time * 2) * 2 * R;
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(ccx, cy + 2 * R, cs * 0.6, 8 * R, 0, 0, Math.PI * 2); ctx.fill();
  sketch(ctx, rectPts(ccx - cs / 2, cy - cs, cs, cs), true, 0.8 * R, 1095); fillInk(ctx, '#fff', 3 * R);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(ccx - cs * 0.18, cy - cs * 0.62, 3 * R, 4.6 * R, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(ccx + cs * 0.18, cy - cs * 0.62, 3 * R, 4.6 * R, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ccx, cy - cs * 0.42, cs * 0.2, 0.15 * Math.PI, 0.85 * Math.PI); ink(ctx, 2.6 * R);

  // night: darker room, warm lamp light
  if (d > 0.001) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${Math.round(lerp(255, 105, d))},${Math.round(lerp(255, 105, d))},${Math.round(lerp(255, 165, d))})`; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowAt(lx, ly, 200 * R, '255,200,110', 0.55 * d); ctx.restore();
  }
  if (bedHover) bubble(b.x + b.w / 2, b.y - 76 * R, 'Sleep');
  if (deskHover) bubble(dk.x + dk.w / 2, dk.y - 30 * R, 'Rod Workbench');
}
const leaveBtn = document.getElementById('leaveCabin'), sleepFade = document.getElementById('sleepFade');
function enterCabin() { insideCabin = true; leaveBtn.classList.remove('hidden'); }
function leaveCabin() { insideCabin = false; bedHover = deskHover = false; leaveBtn.classList.add('hidden'); }
leaveBtn.addEventListener('click', leaveCabin);
// Bed: at night, sleep straight through to the next sunrise (a new morning = a new
// chance for the traveling merchant). Skipped time is saved per player.
let sleeping = false;
function goToSleep() {
  const ck = clock();
  if (ck.isDay) { toast("It's still daytime. You can sleep once it gets dark."); return; }
  if (sleeping) return;
  sleeping = true;
  sleepFade.classList.add('on');
  // wake up just after sunrise, once it's light out
  setTimeout(() => { const c2 = clock(); if (!c2.isDay) { S.timeSkip = (S.timeSkip || 0) + c2.left + FADE_S + 1; save(); } }, 900);
  setTimeout(() => { sleepFade.classList.remove('on'); sleeping = false;
    if (merchant.here) { pendingToast = 'Good morning! The traveling merchant is at the shop!'; pendingBell = true; }
    else { pendingToast = null; toast('Good morning! No merchant today, maybe tomorrow.'); }
  }, 2100);
}

// ---------- traveling merchant's mini shop (just left of the main shop) ----------
const merchantX = () => L.shopX - 240 * K;
function merchantPop() { const w = merchant.walk; return w <= 0 ? 0 : w >= 1 ? 1 : easeOutBack(w); }
function merchantLantern() { const p = merchantPop(); return [merchantX() + 56 * K * p, L.shopBase - 104 * K * p]; }
function hitMerchant(wx, wy) {
  if (merchant.walk < 0.5) return false;
  const x = merchantX();
  return wx > x - 78 * K && wx < x + 78 * K && wy > L.shopBase - 160 * K && wy < L.shopBase + 8 * K;
}
let merchantHover = false;
function drawMerchant() {
  const p = merchantPop();
  if (p <= 0) return;
  const x = merchantX(), by = L.shopBase;
  ctx.save(); ctx.translate(x, by); ctx.scale(p * (merchantHover ? 1.04 : 1), p * (merchantHover ? 1.04 : 1));
  const u = K;
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.ellipse(0, 4 * u, 80 * u, 9 * u, 0, 0, Math.PI * 2); ctx.fill();

  // posts
  for (const px of [-58, 52]) { sketch(ctx, rectPts((px - 3) * u, -134 * u, 7 * u, 90 * u), true, 0.6 * u, 800 + px); fillInk(ctx, '#87582e', 2.2 * u); }

  // the merchant: a cube with round glasses, reading a book behind the counter
  const bob = Math.sin(time * 2) * 1.5 * u, s = 46 * u, cy = -46 * u + bob;
  sketch(ctx, [[-s / 2, cy - s], [s / 2 + u, cy - s - u], [s / 2, cy], [-s / 2 + u, cy + u]], true, 0.8 * u, 810);
  fillInk(ctx, '#fff', 2.8 * u);
  const ey = cy - s * 0.62;
  // plain left eye
  ctx.beginPath(); ctx.ellipse(-10 * u, ey + u, 1.8 * u, 2.6 * u, 0, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
  // monocle on the right eye: gold rim, glass shine, and a little chain
  ctx.beginPath(); ctx.arc(10 * u, ey, 7.5 * u, 0, Math.PI * 2); ctx.fillStyle = 'rgba(200,230,255,.55)'; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 4 * u; ctx.stroke();
  ctx.strokeStyle = '#ffcf3f'; ctx.lineWidth = 2 * u; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(10 * u, ey + u, 1.8 * u, 2.6 * u, 0, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
  ctx.beginPath(); ctx.arc(10 * u, ey, 5 * u, 1.1 * Math.PI, 1.45 * Math.PI); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.4 * u; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(16 * u, ey + 5 * u); ctx.quadraticCurveTo(22 * u, ey + 16 * u, 18 * u, ey + 24 * u);
  ctx.setLineDash([2 * u, 1.6 * u]); ctx.strokeStyle = '#d9a514'; ctx.lineWidth = 1.6 * u; ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(0, ey + 9 * u, 5 * u, 0.15 * Math.PI, 0.85 * Math.PI); ink(ctx, 2 * u);
  // counter
  sketch(ctx, rectPts(-66 * u, -44 * u, 132 * u, 44 * u), true, 0.9 * u, 820); fillInk(ctx, '#b77a43', 2.8 * u);
  sketch(ctx, rectPts(-70 * u, -50 * u, 140 * u, 9 * u), true, 0.7 * u, 821); fillInk(ctx, '#d9a066', 2.4 * u);
  for (const yy of [-28, -14]) { sketch(ctx, [[-62 * u, yy * u], [62 * u, yy * u]], false, 0.4 * u, 822 + yy); ink(ctx, 1.2 * u, 0.3); }
  // open book he's reading, propped up on the counter in front of him
  const bk = -68 * u + bob * 0.5;
  sketch(ctx, [[-22 * u, bk + 4 * u], [0, bk + 8 * u], [22 * u, bk + 4 * u], [22 * u, bk + 18 * u], [0, bk + 22 * u], [-22 * u, bk + 18 * u]], true, 0.4 * u, 814);
  fillInk(ctx, '#7b3fe4', 2.2 * u);
  sketch(ctx, [[-19 * u, bk], [0, bk + 5 * u], [0, bk + 19 * u], [-19 * u, bk + 14 * u]], true, 0.4 * u, 815); fillInk(ctx, '#fffaf0', 1.8 * u);
  sketch(ctx, [[19 * u, bk], [0, bk + 5 * u], [0, bk + 19 * u], [19 * u, bk + 14 * u]], true, 0.4 * u, 816); fillInk(ctx, '#fffaf0', 1.8 * u);
  for (const ly of [4, 8, 12]) { sketch(ctx, [[-15 * u, bk + ly * u], [-4 * u, bk + (ly + 3) * u]], false, 0.15 * u, 817 + ly); ink(ctx, 1 * u, 0.5); sketch(ctx, [[4 * u, bk + (ly + 3) * u], [15 * u, bk + ly * u]], false, 0.15 * u, 819 + ly); ink(ctx, 1 * u, 0.5); }
  // goods on the counter: little jars and a gem
  for (const [gx, col] of [[-52, '#b5ff7a'], [-40, '#ff8fab'], [46, '#7fd8ff']]) {
    sketch(ctx, rectPts((gx - 4) * u, -62 * u, 9 * u, 12 * u), true, 0.3 * u, 830 + gx); fillInk(ctx, col, 1.8 * u);
  }
  sketch(ctx, [[54 * u, -50 * u], [60 * u, -60 * u], [66 * u, -50 * u], [60 * u, -45 * u]], true, 0.3 * u, 835); fillInk(ctx, '#ffd84d', 1.8 * u);

  // purple banner with gold fringe
  const bw = 150 * u, bt = -150 * u, bh = 26 * u;
  sketch(ctx, rectPts(-bw / 2, bt, bw, bh), true, 0.8 * u, 840); fillInk(ctx, '#7b3fe4', 2.8 * u);
  for (let i = 0; i < 10; i++) {
    const x0 = -bw / 2 + i * bw / 10;
    sketch(ctx, [[x0, bt + bh], [x0 + bw / 10, bt + bh], [x0 + bw / 20, bt + bh + 9 * u]], true, 0.3 * u, 841 + i);
    fillInk(ctx, i % 2 ? '#ffcf3f' : '#9b6cf0', 1.6 * u);
  }
  ctx.fillStyle = '#fff'; ctx.font = `${17 * u}px ${HAND_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('MERCHANT', 0, bt + bh / 2 + u);
  // hanging lantern
  sketch(ctx, [[56 * u, -124 * u], [56 * u, -112 * u]], false, 0.2 * u, 850); ink(ctx, 1.4 * u);
  sketch(ctx, rectPts(51 * u, -112 * u, 10 * u, 14 * u), true, 0.3 * u, 851); fillInk(ctx, '#ffe27a', 2 * u);
  // a little magic sparkle
  for (let i = 0; i < 3; i++) {
    const tw = (Math.sin(time * 2.5 + i * 2) + 1) / 2, sx = (-30 + i * 30) * u, sy = (-170 - (i % 2) * 10) * u, r = 5 * u * tw;
    ctx.strokeStyle = '#b085f5'; ctx.lineWidth = 1.8 * u;
    ctx.beginPath(); ctx.moveTo(sx - r, sy); ctx.lineTo(sx + r, sy); ctx.moveTo(sx, sy - r); ctx.lineTo(sx, sy + r); ctx.stroke();
  }
  ctx.restore();
  if (merchantHover) bubble(x, by - 196 * K, 'Traveling Merchant!');
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
const clockEl = $('#clock'), clockVal = $('#clockVal'), merchantEl = $('#merchant'), merchantBody = $('#merchantBody');
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
  // each item stacks up to STACK_MAX; a catch that doesn't fit slips back into the pond
  const have = S.inventory[item.id] || 0;
  F.itemFull = have >= STACK_MAX;
  if (!F.itemFull) { S.inventory[item.id] = have + 1; pendingStash = 1; }
  S.caught++; save();

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
      ${F.itemFull
        ? `<div class="reveal-full">Your ${item.name} stack is full (${STACK_MAX}/${STACK_MAX})! It slipped back into the pond. Sell some at the shop.</div>`
        : `<div class="reveal-stack">In your backpack: ${S.inventory[item.id]}</div>`}
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
  if (F.itemFull) {
    // didn't fit: no trip to the backpack, the popup just fades away
    revealEl.classList.add('closing'); revealEl.classList.remove('show');
    setTimeout(() => { if (!revealOpen) revealEl.classList.add('hidden'); if (F.state === 'cooldown') go('idle'); }, 500);
    go('cooldown');
    if (F.ranOut) { toast(`You ran out of ${F.ranOut}!`); F.ranOut = null; }
    return;
  }
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
function tileHTML(id, count, attrs = '', showFull = false) {
  const it = ITEM[id], r = RARITIES[it.rarity];
  return `<div class="tile" style="--rc:${r.color}" data-id="${id}" ${attrs} title="${it.name} (${r.name})">
    <span class="c${showFull && count >= STACK_MAX ? ' full' : ''}">${showFull && count >= STACK_MAX ? 'FULL' : count > 1 ? 'x' + count : ''}</span>
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
const exclusiveTag = x => x.deal
  ? `<span class="tag sale">SALE −${Math.round((1 - x.price / x.oldPrice) * 100)}%</span>`
  : x.merchant ? '<span class="tag">Merchant exclusive</span>' : '';
function rodCard(r) {
  const owned = S.ownedRods.includes(r.id), eq = S.rod === r.id;
  const was = r.oldPrice ? `<s class="old-price">${fmt(r.oldPrice)}</s> ` : '';
  let btn;
  if (eq) btn = `<button class="btn sketch btn-equipped" disabled>Equipped ✓</button>`;
  else if (owned) btn = `<button class="btn sketch btn-equip" data-equip-rod="${r.id}">Equip</button>`;
  else btn = `<button class="btn sketch ${S.money >= r.price ? 'btn-buy' : 'btn-poor'}" data-buy-rod="${r.id}">Buy · ${COIN()} ${was}${fmt(r.price)}</button>`;
  return `<div class="card ${eq ? 'equipped' : ''} ${r.merchant ? 'exclusive' : ''} ${r.deal ? 'deal' : ''}">${exclusiveTag(r)}
    <canvas width="240" height="160" data-rod="${r.id}"></canvas>
    <div class="card-name">${r.name}</div><div class="card-desc">${r.desc}</div>
    <div class="stats"><span>🍀 +${Math.round(r.luck * 100)}% luck</span><span>⚡ ${speedText(r)}</span></div>${btn}</div>`;
}
function baitCard(b) {
  const have = S.baits[b.id] || 0, eq = S.bait === b.id;
  let btns = `<button class="btn sketch ${S.money >= b.price ? 'btn-buy' : 'btn-poor'}" data-buy-bait="${b.id}">Buy x${b.uses} · ${COIN()} ${fmt(b.price)}</button>`;
  if (eq) btns += `<button class="btn sketch btn-equipped" data-unequip-bait>Equipped ✓ (tap to remove)</button>`;
  else if (have) btns += `<button class="btn sketch btn-equip" data-equip-bait="${b.id}">Equip</button>`;
  return `<div class="card ${eq ? 'equipped' : ''} ${b.merchant ? 'exclusive' : ''}">${exclusiveTag(b)}
    <div class="icon">${ItemArt.html(b.id, b.emoji)}</div>
    <div class="card-name">${b.name}</div><div class="card-desc">${b.desc}</div>
    <div class="stats"><span>🍀 +${Math.round(b.luck * 100)}% luck</span><span>⚡ ${speedText(b)}</span><span>🎒 You have ${have}</span></div>${btns}</div>`;
}
// merchant rods / baits are only sold by the traveling merchant, but still show up
// in the regular shop once you own them (so you can re-equip or restock)
function renderRods() {
  const list = RODS.filter(r => !r.merchant || S.ownedRods.includes(r.id)).concat(S.customRods || []);
  shopBody.innerHTML = `<p class="tab-intro">Fancier poles = better luck and faster bites!</p><div class="cards">` + list.map(rodCard).join('') + '</div>';
  shopBody.querySelectorAll('canvas[data-rod]').forEach(c => drawRodIcon(c, ROD[c.dataset.rod], 'shop'));
}
function renderBait() {
  const list = BAITS.filter(b => !b.merchant || S.baits[b.id]);
  shopBody.innerHTML = `<p class="tab-intro">Bait adds luck and faster bites to every cast until it runs out.</p><div class="cards">` + list.map(baitCard).join('') + '</div>';
}
function cantAfford(btn) { toast('Not enough coins!'); btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake'); }

// Buy / equip buttons on rod and bait cards (shared by the shop and the merchant).
// Returns true when the click was one of these buttons.
function handleGearButton(t) {
  if (t.dataset.buyRod) {
    const r = ROD[t.dataset.buyRod];
    if (S.money < r.price) { cantAfford(t); return true; }
    S.money -= r.price; S.ownedRods.push(r.id); S.rod = r.id; save();
    toast(`You bought the ${r.name}!`); bumpMoney(); refreshHUD(); return true;
  }
  if (t.dataset.equipRod) { S.rod = t.dataset.equipRod; save(); refreshHUD(); return true; }
  if (t.dataset.buyBait) {
    const b = BAIT[t.dataset.buyBait];
    if (S.money < b.price) { cantAfford(t); return true; }
    S.money -= b.price; S.baits[b.id] = (S.baits[b.id] || 0) + b.uses;
    if (!S.bait) S.bait = b.id;
    save(); toast(`+${b.uses} ${b.name}!`); bumpMoney(); refreshHUD(); return true;
  }
  if (t.dataset.equipBait) { S.bait = t.dataset.equipBait; save(); refreshHUD(); return true; }
  if (t.hasAttribute('data-unequip-bait')) { S.bait = null; save(); refreshHUD(); return true; }
  return false;
}

// ---------- Rod workbench: merge two rods into one ----------
const MERGE = window.GAME_DATA.MERGE || { fee: 100000, luckPenalty: 3 };
const mergeEl = $('#merge'), mergeBody = $('#mergeBody');
let mergePick = [];
const shortName = r => r.name.replace(/ Rod$/, '').split('-')[0].split(' ')[0];
// merged rods can't be merged again (and the Basic Rod is always kept)
function mergeCandidates() { return S.ownedRods.filter(id => id !== RODS[0].id && ROD[id] && !ROD[id].merged).map(id => ROD[id]); }
function mergedRod(a, b) {
  // take away the normal penalty, but if that would erase the gain over the better
  // rod, use a smaller one (-100%, then -50%) so merging still pays off
  const best = Math.max(a.luck, b.luck);
  let luck = a.luck + b.luck - MERGE.luckPenalty;
  for (const p of MERGE.softPenalties || [1, 0.5]) if (luck <= best) luck = a.luck + b.luck - p;
  luck = Math.max(luck, best);
  return {
    id: 'merged_' + Date.now().toString(36), name: `${shortName(a)}-${shortName(b)} Rod`, price: 0,
    // speed boosts add together with no penalty: 2.3x + 2.6x faster -> (1.3 + 1.6) extra -> 3.9x faster
    luck: Math.round(luck * 100) / 100, speed: Math.max(0.15, Math.round(100 / (1 + (1 / a.speed - 1) + (1 / b.speed - 1))) / 100),
    colors: [a.colors[0], b.colors[1]], grip: a.grip, accent: b.accent, sparkle: true, merged: true,
    desc: `Merged from the ${a.name} and the ${b.name}.`,
  };
}
function openMerge() { mergePick = []; renderMerge(); openModal(mergeEl); setMoneyText(shownMoney); }
function renderMerge() {
  const list = mergeCandidates();
  mergePick = mergePick.filter(id => list.some(r => r.id === id));
  let html = `<p class="tab-intro">Pick two rods to fuse into one. Luck adds up, minus ${Math.round(MERGE.luckPenalty * 100)}% (or just 100% / 50% if that would cancel the gain). Speed adds up fully. Both rods are used up, and a merged rod can't be merged again.</p>`;
  if (list.length < 2) {
    html += `<div class="empty-note">You need at least 2 rods to merge (not counting the Basic Rod or rods that were already merged). Buy more at the shop!</div>`;
  } else {
    html += `<div class="pick-grid">${list.map(r => `<div class="pick ${mergePick.includes(r.id) ? 'sel' : ''}" data-pick="${r.id}">
      <canvas width="192" height="128" data-rod="${r.id}"></canvas><div class="pn">${r.name}</div><div class="pl">🍀 +${Math.round(r.luck * 100)}%</div></div>`).join('')}</div>`;
    if (mergePick.length === 2) {
      const res = mergedRod(ROD[mergePick[0]], ROD[mergePick[1]]);
      const can = S.money >= MERGE.fee;
      html += `<div class="merge-result"><canvas width="240" height="160" id="mergePreview"></canvas>
        <div class="mr-info"><div class="mr-name">${res.name}</div>
        <div class="mr-stats">🍀 +${Math.round(res.luck * 100)}% luck · ⚡ ${speedText(res)}</div>
        <div class="merge-note">${res.desc}</div></div></div>
        <button class="btn sketch merge-go ${can ? 'btn-buy' : 'btn-poor'}" data-do-merge>Merge · ${COIN()} ${fmt(MERGE.fee)}</button>`;
      mergeBody.__preview = res;
    } else {
      html += `<div class="merge-note" style="margin-top:12px">Pick ${2 - mergePick.length} more rod${mergePick.length === 1 ? '' : 's'}.</div>`;
    }
  }
  mergeBody.innerHTML = html;
  mergeBody.querySelectorAll('canvas[data-rod]').forEach(c => drawRodIcon(c, ROD[c.dataset.rod], 'shop'));
  const pv = mergeBody.querySelector('#mergePreview');
  if (pv && mergeBody.__preview) drawRodIcon(pv, mergeBody.__preview, 'shop');
}
mergeEl.addEventListener('click', e => {
  const pick = e.target.closest('[data-pick]');
  if (pick) {
    const id = pick.dataset.pick;
    if (mergePick.includes(id)) mergePick = mergePick.filter(x => x !== id);
    else { mergePick.push(id); if (mergePick.length > 2) mergePick.shift(); }
    renderMerge(); return;
  }
  const go = e.target.closest('[data-do-merge]');
  if (!go || mergePick.length !== 2) return;
  if (S.money < MERGE.fee) { cantAfford(go); return; }
  const [a, b] = mergePick.map(id => ROD[id]);
  const res = mergedRod(a, b);
  S.money -= MERGE.fee;
  S.ownedRods = S.ownedRods.filter(id => id !== a.id && id !== b.id);
  S.customRods = (S.customRods || []).filter(r => r.id !== a.id && r.id !== b.id);
  S.customRods.push(res); ROD[res.id] = res; S.ownedRods.push(res.id);
  S.rod = res.id; // equip the new rod right away
  save(); bumpMoney(); refreshHUD();
  mergePick = []; renderMerge();
  toast(`You made the ${res.name}! (+${Math.round(res.luck * 100)}% luck)`);
});

// ---------- Property ----------
const propertyEl = $('#property'), propertyBody = $('#propertyBody');
function openProperty() {
  if (S.property) { if (cabinRise() >= 1) enterCabin(); return; } // your cabin: go inside
  {
    const can = S.money >= PROPERTY_PRICE;
    propertyBody.innerHTML = `<p class="prop-text">A plot of land right next to the shop. Buy it and a cozy cabin gets built on it.</p>
      <div class="prop-price">${COIN()} ${fmt(PROPERTY_PRICE)}</div>
      <div class="prop-row">
        <button class="btn sketch ${can ? 'btn-buy' : 'btn-poor'}" data-buy-property>Buy it</button>
        <button class="btn sketch" data-close>Not now</button>
      </div>`;
  }
  openModal(propertyEl);
}
propertyEl.addEventListener('click', e => {
  const t = e.target.closest('[data-buy-property]'); if (!t) return;
  if (S.money < PROPERTY_PRICE) { cantAfford(t); return; }
  S.money -= PROPERTY_PRICE; S.property = true; save();
  cabinBuiltAt = time; // play the build animation
  bumpMoney(); refreshHUD(); closeModal(propertyEl);
  toast('You bought the property! Your cabin is being built...');
});

// ---------- Traveling merchant ----------
function openMerchant() { renderMerchant(); openModal(merchantEl); setMoneyText(shownMoney); }
function renderMerchant() {
  const ck = clock(), st = merchantStock(ck.day);
  merchantBody.innerHTML = `<p class="tab-intro">Rare goods from far away, and not cheap! I pack up when night falls, in <b id="merchantLeft">${mmss(ck.left)}</b>.</p>
    <div class="cards">${st.deals.map(rodCard).join('')}${st.rods.map(rodCard).join('')}${st.baits.map(baitCard).join('')}</div>`;
  merchantBody.querySelectorAll('canvas[data-rod]').forEach(c => drawRodIcon(c, ROD[c.dataset.rod], 'shop'));
}
merchantEl.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (handleGearButton(t)) renderMerchant();
});

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
  if (handleGearButton(t)) renderShop();
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
    <h3>Your Rods (${S.ownedRods.filter(id => ROD[id]).length})</h3>
    <div class="pick-grid rods-grid">${S.ownedRods.filter(id => ROD[id]).map(id => { const r = ROD[id], eq = S.rod === id; return `<div class="pick ${eq ? 'sel' : ''}">
      <canvas width="192" height="128" data-rod="${id}"></canvas><div class="pn">${r.name}</div><div class="pl">🍀 +${Math.round(r.luck * 100)}% · ⚡ ${speedText(r)}</div>
      ${eq ? '<button class="btn sketch btn-equipped" disabled>Equipped ✓</button>' : `<button class="btn sketch btn-equip" data-bag-equip="${id}">Equip</button>`}</div>`; }).join('')}</div>
    <h3 class="section">Items (${invCount()})</h3>
    <div class="grid">${ids.length ? ids.map(id => tileHTML(id, S.inventory[id], '', true)).join('') : '<div class="empty-note">Your backpack is empty. Tap the cube to fish!</div>'}</div>
    <div class="section"><h3>Collection (${found}/${ITEMS.length})</h3>
      <div class="grid">${ITEMS.slice().sort((a, b) => a.rarity - b.rarity).map(it => S.discovered[it.id]
        ? `<div class="tile" style="--rc:${RARITIES[it.rarity].color}" title="${it.name}"><span class="e">${ItemArt.html(it.id, it.emoji)}</span><span class="n">${it.name}</span><span class="r">${RARITIES[it.rarity].name}</span></div>`
        : `<div class="tile unknown" title="Not found yet"><span class="e">${ItemArt.html(it.id, it.emoji)}</span><span class="n">???</span><span class="r">${RARITIES[it.rarity].name}</span></div>`).join('')}</div>
    </div>
    <button class="reset" data-reset>Reset all progress</button>`;
  bagBody.querySelectorAll('canvas[data-rod]').forEach(c => drawRodIcon(c, ROD[c.dataset.rod], 'shop'));
}
bagEl.addEventListener('click', e => {
  const eq = e.target.closest('[data-bag-equip]');
  if (eq) { S.rod = eq.dataset.bagEquip; save(); refreshHUD(); renderBag(); toast(`Equipped the ${ROD[S.rod].name}`); return; }
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
// On narrow screens, when the merchant is visiting, center between his stall and the shop
// so both fit; otherwise center the shop.
const shopViewCam = () => clampCam((W < 700 ? L.shopX - 110 * K : L.shopX) - W / 2);
navShop.addEventListener('click', () => { camTarget = shopViewCam(); });
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
  if (insideCabin) {
    bedHover = hitBed(e.clientX, e.clientY); deskHover = hitDesk(e.clientX, e.clientY);
    cv.style.cursor = (bedHover || deskHover) ? 'pointer' : 'default';
    return;
  }
  if (ptr) {
    const dx = e.clientX - ptr.x;
    if (Math.abs(dx) > 8) ptr.moved = true;
    if (ptr.moved) camTarget = clampCam(ptr.cam - dx);
  }
  const wx = e.clientX + cam, wy = e.clientY;
  cubeHover = hitCube(wx, wy); merchantHover = hitMerchant(wx, wy); shopHover = !merchantHover && hitShop(wx, wy);
  propHover = !merchantHover && !shopHover && hitProperty(wx, wy);
  cv.style.cursor = (cubeHover || shopHover || merchantHover || propHover) ? 'pointer' : (ptr && ptr.moved ? 'grabbing' : 'default');
});
cv.addEventListener('pointerup', e => {
  if (insideCabin) {
    if (hitBed(e.clientX, e.clientY)) goToSleep();
    else if (hitDesk(e.clientX, e.clientY)) openMerge();
    ptr = null; return;
  }
  if (ptr && !ptr.moved) {
    const wx = e.clientX + cam, wy = e.clientY;
    if (hitCube(wx, wy)) startFishing();
    else if (hitMerchant(wx, wy)) openMerchant();
    else if (hitShop(wx, wy)) openShop();
    else if (hitProperty(wx, wy)) openProperty();
  }
  ptr = null;
});
cv.addEventListener('pointercancel', () => { ptr = null; });
cv.addEventListener('pointerleave', () => { shopHover = cubeHover = merchantHover = propHover = false; });
window.addEventListener('wheel', e => {
  if (modalOpen || revealOpen || insideCabin) return;
  e.preventDefault();
  camTarget = clampCam(camTarget + e.deltaX - e.deltaY);
}, { passive: false });
// F11 or Ctrl+F11: toggle fullscreen for the game (computers)
function toggleFullscreen() {
  const d = document, el = d.documentElement;
  try {
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
  } catch (err) { toast('Fullscreen is not available here'); }
}
window.addEventListener('keydown', e => {
  if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); return; }
  if (e.key === 'Escape' && modalOpen) closeModal(modalOpen);
  if (e.code === 'Space' || e.key === 'Enter') {
    if (revealOpen) { e.preventDefault(); closeReveal(); }
    else if (!modalOpen && !insideCabin && e.code === 'Space') { e.preventDefault(); startFishing(); }
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
