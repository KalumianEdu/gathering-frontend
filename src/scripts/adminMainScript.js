import {
  fetchSystemTotals,
  getWaitingApplicationApi,
  approveOrganizer,
  declineOrganizer,
  fetchPaginatedUsers,
} from "./api.js";

// Pagination State
let currentPage = 1;
const PAGE_SIZE = 5;

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Grab the saved user data from local storage
  const savedUser = localStorage.getItem("user");

  const token = localStorage.getItem("accessToken");
  const userRole = localStorage.getItem("userRole");

  if (!token) {
    window.location.href = "./login.html";
    return;
  }

  // 2. Verify they are actually an Admin (userType 1)
  if (userRole != 1) {
    alert("Unauthorized. Admin access only.");
    window.location.href = "./login.html";
    return;
  }

  // 3. INITIALIZE NAVIGATION
  initNavigation();

  // 4. Update the UI with the Admin's Name
  // CRITICAL FIX: Convert the string back into an object!
  const parsedUser = JSON.parse(savedUser);
  if (parsedUser == null) {
    alert("saved user is null");
  } else {
    updateAdminProfileUI(parsedUser);
  }

  // 5. Fetch and Display Real Totals for the Overview
  const totals = await fetchSystemTotals();
  if (totals) {
    updateMetricsUI(totals);
  }

  // 6. Fetch and Render Organizer Applications
  const applications = await getWaitingApplicationApi();
  renderApprovalsUI(applications);

  // 7. NEW: Fetch and Render the User Directory Paginated Table
  await loadUsersPage();

  // --- Pagination Button Listeners ---
  const btnPrev = document.getElementById("btn-prev-page");
  const btnNext = document.getElementById("btn-next-page");

  if (btnPrev) {
    btnPrev.addEventListener("click", async () => {
      if (currentPage > 1) {
        currentPage--;
        await loadUsersPage();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener("click", async () => {
      currentPage++;
      await loadUsersPage();
    });
  }

  // --- Event Delegation for Approve & Decline Buttons ---
  const approvalsContainer = document.getElementById("approvals-container");
  if (approvalsContainer) {
    approvalsContainer.addEventListener("click", async (e) => {
      // --- HANDLE APPROVE CLICK ---
      const approveBtn = e.target.closest(".btn-approve");
      if (approveBtn) {
        const userId = approveBtn.getAttribute("data-id");

        if (confirm("Are you sure you want to approve this organizer?")) {
          approveBtn.innerHTML = "Approving...";
          approveBtn.disabled = true;

          await approveOrganizer(userId);

          // Refresh UI
          const updatedApplications = await getWaitingApplicationApi();
          renderApprovalsUI(updatedApplications);

          const totals = await fetchSystemTotals();
          if (totals) updateMetricsUI(totals);
        }
        return;
      }

      // --- HANDLE DECLINE CLICK ---
      const declineBtn = e.target.closest(".btn-decline");
      if (declineBtn) {
        const userId = declineBtn.getAttribute("data-id");

        if (
          confirm(
            "Are you sure you want to DECLINE and remove this application?",
          )
        ) {
          declineBtn.innerHTML = "Declining...";
          declineBtn.disabled = true;

          await declineOrganizer(userId);

          const updatedApplications = await getWaitingApplicationApi();
          renderApprovalsUI(updatedApplications);

          const totals = await fetchSystemTotals();
          if (totals) updateMetricsUI(totals);
        }
      }
    });
  }

  // Setup Logout
  const logoutBtn = document.getElementById("admin-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.clear();
      window.location.replace("./login.html");
    });
  }
});

// --- User Pagination Logic ---
async function loadUsersPage() {
  const response = await fetchPaginatedUsers(currentPage, PAGE_SIZE);
  if (response) {
    renderUsersTable(response);
  }
}

