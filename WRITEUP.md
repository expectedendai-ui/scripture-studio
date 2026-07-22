# Scripture Studio — Scripture inside the creative workflow

**Live demo:** https://scripture-studio.pages.dev · **Code:** https://github.com/expectedendai-ui/scripture-studio · **Video:** (YouTube link TBD)

## The problem

Billions of moments of creation happen every day — a student making an encouraging post for a stressed friend, a coach hyping his team, a youth leader building slides at midnight. In those moments, Scripture is never present. Not because it doesn't belong there, but because reaching for it means leaving the workflow: open a Bible app, search, copy, paste, lose the moment.

I know this gap personally. I'm a 22-year-old college student and the solo founder of MyBibleLens, a Bible-study app live on the App Store. My users constantly *make things* — verse art, study canvases, sermon slides. The lesson from shipping that app: people don't need another destination for Scripture. They need Scripture to show up **where they already are, mid-creation.**

## What I built

Scripture Studio is a conversational creator tool. You talk to it like a friend: *"I'm making a hype workout story for my teammates about not quitting during two-a-days."* Then:

1. **Gloo AI Studio** (chat completions, auto-routing) reasons about the moment and chooses one passage that genuinely fits — no keyword matching, no stretching. It replies conversationally and explains why the verse belongs.
2. **YouVersion Platform API** delivers the real, licensed verse text in the creator's chosen translation — 9 versions across English, Spanish, French, Portuguese, and Chinese.
3. A finished verse card lands on a canvas gallery — and exports as a 1080×1350 PNG, ready to post.

It's multi-turn: say *"too soft — make it HYPE like a locker room speech"* and Gloo keeps the verse but rewrites the caption in your register. The conversation IS the creative tool. Speak Spanish to it, and it answers — and quotes Reina-Valera — in Spanish.

## How it works

Static front end + a Cloudflare Worker proxy. The Worker holds all credentials as secrets (OAuth2 client-credentials flow for Gloo with token caching; YouVersion app key server-side), normalizes verse references (Gloo emits `PHP.4.6-PHP.4.7`; YouVersion wants `PHP.4.6-7`), and caches the Bible-version map across five languages. No keys ever touch the browser or the repo. Every card is real API output — nothing mocked.

## Why this matters at scale

This pattern — intent → faith-tuned reasoning → licensed Scripture → finished asset — drops into any creator surface: sticker pickers, sermon builders, social composers, design tools. I'm already building it into MyBibleLens as a canvas-native compose button, where my users will speak a moment and watch the Word land on their sanctuary canvas. The bridge from "billions live where Scripture never shows up" to "Scripture present in the making" is exactly one conversation long.

Built solo in one day on the YouVersion Platform and Gloo AI Studio — because the fastest way to prove Scripture belongs in the creative workflow was to let it compose mine.
