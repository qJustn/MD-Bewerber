/* LSMD • Ausbilder Checkliste (mit Korruptionsfragen Modal)
   - Progress + Stats + Suche + LocalStorage + Toast
   - Clock + BPM + Hover-Sound
   - Korruptionsfragen: Modal, Copy, Random, "als gefragt" speichern
*/

const LS_KEYS = {
  trainer: "lsmd_trainer_name",
  candidate: "lsmd_candidate_name",
  checks: "lsmd_check_state_v3",
  sound: "lsmd_sound_enabled",
  counters: "lsmd_counters_v1",
  corruptionAsked: "lsmd_corruption_asked_v1"
};

const $ = (id) => document.getElementById(id);

const els = {
  trainerName: $("trainerName"),
  candidateName: $("candidateName"),
  search: $("search"),
  progressFill: $("progressFill"),
  progressPercent: $("progressPercent"),
  progressHint: $("progressHint"),
  statToday: $("statToday"),
  statTotal: $("statTotal"),
  statOpen: $("statOpen"),
  statDone: $("statDone"),
  btnReset: $("btnReset"),
  btnSave: $("btnSave"),
  btnFinish: $("btnFinish"),
  toast: $("toast"),
  toastTitle: $("toastTitle"),
  toastText: $("toastText"),
  clock: $("clock"),
  bpm: $("bpm"),
  soundToggle: $("soundToggle"),

  // Corruption Modal
  btnCorruption: $("btnCorruption"),
  corruptionModal: $("corruptionModal"),
  btnCloseModal: $("btnCloseModal"),
  btnRandomQuestion: $("btnRandomQuestion"),
  btnCopyAll: $("btnCopyAll"),
  questionsWrap: $("questionsWrap"),
};

const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"][data-key]'));
const items = Array.from(document.querySelectorAll(".item"));

/* ---- Korruptionsfragen (aus deinem Bild) ---- */
const corruptionSummary =
  "Zusammengefasst: Privatmedic, außer Dienst hochholen, Medkits & Nadeln weitergeben, Telefonnummer weitergeben";

const corruptionQuestions = [
  "Du bist mit deinem Kumpel am Würfelpark unterwegs und er wird von einem Fahrzeug angefahren und dadurch bewusstlos, du bist Zivil. Wie reagierst du?",
  "Dein Kumpel wird von einer fremden Person angegriffen und kann den Angreifer abwehren, nun ist der Angreifer bewusstlos. Du wirst von deinem Kumpel aufgefordert ihn nicht hochzuholen, du bist aber im Dienst. Wie reagierst du?",
  "Ein Patient fragt dich ob du ihm Medkits und Defibrillatoren verkaufen kannst. Wie handelst du?",
  "Du bist im Dienst und eine fremde Person kommt auf dich zu und fragt dich, ob er deine Telefonnummer haben kann um dich in Notfällen anrufen zu können. Wie reagierst du?"
];

function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function showToast(title, text) {
  if (!els.toast) return;
  els.toastTitle.textContent = title;
  els.toastText.textContent = text;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 2400);
}

/* ---------- Counters ---------- */
function getCounters() {
  const base = { total: 0, todayCount: 0, todayDate: todayKey() };
  const data = safeParse(localStorage.getItem(LS_KEYS.counters), null);
  if (!data) return base;

  if (data.todayDate !== todayKey()) {
    data.todayDate = todayKey();
    data.todayCount = 0;
  }
  return {
    total: Number.isFinite(data.total) ? data.total : 0,
    todayCount: Number.isFinite(data.todayCount) ? data.todayCount : 0,
    todayDate: data.todayDate || todayKey(),
  };
}

function setCounters(c) {
  localStorage.setItem(LS_KEYS.counters, JSON.stringify(c));
  if (els.statTotal) els.statTotal.textContent = String(c.total);
  if (els.statToday) els.statToday.textContent = String(c.todayCount);
}

/* ---------- Save/Load ---------- */
function saveAll() {
  localStorage.setItem(LS_KEYS.trainer, (els.trainerName?.value || "").trim());
  localStorage.setItem(LS_KEYS.candidate, (els.candidateName?.value || "").trim());

  const state = {};
  checkboxes.forEach(cb => state[cb.dataset.key] = cb.checked);
  localStorage.setItem(LS_KEYS.checks, JSON.stringify(state));

  localStorage.setItem(LS_KEYS.sound, els.soundToggle?.checked ? "1" : "0");

  showToast("Gespeichert", "Deine Änderungen wurden gespeichert.");
}

