/* Scripture Studio — one compose engine, three sanctuary surfaces.
   Compose (Gloo + YouVersion) is the doorway. What it produces flows into:
     · Canvas    — verse cards land on a living landscape (draggable)
     · Sermon Deck — send a verse to build a slide-by-slide message
     · Reflect   — every composition saves as a reflection to revisit
*/

const $ = (id) => document.getElementById(id);
const els = {
  nav: $("nav"),
  canvas: $("canvas"), hint: $("canvasHint"),
  deck: $("deck"), deckEmpty: $("deckEmpty"), deckStage: $("deckStage"),
  slide: $("slide"), slidePrev: $("slidePrev"), slideNext: $("slideNext"),
  slideCounter: $("slideCounter"), deckRail: $("deckRail"), deckCount: $("deckCount"),
  reflect: $("reflect"), reflectEmpty: $("reflectEmpty"), reflectList: $("reflectList"), reflectCount: $("reflectCount"),
  fab: $("composeFab"), sheet: $("sheet"), scrim: $("scrim"), sheetClose: $("sheetClose"),
  thread: $("thread"), input: $("input"), send: $("send"),
  translation: $("translation"), starters: $("starters"),
};

const history = [];
const deck = [];        // [{passage, composed}]
const reflections = []; // [{intent, passage, composed, reply, time}]
let deckIndex = 0;
let cardCount = 0;
let z = 10;

/* ============ view switching ============ */
els.nav.addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (!btn) return;
  showView(btn.dataset.view);
});
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => { v.hidden = v.dataset.view !== name; });
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
}

/* ============ canvas seed objects ============ */
function seedCanvas() {
  const W = window.innerWidth, H = window.innerHeight;
  // sticky notes — the "moments" waiting for a verse
  const notes = [
    { html: `<span class="note-pin"></span>Youth night — theme:<br><b>"Who God says you are"</b><br>need a verse ✦`, x: 0.11, y: 0.22, rot: -4 },
    { html: `<span class="note-pin pink"></span>Post for the group chat 🙏<br><b>someone's anxious about finals</b>`, x: 0.30, y: 0.64, rot: 5 },
    { html: `<span class="note-pin blue"></span>Grad card for my sister 🎓<br><b>new beginnings</b>`, x: 0.60, y: 0.18, rot: 3 },
  ];
  notes.forEach((n) => placeObj(makeObj(n.html, "note"), W * n.x, H * n.y, n.rot));

  // real MyBibleLens stickers scattered on the board
  const stickers = [
    { s: "renaissance", x: 0.46, y: 0.30, rot: 8 },
    { s: "goldicon", x: 0.74, y: 0.62, rot: -6 },
    { s: "afroart", x: 0.19, y: 0.74, rot: 10 },
    { s: "stainedglass", x: 0.86, y: 0.32, rot: -5 },
    { s: "holycard", x: 0.52, y: 0.74, rot: 4 },
    { s: "mosaic", x: 0.68, y: 0.22, rot: -9 },
  ];
  stickers.forEach((k) =>
    placeObj(makeObj(`<img src="assets/stickers/${k.s}.png" alt="">`, "sticker-img"), W * k.x, H * k.y, k.rot),
  );
}
function makeObj(html, cls) {
  const el = document.createElement("div");
  el.className = `obj ${cls}`;
  el.innerHTML = html;
  makeDraggable(el);
  els.canvas.appendChild(el);
  return el;
}
function placeObj(el, x, y, rot = 0) {
  el.style.left = `${x}px`; el.style.top = `${y}px`;
  el.style.transform = `rotate(${rot}deg)`;
  el.style.zIndex = ++z;
}

/* ============ dragging ============ */
/* Movement-threshold drag: pointerdown never captures immediately, so a plain
   click (including on buttons inside the card) always fires. Dragging only
   begins once the pointer moves past DRAG_THRESHOLD px. */
const DRAG_THRESHOLD = 5;
function makeDraggable(el) {
  let sx, sy, ox, oy, pending = false, dragging = false, pid = null;
  el.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, a, select, textarea")) return; // let controls click
    sx = e.clientX; sy = e.clientY;
    ox = parseFloat(el.style.left) || 0; oy = parseFloat(el.style.top) || 0;
    pending = true; dragging = false; pid = e.pointerId;
  });
  el.addEventListener("pointermove", (e) => {
    if (!pending) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!dragging) {
      if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return; // still a click, not a drag
      dragging = true;
      el.setPointerCapture(pid);
      el.classList.add("dragging"); el.style.zIndex = ++z;
    }
    el.style.left = `${ox + dx}px`;
    el.style.top = `${oy + dy}px`;
  });
  const end = () => {
    if (dragging) { el.classList.remove("dragging"); try { el.releasePointerCapture(pid); } catch {} }
    pending = false; dragging = false; pid = null;
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

/* ============ info modal ============ */
const infoBtn = $("infoBtn"), infoModal = $("infoModal"), infoScrim = $("infoScrim"), infoClose = $("infoClose");
function openInfo() { infoModal.hidden = false; infoScrim.hidden = false; }
function closeInfo() { infoModal.hidden = true; infoScrim.hidden = true; }
infoBtn.addEventListener("click", openInfo);
infoClose.addEventListener("click", closeInfo);
infoScrim.addEventListener("click", closeInfo);

/* ============ compose sheet ============ */
function openSheet() { els.sheet.hidden = false; els.scrim.hidden = false; setTimeout(() => els.input.focus(), 100); }
function closeSheet() { els.sheet.hidden = true; els.scrim.hidden = true; }
els.fab.addEventListener("click", openSheet);
els.sheetClose.addEventListener("click", closeSheet);
els.scrim.addEventListener("click", closeSheet);
els.starters.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (chip) { els.input.value = chip.dataset.intent; sendFlow(); }
});
els.send.addEventListener("click", sendFlow);
els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendFlow(); }
});

