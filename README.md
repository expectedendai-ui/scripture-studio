# Scripture Studio

**Scripture, present inside the creative workflow — not next to it.**

🔴 **Live demo:** https://scripture-studio.pages.dev
⚙️ **Live API proxy:** https://scripture-studio-proxy.expectedendai.workers.dev

An entry for the [Scripture in New Frontiers](https://www.kaggle.com/competitions/scripture-in-new-frontiers) challenge (Gloo × YouVersion, July 2026), exploring the **creator-tools frontier**: what happens when the moment of making — a post, a slide, a story — becomes a moment of encountering Scripture.

Built by [Denzel Rigaud](https://mybiblelens.us), founder of MyBibleLens (live on the App Store).

## What it does

Talk to the studio companion like a friend — *"I'm making a hype workout story for my teammates about not quitting"* — and Scripture Studio:

1. **Understands the moment** using the **Gloo AI Studio API** (faith-tuned chat completions — it reasons about which Scripture genuinely fits, with theological guardrails, and converses across turns: say *"make it more hype"* and it honors the tone)
2. **Fetches the real, licensed verse text** from the **YouVersion Platform API** (2,000+ translations)
3. **Lands finished verse cards on a canvas gallery** — with native-canvas PNG export (1080×1350, ready for the feed)

The demo UI is styled after the MyBibleLens sanctuary aesthetic to show how this frontier looks when it ships inside a real product family.

## Architecture

```
Browser (static app: index.html + app.js)
   │
   ▼
Cloudflare Worker (worker/) — holds API keys as secrets, proxies:
   ├── POST /api/compose  →  Gloo AI Studio API   (intent → verse selection + caption)
   └── GET  /api/passage  →  YouVersion Platform  (verse reference → licensed text)
```

No API keys ever ship to the browser or this repo.

## Run it locally

1. Copy `config.example.js` to `config.js` and set your Worker URL (or run the worker locally).
2. In `worker/`: `cp .dev.vars.example .dev.vars`, add your two API keys, then `npx wrangler dev`.
3. Open `index.html` (any static server: `python3 -m http.server 8080`).

Get free challenge API keys:
- YouVersion Platform: https://platform.youversion.com/summer-virtual-challenge-2026
- Gloo AI Studio: https://studio.ai.gloo.com/challenge

## Deploy

- Worker: `cd worker && npx wrangler deploy`, then `npx wrangler secret put GLOO_API_KEY` and `npx wrangler secret put YOUVERSION_API_KEY`
- Front end: any static host (Cloudflare Pages / Vercel). Set the Worker URL in `config.js`.

## License

MIT (per challenge winner-license requirements).
