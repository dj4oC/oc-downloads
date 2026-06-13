# oc-downloads

A static **"Get ownCloud"** page that aggregates every ownCloud download surface
into one place — server (oCIS + ownCloud 10), Docker/Helm, desktop clients, and
mobile apps — and routes the right person to the right download in seconds.

It is intended to become the canonical replacement for `download.owncloud.com`.
This repo (`dj4oC/oc-downloads`) is the working prototype; once approved it will
be proposed as a pull request into the `owncloud` org.

> **Live page:** https://dj4oC.github.io/oc-downloads/

## How it works

- **No framework, no build step.** Plain `index.html`, `style.css`, and `app.js`.
- `app.js` reads `data/releases.json` at runtime and renders the dynamic bits
  (versions, file sizes, per-platform binary buttons). If that fetch fails, the
  page still renders with static fallback content — it never breaks.
- The GitHub API is **never** called from the browser. Release data is fetched
  server-side by a scheduled workflow and committed to the repo as a cached JSON
  file, so the page loads instantly and works offline of the API.

## Repository layout

```
.github/workflows/
  fetch-data.yml   # daily (+ on push / manual) — refreshes data/releases.json
  deploy.yml       # deploys to GitHub Pages on push to main
data/
  releases.json    # cached release metadata (auto-generated, committed)
index.html         # the page
style.css          # styles
app.js             # reads releases.json, renders dynamic sections
```

## Run locally

No dependencies. Serve the folder over HTTP (so `fetch('data/releases.json')`
resolves) and open the printed URL:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then visit http://localhost:8000.

## How the data fetch works

`fetch-data.yml` calls the GitHub Releases API (authenticated with the built-in
`GITHUB_TOKEN`) for these `owncloud` repos and keeps the most recent **stable**
releases (drafts and pre-releases are excluded):

| Repo               | Surface          | Releases kept |
| ------------------ | ---------------- | ------------- |
| `owncloud/ocis`    | oCIS server      | 3             |
| `owncloud/client`  | Desktop client   | 2             |
| `owncloud/android` | Android app      | 1             |
| `owncloud/ios-app` | iOS app          | 1             |

For each release it stores `tag_name`, `name`, `published_at`, `html_url`, the
release `body` (markdown headers stripped, trimmed to 300 chars), and each asset's
`name`, `browser_download_url`, and `size`. The combined result is written to
`data/releases.json` and committed with `[bot] update release data` only when it
changed.

**Trigger it manually:** Actions tab → *Fetch release data* → *Run workflow*
(or `gh workflow run fetch-data.yml`).

## Deployment

`deploy.yml` publishes the repo root to GitHub Pages on every push to `main`
(and on demand). One-time setup: repo **Settings → Pages → Source → "GitHub
Actions"**.

## Proposing changes

1. Fork / branch and open a PR against `dj4oC/oc-downloads`.
2. Keep it dependency-free — no npm, no bundler, no tracking scripts.
3. The intended path is for this to graduate into the `owncloud` org as the
   official downloads page; keep content vendor-neutral and links canonical.

## License

MIT for the code in this repository (see `LICENSE`). The ownCloud project itself
is licensed separately (AGPL and others) by ownCloud GmbH.
