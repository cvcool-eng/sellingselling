# SellingSelling

A hand-drawn fishing RNG game about a little cube who fishes up stuff and sells it. Tap the cube to cast, reel in random stuff, sell it at the shop, and buy better poles and bait.

## Play it on GitHub Pages
1. Create a GitHub repo and upload `index.html`, `style.css`, `game.js`, `data.js`, `items-art.js`, and `title.js`.
2. In the repo, go to **Settings → Pages**.
3. Under **Source**, pick **Deploy from a branch**, then choose `main` and `/ (root)`.
4. After about a minute, the game is live at `https://<your-username>.github.io/<repo-name>/`.

## Changing prices, items, rods and bait
Everything is in **`data.js`**:
- `ITEMS`: name, emoji, rarity (0 = Common … 6 = Mythic) and sell `price`.
- `RODS`: shop `price`, `luck` bonus, `speed` (lower means faster bites) and colors.
- `BAITS`: shop `price`, number of `uses` per pack, and `luck` bonus.
- `RARITIES`: base `weight` (chance) for each tier.

Item drawings live in **`items-art.js`** (one small function per item). A new item with no drawing yet shows its `emoji` until you add one.

After changing any file, bump the `?v=` number on every link in `index.html` so browsers and home-screen apps load the new version instead of a cached copy.

Progress saves automatically in the browser (localStorage).