function loadAll() {
  if (els.trainerName) els.trainerName.value = localStorage.getItem(LS_KEYS.trainer) || "";
  if (els.candidateName) els.candidateName.value = localStorage.getItem(LS_KEYS.candidate) || "";

  const saved = safeParse(localStorage.getItem(LS_KEYS.checks), {});
  checkboxes.forEach(cb => cb.checked = !!saved[cb.dataset.key]);

  if (els.soundToggle) els.soundToggle.checked = (localStorage.getItem(LS_KEYS.sound) === "1");

  setCounters(getCounters());
}

/* ---------- Progress + Stats ---------- */
function updateProgress() {
  const total = checkboxes.length;
  const done = checkboxes.filter(cb => cb.checked).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  if (els.progressPercent) els.progressPercent.textContent = String(percent);
  if (els.progressFill) els.progressFill.style.width = `${percent}%`;

  const open = total - done;
  if (els.statOpen) els.statOpen.textContent = String(open);
  if (els.statDone) els.statDone.textContent = (percent === 100) ? "Ja" : "Nein";

  if (els.progressHint) {
    if (done === 0) els.progressHint.textContent = "Noch nichts abgehakt.";
    else if (percent < 100) els.progressHint.textContent = `Weiter so – ${open} Punkt(e) noch offen.`;
    else els.progressHint.textContent = "Alles erledigt ✅ Du kannst die Einstellung abschließen.";
  }
}

/* ---------- Search ---------- */
function applySearchFilter(query) {
  const q = (query || "").toLowerCase().trim();
  if (!q) {
    items.forEach(el => el.style.display = "");
    document.querySelectorAll(".card").forEach(card => card.style.display = "");
    return;
  }

  items.forEach(item => {
    const t = (item.textContent || "").toLowerCase();
    item.style.display = t.includes(q) ? "" : "none";
  });

  document.querySelectorAll(".card").forEach(card => {
    const visible = Array.from(card.querySelectorAll(".item"))
      .some(i => i.style.display !== "none");
    card.style.display = visible ? "" : "none";
  });
}

/* ---------- Hover sound (WebAudio) ---------- */
let audioCtx = null;
function beep({ freq = 520, duration = 0.02, gain = 0.035 } = {}) {
  if (!els.soundToggle?.checked) return;

  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.value = gain;

  o.connect(g);
  g.connect(audioCtx.destination);

  o.start();
  o.stop(audioCtx.currentTime + duration);
}

function attachHoverSounds() {
  document.querySelectorAll(".card, .btn, .toggle, .chip, .item, .q-btn, .icon-btn").forEach(el => {
    el.addEventListener("mouseenter", () => beep({ freq: 520, duration: 0.018, gain: 0.03 }));
  });

  checkboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      beep({ freq: cb.checked ? 760 : 420, duration: 0.03, gain: 0.04 });
    });
  });
}

/* ---------- Clock + BPM ---------- */
function updateClock() {
  if (!els.clock) return;
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  els.clock.textContent = `${hh}:${mm}:${ss}`;
}

let currentBpm = 78;
function updateBpm() {
  if (!els.bpm) return;
  const target = 72 + Math.round(Math.random() * 14);
  currentBpm = Math.round(currentBpm + (target - currentBpm) * 0.35);
  els.bpm.textContent = String(currentBpm);
}

/* ---------- Checklist actions ---------- */
function resetChecklist() {
  checkboxes.forEach(cb => cb.checked = false);
  updateProgress();
  saveAll();
  showToast("Zurückgesetzt", "Alle Punkte wurden zurückgesetzt.");
}

function finishHiring() {
  updateProgress();
  const percent = Number(els.progressPercent?.textContent || "0");

  const trainer = (els.trainerName?.value || "").trim();
  const candidate = (els.candidateName?.value || "").trim();

  if (!trainer || !candidate) {
    showToast("Fehlende Angaben", "Bitte Ausbilder + Bewerber eintragen.");
    return;
  }

  if (percent < 100) {
    showToast("Noch nicht fertig", "Nicht alle Punkte sind abgehakt.");
    return;
  }

  const counters = getCounters();
  counters.total += 1;
  counters.todayCount += 1;
  counters.todayDate = todayKey();
  setCounters(counters);

  showToast("Einstellung abgeschlossen ✅", `${candidate} wurde von ${trainer} eingestellt.`);
}

/* ---------- Corruption modal ---------- */
function getAskedState() {
  return safeParse(localStorage.getItem(LS_KEYS.corruptionAsked), {});
}

function setAskedState(state) {
  localStorage.setItem(LS_KEYS.corruptionAsked, JSON.stringify(state));
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Kopiert", "In die Zwischenablage kopiert.");
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("Kopiert", "In die Zwischenablage kopiert.");
  }
}