/* ============ the compose flow ============ */
async function sendFlow() {
  const text = els.input.value.trim();
  if (!text || els.send.disabled) return;
  els.input.value = ""; els.send.disabled = true;
  const starters = $("starters"); if (starters) starters.remove();

  addMsg("user", text);
  history.push({ role: "user", content: text });
  const thinking = addMsg("assistant thinking", "listening for the right word…");

  try {
    const composed = await api("/api/compose", {
      method: "POST",
      body: JSON.stringify({ intent: text, history: history.slice(0, -1) }),
    });
    const passage = await api(
      `/api/passage?ref=${encodeURIComponent(composed.reference)}&version=${els.translation.value}`
    );
    thinking.remove();
    const reply = composed.reply || `This moment belongs to ${composed.displayRef}.`;
    addMsg("assistant",
      `${esc(reply)} <span class="ref-pill">${esc(passage.reference)} · ${esc(passage.version)}</span> — on your canvas ↗`,
      true);
    history.push({ role: "assistant", content: `${reply} [chose ${composed.displayRef}]` });

    dropCardOnCanvas(passage, composed);
    saveReflection(text, passage, composed, reply);   // every compose → a reflection
  } catch (err) {
    console.error(err);
    thinking.remove();
    addMsg("assistant", "Something drifted — say that again in a moment. ✦");
  } finally {
    els.send.disabled = false; els.input.focus();
  }
}

function addMsg(cls, content, isHtml = false) {
  const div = document.createElement("div");
  div.className = `msg ${cls}`;
  const p = document.createElement("p");
  if (isHtml) p.innerHTML = content; else p.textContent = content;
  div.appendChild(p);
  els.thread.appendChild(div);
  els.thread.scrollTop = els.thread.scrollHeight;
  return div;
}

/* ============ surface 1: canvas ============ */
function dropCardOnCanvas(passage, composed) {
  if (els.hint) { els.hint.style.opacity = "0"; setTimeout(() => els.hint?.remove(), 400); }
  const card = document.createElement("div");
  card.className = "obj verse-card";
  card.innerHTML = `
    <p class="verse-text">“${esc(passage.text)}”</p>
    <p class="verse-ref">${esc(passage.reference)} · ${esc(passage.version)}</p>
    <p class="card-caption">${esc(composed.caption || "")}</p>
    <p class="card-credit">Scripture via YouVersion · composed with Gloo AI</p>
    <div class="card-actions">
      <button class="ghost primary sermon">＋ Sermon Deck</button>
      <button class="ghost dl">Download</button>
    </div>`;
  const cx = window.innerWidth * (0.40 + (cardCount % 3) * 0.14);
  const cy = window.innerHeight * (0.16 + (cardCount % 2) * 0.22);
  cardCount++;
  makeDraggable(card);
  els.canvas.appendChild(card);
  placeObj(card, cx, cy, (Math.random() * 4 - 2));
  card.querySelector(".dl").addEventListener("click", () => downloadPNG(passage, composed));
  card.querySelector(".sermon").addEventListener("click", (e) => {
    addToDeck(passage, composed);
    e.currentTarget.textContent = "✓ In Sermon Deck";
    e.currentTarget.disabled = true;
  });
}

/* ============ surface 2: sermon deck ============ */
function addToDeck(passage, composed) {
  deck.push({ passage, composed });
  deckIndex = deck.length - 1;
  els.deckCount.hidden = false; els.deckCount.textContent = deck.length;
  renderDeck();
}
function renderDeck() {
  if (!deck.length) { els.deckEmpty.hidden = false; els.deckStage.hidden = true; return; }
  els.deckEmpty.hidden = true; els.deckStage.hidden = false;
  const { passage, composed } = deck[deckIndex];
  els.slide.innerHTML = `
    <span class="slide-mark">✦</span>
    <p class="slide-verse">“${esc(passage.text)}”</p>
    <p class="slide-ref">${esc(passage.reference)} · ${esc(passage.version)}</p>
    ${composed.caption ? `<p class="slide-caption">${esc(composed.caption)}</p>` : ""}`;
  els.slideCounter.textContent = `${deckIndex + 1} / ${deck.length}`;
  els.deckRail.innerHTML = "";
  deck.forEach((d, i) => {
    const t = document.createElement("div");
    t.className = `deck-thumb ${i === deckIndex ? "active" : ""}`;
    t.innerHTML = `<div>“${esc(d.passage.text.slice(0, 42))}…”</div><div class="thumb-ref">${esc(d.passage.reference)}</div>`;
    t.addEventListener("click", () => { deckIndex = i; renderDeck(); });
    els.deckRail.appendChild(t);
  });
}
els.slidePrev.addEventListener("click", () => { if (deckIndex > 0) { deckIndex--; renderDeck(); } });
els.slideNext.addEventListener("click", () => { if (deckIndex < deck.length - 1) { deckIndex++; renderDeck(); } });

