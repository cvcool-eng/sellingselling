// ============================================================
//  GAME DATA — edit prices, items, rods and bait here!
// ============================================================
window.GAME_DATA = {
  // How strongly luck pushes rolls toward rarer tiers (higher = stronger).
  LUCK_POWER: 0.5,

  // Worst -> best. "weight" = base chance (out of the total of all weights).
  RARITIES: [
    { name: 'Common',    color: '#8a8f98', weight: 50 },
    { name: 'Uncommon',  color: '#3fae4a', weight: 26 },
    { name: 'Rare',      color: '#2f7fe8', weight: 13 },
    { name: 'Cool',      color: '#12b5c6', weight: 6.5 },
    { name: 'Awesome',   color: '#9b4de0', weight: 3 },
    { name: 'Legendary', color: '#f0a020', weight: 1.1 },
    { name: 'Mythic',    color: '#ff3d7f', weight: 0.4 },
  ],

  // rarity: index into RARITIES (0 = Common ... 6 = Mythic). price = sell value.
  ITEMS: [
    // Common
    { id: 'boot',     name: 'Old Boot',            emoji: '👢', rarity: 0, price: 3 },
    { id: 'can',      name: 'Tin Can',             emoji: '🥫', rarity: 0, price: 2 },
    { id: 'seaweed',  name: 'Clump of Seaweed',    emoji: '🌿', rarity: 0, price: 2 },
    { id: 'stick',    name: 'Soggy Stick',         emoji: '🪵', rarity: 0, price: 3 },
    { id: 'sock',     name: 'Wet Sock',            emoji: '🧦', rarity: 0, price: 4 },
    { id: 'sardine',  name: 'Sardine',             emoji: '🐟', rarity: 0, price: 6 },
    { id: 'rock',     name: 'Smooth Rock',         emoji: '🪨', rarity: 0, price: 3 },
    // Uncommon
    { id: 'ham',      name: 'Piece of Ham',        emoji: '🍖', rarity: 1, price: 14 },
    { id: 'crab',     name: 'Crab',                emoji: '🦀', rarity: 1, price: 16 },
    { id: 'shrimp',   name: 'Shrimp',              emoji: '🦐', rarity: 1, price: 12 },
    { id: 'duck',     name: 'Rubber Duck',         emoji: '🦆', rarity: 1, price: 15 },
    { id: 'frog',     name: 'Frog',                emoji: '🐸', rarity: 1, price: 18 },
    { id: 'teddy',    name: 'Soggy Teddy Bear',    emoji: '🧸', rarity: 1, price: 12 },
    { id: 'pizza',    name: 'Slice of Pizza',      emoji: '🍕', rarity: 1, price: 10 },
    // Rare
    { id: 'puffer',   name: 'Pufferfish',          emoji: '🐡', rarity: 2, price: 45 },
    { id: 'octopus',  name: 'Octopus',             emoji: '🐙', rarity: 2, price: 55 },
    { id: 'lobster',  name: 'Lobster',             emoji: '🦞', rarity: 2, price: 60 },
    { id: 'squid',    name: 'Squid',               emoji: '🦑', rarity: 2, price: 50 },
    { id: 'turtle',   name: 'Turtle',              emoji: '🐢', rarity: 2, price: 70 },
    { id: 'bottle',   name: 'Message in a Bottle', emoji: '🍾', rarity: 2, price: 40 },
    // Cool
    { id: 'tropical', name: 'Tropical Fish',       emoji: '🐠', rarity: 3, price: 110 },
    { id: 'shades',   name: 'Pair of Sunglasses',  emoji: '🕶️', rarity: 3, price: 130 },
    { id: 'skate',    name: 'Skateboard',          emoji: '🛹', rarity: 3, price: 150 },
    { id: 'guitar',   name: 'Electric Guitar',     emoji: '🎸', rarity: 3, price: 180 },
    { id: 'gamepad',  name: 'Game Controller',     emoji: '🎮', rarity: 3, price: 160 },
    { id: 'coin',     name: 'Gold Coin',           emoji: '🪙', rarity: 3, price: 120 },
    // Awesome
    { id: 'shark',    name: 'Shark',               emoji: '🦈', rarity: 4, price: 320 },
    { id: 'gold',     name: 'Bag of Gold',         emoji: '💰', rarity: 4, price: 350 },
    { id: 'diamond',  name: 'Diamond',             emoji: '💎', rarity: 4, price: 400 },
    { id: 'trophy',   name: 'Golden Trophy',       emoji: '🏆', rarity: 4, price: 300 },
    { id: 'robot',    name: 'Robot',               emoji: '🤖', rarity: 4, price: 360 },
    { id: 'rocket',   name: 'Toy Rocket',          emoji: '🚀', rarity: 4, price: 280 },
    // Legendary
    { id: 'crown',    name: 'Royal Crown',         emoji: '👑', rarity: 5, price: 1100 },
    { id: 'whale',    name: 'Whale',               emoji: '🐋', rarity: 5, price: 1300 },
    { id: 'trident',  name: 'Ancient Trident',     emoji: '🔱', rarity: 5, price: 1500 },
    { id: 'dolphin',  name: 'Dolphin',             emoji: '🐬', rarity: 5, price: 1000 },
    // Mythic
    { id: 'unicorn',  name: 'Unicorn',             emoji: '🦄', rarity: 6, price: 1600 },
    { id: 'star',     name: 'Fallen Star',         emoji: '🌟', rarity: 6, price: 1850 },
    { id: 'ufo',      name: 'UFO',                 emoji: '🛸', rarity: 6, price: 2000 },
    { id: 'rainbow',  name: 'Rainbow',             emoji: '🌈', rarity: 6, price: 1750 },
  ],

  // luck: +luck (0.2 = +20%). speed: wait-time multiplier (lower = faster bites).
  // colors: [shaft base, shaft tip], grip, accent (reel / tip)
  RODS: [
    { id: 'basic',      name: 'Basic Rod',      price: 0,        luck: 0,    speed: 1.00, colors: ['#8b5a2b', '#c99a62'], grip: '#3a3a3a', accent: '#c9c9c9', desc: 'Trusty old stick with a string.' },
    { id: 'bamboo',     name: 'Bamboo Rod',     price: 2000,     luck: 0.2,  speed: 0.92, colors: ['#8fae3c', '#dfe98f'], grip: '#6b4f2a', accent: '#e8d9a8', desc: 'Light, bendy and eco-friendly.' },
    { id: 'fiberglass', name: 'Fiberglass Rod', price: 10000,    luck: 0.5,  speed: 0.85, colors: ['#e9b52a', '#fff1a8'], grip: '#222222', accent: '#ff6b6b', desc: 'Bright yellow and tough as nails.' },
    { id: 'steel',      name: 'Steel Rod',      price: 30000,    luck: 0.75, speed: 0.80, colors: ['#6f7c88', '#dfe6ec'], grip: '#2b2b33', accent: '#4aa3df', desc: 'Heavy duty. Will not snap.' },
    { id: 'carbon',     name: 'Carbon Rod',     price: 75000,    luck: 1.0,  speed: 0.74, colors: ['#1e1e1e', '#5a5a5a'], grip: '#b3261e', accent: '#ff4d4d', desc: 'Pro-grade. Feels every nibble.' },
    { id: 'golden',     name: 'Golden Rod',     price: 250000,   luck: 1.8,  speed: 0.66, colors: ['#c8920c', '#ffe680'], grip: '#5a3b0a', accent: '#ffffff', desc: 'Shiny! Fish love shiny.' },
    { id: 'crystal',    name: 'Crystal Rod',    price: 500000,   luck: 3.0,  speed: 0.58, colors: ['#5ec8ff', '#e6fbff'], grip: '#3d2a7a', accent: '#c59bff', desc: 'Hums softly near rare things.', sparkle: true },
    { id: 'cosmic',     name: 'Cosmic Rod',     price: 900000,   luck: 4.5,  speed: 0.50, colors: ['#3a1c71', '#ff8fb1'], grip: '#101030', accent: '#ffd36e', desc: 'Forged from a shooting star.', sparkle: true },
    { id: 'lava',       name: 'Lava Rod',       price: 2000000,  luck: 6.0,  speed: 0.44, colors: ['#7a1500', '#ff9a2e'], grip: '#2b1a12', accent: '#ffd84d', desc: 'Still warm. Do not touch the tip.', sparkle: true },
    { id: 'void',       name: 'Void Rod',       price: 4000000,  luck: 8.0,  speed: 0.38, colors: ['#120024', '#7b3fe4'], grip: '#000000', accent: '#d0a8ff', desc: 'Fishes from somewhere else entirely.', sparkle: true },
  ],

  // Bait is bought in packs of `uses` casts.
  // speed: bite-wait multiplier, stacks with the rod (0.5 = bites come 2x faster).
  BAITS: [
    { id: 'worm',     name: 'Worms',         emoji: '🪱', price: 75,     uses: 10, luck: 0.10, speed: 0.90, desc: 'Classic. Wiggly.' },
    { id: 'cricket',  name: 'Crickets',      emoji: '🦗', price: 300,    uses: 10, luck: 0.25, speed: 0.85, desc: 'Crunchy and chirpy.' },
    { id: 'cheese',   name: 'Stinky Cheese', emoji: '🧀', price: 1000,   uses: 10, luck: 0.50, speed: 0.80, desc: 'Smells awful. Works great.' },
    { id: 'clover',   name: 'Lucky Clover',  emoji: '🍀', price: 2500,   uses: 10, luck: 0.70, speed: 0.75, desc: 'Four leaves. Very lucky.' },
    { id: 'glow',     name: 'Glow Bait',     emoji: '✨', price: 5000,   uses: 10, luck: 0.90, speed: 0.70, desc: 'Lights up the deep water.' },
    { id: 'goldbait', name: 'Golden Bait',   emoji: '🌟', price: 15000,  uses: 10, luck: 1.40, speed: 0.60, desc: 'Only the fanciest fish bite.' },
    { id: 'stardust', name: 'Stardust',      emoji: '💫', price: 50000,  uses: 10, luck: 2.00, speed: 0.50, desc: 'A pinch of the universe.' },
    { id: 'jelly',    name: 'Rainbow Jelly', emoji: '🌈', price: 120000, uses: 10, luck: 2.60, speed: 0.42, desc: 'Jiggly, glowing, irresistible.' },
    { id: 'comet',    name: 'Comet Chunk',   emoji: '☄️', price: 300000, uses: 10, luck: 3.30, speed: 0.35, desc: 'A piece of a passing comet.' },
  ],
};