function renderCorruptionQuestions() {
  if (!els.questionsWrap) return;
  const asked = getAskedState();

  els.questionsWrap.innerHTML = corruptionQuestions.map((q, idx) => {
    const id = `q_${idx}`;
    const isAsked = !!asked[id];

    return `
      <div class="q-card ${isAsked ? "asked" : ""}" data-qid="${id}">
        <div class="q-top">
          <div class="q-index">Frage ${idx + 1}</div>
          <div class="q-actions">
            <button class="q-btn" type="button" data-copy="${idx}">Kopieren</button>
          </div>
        </div>
        <div class="q-text">${q}</div>
        <div class="q-foot">
          <label>
            <input type="checkbox" data-asked="${id}" ${isAsked ? "checked" : ""} />
            als gefragt markieren
          </label>
          <span>${isAsked ? "✅ markiert" : ""}</span>
        </div>
      </div>
    `;
  }).join("");

  // Copy per question
  els.questionsWrap.querySelectorAll("[data-copy]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-copy"));
      const text = `Korruptionsfrage ${idx + 1}:\n${corruptionQuestions[idx]}`;
      copyToClipboard(text);
    });
  });

  // Mark asked
  els.questionsWrap.querySelectorAll("[data-asked]").forEach(chk => {
    chk.addEventListener("change", () => {
      const id = chk.getAttribute("data-asked");
      const state = getAskedState();
      state[id] = chk.checked;
      setAskedState(state);
      renderCorruptionQuestions();
    });
  });
}

function openModal() {
  renderCorruptionQuestions();
  els.corruptionModal?.classList.add("show");
  els.corruptionModal?.setAttribute("aria-hidden", "false");
}

function closeModal() {
  els.corruptionModal?.classList.remove("show");
  els.corruptionModal?.setAttribute("aria-hidden", "true");
}

function randomQuestion() {
  const idx = Math.floor(Math.random() * corruptionQuestions.length);
  const cards = Array.from(document.querySelectorAll(".q-card"));
  const target = cards[idx];
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.style.boxShadow = "0 0 0 4px rgba(0,255,200,.10), 0 0 35px rgba(0,255,200,.18)";
    setTimeout(() => target.style.boxShadow = "", 1200);
    showToast("Zufällige Frage", `Frage ${idx + 1} hervorgehoben.`);
  }
}

function copyAllQuestions() {
  const text =
    `Korruptionsfragen (LSMD)\n${corruptionSummary}\n\n` +
    corruptionQuestions.map((q, i) => `${i + 1}) ${q}`).join("\n\n");
  copyToClipboard(text);
}

/* ---------- Init ---------- */
function init() {
  loadAll();
  updateProgress();
  applySearchFilter("");

  // checkbox listeners
  checkboxes.forEach(cb => cb.addEventListener("change", () => {
    updateProgress();
    const state = safeParse(localStorage.getItem(LS_KEYS.checks), {});
    state[cb.dataset.key] = cb.checked;
    localStorage.setItem(LS_KEYS.checks, JSON.stringify(state));
  }));

  // search
  els.search?.addEventListener("input", (e) => applySearchFilter(e.target.value));

  // inputs autosave
  let t = null;
  const debouncedSave = () => {
    clearTimeout(t);
    t = setTimeout(saveAll, 250);
  };
  els.trainerName?.addEventListener("input", debouncedSave);
  els.candidateName?.addEventListener("input", debouncedSave);

  // buttons
  els.btnSave?.addEventListener("click", saveAll);
  els.btnReset?.addEventListener("click", resetChecklist);
  els.btnFinish?.addEventListener("click", finishHiring);

  // modal button
  els.btnCorruption?.addEventListener("click", openModal);
  els.btnCloseModal?.addEventListener("click", closeModal);

  // close modal by clicking backdrop
  els.corruptionModal?.addEventListener("click", (e) => {
    if (e.target === els.corruptionModal) closeModal();
  });

  // close modal by ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // modal tools
  els.btnRandomQuestion?.addEventListener("click", randomQuestion);
  els.btnCopyAll?.addEventListener("click", copyAllQuestions);

  // sound toggle store
  els.soundToggle?.addEventListener("change", () => {
    localStorage.setItem(LS_KEYS.sound, els.soundToggle.checked ? "1" : "0");
    showToast("Sound", els.soundToggle.checked ? "Hover-Sound aktiv" : "Hover-Sound aus");
  });

  // hover sounds
  attachHoverSounds();

  // clock + bpm
  updateClock();
  setInterval(updateClock, 1000);

  updateBpm();
  setInterval(updateBpm, 2000);

  // counters show
  setCounters(getCounters());
}

init();
