/* Scripture Studio — Cloudflare Worker proxy.
   Holds all credentials as Worker secrets; the public front end only ever talks to this.

   Secrets (local: worker/.dev.vars — deployed: `npx wrangler secret put NAME`):
     GLOO_CLIENT_ID      — from https://studio.ai.gloo.com/api-credentials
     GLOO_CLIENT_SECRET  — same page (Client Secret; can be re-copied anytime)
     YOUVERSION_API_KEY  — App Key from https://platform.youversion.com (register an app)

   Gloo auth: OAuth2 client-credentials → bearer token (expires 1h; cached below).
     Token:  POST https://platform.ai.gloo.com/oauth2/token
     Chat:   POST https://platform.ai.gloo.com/ai/v2/chat/completions
   YouVersion: GET https://api.youversion.com/v1/bibles/{bibleId}/passages/{passageId}
     with the app key sent as the x-yvp-app-key header.
*/

const GLOO_TOKEN_URL = "https://platform.ai.gloo.com/oauth2/token";
const GLOO_CHAT_URL = "https://platform.ai.gloo.com/ai/v2/chat/completions";
const YV_BASE = "https://api.youversion.com/v1";

const CORS = {
  "Access-Control-Allow-Origin": "*", // tighten to the deployed demo origin before submission
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const COMPOSE_SYSTEM_PROMPT = `You are the Scripture Studio companion — a warm, conversational creative partner
who helps creators bring Scripture into what they are making. Given the conversation, choose ONE Bible verse
or short passage that genuinely fits the creator's current request (no stretching). If they ask you to adjust
(different tone, different verse, more hype, softer), honor it.
Respond with ONLY strict JSON, no markdown fences:
{"reference":"<USFM ref like PHP.4.6 or PSA.23.1-PSA.23.3>","displayRef":"<human ref like Philippians 4:6>","caption":"<one-sentence caption for the finished card, matching their context and tone>","reply":"<one short, warm conversational sentence to the creator about why this verse fits — no emoji>"}`;

// In-isolate caches (fine for a demo; resets on cold start)
let glooToken = null; // { access_token, expires_at }
let biblesCache = null; // { [abbreviation]: id }

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/compose" && request.method === "POST") {
        const { intent, avoid, history } = await request.json();
        return json(await composeWithGloo(intent, avoid, history, env));
      }
      if (url.pathname === "/api/passage" && request.method === "GET") {
        const ref = url.searchParams.get("ref");
        const version = url.searchParams.get("version") || "WEB";
        return json(await fetchYouVersionPassage(ref, version, env));
      }
      if (url.pathname === "/api/versions" && request.method === "GET") {
        return json(await getBibles(env));
      }
      return json({ error: "not found" }, 404);
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  },
};

/* ---------- Gloo ---------- */

async function getGlooToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (glooToken && glooToken.expires_at - 60 > now) return glooToken.access_token;

  const res = await fetch(GLOO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${env.GLOO_CLIENT_ID}:${env.GLOO_CLIENT_SECRET}`),
    },
    body: "grant_type=client_credentials&scope=api/access",
  });
  if (!res.ok) throw new Error(`Gloo token ${res.status}: ${await res.text()}`);
  const data = await res.json();
  glooToken = { access_token: data.access_token, expires_at: now + (data.expires_in || 3600) };
  return glooToken.access_token;
}

async function composeWithGloo(intent, avoid, history, env) {
  const token = await getGlooToken(env);
  const messages = [
    { role: "system", content: COMPOSE_SYSTEM_PROMPT },
    ...(Array.isArray(history) ? history.slice(-8) : []),
    { role: "user", content: avoid ? `${intent}\n(Please choose a different passage than ${avoid}.)` : intent },
  ];

  const res = await fetch(GLOO_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ messages, auto_routing: true, temperature: 0.7 }),
  });
  if (!res.ok) throw new Error(`Gloo chat ${res.status}: ${await res.text()}`);
  const data = await res.json();

  const raw = data.choices?.[0]?.message?.content ?? "";
  return parseComposeJSON(raw);
}

function parseComposeJSON(raw) {
  // The model is instructed to return bare JSON, but strip fences defensively.
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Gloo returned non-JSON: " + raw.slice(0, 120));
  return JSON.parse(cleaned.slice(start, end + 1));
}

/* ---------- YouVersion ---------- */

async function getBibles(env) {
  if (biblesCache) return biblesCache;
  const res = await fetch(`${YV_BASE}/bibles?language_ranges[]=en`, {
    headers: { "x-yvp-app-key": env.YOUVERSION_API_KEY, accept: "application/json" },
  });
  if (!res.ok) throw new Error(`YouVersion bibles ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const map = {};
  for (const b of data.data ?? []) map[b.abbreviation?.toUpperCase()] = b.id;
  biblesCache = map;
  return map;
}

// Gloo returns ranges like "PHP.4.6-PHP.4.7"; YouVersion wants "PHP.4.6-7".
// Cross-chapter ranges fall back to the first verse.
function normalizeRef(ref) {
  const m = ref.match(/^([1-3]?[A-Z]+)\.(\d+)\.(\d+)-([1-3]?[A-Z]+)\.(\d+)\.(\d+)$/);
  if (!m) return ref;
  const [, b1, c1, v1, b2, c2, v2] = m;
  if (b1 === b2 && c1 === c2) return `${b1}.${c1}.${v1}-${v2}`;
  return `${b1}.${c1}.${v1}`;
}

async function fetchYouVersionPassage(ref, version, env) {
  if (!ref) throw new Error("missing ref");
  ref = normalizeRef(ref);
  const bibles = await getBibles(env);
  const bibleId = bibles[version.toUpperCase()] ?? Object.values(bibles)[0];
  if (!bibleId) throw new Error(`no bible found for version ${version}`);

  const res = await fetch(
    `${YV_BASE}/bibles/${bibleId}/passages/${encodeURIComponent(ref)}?format=text`,
    { headers: { "x-yvp-app-key": env.YOUVERSION_API_KEY, accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`YouVersion passage ${res.status}: ${await res.text()}`);
  const data = await res.json();

  return {
    text: (data.content ?? data.text ?? "").trim(),
    reference: data.reference?.human ?? data.reference ?? ref,
    version: version.toUpperCase(),
  };
}

/* ---------- util ---------- */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
