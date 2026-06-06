// ── CONFIG ──────────────────────────────────────────────
// Your real API endpoint — matches /api/Logs exactly
const API_BASE = "https://gathering.runasp.net/api/Logs";
const PAGE_SIZE = 50; // matches your API default
const AUTO_REFRESH_MS = 30000;

// ── STATE ────────────────────────────────────────────────
let currentLogs = [];
let totalPages = 1;
let currentPage = 1;
let levelFilter = "";
let searchTerm = "";
let currentView = "all";
let chartCache = [];
let statsCache = {};

// ── HELPERS ──────────────────────────────────────────────
function esc(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function badgeIcon(level) {
  return (
    {
      Error: "cancel",
      Warning: "warning_amber",
      Information: "info",
      Debug: "code",
      Critical: "dangerous",
    }[level] || "circle"
  );
}

function showToast(msg, icon = "check_circle") {
  const t = document.getElementById("toast");
  document.getElementById("toast-msg").textContent = msg;
  document.getElementById("toast-icon").textContent = icon;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

function setDarkMode(isDark) {
  const toggle = document.getElementById("theme-toggle");
  const icon = document.getElementById("theme-toggle-icon");
  const text = document.getElementById("theme-toggle-text");

  document.body.classList.toggle("dark-mode", isDark);
  localStorage.setItem("logsDarkMode", String(isDark));

  if (toggle) {
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute(
      "aria-label",
      isDark ? "Disable dark mode" : "Enable dark mode",
    );
  }
  if (icon) icon.textContent = isDark ? "light_mode" : "dark_mode";
  if (text) text.textContent = isDark ? "Light" : "Dark";
}

function initThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  setDarkMode(localStorage.getItem("logsDarkMode") === "true");

  toggle.addEventListener("click", () => {
    setDarkMode(!document.body.classList.contains("dark-mode"));
  });
}

// ── API ──────────────────────────────────────────────────
async function fetchPage() {
  const accessToken = localStorage.getItem("accessToken");

  const params = new URLSearchParams();
  params.set("page", currentPage);
  params.set("pageSize", PAGE_SIZE);

  if (levelFilter) params.set("level", levelFilter);
  if (searchTerm.trim()) params.set("search", searchTerm.trim());

  const res = await fetch(`${API_BASE}?${params}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchAllForStats() {
  const accessToken = localStorage.getItem("accessToken");
  try {
    // FIX: Replaced ?${params} with /stats
    const res = await fetch(`${API_BASE}/stats`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error("fetchAllForStats error:", e);
    return {
      stats: {
        Error: 0,
        Warning: 0,
        Information: 0,
        Debug: 0,
        Critical: 0,
        total: 0,
      },
      chart: [],
    };
  }
}

// ── RENDER STATS ─────────────────────────────────────────
function renderStats(s) {
  document.getElementById("num-all").textContent = s.total || 0;
  document.getElementById("num-Error").textContent = s.Error || 0;
  document.getElementById("num-Warning").textContent = s.Warning || 0;
  document.getElementById("num-Information").textContent = s.Information || 0;
  document.getElementById("num-Debug").textContent = s.Debug || 0;
  document.getElementById("badge-count").textContent = s.Error || 0;
}

// ── RENDER CHART ─────────────────────────────────────────
function renderChart(data) {
  const el = document.getElementById("chart");
  if (!data || data.length === 0) return;

  const max =
    Math.max(...data.map((d) => d.errors + d.warns + d.info + d.debug)) || 1;
  const H = 150;
  const today = (new Date().getDay() + 6) % 7; // Mon=0

  el.innerHTML = data
    .map((d, i) => {
      const eH = Math.round((d.errors / max) * H);
      const wH = Math.round((d.warns / max) * H);
      const iH = Math.round((d.info / max) * H);
      const dH = Math.round((d.debug / max) * H);
      const tot = eH + wH + iH + dH;
      return `<div class="bar-col">
      <div class="bar-stack" style="height:${tot || 2}px"
           title="${d.day}: ${d.errors} errors · ${d.warns} warnings · ${d.info} info · ${d.debug} debug">
        <div class="bar-seg" style="height:${eH}px;background:#c0392b;opacity:.85"></div>
        <div class="bar-seg" style="height:${wH}px;background:#b7770d;opacity:.85"></div>
        <div class="bar-seg" style="height:${iH}px;background:#1a5e8a;opacity:.75"></div>
        <div class="bar-seg" style="height:${dH}px;background:#8fbc8f;opacity:.8"></div>
      </div>
      <div class="bar-day ${i === today ? "bar-today" : ""}">${d.day}</div>
    </div>`;
    })
    .join("");
}

// ── RENDER TABLE ─────────────────────────────────────────
function getViewFiltered(logs) {
  if (currentView === "errors")
    return logs.filter((l) => l.level === "Error" || l.level === "Critical");
  if (currentView === "today")
    return logs.filter((l) =>
      l.timeStamp.startsWith(new Date().toISOString().slice(0, 10)),
    );
  if (currentView === "exceptions") return logs.filter((l) => !!l.exception);
  return logs;
}

function renderTable() {
  const visible = getViewFiltered(currentLogs);

  document.getElementById("table-count").textContent = visible.length;
  document.getElementById("empty").style.display = visible.length
    ? "none"
    : "block";

  const tbody = document.getElementById("log-body");
  tbody.innerHTML = visible
    .map((l) => {
      const dt = new Date(l.timeStamp);
      const date = dt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const time = dt.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const hasExc = !!l.exception;
      const excLines = hasExc ? l.exception.split("\n") : [];

      return `
    <tr class="log-row fade-up" onclick="toggleRow(${l.id})" id="row-${l.id}">
      <td>
        <div class="ts">${time}</div>
        <div class="ts-date">${date}</div>
      </td>
      <td>
        <span class="badge badge-${l.level}">
          <span class="material-icons">${badgeIcon(l.level)}</span>${l.level}
        </span>
      </td>
      <td>
        <div class="log-msg">
          ${esc(l.message)}
          ${hasExc ? `<span class="material-icons expand-arrow">expand_more</span>` : ""}
        </div>
      </td>
    </tr>
    ${
      hasExc
        ? `
    <tr class="exc-row" id="exc-${l.id}">
      <td class="exc-cell" colspan="3">
        <div class="exc-box">
          <span class="exc-type">${esc(excLines[0] || "")}</span>
          <span class="exc-trace">${esc(excLines.slice(1).join("\n"))}</span>
        </div>
      </td>
    </tr>`
        : ""
    }`;
    })
    .join("");

  renderPagination();
}

// ── RENDER PAGINATION ────────────────────────────────────
function renderPagination() {
  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalPages * PAGE_SIZE);

  document.getElementById("page-info").textContent =
    totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : "No entries";

  let html = `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (
      totalPages > 7 &&
      i > 2 &&
      i < totalPages - 1 &&
      Math.abs(i - currentPage) > 1
    ) {
      if (i === 3 || i === totalPages - 2)
        html += `<button class="page-btn" disabled>…</button>`;
      continue;
    }
    html += `<button class="page-btn ${i === currentPage ? "active" : ""}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}>›</button>`;
  document.getElementById("page-btns").innerHTML = html;
}

// ── INTERACTIONS ─────────────────────────────────────────
function toggleRow(id) {
  const row = document.getElementById(`row-${id}`);
  const exc = document.getElementById(`exc-${id}`);
  if (!exc) return;
  row.classList.toggle("expanded");
  exc.classList.toggle("visible");
}

function filterLevel(level) {
  levelFilter = level;
  currentPage = 1;

  document
    .querySelectorAll(".chip")
    .forEach((c) => c.classList.remove("active"));
  document.getElementById(`chip-${level || "all"}`).classList.add("active");

  document
    .querySelectorAll(".stat-card")
    .forEach((c) => c.classList.remove("active"));
  document.getElementById(`card-${level || "all"}`)?.classList.add("active");

  loadPage();
}

function setView(view) {
  currentView = view;
  currentPage = 1;
  document
    .querySelectorAll(".nav-link")
    .forEach((n) => n.classList.remove("active"));
  document.getElementById(`nav-${view}`).classList.add("active");
  renderTable();
}

let searchTimer;
function applyFilters() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTerm = document.getElementById("search").value;
    currentPage = 1;
    loadPage();
  }, 400);
}