/* ============ surface 3: reflections ============ */
function saveReflection(intent, passage, composed, reply) {
  const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  reflections.unshift({ intent, passage, composed, reply, time });
  els.reflectCount.hidden = false; els.reflectCount.textContent = reflections.length;
  renderReflections();
}
function renderReflections() {
  if (!reflections.length) { els.reflectEmpty.hidden = false; els.reflectList.innerHTML = ""; return; }
  els.reflectEmpty.hidden = true;
  els.reflectList.innerHTML = reflections.map((r) => `
    <div class="reflection">
      <p class="r-intent">You were making: <b>${esc(r.intent)}</b></p>
      <p class="r-verse">“${esc(r.passage.text)}”</p>
      <p class="r-ref">${esc(r.passage.reference)} · ${esc(r.passage.version)}</p>
      <p class="r-reply">${esc(r.reply)}</p>
      <p class="r-time">Saved ${esc(r.time)}</p>
    </div>`).join("");
}

/* ============ PNG export ============ */
function downloadPNG(passage, composed) {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(W * 0.3, H * 0.2, 80, W / 2, H / 2, H);
  g.addColorStop(0, "#fff8f3"); g.addColorStop(1, "#f7ede2");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = "#b6741d"; x.font = "64px Georgia"; x.textAlign = "center"; x.fillText("✦", W / 2, 170);
  x.fillStyle = "#1a1a1a"; x.font = "italic 52px Lora, Georgia";
  const bottom = wrap(x, `“${passage.text}”`, W / 2, 300, W - 240, 74);
  x.fillStyle = "#8f5916"; x.font = "bold 34px Inter, Helvetica";
  x.fillText(`${passage.reference.toUpperCase()} · ${passage.version}`, W / 2, bottom + 80);
  x.fillStyle = "#6b5a44"; x.font = "italic 30px Lora, Georgia";
  wrap(x, composed.caption || "", W / 2, bottom + 150, W - 300, 44);
  x.fillStyle = "#b6a888"; x.font = "22px Inter, Helvetica";
  x.fillText("Scripture via YouVersion · composed with Gloo AI", W / 2, H - 60);
  const a = document.createElement("a");
  a.download = `${passage.reference.replace(/[^\w-]+/g, "-")}.png`;
  a.href = c.toDataURL("image/png"); a.click();
}
function wrap(x, text, cx, y, maxW, lineH) {
  const words = String(text).split(/\s+/); let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (x.measureText(test).width > maxW && line) { x.fillText(line, cx, y); y += lineH; line = w; }
    else line = test;
  }
  if (line) x.fillText(line, cx, y);
  return y;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
async function api(path, opts = {}) {
  const base = window.STUDIO_CONFIG?.workerUrl;
  if (!base) throw new Error("Set workerUrl in config.js");
  const res = await fetch(base + path, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

/* ============ toolbar ============ */
const NEW_NOTE_TEXTS = [
  `<span class="note-pin"></span>New note ✦`,
  `<span class="note-pin pink"></span>A moment to remember 🙏`,
  `<span class="note-pin blue"></span>Verse for this ✦`,
];
let noteIdx = 0;
const toolbar = $("toolbar");
if (toolbar) {
  toolbar.addEventListener("click", (e) => {
    const btn = e.target.closest(".tool[data-tool]");
    if (!btn) return; // Compose has its own handler
    const tool = btn.dataset.tool;
    document.querySelectorAll(".tool[data-tool]").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    const W = window.innerWidth, H = window.innerHeight;
    const rx = () => W * (0.34 + Math.random() * 0.34);
    const ry = () => H * (0.28 + Math.random() * 0.34);
    if (tool === "note") {
      placeObj(makeObj(NEW_NOTE_TEXTS[noteIdx++ % NEW_NOTE_TEXTS.length], "note"), rx(), ry(), Math.random() * 8 - 4);
    } else if (tool === "stickers") {
      const set = ["renaissance", "goldicon", "afroart", "stainedglass", "holycard", "mosaic"];
      const s = set[Math.floor(Math.random() * set.length)];
      placeObj(makeObj(`<img src="assets/stickers/${s}.png" alt="">`, "sticker-img"), rx(), ry(), Math.random() * 16 - 8);
    } else if (tool === "verse") {
      openSheet(); // Verse Stamp → compose a verse
    }
    // pencil / highlighter / eraser / lasso / connector / pin / layouts / mosaic / landscapes
    // stay selected (cosmetic in this demo — fully live in the shipped MyBibleLens app)
  });
}

seedCanvas();
