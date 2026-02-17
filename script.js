/* LSMD • Ausbilder Checkliste
   - LocalStorage Save/Load
   - Live Search filter
   - Progress % + stats
   - Finish increments counters
   - Hover sound (toggle)
   - Clock + BPM animation
*/

const LS_KEYS = {
  trainer: "lsmd_trainer_name",
  candidate: "lsmd_candidate_name",
  checks: "lsmd_check_state_v1",
  sound: "lsmd_sound_enabled",
  counters: "lsmd_counters_v1", // { total, todayCount, todayDate }
};

const els = {
  trainerName: document.getElementById("trainerName"),
  candidateName: document.getElementById("candidateName"),
  search: document.getElementById("search"),
  progressFill: document.getElementById("progressFill"),
  progressPercent: document.getElementById("progressPercent"),
  progressHint: document.getElementById("progressHint"),
  statToday: document.getElementById("statToday"),
  statTotal: document.getElementById("statTotal"),
  statOpen: document.getElementById("statOpen"),
  statDone: document.getElementById("statDone"),
  btnReset: document.getElementById("btnReset"),
  btnSave: document.getElementById("btnSave"),
  btnFinish: document.getElementById("btnFinish"),
  toast: document.getElementById("toast"),
  toastTitle: document.getElementById("toastTitle"),
  toastText: document.getElementById("toastText"),
  clock: document.getElementById("clock"),
  bpm: document.getElementById("bpm"),
  soundToggle: document.getElementById("soundToggle"),
};

const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"][data-key]'));
const items = Array.from(document.querySelectorAll(".item"));

/* ---------- Helpers ---------- */

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

function showToast(title, text) {
  els.toastTitle.textContent = title;
  els.toastText.textContent = text;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function saveAll() {
  localStorage.setItem(LS_KEYS.trainer, els.trainerName.value.trim());
  localStorage.setItem(LS_KEYS.candidate, els.candidateName.value.trim());

  const state = {};
  checkboxes.forEach(cb => state[cb.dataset.key] = cb.checked);
  localStorage.setItem(LS_KEYS.checks, JSON.stringify(state));

  localStorage.setItem(LS_KEYS.sound, els.soundToggle.checked ? "1" : "0");

  showToast("Gespeichert", "Deine Änderungen wurden gespeichert.");
}

function loadAll() {
  els.trainerName.value = localStorage.getItem(LS_KEYS.trainer) || "";
  els.candidateName.value = localStorage.getItem(LS_KEYS.candidate) || "";

  const saved = safeParse(localStorage.getItem(LS_KEYS.checks), {});
  checkboxes.forEach(cb => cb.checked = !!saved[cb.dataset.key]);

  const sound = localStorage.getItem(LS_KEYS.sound);
  els.soundToggle.checked = (sound === "1");

  // Counters
  const counters = getCounters();
  setCounters(counters);
}

/* ---------- Counters (Total / Today) ---------- */

function getCounters() {
  const raw = localStorage.getItem(LS_KEYS.counters);
  const data = safeParse(raw, null);

  const base = { total: 0, todayCount: 0, todayDate: todayKey() };

  if (!data) return base;

  // reset "today" if date changed
  if (data.todayDate !== todayKey()) {
    data.todayDate = todayKey();
    data.todayCount = 0;
  }

  // ensure fields
  return {
    total: Number.isFinite(data.total) ? data.total : 0,
    todayCount: Number.isFinite(data.todayCount) ? data.todayCount : 0,
    todayDate: data.todayDate || todayKey(),
  };
}

function setCounters(counters) {
  localStorage.setItem(LS_KEYS.counters, JSON.stringify(counters));
  els.statTotal.textContent = String(counters.total);
  els.statToday.textContent = String(counters.todayCount);
}

/* ---------- Progress + Stats ---------- */

function updateProgress() {
  const total = checkboxes.length;
  const done = checkboxes.filter(cb => cb.checked).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  els.progressPercent.textContent = String(percent);
  els.progressFill.style.width = `${percent}%`;

  const open = total - done;
  els.statOpen.textContent = String(open);
  els.statDone.textContent = (percent === 100) ? "Ja" : "Nein";

  if (done === 0) els.progressHint.textContent = "Noch nichts abgehakt.";
  else if (percent < 100) els.progressHint.textContent = `Weiter so – ${open} Punkt(e) noch offen.`;
  else els.progressHint.textContent = "Alles erledigt ✅ Du kannst die Einstellung abschließen.";
}

/* ---------- Search ---------- */

function normalize(s) {
  return (s || "").toLowerCase().trim();
}

function applySearchFilter(query) {
  const q = normalize(query);
  if (!q) {
    items.forEach(el => el.style.display = "");
    document.querySelectorAll(".card").forEach(card => card.style.display = "");
    return;
  }

  // show/hide each checklist item
  items.forEach(item => {
    const text = normalize(item.textContent);
    item.style.display = text.includes(q) ? "" : "none";
  });

  // hide cards with no visible items
  document.querySelectorAll(".card").forEach(card => {
    const visible = Array.from(card.querySelectorAll(".item"))
      .some(i => i.style.display !== "none");
    card.style.display = visible ? "" : "none";
  });
}

/* ---------- Hover sound (very clean) ---------- */
/* Uses WebAudio (no external file) */
let audioCtx = null;

function beep({ freq = 520, duration = 0.02, gain = 0.035 } = {}) {
  if (!els.soundToggle.checked) return;

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
  // Hover on cards + buttons + check items
  document.querySelectorAll(".card, .btn, .toggle, .chip, .item").forEach(el => {
    el.addEventListener("mouseenter", () => beep({ freq: 520, duration: 0.018, gain: 0.03 }));
  });

  // Tick sound on checkbox change
  checkboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      beep({ freq: cb.checked ? 760 : 420, duration: 0.03, gain: 0.04 });
    });
  });
}

