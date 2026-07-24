# Scripture Studio — Scripture inside the creative workflow

**Subtitle:** A compose feature built on the YouVersion Platform + Gloo AI Studio — from the solo founder of MyBibleLens, live on the Apple App Store.

**Live demo:** https://scripture-studio.pages.dev · **Code:** https://github.com/expectedendai-ui/scripture-studio · **Video:** (YouTube link)

---

## The problem

Billions of people spend their lives creating in digital spaces — posts, stories, slides, art. In all of that creating, Scripture almost never shows up. Not because it doesn't belong there, but because no one built the bridge into the moment itself. Reaching for a verse means leaving your workflow to go search a Bible app. The moment passes.

## What it does

Scripture Studio is a conversational compose feature. You speak the moment — *"a sermon slide on identity for youth night — who God says you are"* — and it responds like a creative partner. **Gloo AI Studio** reads the intent and reasons to the verse that genuinely fits (no keyword matching), explaining why. **The YouVersion Platform** delivers the real, licensed text. The verse then lands where you're already working:

- On an **Infinite Canvas** — a living landscape where the verse card drops as a draggable object, beside your notes.
- Into a **Sermon Deck** — one tap turns it into a presentation slide.
- Saved as a **Reflection** — every conversation is kept to revisit.

It works in every language — ask in Spanish and it answers in Spanish, quoting the actual Spanish Bible. This is built for the whole Church, not just English speakers.

## How it works

A static front end talks to a Cloudflare Worker that holds both credentials as secrets (OAuth2 client-credentials for Gloo with token caching; the YouVersion app key server-side). The Worker normalizes verse references between the two APIs and caches the version map across five languages. No keys ever touch the browser. Every card is live API output — nothing is mocked; the code is open source.

## Why it matters — and why it's already real

This isn't a hackathon idea. **MyBibleLens is my app, live on the Apple App Store since July 2026, built entirely by me** — one person, self-taught, from a blank page, guided by what felt right and by God's word. Everything you see here already exists in it: the Infinite Canvas, the Sermon Builder, Reflections. I had a finished, shipped product before I ever found this challenge — then I saw exactly where YouVersion and Gloo fit.

That's the point. The pattern — **intent → faith-tuned reasoning → licensed Scripture → finished asset** — drops into any creative surface: sermon builders, social composers, design tools. I'm building it into MyBibleLens as a canvas-native compose button, so a youth pastor can speak a moment and watch the Word land on their sanctuary canvas.

Scripture didn't make me leave what I was doing. It showed up inside it. That's the bridge — and it's one conversation long.
