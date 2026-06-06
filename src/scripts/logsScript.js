// ── CONFIG ──────────────────────────────────────────────
const API_BASE = "/api/logs";
const USE_MOCK = true; // set false when real API ready
const AUTO_REFRESH_MS = 30000;

// ── MOCK DATA ────────────────────────────────────────────
const MOCK_LOGS = [
  {
    id: 1,
    timeStamp: "2026-06-06T14:32:01",
    level: "Error",
    message: "Payment gateway timeout for OrderId 4821",
    exception:
      "System.TimeoutException: The operation has timed out.\n   at PaymentService.ChargeAsync(Order order)\n   at OrdersController.Checkout(CheckoutDto dto)",
  },
  {
    id: 2,
    timeStamp: "2026-06-06T14:28:44",
    level: "Warning",
    message: "Rate limit approaching for UserId 992 (88/100 req/min)",
    exception: null,
  },
  {
    id: 3,
    timeStamp: "2026-06-06T14:25:10",
    level: "Information",
    message: "Order 4821 created by UserId 992",
    exception: null,
  },
  {
    id: 4,
    timeStamp: "2026-06-06T14:20:03",
    level: "Error",
    message: "Unhandled exception in background job ProcessInvoices",
    exception:
      "System.NullReferenceException: Object reference not set to an instance of an object.\n   at InvoiceProcessor.Run(CancellationToken ct)\n   at BackgroundJobService.ExecuteAsync(CancellationToken ct)",
  },
  {
    id: 5,
    timeStamp: "2026-06-06T13:58:22",
    level: "Information",
    message: "User 992 authenticated successfully via JWT",
    exception: null,
  },
  {
    id: 6,
    timeStamp: "2026-06-06T13:44:11",
    level: "Warning",
    message: "Database query took 2340ms — consider index on Orders.CreatedAt",
    exception: null,
  },
  {
    id: 7,
    timeStamp: "2026-06-06T13:30:59",
    level: "Information",
    message: "Health check passed — DB response 12ms",
    exception: null,
  },
  {
    id: 8,
    timeStamp: "2026-06-06T13:15:40",
    level: "Error",
    message: "Failed to send email to user@example.com",
    exception:
      "SmtpException: Connection refused on port 587.\n   at EmailService.SendAsync(string to, string subject)\n   at NotificationHandler.Handle(EmailNotification n)",
  },
  {
    id: 9,
    timeStamp: "2026-06-06T13:02:18",
    level: "Debug",
    message: "Cache miss for key products:category:electronics",
    exception: null,
  },
  {
    id: 10,
    timeStamp: "2026-06-06T12:47:05",
    level: "Information",
    message: "Product catalog refreshed — 1420 items loaded",
    exception: null,
  },
  {
    id: 11,
    timeStamp: "2026-06-06T12:30:00",
    level: "Warning",
    message: "JWT token expiry within 5 minutes for UserId 881",
    exception: null,
  },
  {
    id: 12,
    timeStamp: "2026-06-06T12:15:33",
    level: "Information",
    message: "Scheduled job CleanupExpiredSessions completed in 340ms",
    exception: null,
  },
  {
    id: 13,
    timeStamp: "2026-06-06T11:58:12",
    level: "Critical",
    message: "EF Core migration failed on startup — column mismatch",
    exception:
      "Microsoft.Data.SqlClient.SqlException: Invalid column name 'RefreshTokenExpiry'.\n   at AppDbContext.OnModelCreating(ModelBuilder mb)\n   at DatabaseMigrator.ApplyPendingMigrations()",
  },
  {
    id: 14,
    timeStamp: "2026-06-06T11:40:07",
    level: "Information",
    message: "Application started on http://localhost:5000",
    exception: null,
  },
  {
    id: 15,
    timeStamp: "2026-06-06T11:35:50",
    level: "Debug",
    message: "DI container built — 142 services registered",
    exception: null,
  },
  {
    id: 16,
    timeStamp: "2026-06-05T16:20:11",
    level: "Error",
    message: "Stripe webhook signature validation failed",
    exception:
      "Stripe.StripeException: No signatures found matching the expected signature.\n   at WebhookController.HandleStripeEvent()",
  },
  {
    id: 17,
    timeStamp: "2026-06-05T15:44:02",
    level: "Warning",
    message: "Slow middleware on /api/products — 980ms",
    exception: null,
  },
  {
    id: 18,
    timeStamp: "2026-06-05T14:10:55",
    level: "Information",
    message: "Background job SendWeeklyReport started",
    exception: null,
  },
  {
    id: 19,
    timeStamp: "2026-06-04T09:00:00",
    level: "Debug",
    message: "Feature flag dark_mode_v2 = true for UserId 881",
    exception: null,
  },
  {
    id: 20,
    timeStamp: "2026-06-04T08:45:33",
    level: "Information",
    message: "Config reloaded from appsettings.Production.json",
    exception: null,
  },
];

