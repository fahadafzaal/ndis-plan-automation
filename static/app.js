"use strict";

const state = {
  sessionId: null,
  checkpoints: [],
  decisions: {},   // key "C2|medications" -> { decision: "yes"|"no", note: "" }
  documents: {},
  activeDoc: null,
};

const $ = (sel) => document.querySelector(sel);
const key = (c) => `${c.checkpoint_id}|${c.field}`;

function startTimer(selector, label) {
  const el = $(selector);
  let s = 0;
  el.textContent = `${label} (0s)`;
  const id = setInterval(() => { s += 1; el.textContent = `${label} (${s}s)`; }, 1000);
  return () => clearInterval(id);
}

async function api(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
}

// ---- Step 1: intake + parse ----
document.querySelectorAll("[data-load]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const data = await (await fetch("/api/participants")).json();
    $("#intake").value = data[btn.dataset.load] || "";
  });
});

$("#btn-parse").addEventListener("click", async () => {
  const intake = $("#intake").value.trim();
  if (!intake) { $("#parse-status").textContent = "Paste some intake text first."; return; }
  $("#btn-parse").disabled = true;
  const stopTimer = startTimer("#parse-status", "Parsing with the Intake Parser…");
  try {
    const out = await api("/api/parse", { intake_text: intake });
    stopTimer();
    state.sessionId = out.session_id;
    state.checkpoints = out.checkpoints;
    state.decisions = {};
    $("#profile-json").textContent = JSON.stringify(out.profile, null, 2);
    renderCheckpoints();
    $("#step-review").classList.remove("hidden");
    $("#step-output").classList.add("hidden");
    $("#parse-status").textContent = `Parsed. ${out.checkpoints.length} critical points to confirm.`;
    $("#step-review").scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    stopTimer();
    $("#parse-status").textContent = "Error: " + e.message;
  } finally {
    $("#btn-parse").disabled = false;
  }
});

// ---- Step 2: checkpoints ----
function renderCheckpoints() {
  const box = $("#checkpoints");
  box.innerHTML = "";
  state.checkpoints.forEach((c) => {
    const k = key(c);
    const el = document.createElement("div");
    el.className = "checkpoint";
    el.dataset.key = k;
    el.innerHTML = `
      <div class="cp-head"><span class="cp-id">${c.checkpoint_id}</span>
        <span class="cp-field">${c.field}</span></div>
      <div class="cp-value">${escapeHtml(c.value_shown)}</div>
      <div class="cp-why">${escapeHtml(c.why)}</div>
      <div class="cp-actions">
        <button data-act="yes">Yes</button>
        <button data-act="no">No</button>
        <input type="text" placeholder="optional note" />
      </div>`;
    el.querySelector('[data-act="yes"]').addEventListener("click", () => setDecision(k, "yes"));
    el.querySelector('[data-act="no"]').addEventListener("click", () => setDecision(k, "no"));
    el.querySelector("input").addEventListener("input", (ev) => {
      if (!state.decisions[k]) state.decisions[k] = { decision: null, note: "" };
      state.decisions[k].note = ev.target.value;
    });
    box.appendChild(el);
  });
  updateGenerateEnabled();
}

function setDecision(k, value) {
  const note = state.decisions[k] ? state.decisions[k].note : "";
  state.decisions[k] = { decision: value, note };
  const el = document.querySelector(`.checkpoint[data-key="${CSS.escape(k)}"]`);
  el.classList.toggle("decided-yes", value === "yes");
  el.classList.toggle("decided-no", value === "no");
  el.querySelector('[data-act="yes"]').classList.toggle("active-yes", value === "yes");
  el.querySelector('[data-act="no"]').classList.toggle("active-no", value === "no");
  updateGenerateEnabled();
}

function updateGenerateEnabled() {
  const decided = state.checkpoints.every((c) => {
    const d = state.decisions[key(c)];
    return d && (d.decision === "yes" || d.decision === "no");
  });
  $("#btn-generate").disabled = !decided;
  $("#generate-status").textContent = decided
    ? "All confirmed — ready to generate."
    : "Confirm every card to enable generation.";
}

// ---- Step 2 -> 3: generate ----
$("#btn-generate").addEventListener("click", async () => {
  $("#btn-generate").disabled = true;
  const stopTimer = startTimer("#generate-status", "Generating documents…");
  try {
    const decisions = state.checkpoints.map((c) => {
      const d = state.decisions[key(c)];
      return {
        checkpoint_id: c.checkpoint_id, field: c.field, value_shown: c.value_shown,
        decision: d.decision, note: d.note || "",
      };
    });
    await api("/api/decisions", { session_id: state.sessionId, decisions });
    const out = await api("/api/generate", { session_id: state.sessionId });
    stopTimer();
    state.documents = out.documents;
    renderReport(out.report, out.passed);
    renderExcluded(out.excluded);
    renderDocTabs();
    $("#step-output").classList.remove("hidden");
    $("#generate-status").textContent = "Generated.";
    $("#step-output").scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    stopTimer();
    $("#generate-status").textContent = "Error: " + e.message;
  } finally {
    $("#btn-generate").disabled = false;
  }
});

function renderReport(findings, passed) {
  const box = $("#report");
  const banner = passed
    ? `<div class="report-banner ok">✓ Validator passed (no hard failures)</div>`
    : `<div class="report-banner bad">✗ Validator found hard failures — review before exporting</div>`;
  const rows = findings.map((f) =>
    `<div class="finding"><span class="dot ${f.status}"></span>
       <span><b>${f.rule}</b> · ${escapeHtml(f.message)}</span></div>`).join("");
  box.innerHTML = banner + rows;
}

function renderExcluded(excluded) {
  const box = $("#excluded-box");
  if (!excluded || !excluded.length) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="excluded"><b>Excluded by the human (locked out of the documents):</b>
    <ul>${excluded.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul></div>`;
}

const DOC_LABELS = { "care-plan": "Care / Support Plan", "progress-notes": "Progress Notes", "risk-consent": "Risk & Consent" };

function renderDocTabs() {
  const tabs = $("#doc-tabs");
  tabs.innerHTML = "";
  Object.keys(state.documents).forEach((k, i) => {
    const b = document.createElement("button");
    b.textContent = DOC_LABELS[k] || k;
    b.addEventListener("click", () => showDoc(k));
    tabs.appendChild(b);
    if (i === 0) showDoc(k);
  });
}

function showDoc(k) {
  state.activeDoc = k;
  $("#doc-view").textContent = state.documents[k] || "";
  document.querySelectorAll("#doc-tabs button").forEach((b) => {
    b.classList.toggle("active", b.textContent === (DOC_LABELS[k] || k));
  });
}

// ---- Step 3: export ----
$("#btn-export").addEventListener("click", async () => {
  $("#btn-export").disabled = true;
  $("#export-status").textContent = "Exporting Markdown + PDF…";
  try {
    const out = await api("/api/export", { session_id: state.sessionId });
    const links = out.files.map((f) =>
      f.url ? `<a href="${f.url}" target="_blank">${f.name}</a>`
            : `<span title="${escapeHtml(f.detail)}">${escapeHtml(f.name)}</span>`).join("");
    $("#downloads").innerHTML = "<b>Exported files:</b><br>" + links;
    $("#export-status").textContent = "Done — files written to exports/.";
  } catch (e) {
    $("#export-status").textContent = "Error: " + e.message;
  } finally {
    $("#btn-export").disabled = false;
  }
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
