// ============================================================
//  GAME DATA — edit prices, items, rods and bait here!
// ============================================================
window.GAME_DATA = {
  // How strongly luck pushes rolls toward rarer tiers (higher = stronger).
  LUCK_POWER: 0.5,

  // Day / night cycle, in seconds.
  DAY_SECONDS: 600,
  NIGHT_SECONDS: 600,

  // Traveling merchant: chance to show up each morning, and how many of his
  // rods / baits he brings per visit (picked from the `merchant: true` entries below).
  // `deals` = how many sale rods (the `deal: true` ones) he brings each visit.
  MERCHANT: { chance: 0.10, rods: 2, baits: 2, deals: 5 },

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
    { id: 'boot',     name: 'Old Boot',            emoji: '👢', rarity: 0, price: 30 },
    { id: 'can',      name: 'Tin Can',             emoji: '🥫', rarity: 0, price: 20 },
    { id: 'seaweed',  name: 'Clump of Seaweed',    emoji: '🌿', rarity: 0, price: 20 },
    { id: 'stick',    name: 'Soggy Stick',         emoji: '🪵', rarity: 0, price: 30 },
    { id: 'sock',     name: 'Wet Sock',            emoji: '🧦', rarity: 0, price: 40 },
    { id: 'sardine',  name: 'Sardine',             emoji: '🐟', rarity: 0, price: 60 },
    { id: 'rock',     name: 'Smooth Rock',         emoji: '🪨', rarity: 0, price: 30 },
    // Uncommon
    { id: 'ham',      name: 'Piece of Ham',        emoji: '🍖', rarity: 1, price: 140 },
    { id: 'crab',     name: 'Crab',                emoji: '🦀', rarity: 1, price: 160 },
    { id: 'shrimp',   name: 'Shrimp',              emoji: '🦐', rarity: 1, price: 120 },
    { id: 'duck',     name: 'Rubber Duck',         emoji: '🦆', rarity: 1, price: 150 },
    { id: 'frog',     name: 'Frog',                emoji: '🐸', rarity: 1, price: 180 },
    { id: 'teddy',    name: 'Soggy Teddy Bear',    emoji: '🧸', rarity: 1, price: 120 },
    { id: 'pizza',    name: 'Slice of Pizza',      emoji: '🍕', rarity: 1, price: 100 },
    // Rare
    { id: 'puffer',   name: 'Pufferfish',          emoji: '🐡', rarity: 2, price: 450 },
    { id: 'octopus',  name: 'Octopus',             emoji: '🐙', rarity: 2, price: 550 },
    { id: 'lobster',  name: 'Lobster',             emoji: '🦞', rarity: 2, price: 600 },
    { id: 'squid',    name: 'Squid',               emoji: '🦑', rarity: 2, price: 500 },
    { id: 'turtle',   name: 'Turtle',              emoji: '🐢', rarity: 2, price: 700 },
    { id: 'bottle',   name: 'Message in a Bottle', emoji: '🍾', rarity: 2, price: 400 },
    // Cool
    { id: 'tropical', name: 'Tropical Fish',       emoji: '🐠', rarity: 3, price: 1100 },
    { id: 'shades',   name: 'Pair of Sunglasses',  emoji: '🕶️', rarity: 3, price: 1300 },
    { id: 'skate',    name: 'Skateboard',          emoji: '🛹', rarity: 3, price: 1500 },
    { id: 'guitar',   name: 'Electric Guitar',     emoji: '🎸', rarity: 3, price: 1800 },
    { id: 'gamepad',  name: 'Game Controller',     emoji: '🎮', rarity: 3, price: 1600 },
    { id: 'coin',     name: 'Gold Coin',           emoji: '🪙', rarity: 3, price: 1200 },
    // Awesome
    { id: 'shark',    name: 'Shark',               emoji: '🦈', rarity: 4, price: 3200 },
    { id: 'gold',     name: 'Bag of Gold',         emoji: '💰', rarity: 4, price: 3500 },
    { id: 'diamond',  name: 'Diamond',             emoji: '💎', rarity: 4, price: 4000 },
    { id: 'trophy',   name: 'Golden Trophy',       emoji: '🏆', rarity: 4, price: 3000 },
    { id: 'robot',    name: 'Robot',               emoji: '🤖', rarity: 4, price: 3600 },
    { id: 'rocket',   name: 'Toy Rocket',          emoji: '🚀', rarity: 4, price: 2800 },
    // Legendary
    { id: 'crown',    name: 'Royal Crown',         emoji: '👑', rarity: 5, price: 11000 },
    { id: 'whale',    name: 'Whale',               emoji: '🐋', rarity: 5, price: 13000 },
    { id: 'trident',  name: 'Ancient Trident',     emoji: '🔱', rarity: 5, price: 15000 },
    { id: 'dolphin',  name: 'Dolphin',             emoji: '🐬', rarity: 5, price: 10000 },
    // Mythic
    { id: 'unicorn',  name: 'Unicorn',             emoji: '🦄', rarity: 6, price: 16000 },
    { id: 'star',     name: 'Fallen Star',         emoji: '🌟', rarity: 6, price: 18500 },
    { id: 'ufo',      name: 'UFO',                 emoji: '🛸', rarity: 6, price: 20000 },
    { id: 'rainbow',  name: 'Rainbow',             emoji: '🌈', rarity: 6, price: 17500 },
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
    // Traveling merchant only
    { id: 'tidecaller', name: 'Tidecaller Rod', price: 650000,   luck: 4.0,  speed: 0.48, colors: ['#0f6e8c', '#7ff0e0'], grip: '#0b3340', accent: '#e9fffb', desc: 'Calls the rare ones in with the tide.', sparkle: true, merchant: true },
    { id: 'starfall',   name: 'Starfall Rod',   price: 3000000,  luck: 7.0,  speed: 0.40, colors: ['#1b1f5e', '#ffe680'], grip: '#0d0f30', accent: '#fff3b0', desc: 'Made from a star that fell in a pond.', sparkle: true, merchant: true },
    { id: 'rainbowrod', name: 'Rainbow Rod',    price: 9000000,  luck: 12.0, speed: 0.30, colors: ['#ff5f6d', '#7fd8ff'], grip: '#3d2a7a', accent: '#ffe066', desc: 'The best rod there is. Very hard to find.', sparkle: true, merchant: true },
    // Traveling merchant sale rods: shown as `oldPrice` crossed out, sold for `price`
    { id: 'coralcrown', name: 'Coral Crown Rod',     oldPrice: 1500000,  price: 120000, luck: 4.0, speed: 0.48, colors: ['#ff6f91', '#ffd1dc'], grip: '#6b1f3a', accent: '#ffe066', desc: 'Grown on a reef fit for a king.', sparkle: true, merchant: true, deal: true },
    { id: 'sunken',     name: 'Sunken Treasure Rod', oldPrice: 3000000,  price: 200000, luck: 5.0, speed: 0.45, colors: ['#0f5f6e', '#ffd36e'], grip: '#3b2a12', accent: '#ffe680', desc: 'Pulled up from a shipwreck. He wants it gone.', sparkle: true, merchant: true, deal: true },
    { id: 'thunder',    name: 'Thunder Rod',         oldPrice: 5000000,  price: 350000, luck: 6.0, speed: 0.42, colors: ['#2b2f6b', '#ffef5a'], grip: '#14162e', accent: '#9be7ff', desc: 'Crackles when a big one bites.', sparkle: true, merchant: true, deal: true },
    { id: 'frostbite',  name: 'Frostbite Rod',       oldPrice: 7500000,  price: 500000, luck: 7.5, speed: 0.40, colors: ['#5ec8ff', '#ffffff'], grip: '#1d3557', accent: '#bdf0ff', desc: 'So cold the fish freeze in surprise.', sparkle: true, merchant: true, deal: true },
    { id: 'galaxy',     name: 'Galaxy Rod',          oldPrice: 12000000, price: 900000, luck: 9.0, speed: 0.36, colors: ['#1a0b3d', '#c77dff'], grip: '#0b0620', accent: '#ffd6ff', desc: 'Holds a whole galaxy in the handle.', sparkle: true, merchant: true, deal: true },
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
    // Traveling merchant only
    { id: 'mystery',  name: 'Mystery Bait',  emoji: '❓', price: 120000, uses: 10, luck: 2.80, speed: 0.42, desc: 'Nobody knows what is in it. Fish love it.', merchant: true },
    { id: 'goldlure', name: 'Golden Lure',   emoji: '🪝', price: 400000, uses: 10, luck: 4.00, speed: 0.32, desc: 'A shiny lure that never runs dry of luck.', merchant: true },
    { id: 'krakenink',name: 'Kraken Ink',    emoji: '🦑', price: 900000, uses: 10, luck: 5.50, speed: 0.26, desc: 'One drop and the deep wakes up.', merchant: true },
  ],
};