const MOCK_CHART = [
  { day: "Mon", errors: 2, warns: 4, info: 38, debug: 12 },
  { day: "Tue", errors: 0, warns: 2, info: 45, debug: 8 },
  { day: "Wed", errors: 5, warns: 8, info: 52, debug: 15 },
  { day: "Thu", errors: 1, warns: 3, info: 41, debug: 9 },
  { day: "Fri", errors: 3, warns: 6, info: 48, debug: 11 },
  { day: "Sat", errors: 0, warns: 1, info: 32, debug: 4 },
  { day: "Sun", errors: 2, warns: 10, info: 33, debug: 7 },
];

// ── STATE ────────────────────────────────────────────────
let allLogs = [];
let levelFilter = "";
let searchTerm = "";
let currentPage = 1;
let currentView = "all";
const PAGE_SIZE = 10;

// ── API ──────────────────────────────────────────────────
async function fetchAll() {
  if (USE_MOCK) {
    const counts = {};
    MOCK_LOGS.forEach((l) => (counts[l.level] = (counts[l.level] || 0) + 1));
    return {
      logs: MOCK_LOGS,
      chart: MOCK_CHART,
      stats: { ...counts, total: MOCK_LOGS.length },
    };
  }
  const [logsR, chartR, statsR] = await Promise.all([
    fetch(`${API_BASE}?pageSize=200`, { credentials: "include" }).then((r) =>
      r.json(),
    ),
    fetch(`${API_BASE}/chart`, { credentials: "include" }).then((r) =>
      r.json(),
    ),
    fetch(`${API_BASE}/stats`, { credentials: "include" }).then((r) =>
      r.json(),
    ),
  ]);
  return { logs: logsR.data || logsR, chart: chartR, stats: statsR };
}

// ── RENDER STATS ─────────────────────────────────────────
function renderStats(s) {
  const get = (k, ...alts) =>
    s[k] ?? alts.reduce((v, a) => v ?? s[a], undefined) ?? 0;
  document.getElementById("num-all").textContent = get("total");
  document.getElementById("num-Error").textContent = get("Error", "errors");
  document.getElementById("num-Warning").textContent = get(
    "Warning",
    "warnings",
  );
  document.getElementById("num-Information").textContent = get(
    "Information",
    "info",
  );
  document.getElementById("num-Debug").textContent = get("Debug", "debug");
  document.getElementById("badge-count").textContent = get("Error", "errors");
}