function renderUsersTable(response) {
  const tbody = document.getElementById("users-table-body");
  const pageInfo = document.getElementById("page-info");
  const totalCountInfo = document.getElementById("total-users-count");
  const btnPrev = document.getElementById("btn-prev-page");
  const btnNext = document.getElementById("btn-next-page");

  if (!tbody) return;
  tbody.innerHTML = ""; // Clear old rows

  if (!response.data || response.data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="px-6 py-8 text-center text-stone-500 italic">No users found.</td></tr>';
    return;
  }

  // Helper to format roles
  const roleMap = {
    1: { name: "Admin", style: "bg-error-container text-on-error-container" },
    2: {
      name: "Organizer",
      style: "bg-primary-fixed text-on-primary-fixed-variant",
    },
    3: { name: "User", style: "bg-surface-variant text-on-surface-variant" },
  };

  // Inject rows
  response.data.forEach((user) => {
    const role = roleMap[user.userTypeId] || {
      name: "Unknown",
      style: "bg-stone-200 text-stone-600",
    };
    const firstName = user.firstName || "Unknown";
    const lastName = user.lastName || "";
    const email = user.contact?.email || "No Email Provided";

    const rowHTML = `
            <tr class="hover:bg-surface-container/30 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center font-bold text-tertiary overflow-hidden">
                            <p>${user.id}</p>
                        </div>
                        <div>
                            <div class="font-bold text-on-surface">${firstName} ${lastName}</div>
                            <div class="text-xs text-on-surface-variant">${email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full ${role.style} text-xs font-bold uppercase tracking-wider">${role.name}</span>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex justify-center gap-2">
                        <button class="p-2 text-outline hover:text-primary transition-colors">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="p-2 text-error hover:text-error/80 transition-colors">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    tbody.innerHTML += rowHTML;
  });

  // Update Pagination UI Footer
  if (pageInfo)
    pageInfo.textContent = `Page ${response.pageNumber} of ${response.totalPages}`;
  if (totalCountInfo) totalCountInfo.textContent = response.totalCount;

  // Enable/Disable buttons based on the page bounds
  if (btnPrev) btnPrev.disabled = response.pageNumber <= 1;
  if (btnNext) btnNext.disabled = response.pageNumber >= response.totalPages;

  // Sync state
  currentPage = response.pageNumber;
}

// --- Tab Switching Logic ---
function initNavigation() {
  const tabs = {
    "tab-overview": "view-overview",
    "tab-users": "view-users",
    "tab-approvals": "view-approvals",
  };

  const activeClasses = ["bg-[#4a7c59]", "text-white", "shadow-sm"];
  const inactiveClasses = ["text-stone-600", "hover:bg-stone-100"];

  const sectionDisplay = {
    "view-overview": "block",
    "view-users": "flex",
    "view-approvals": "flex",
  };

  const sectionItemSelectors = {
    "view-overview": "section > div",
    "view-users": "header > div, section > div",
    "view-approvals": "header > div, #approvals-container > div",
  };

  Object.keys(tabs).forEach((tabId) => {
    const tabElement = document.getElementById(tabId);
    if (tabElement) {
      tabElement.addEventListener("click", (e) => {
        e.preventDefault();

        const newViewId = tabs[tabId];
        animateSectionTransition(newViewId, sectionDisplay[newViewId]);

        Object.keys(tabs).forEach((id) => {
          const el = document.getElementById(id);
          if (el) {
            el.classList.remove(...activeClasses);
            el.classList.add(...inactiveClasses);
          }
        });
        tabElement.classList.add(...activeClasses);
        tabElement.classList.remove(...inactiveClasses);
      });
    }
  });

  function animateSectionTransition(viewId, displayType) {
    const allViews = ["view-overview", "view-users", "view-approvals"];

    allViews.forEach((id) => {
      const view = document.getElementById(id);
      if (!view) return;

      const items = Array.from(
        view.querySelectorAll(sectionItemSelectors[id] || ":scope > *"),
      );

      if (id === viewId) {
        view.classList.remove("hidden", "section-view-hidden");
        if (!view.classList.contains(displayType)) {
          view.classList.add(displayType);
        }

        requestAnimationFrame(() => {
          view.classList.add("section-view-visible");
        });

        items.forEach((item, index) => {
          item.classList.add("fade-item");
          item.classList.remove("fade-item-visible");
          item.style.transition = "opacity 0.35s ease, transform 0.35s ease";
          item.style.transitionDelay = `${index * 80}ms`;
          requestAnimationFrame(() => {
            item.classList.remove("fade-item");
            item.classList.add("fade-item-visible");
          });
        });
      } else if (!view.classList.contains("hidden")) {
        view.classList.remove("section-view-visible");
        view.classList.add("section-view-hidden");

        items.forEach((item) => {
          item.classList.remove("fade-item-visible");
          item.classList.add("fade-item");
          item.style.transitionDelay = "0ms";
        });

        window.setTimeout(() => {
          if (view.classList.contains("section-view-hidden")) {
            view.classList.add("hidden");
            view.classList.remove(displayType);
            items.forEach((item) => {
              item.style.transitionDelay = "";
            });
          }
        }, 320);
      }
    });
  }
}

function updateAdminProfileUI(user) {
  const nameDisplay = document.getElementById("admin-name-display");
  const emailDisplay = document.getElementById("admin-email-display");
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const displayName = fullName || user.username || "Admin";
  const displayEmail =
    user.email || localStorage.getItem("userEmail") || "No email available";

  if (nameDisplay) {
    nameDisplay.textContent = displayName;
  }
  if (emailDisplay) {
    emailDisplay.textContent = displayEmail;
  }
}

function updateMetricsUI(data) {
  if (document.getElementById("stat-total-users"))
    document.getElementById("stat-total-users").textContent =
      data.TotalUsers || 0;
  if (document.getElementById("stat-total-events"))
    document.getElementById("stat-total-events").textContent =
      data.TotalEvents || 0;
  if (document.getElementById("stat-total-rooms"))
    document.getElementById("stat-total-rooms").textContent =
      data.TotalRooms || 0;
  if (document.getElementById("stat-pending-approvals"))
    document.getElementById("stat-pending-approvals").textContent =
      data.TotalPendings || 0;
}

function renderApprovalsUI(applications) {
  const container = document.getElementById("approvals-container");
  if (!container) return;

  container.innerHTML = "";

  if (!applications || applications.length === 0) {
    container.innerHTML =
      '<p class="text-stone-500 italic col-span-2">No pending organizer applications at this time.</p>';
    return;
  }

  applications.forEach((app) => {
    const dob = new Date(app.DateOfBirth).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const cardHTML = `
            <div class="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(46,50,48,0.06)] border border-outline-variant/20 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start mb-6">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-on-primary">
                                <p class="font-bold text-lg">${app.WatingUserID}</p>
                            </div>
                            <div>
                                <h3 class="text-xl font-bold">${app.FirstName} ${app.LastName}</h3>
                                <p class="text-sm text-stone-500 font-semibold">Username: ${app.Username}</p>
                            </div>
                        </div>
                        <span class="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant text-xs font-bold rounded-full">New Application</span>
                    </div>
                    <div class="space-y-3 mb-6 text-stone-700">
                        <div class="flex items-center gap-3"><span class="material-symbols-outlined text-primary text-xl">cake</span><span class="text-sm">DOB: <strong>${dob}</strong></span></div>
                        <div class="flex items-center gap-3"><span class="material-symbols-outlined text-primary text-xl">home</span><span class="text-sm">${app.HomeAddress}</span></div>
                        <div class="flex items-center gap-3"><span class="material-symbols-outlined text-primary text-xl">phone</span><span class="text-sm"><strong>${app.PhoneNumber}</strong></span></div>
                    </div>
                    <div class="bg-surface-container-low p-4 rounded-lg mb-6">
                        <p class="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Email</p>
                        <p class="text-sm text-stone-600"><strong>${app.Email}</strong></p>
                    </div>
                    <div class="bg-surface-container-low p-4 rounded-lg mb-8">
                        <p class="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">About Application</p>
                        <p class="text-sm text-stone-600 leading-relaxed italic">"${app.AboutOrganizer}"</p>
                    </div>
                </div>
                <div class="flex gap-3 pt-4 border-t border-outline-variant/10">
                    <button data-id="${app.WatingUserID}" class="btn-approve flex-1 py-3 bg-primary text-white rounded-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-lg">check_circle</span> Approve
                    </button>
                    <button data-id="${app.WatingUserID}" class="btn-decline flex-1 py-3 bg-white text-error border border-error/30 rounded-lg font-bold hover:bg-error-container/20 transition-all flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-lg">cancel</span> Decline
                    </button>
                </div>
            </div>
        `;
    container.innerHTML += cardHTML;
  });
}