/* ---------- Clock ---------- */

function updateClock() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  els.clock.textContent = `${hh}:${mm}:${ss}`;
}

/* ---------- BPM animation ---------- */

let currentBpm = 78;

function updateBpm() {
  // target fluctuates in a healthy range
  const target = 72 + Math.round(Math.random() * 14); // 72..86
  // smooth approach
  currentBpm = Math.round(currentBpm + (target - currentBpm) * 0.35);
  els.bpm.textContent = String(currentBpm);
}

/* ---------- Actions ---------- */

function resetChecklist() {
  checkboxes.forEach(cb => cb.checked = false);
  updateProgress();
  saveAll();
  showToast("Zurückgesetzt", "Alle Punkte wurden zurückgesetzt.");
}

function finishHiring() {
  updateProgress();
  const percent = Number(els.progressPercent.textContent || "0");

  const trainer = els.trainerName.value.trim();
  const candidate = els.candidateName.value.trim();

  if (!trainer || !candidate) {
    showToast("Fehlende Angaben", "Bitte Ausbilder + Bewerber eintragen.");
    return;
  }

  if (percent < 100) {
    showToast("Noch nicht fertig", "Nicht alle Punkte sind abgehakt.");
    return;
  }

  // increment counters
  const counters = getCounters();
  counters.total += 1;
  counters.todayCount += 1;
  counters.todayDate = todayKey();
  setCounters(counters);

  // store a small log (last 10) - optional
  const logKey = "lsmd_log_v1";
  const log = safeParse(localStorage.getItem(logKey), []);
  log.unshift({
    at: new Date().toISOString(),
    trainer,
    candidate
  });
  localStorage.setItem(logKey, JSON.stringify(log.slice(0, 10)));

  showToast("Einstellung abgeschlossen ✅", `${candidate} wurde von ${trainer} eingestellt.`);
}

/* ---------- Init ---------- */

function init() {
  loadAll();
  updateProgress();
  applySearchFilter("");

  // listeners
  checkboxes.forEach(cb => cb.addEventListener("change", () => {
    updateProgress();
    // auto save checkbox state (nice)
    const state = safeParse(localStorage.getItem(LS_KEYS.checks), {});
    state[cb.dataset.key] = cb.checked;
    localStorage.setItem(LS_KEYS.checks, JSON.stringify(state));
  }));

  els.search.addEventListener("input", (e) => applySearchFilter(e.target.value));

  // save text inputs with debounce
  let t = null;
  const debouncedSave = () => {
    clearTimeout(t);
    t = setTimeout(() => saveAll(), 250);
  };
  els.trainerName.addEventListener("input", debouncedSave);
  els.candidateName.addEventListener("input", debouncedSave);

  els.soundToggle.addEventListener("change", () => {
    localStorage.setItem(LS_KEYS.sound, els.soundToggle.checked ? "1" : "0");
    showToast("Sound", els.soundToggle.checked ? "Hover-Sound aktiv" : "Hover-Sound aus");
  });

  els.btnSave.addEventListener("click", saveAll);
  els.btnReset.addEventListener("click", resetChecklist);
  els.btnFinish.addEventListener("click", finishHiring);

  // attach hover sounds
  attachHoverSounds();

  // clock tick
  updateClock();
  setInterval(updateClock, 1000);

  // bpm tick
  updateBpm();
  setInterval(updateBpm, 2000);

  // ensure counters shown
  setCounters(getCounters());
}

init();