// ── RENDER CHART ─────────────────────────────────────────
function renderChart(data) {
  const el = document.getElementById("chart");
  const max =
    Math.max(
      ...data.map(
        (d) =>
          (d.errors || 0) + (d.warns || 0) + (d.info || 0) + (d.debug || 0),
      ),
    ) || 1;
  const H = 150;
  const today = (new Date().getDay() + 6) % 7;
  el.innerHTML = data
    .map((d, i) => {
      const eH = Math.round(((d.errors || 0) / max) * H);
      const wH = Math.round(((d.warns || 0) / max) * H);
      const iH = Math.round(((d.info || 0) / max) * H);
      const dH = Math.round(((d.debug || 0) / max) * H);
      const tot = eH + wH + iH + dH;
      return `<div class="bar-col">
      <div class="bar-stack" style="height:${tot || 2}px" title="${d.day}: ${d.errors || 0} errors · ${d.warns || 0} warnings · ${d.info || 0} info · ${d.debug || 0} debug">
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

// ── FILTER ───────────────────────────────────────────────
function getFiltered() {
  let logs = [...allLogs];
  if (currentView === "errors")
    logs = logs.filter((l) => l.level === "Error" || l.level === "Critical");
  if (currentView === "today")
    logs = logs.filter((l) =>
      l.timeStamp.startsWith(new Date().toISOString().slice(0, 10)),
    );
  if (currentView === "exceptions") logs = logs.filter((l) => l.exception);
  if (levelFilter) logs = logs.filter((l) => l.level === levelFilter);
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.message.toLowerCase().includes(q) ||
        (l.exception || "").toLowerCase().includes(q),
    );
  }
  return logs;
}

// ── BADGE ICON ───────────────────────────────────────────
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

// ── RENDER TABLE ─────────────────────────────────────────
function renderTable() {
  const filtered = getFiltered();
  const total = filtered.length;
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filtered.slice(start, start + PAGE_SIZE);

  document.getElementById("table-count").textContent = total;
  document.getElementById("empty").style.display = page.length
    ? "none"
    : "block";

  const tbody = document.getElementById("log-body");
  tbody.innerHTML = page
    .map((l) => {
      const d = new Date(l.timeStamp);
      const date = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const time = d.toLocaleTimeString("en-GB", {
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
      <td><span class="badge badge-${l.level}"><span class="material-icons">${badgeIcon(l.level)}</span>${l.level}</span></td>
      <td>
        <div class="log-msg">${esc(l.message)}${hasExc ? `<span class="material-icons expand-arrow">expand_more</span>` : ""}</div>
      </td>
    </tr>
    ${
      hasExc
        ? `<tr class="exc-row" id="exc-${l.id}">
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

  renderPagination(total, start, Math.min(start + PAGE_SIZE, total));
}

function renderPagination(total, start, end) {
  const pages = Math.ceil(total / PAGE_SIZE) || 1;
  document.getElementById("page-info").textContent = total
    ? `Showing ${start + 1}–${end} of ${total} entries`
    : "No entries";
  let html = `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - currentPage) > 1) {
      if (i === 3 || i === pages - 2)
        html += `<button class="page-btn" disabled>…</button>`;
      continue;
    }
    html += `<button class="page-btn ${i === currentPage ? "active" : ""}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === pages ? "disabled" : ""}>›</button>`;
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
  renderTable();
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

function applyFilters() {
  searchTerm = document.getElementById("search").value;
  currentPage = 1;
  renderTable();
}
function goPage(p) {
  const pages = Math.ceil(getFiltered().length / PAGE_SIZE) || 1;
  if (p < 1 || p > pages) return;
  currentPage = p;
  renderTable();
}
function esc(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function showToast(msg, icon = "check_circle") {
  const t = document.getElementById("toast");
  document.getElementById("toast-msg").textContent = msg;
  document.getElementById("toast-icon").textContent = icon;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

async function refresh() {
  try {
    const { logs, chart, stats } = await fetchAll();
    allLogs = logs;
    renderStats(stats);
    renderChart(chart);
    renderTable();
    showToast("Logs refreshed");
  } catch (e) {
    showToast("Failed to load logs", "error");
    console.error(e);
  }
}

function exportLogs() {
  const rows = getFiltered();
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
  showToast(`Exported ${rows.length} logs`);
}

// ── INIT ─────────────────────────────────────────────────
document.getElementById("nav-all").classList.add("active");
(async () => {
  await refresh();
  setInterval(refresh, AUTO_REFRESH_MS);
})();
