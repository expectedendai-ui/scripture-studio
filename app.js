/* Scripture Studio — conversational flow.
   Talk to the studio companion; verse cards land on the canvas as you go.

   user message ──► /api/compose (Gloo AI Studio: chat + verse choice + caption)
                ──► /api/passage (YouVersion Platform: licensed verse text)
                ──► verse card lands on the canvas (+ PNG download, drawn natively)
*/

const $ = (id) => document.getElementById(id);
const els = {
  thread: $("thread"), input: $("input"), send: $("send"),
  canvas: $("canvas"), empty: $("empty"),
  translation: $("translation"), starters: $("starters"),
};

const history = []; // {role, content} pairs sent to Gloo for context

els.starters.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (chip) { els.input.value = chip.dataset.intent; sendFlow(); }
});
els.send.addEventListener("click", sendFlow);
els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendFlow(); }
});

async function sendFlow() {
  const text = els.input.value.trim();
  if (!text || els.send.disabled) return;
  els.input.value = "";
  els.send.disabled = true;

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
      `${escapeHtml(reply)}<span class="ref-pill">${escapeHtml(passage.reference)} · ${escapeHtml(passage.version)}</span>`,
      true);
    history.push({ role: "assistant", content: `${reply} [chose ${composed.displayRef}: "${composed.caption}"]` });

    addCard(passage, composed);
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

function addCard(passage, composed) {
  if (els.empty) els.empty.remove();

  const card = document.createElement("div");
  card.className = "verse-card";
  card.innerHTML = `
    <p class="verse-text">“${escapeHtml(passage.text)}”</p>
    <p class="verse-ref">${escapeHtml(passage.reference)} · ${escapeHtml(passage.version)}</p>
    <p class="card-caption">${escapeHtml(composed.caption || "")}</p>
    <p class="card-credit">Scripture via YouVersion · composed with Gloo AI</p>
    <div class="card-actions">
      <button class="ghost dl">Download PNG</button>
    </div>`;
  card.querySelector(".dl").addEventListener("click", () => downloadPNG(passage, composed));
  els.canvas.prepend(card);
}

/* Draw the card as a 1080x1350 PNG (Instagram portrait) with native canvas — no libraries. */
function downloadPNG(passage, composed) {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");

  const g = x.createRadialGradient(W * 0.3, H * 0.2, 80, W / 2, H / 2, H);
  g.addColorStop(0, "#fdf8ea"); g.addColorStop(1, "#f3ead6");
  x.fillStyle = g; x.fillRect(0, 0, W, H);

  x.fillStyle = "#C58310"; x.font = "64px Georgia";
  x.textAlign = "center"; x.fillText("✦", W / 2, 170);

  x.fillStyle = "#2b2118"; x.font = "italic 52px Georgia";
  const bottom = wrapText(x, `“${passage.text}”`, W / 2, 300, W - 240, 74);

  x.fillStyle = "#7a5206"; x.font = "bold 34px Avenir Next, Helvetica";
  x.fillText(`${passage.reference.toUpperCase()} · ${passage.version}`, W / 2, bottom + 80);

  x.fillStyle = "#6b5a44"; x.font = "italic 30px Georgia";
  wrapText(x, composed.caption || "", W / 2, bottom + 150, W - 300, 44);

  x.fillStyle = "#b6a888"; x.font = "22px Avenir Next, Helvetica";
  x.fillText("Scripture via YouVersion · composed with Gloo AI", W / 2, H - 60);

  const a = document.createElement("a");
  a.download = `${passage.reference.replace(/[^\w-]+/g, "-")}.png`;
  a.href = c.toDataURL("image/png");
  a.click();
}

function wrapText(x, text, cx, y, maxW, lineH) {
  const words = text.split(/\s+/);
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (x.measureText(test).width > maxW && line) {
      x.fillText(line, cx, y); y += lineH; line = w;
    } else line = test;
  }
  if (line) x.fillText(line, cx, y);
  return y;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

async function api(path, opts = {}) {
  const base = window.STUDIO_CONFIG?.workerUrl;
  if (!base) throw new Error("Set workerUrl in config.js");
  const res = await fetch(base + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}
