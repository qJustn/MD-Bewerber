// LSMD Checkliste – robustes Script (bricht nicht ab)

const $ = (id) => document.getElementById(id);

const els = {
  trainerName: $("trainerName"),
  candidateName: $("candidateName"),
  search: $("search"),
  progressFill: $("progressFill"),
  progressPercent: $("progressPercent"),
  progressHint: $("progressHint"),
  btnReset: $("btnReset"),
  btnSave: $("btnSave"),
  toast: $("toast"),
  toastTitle: $("toastTitle"),
  toastText: $("toastText"),
  bpm: $("bpm"),
  clock: $("clock"),
  soundToggle: $("soundToggle"),
  statToday: $("statToday"),
  statTotal: $("statTotal"),
  statOpen: $("statOpen"),
  statDone: $("statDone"),
};

const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"][data-key]'));
const items = Array.from(document.querySelectorAll(".item"));

const LS = {
  trainer: "lsmd_trainer_name",
  candidate: "lsmd_candidate_name",
  checks: "lsmd_check_state_v2",
  sound: "lsmd_sound_enabled",
  counters: "lsmd_counters_v1",
};

function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function showToast(title, text) {
  if (!els.toast) return;
  els.toastTitle.textContent = title;
  els.toastText.textContent = text;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function getCounters() {
  const base = { total: 0, todayCount: 0, todayDate: todayKey() };
  const data = safeParse(localStorage.getItem(LS.counters), null);
  if (!data) return base;

  if (data.todayDate !== todayKey()) {
    data.todayDate = todayKey();
    data.todayCount = 0;
  }
  return {
    total: Number(data.total) || 0,
    todayCount: Number(data.todayCount) || 0,
    todayDate: data.todayDate || todayKey(),
  };
}

function setCounters(c) {
  localStorage.setItem(LS.counters, JSON.stringify(c));
  if (els.statTotal) els.statTotal.textContent = String(c.total);
  if (els.statToday) els.statToday.textContent = String(c.todayCount);
}

function saveAll() {
  if (els.trainerName) localStorage.setItem(LS.trainer, els.trainerName.value.trim());
  if (els.candidateName) localStorage.setItem(LS.candidate, els.candidateName.value.trim());

  const state = {};
  checkboxes.forEach(cb => state[cb.dataset.key] = cb.checked);
  localStorage.setItem(LS.checks, JSON.stringify(state));

  if (els.soundToggle) localStorage.setItem(LS.sound, els.soundToggle.checked ? "1" : "0");

  showToast("Gespeichert", "Alles wurde gespeichert.");
}

function loadAll() {
  if (els.trainerName) els.trainerName.value = localStorage.getItem(LS.trainer) || "";
  if (els.candidateName) els.candidateName.value = localStorage.getItem(LS.candidate) || "";

  const saved = safeParse(localStorage.getItem(LS.checks), {});
  checkboxes.forEach(cb => cb.checked = !!saved[cb.dataset.key]);

  if (els.soundToggle) els.soundToggle.checked = localStorage.getItem(LS.sound) === "1";

  setCounters(getCounters());
}

function updateProgress() {
  const total = checkboxes.length;
  const done = checkboxes.filter(cb => cb.checked).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  if (els.progressPercent) els.progressPercent.textContent = String(percent);
  if (els.progressFill) els.progressFill.style.width = `${percent}%`;

  const open = total - done;
  if (els.statOpen) els.statOpen.textContent = String(open);
  if (els.statDone) els.statDone.textContent = percent === 100 ? "Ja" : "Nein";

  if (els.progressHint) {
    if (done === 0) els.progressHint.textContent = "Noch nichts abgehakt.";
    else if (percent < 100) els.progressHint.textContent = `${open} Punkt(e) noch offen.`;
    else els.progressHint.textContent = "Alles erledigt ✅";
  }
}

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

function resetAll() {
  checkboxes.forEach(cb => cb.checked = false);
  updateProgress();
  saveAll();
  showToast("Zurückgesetzt", "Alle Haken wurden entfernt.");
}

function finishHiring() {
  updateProgress();
  const percent = Number(els.progressPercent?.textContent || "0");
  const trainer = els.trainerName?.value.trim() || "";
  const candidate = els.candidateName?.value.trim() || "";

  if (!trainer || !candidate) {
    showToast("Fehlt was", "Bitte Ausbilder + Bewerber eintragen.");
    return;
  }

  if (percent < 100) {
    showToast("Nicht fertig", "Nicht alle Punkte sind abgehakt.");
    return;
  }

  const c = getCounters();
  c.total += 1;
  c.todayCount += 1;
  c.todayDate = todayKey();
  setCounters(c);

  showToast("Abgeschlossen ✅", `${candidate} wurde von ${trainer} eingestellt.`);
}

function updateClock() {
  if (!els.clock) return;
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  els.clock.textContent = `${hh}:${mm}:${ss}`;
}

let bpm = 78;
function updateBpm() {
  if (!els.bpm) return;
  const target = 72 + Math.round(Math.random() * 14);
  bpm = Math.round(bpm + (target - bpm) * 0.35);
  els.bpm.textContent = String(bpm);
}

function init() {
  loadAll();
  updateProgress();
  applySearchFilter("");

  // Checkbox listeners
  checkboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      updateProgress();
      // autosave checkbox state
      const state = safeParse(localStorage.getItem(LS.checks), {});
      state[cb.dataset.key] = cb.checked;
      localStorage.setItem(LS.checks, JSON.stringify(state));
    });
  });

  // Search
  if (els.search) {
    els.search.addEventListener("input", (e) => applySearchFilter(e.target.value));
  }

  // Inputs autosave
  let t;
  const debounced = () => {
    clearTimeout(t);
    t = setTimeout(saveAll, 250);
  };
  els.trainerName?.addEventListener("input", debounced);
  els.candidateName?.addEventListener("input", debounced);

  // Buttons
  els.btnSave?.addEventListener("click", saveAll);
  els.btnReset?.addEventListener("click", resetAll);

  const finishBtn = document.getElementById("btnFinish");
  finishBtn?.addEventListener("click", finishHiring);

  // Time + BPM
  updateClock();
  setInterval(updateClock, 1000);

  updateBpm();
  setInterval(updateBpm, 2000);

  showToast("System bereit", "JS läuft ✅");
}

init();
