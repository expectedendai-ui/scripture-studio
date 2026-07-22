/* Scripture Studio — Infinite Canvas hero.
   The compose sheet is the doorway; composed verse cards LAND on the living
   landscape as draggable objects, the way they would inside MyBibleLens.

   Flow: talk ──► /api/compose (Gloo AI: verse + caption + conversational reply)
              ──► /api/passage (YouVersion: licensed verse text)
              ──► verse card drops onto the canvas, draggable, exportable.
*/

const $ = (id) => document.getElementById(id);
const els = {
  canvas: $("canvas"), hint: $("canvasHint"),
  fab: $("composeFab"), sheet: $("sheet"), scrim: $("scrim"), sheetClose: $("sheetClose"),
  thread: $("thread"), input: $("input"), send: $("send"),
  translation: $("translation"), starters: $("starters"),
};

const history = [];
let cardCount = 0;
let z = 10;

/* ---------- pre-place a couple of landscape objects (the "living" part) ---------- */
function seedCanvas() {
  const note = makeObj(`
    <span class="note-pin"></span>
    Youth night — theme:<br><b>"Who God says you are"</b><br>need a verse ✦`, "note");
  placeObj(note, window.innerWidth * 0.14, window.innerHeight * 0.30, -4);

  const sticker = makeObj("🕊️", "sticker");
  placeObj(sticker, window.innerWidth * 0.80, window.innerHeight * 0.62, 6);
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
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.transform = `rotate(${rot}deg)`;
  el.dataset.rot = rot;
  el.style.zIndex = ++z;
}

/* ---------- dragging (pointer events, works on touch + mouse) ---------- */
function makeDraggable(el) {
  let sx, sy, ox, oy, moved;
  el.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, a, select, textarea")) return; // let controls work
    moved = false;
    sx = e.clientX; sy = e.clientY;
    ox = parseFloat(el.style.left) || 0;
    oy = parseFloat(el.style.top) || 0;
    el.setPointerCapture(e.pointerId);
    el.classList.add("dragging");
    el.style.zIndex = ++z;
  });
  el.addEventListener("pointermove", (e) => {
    if (!el.classList.contains("dragging")) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    el.style.left = `${ox + dx}px`;
    el.style.top = `${oy + dy}px`;
  });
  const end = (e) => {
    if (!el.classList.contains("dragging")) return;
    el.classList.remove("dragging");
    try { el.releasePointerCapture(e.pointerId); } catch {}
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

/* ---------- compose sheet ---------- */
function openSheet() {
  els.sheet.hidden = false; els.scrim.hidden = false;
  setTimeout(() => els.input.focus(), 100);
}
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

/* ---------- the compose flow ---------- */
async function sendFlow() {
  const text = els.input.value.trim();
  if (!text || els.send.disabled) return;
  els.input.value = "";
  els.send.disabled = true;

  const starters = $("starters");
  if (starters) starters.remove();

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
      `${esc(reply)} <span class="ref-pill">${esc(passage.reference)} · ${esc(passage.version)}</span> — dropped on your canvas ↗`,
      true);
    history.push({ role: "assistant", content: `${reply} [chose ${composed.displayRef}]` });

    dropCardOnCanvas(passage, composed);
  } catch (err) {
    console.error(err);
    thinking.remove();
    addMsg("assistant", "Something drifted — say that again in a moment. ✦");
  } finally {
    els.send.disabled = false;
    els.input.focus();
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

/* ---------- the money shot: card lands on the living landscape ---------- */
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

  // stagger cards across the landscape so they feel organically placed
  const cx = window.innerWidth * (0.40 + (cardCount % 3) * 0.14);
  const cy = window.innerHeight * (0.22 + (cardCount % 2) * 0.20);
  cardCount++;
  makeDraggable(card);
  els.canvas.appendChild(card);
  placeObj(card, cx, cy, (Math.random() * 4 - 2));

  card.querySelector(".dl").addEventListener("click", () => downloadPNG(passage, composed));
  card.querySelector(".sermon").addEventListener("click", (e) => {
    e.currentTarget.textContent = "✓ Added to Sermon Deck";
    e.currentTarget.disabled = true;
    // Sermon Deck view is the next build — this proves the hand-off point.
  });
}

/* ---------- PNG export (1080x1350, native canvas) ---------- */
function downloadPNG(passage, composed) {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(W * 0.3, H * 0.2, 80, W / 2, H / 2, H);
  g.addColorStop(0, "#fff8f3"); g.addColorStop(1, "#f7ede2");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = "#b6741d"; x.font = "64px Georgia"; x.textAlign = "center";
  x.fillText("✦", W / 2, 170);
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

seedCanvas();