function goPage(p) {
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  loadPage();
}

// ── LOAD PAGE ────────────────────────────────────────────
async function loadPage() {
  try {
    const body = await fetchPage();
    currentLogs = body.data || [];
    totalPages = body.totalPages || 1;
    renderTable();
  } catch (e) {
    showToast("Failed to load logs", "error");
    console.error("loadPage error:", e);
  }
}

// ── FULL REFRESH ─────────────────────────────────────────
async function refresh(showMessage = false) {
  try {
    const dashboardData = await fetchAllForStats();

    statsCache = dashboardData.stats;
    chartCache = dashboardData.chart;
    renderStats(statsCache);
    renderChart(chartCache);

    await loadPage();

    if (showMessage) showToast("Logs refreshed");
  } catch (e) {
    showToast("Failed to load logs", "error");
    console.error("refresh error:", e);
  }
}

// ── EXPORT ───────────────────────────────────────────────
function exportLogs() {
  const rows = getViewFiltered(currentLogs);
  const csv =
    "Id,TimeStamp,Level,Message,Exception\n" +
    rows
      .map(
        (l) =>
          `${l.id},"${l.timeStamp}","${l.level}","${(l.message || "").replace(/"/g, '""')}","${(l.exception || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      )
      .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`Exported ${rows.length} entries from page ${currentPage}`);
}

// ── EXPOSE TO WINDOW FOR HTML INLINE EVENTS ──────────────
// Because your script is type="module", HTML onclick attributes cannot see these
// functions unless we attach them to the global window object.
window.toggleRow = toggleRow;
window.filterLevel = filterLevel;
window.setView = setView;
window.applyFilters = applyFilters;
window.goPage = goPage;
window.refresh = refresh;
window.exportLogs = exportLogs;

// ── INIT ─────────────────────────────────────────────────
initThemeToggle();
document.getElementById("nav-all").classList.add("active");
refresh();
setInterval(() => refresh(), AUTO_REFRESH_MS);
