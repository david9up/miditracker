# Deploying & publishing MidiTracker

Production output lives in `dist/`. The app is static — no server runtime.

## Pre-publish checklist

Run locally before the first GitHub push:

```bash
cd miditracker
npm ci
npm run test:all          # unit + smoke + expert suites
npm run release           # test + production build
npm run build:pages       # verify GitHub Pages asset paths
npx playwright install chromium   # first time only
npm run screenshots       # refresh docs/screenshots/*.png for README
```

Confirm:

- [ ] `docs/screenshots/` contains all five PNGs (see `docs/screenshots/README.md`)
- [ ] No personal paths in `fixtures/**/manifest.json`
- [ ] `npm run build:pages` — open `dist/index.html` and check asset URLs use `/miditracker/`
- [ ] About dialog shows **v1.0.0**

## GitHub repo setup

1. Create **https://github.com/david9up/miditracker** (public)
2. Push `main` and tag `v1.0.0`
3. **Settings → Pages** → source: **GitHub Actions**
4. **About** → add description + topics: `midi`, `polyend`, `tracker`, `chiptune`, `vue`

```bash
git init
git add .
git commit -m "MidiTracker 1.0.0 — initial public release"
git branch -M main
git remote add origin https://github.com/david9up/miditracker.git
git push -u origin main
git tag -a v1.0.0 -m "MidiTracker 1.0.0"
git push origin v1.0.0
```

Live URL after first Pages deploy:

**https://david9up.github.io/miditracker/**

### Blank page troubleshooting

If view-source shows HTML but the screen is blank, open DevTools → **Network** and check the main `.js` file:

- **Wrong:** `https://david9up.github.io/assets/index-….js` (404)
- **Correct:** `https://david9up.github.io/miditracker/assets/index-….js`

The Pages workflow must build with `DEPLOY_PAGES=true` so Vite uses `base: '/miditracker/'`. Re-run **Actions → Deploy GitHub Pages → Run workflow** after fixing.

## GitHub Actions

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `test.yml` | push / PR to `main` | `npm ci` → test → build |
| `pages.yml` | push to `main` | test → `build:pages` → deploy `dist/` |

## Manual Pages build

```bash
npm ci
npm run build:pages
# dist/ is ready for any static host under /miditracker/
```

## README screenshots

```bash
npm run screenshots
git add docs/screenshots/*.png
```

Status bar is hidden in capture CSS. Sample: **Sample** button. Import shot: Doom E1M1 fixture.

## Release tag

Publish a GitHub Release from tag `v1.0.0` using notes from [CHANGELOG.md](CHANGELOG.md).
