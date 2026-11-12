# Pixel FAST

A walkable pixel-art FAST-NUCES Islamabad campus. Everything is drawn in code (no image assets).

## Run

```
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/
npm run preview   # serve dist/ locally
```

Deploy `dist/` to any static host (Vercel: framework "Vite", output `dist`).

## Layout

| File | What it holds |
|---|---|
| `src/main.js` | Scene manager, game loop, camera, input, HUD, floor menu |
| `src/campus.js` | Outdoor campus scene (traced from satellite, names from OpenStreetMap) |
| `src/interiors.js` | Building floors: cafe (C B1), library (C G), faculty parking (D B1), corridors, classrooms |
| `src/sprites.js` | People, trees, the Wisdom Tree, cars |
| `src/util.js` | Noise, colours, pixel text, walk checks |
| `tools/data/fast.json` | Raw OpenStreetMap export used for the layout |

Scenes are built the first time you enter them and then cached. A scene is a plain object
(`bg`, `ents`, `free`, `triggers`, `spawns`, `places`, `labels`), so adding a room means writing
one function in `interiors.js` and returning `r.done({...})`.
