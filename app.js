(function () {
  "use strict";

  const STORAGE_KEY = "faculty_tracker_v3";
  const SCRIPT_URL_KEY = "faculty_tracker_script_url";
  // Optional: paste your deployed Google Apps Script Web App URL here so every browser uses it automatically
  const DEFAULT_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzth_kW3cN2G8ksTdOJQAENDYrP2p6OV1XSLqZZIEv97wVfQYwk5P_AmtnnPZwyLJ0c/exec";
  const DEFAULT_CLIENTS = ["NPR", "AVS", "SINCET", "IFET", "IG", "ARJUN"];
  const ACTIVITY_YEARS = [
    { key: "y1", label: "1st Year" },
    { key: "y2", label: "2nd Year" },
    { key: "y3", label: "3rd Year" }
  ];

  function todayISO() {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
  }

  function createSeedState() {
    const today = todayISO();
    return {
      users: [
        {
          id: "u-admin",
          role: "admin",
          name: "System Admin",
          username: "admin",
          password: "admin123",
          department: "Administration",
          clients: []
        },
        {
          id: "u-fac-1",
          role: "faculty",
          name: "Dr. Priya Sharma",
          username: "priya",
          password: "pass123",
          department: "Computer Science",
          clients: [...DEFAULT_CLIENTS]
        },
        {
          id: "u-fac-2",
          role: "faculty",
          name: "Prof. Arjun Nair",
          username: "arjun",
          password: "pass123",
          department: "Management Studies",
          clients: [...DEFAULT_CLIENTS]
        }
      ],
      reports: [
        {
          id: "r-seed-1",
          facultyId: "u-fac-1",
          date: today,
          clients: [
            {
              name: "NPR",
              status: "completed",
              remarks: "",
              activityYears: {
                y1: { status: "completed", remarks: "" },
                y2: { status: "completed", remarks: "" },
                y3: { status: "completed", remarks: "" }
              },
              calendarStatus: "completed",
              calendarRemarks: "",
              grievance: ""
            },
            {
              name: "AVS",
              status: "not_completed",
              remarks: "Awaiting client sign-off on weekly deliverables.",
              activityYears: {
                y1: { status: "completed", remarks: "" },
                y2: { status: "not_completed", remarks: "Awaiting client sign-off on 2nd year deliverables." },
                y3: { status: "completed", remarks: "" }
              },
              calendarStatus: "completed",
              calendarRemarks: "",
              grievance: "Need updated lab schedule shared before Friday."
            },
            {
              name: "SINCET",
              status: "completed",
              remarks: "",
              activityYears: {
                y1: { status: "completed", remarks: "" },
                y2: { status: "completed", remarks: "" },
                y3: { status: "completed", remarks: "" }
              },
              calendarStatus: "completed",
              calendarRemarks: "",
              grievance: ""
            },
            {
              name: "IFET",
              status: "completed",
              remarks: "",
              activityYears: {
                y1: { status: "completed", remarks: "" },
                y2: { status: "completed", remarks: "" },
                y3: { status: "completed", remarks: "" }
              },
              calendarStatus: "not_completed",
              calendarRemarks: "Pending calendar invite confirmation.",
              grievance: ""
            },
            {
              name: "IG",
              status: "completed",
              remarks: "",
              activityYears: {
                y1: { status: "completed", remarks: "" },
                y2: { status: "completed", remarks: "" },
                y3: { status: "completed", remarks: "" }
              },
              calendarStatus: "completed",
              calendarRemarks: "",
              grievance: ""
            },
            {
              name: "ARJUN",
              status: "completed",
              remarks: "",
              activityYears: {
                y1: { status: "completed", remarks: "" },
                y2: { status: "completed", remarks: "" },
                y3: { status: "completed", remarks: "" }
              },
              calendarStatus: "completed",
              calendarRemarks: "",
              grievance: ""
            }
          ],
          updatedAt: new Date().toISOString()
        }
      ],
      customClients: [...DEFAULT_CLIENTS],
      sessionUserId: null
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seed = createSeedState();
        saveState(seed);
        return seed;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.users) || !Array.isArray(parsed.reports)) {
        throw new Error("Invalid stored state");
      }
      return parsed;
    } catch (_err) {
      const seed = createSeedState();
      saveState(seed);
      return seed;
    }
  }

  function saveState(nextState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }

  let state = loadState();
  let draftClients = [];

  // DOM Elements
  const el = {
    toastContainer: document.getElementById("toast-container"),
    loginView: document.getElementById("login-view"),
    loginForm: document.getElementById("login-form"),
    loginUsername: document.getElementById("login-username"),
    loginPassword: document.getElementById("login-password"),
    loginError: document.getElementById("login-error"),
    appShell: document.getElementById("app-shell"),
    userRoleBadge: document.getElementById("user-role-badge"),
    sheetStatusPill: document.getElementById("sheet-status-pill"),
    syncNowBtn: document.getElementById("sync-now-btn"),
    currentUserLabel: document.getElementById("current-user-label"),
    logoutBtn: document.getElementById("logout-btn"),
    adminView: document.getElementById("admin-view"),
    facultyView: document.getElementById("faculty-view"),
    resetDemoBtn: document.getElementById("reset-demo-btn"),
    adminStats: document.getElementById("admin-stats"),
    dashFilterDate: document.getElementById("dash-filter-date"),
    adminCompletionDashboard: document.getElementById("admin-completion-dashboard"),
    facultyCompletionDashboard: document.getElementById("faculty-completion-dashboard"),
    adminSectionDropdown: document.getElementById("admin-section-dropdown"),
    clientsTab: document.getElementById("clients-tab"),
    globalClientCount: document.getElementById("global-client-count"),
    addGlobalClientForm: document.getElementById("add-global-client-form"),
    newGlobalClientInput: document.getElementById("new-global-client-input"),
    clientsManageTable: document.getElementById("clients-manage-table"),
    tabBtns: document.querySelectorAll(".tab-btn"),
    reportsTab: document.getElementById("reports-tab"),
    facultiesTab: document.getElementById("faculties-tab"),
    sheetTab: document.getElementById("sheet-tab"),
    sheetConfigForm: document.getElementById("sheet-config-form"),
    scriptUrlInput: document.getElementById("script-url-input"),
    sheetConfigMsg: document.getElementById("sheet-config-msg"),
    disconnectSheetBtn: document.getElementById("disconnect-sheet-btn"),
    filterFaculty: document.getElementById("filter-faculty"),
    filterDate: document.getElementById("filter-date"),
    filterStatus: document.getElementById("filter-status"),
    clearFiltersBtn: document.getElementById("clear-filters-btn"),
    adminReportsList: document.getElementById("admin-reports-list"),
    createFacultyForm: document.getElementById("create-faculty-form"),
    facName: document.getElementById("fac-name"),
    facDept: document.getElementById("fac-dept"),
    facUsername: document.getElementById("fac-username"),
    facPassword: document.getElementById("fac-password"),
    facClients: document.getElementById("fac-clients"),
    createFacultyError: document.getElementById("create-faculty-error"),
    facultyCountPill: document.getElementById("faculty-count-pill"),
    facultyDirectory: document.getElementById("faculty-directory"),
    reportDate: document.getElementById("report-date"),
    facultyChecklistForm: document.getElementById("faculty-checklist-form"),
    clientActivitiesList: document.getElementById("client-activities-list"),
    calendarTableList: document.getElementById("calendar-table-list"),
    grievanceTableList: document.getElementById("grievance-table-list"),
    facultyFormError: document.getElementById("faculty-form-error"),
    facultyHistoryList: document.getElementById("faculty-history-list")
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  function currentUser() {
    return state.users.find((u) => u.id === state.sessionUserId) || null;
  }

  function faculties() {
    return state.users.filter((u) => u.role === "faculty");
  }

  function hasIncomplete(report) {
    return report.clients.some((c) => {
      const actSummary = computeActivitySummary(c.activityYears, c.status, c.remarks);
      return actSummary.status !== "completed" || c.calendarStatus !== "completed";
    });
  }

  function hasGrievance(report) {
    return report.clients.some((c) => (c.grievance || "").trim().length > 0);
  }

  function formatTimestamp(iso) {
    try {
      return new Date(iso).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
      });
    } catch (_e) {
      return iso;
    }
  }

  // ---- GOOGLE SHEET SYNC ----
  function getScriptUrl() {
    return (localStorage.getItem(SCRIPT_URL_KEY) || DEFAULT_SCRIPT_URL || "").trim();
  }

  function setScriptUrl(url) {
    const clean = (url || "").trim();
    if (clean) {
      localStorage.setItem(SCRIPT_URL_KEY, clean);
    } else {
      localStorage.removeItem(SCRIPT_URL_KEY);
    }
    updateSheetStatusUI();
  }

  function updateSheetStatusUI() {
    const url = getScriptUrl();
    const connected = Boolean(url);
    el.sheetStatusPill.textContent = connected ? "Google Sheet Connected" : "Local Cache";
    el.sheetStatusPill.className = `badge ${connected ? "badge-success" : "badge-warn"}`;
    el.syncNowBtn.classList.toggle("hidden", !connected);
    if (el.scriptUrlInput && document.activeElement !== el.scriptUrlInput) {
      el.scriptUrlInput.value = url;
    }
  }

  async function sheetGet(action) {
    const url = getScriptUrl();
    if (!url) throw new Error("Google Apps Script URL is not configured.");
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${sep}action=${encodeURIComponent(action)}`, {
      method: "GET",
      redirect: "follow"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Sheet request failed.");
    return data;
  }

  async function sheetPost(payload) {
    const url = getScriptUrl();
    if (!url) return { ok: false, skipped: true };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Sheet save failed.");
    return data;
  }

  async function syncFromSheet({ init = false, quiet = false } = {}) {
    if (!getScriptUrl()) return false;
    try {
      const data = await sheetGet(init ? "init" : "getAll");
      const admins = state.users.filter((u) => u.role === "admin");
      const sheetFaculties = Array.isArray(data.faculties) ? data.faculties : [];
      state.users = [...admins, ...sheetFaculties];
      state.reports = Array.isArray(data.reports) ? data.reports : [];
      saveState(state);
      renderApp();
      if (!quiet) {
        showToast("Synced with Google Sheet.");
      }
      return true;
    } catch (err) {
      if (!quiet) {
        showToast(`Google Sheet sync error: ${err.message}`);
      }
      return false;
    }
  }

  // ---- AUTH ----
  el.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = el.loginForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : "Sign In";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Verifying...";
    }

    const username = el.loginUsername.value.trim().toLowerCase();
    const password = el.loginPassword.value;
    let matched = state.users.find(
      (u) => u.username.toLowerCase() === username && u.password === password
    );

    // If credentials aren't found locally, fetch latest users from Google Sheet
    if (!matched && getScriptUrl()) {
      await syncFromSheet({ quiet: true });
      matched = state.users.find(
        (u) => u.username.toLowerCase() === username && u.password === password
      );
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }

    if (!matched) {
      el.loginError.textContent = "Invalid username or password.";
      el.loginError.classList.remove("hidden");
      return;
    }

    el.loginError.classList.add("hidden");
    state.sessionUserId = matched.id;
    saveState(state);
    el.loginForm.reset();
    el.reportDate.value = todayISO();
    renderApp();
    syncFromSheet({ quiet: true });
  });

  el.logoutBtn.addEventListener("click", () => {
    state.sessionUserId = null;
    saveState(state);
    renderApp();
  });

  el.syncNowBtn.addEventListener("click", () => {
    syncFromSheet();
  });

  // ---- APP ROUTING ----
  function renderApp() {
    updateSheetStatusUI();
    const user = currentUser();
    if (!user) {
      el.loginView.classList.remove("hidden");
      el.appShell.classList.add("hidden");
      return;
    }

    el.loginView.classList.add("hidden");
    el.appShell.classList.remove("hidden");
    el.userRoleBadge.textContent = user.role;
    el.currentUserLabel.textContent = `${user.name} (${user.department})`;

    if (user.role === "admin") {
      el.adminView.classList.remove("hidden");
      el.facultyView.classList.add("hidden");
      renderAdminView();
    } else {
      el.adminView.classList.add("hidden");
      el.facultyView.classList.remove("hidden");
      if (!el.reportDate.value) {
        el.reportDate.value = todayISO();
      }
      loadFacultyDraftForDate(user, el.reportDate.value);
      renderFacultyHistory(user);
    }
  }

  // ---- ADMIN VIEW ----
  function setAdminVisibleSection(target) {
    const isNone = !target || target === "none";
    if (el.adminSectionDropdown) {
      el.adminSectionDropdown.value = isNone ? "none" : target;
    }
    el.clientsTab.classList.toggle("hidden", isNone || target !== "clients-tab");
    el.reportsTab.classList.toggle("hidden", isNone || target !== "reports-tab");
    el.facultiesTab.classList.toggle("hidden", isNone || target !== "faculties-tab");
    el.sheetTab.classList.toggle("hidden", isNone || target !== "sheet-tab");
    if (target === "clients-tab") {
      renderClientsManageTable();
    }
  }

  if (el.adminSectionDropdown) {
    el.adminSectionDropdown.addEventListener("change", (e) => {
      setAdminVisibleSection(e.target.value);
    });
  }

  el.sheetConfigForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = el.scriptUrlInput.value.trim();
    if (!url || !url.startsWith("https://")) {
      el.sheetConfigMsg.textContent = "Please paste a valid https:// Google Apps Script Web App URL.";
      el.sheetConfigMsg.className = "error-text";
      el.sheetConfigMsg.classList.remove("hidden");
      return;
    }

    setScriptUrl(url);
    el.sheetConfigMsg.textContent = "Connecting and initializing sheet headers...";
    el.sheetConfigMsg.className = "small-text muted";
    el.sheetConfigMsg.classList.remove("hidden");

    const ok = await syncFromSheet({ init: true, quiet: true });
    if (ok) {
      el.sheetConfigMsg.textContent = "Connected! Sheet tabs and column headers are initialized and synced.";
      el.sheetConfigMsg.className = "small-text";
      el.sheetConfigMsg.style.color = "var(--success)";
      showToast("Google Sheet connected and initialized!");
    } else {
      el.sheetConfigMsg.textContent = "Could not reach Web App URL. Verify deployment access is set to 'Anyone'.";
      el.sheetConfigMsg.className = "error-text";
    }
  });

  el.disconnectSheetBtn.addEventListener("click", () => {
    setScriptUrl("");
    el.scriptUrlInput.value = "";
    el.sheetConfigMsg.classList.add("hidden");
    showToast("Disconnected Google Sheet. Using local browser cache.");
  });

  el.resetDemoBtn.addEventListener("click", () => {
    if (!confirm("Reset all faculties and reports back to initial demo data?")) {
      return;
    }
    const adminId = state.sessionUserId;
    state = createSeedState();
    state.sessionUserId = adminId;
    saveState(state);
    renderAdminView();
    showToast("Demo data restored.");
  });

  el.createFacultyForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = el.facName.value.trim();
    const department = el.facDept.value.trim();
    const username = el.facUsername.value.trim();
    const password = el.facPassword.value.trim();
    const rawClients = el.facClients.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!name || !department || !username || !password) {
      el.createFacultyError.textContent = "Please fill in all required faculty fields.";
      el.createFacultyError.classList.remove("hidden");
      return;
    }

    const duplicate = state.users.some(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
    if (duplicate) {
      el.createFacultyError.textContent = `Username "${username}" is already taken.`;
      el.createFacultyError.classList.remove("hidden");
      return;
    }

    el.createFacultyError.classList.add("hidden");
    const uniqueClients = [...new Set(rawClients.length ? rawClients : DEFAULT_CLIENTS)];

    const newFaculty = {
      id: "u-fac-" + Date.now(),
      role: "faculty",
      name,
      department,
      username,
      password,
      clients: uniqueClients
    };
    state.users.push(newFaculty);
    saveState(state);
    el.createFacultyForm.reset();
    renderAdminView();
    showToast(`Faculty "${name}" created.`);

    sheetPost({ action: "createFaculty", faculty: newFaculty })
      .then((res) => {
        if (!res.skipped) showToast(`Saved "${name}" to Google Sheet.`);
      })
      .catch((err) => showToast(`Sheet sync failed: ${err.message}`));
  });

  [el.filterFaculty, el.filterDate, el.filterStatus].forEach((control) => {
    control.addEventListener("change", renderAdminReports);
  });

  el.clearFiltersBtn.addEventListener("click", () => {
    el.filterFaculty.value = "all";
    el.filterDate.value = "";
    el.filterStatus.value = "all";
    renderAdminReports();
  });

  el.dashFilterDate.addEventListener("change", renderAdminCompletionDashboard);

  function renderAdminView() {
    if (!el.dashFilterDate.value) {
      el.dashFilterDate.value = todayISO();
    }
    renderAdminStats();
    renderFacultyFilterOptions();
    renderAdminCompletionDashboard();
    renderFacultyDirectory();
    renderClientsManageTable();
    renderAdminReports();
  }

  function getAllColleges() {
    if (!Array.isArray(state.customClients)) {
      state.customClients = [...DEFAULT_CLIENTS];
    }
    const list = [...state.customClients];
    state.users.forEach((u) => {
      if (Array.isArray(u.clients)) {
        u.clients.forEach((c) => {
          if (!list.some((existing) => existing.toLowerCase() === c.toLowerCase())) {
            list.push(c);
          }
        });
      }
    });
    return list;
  }

  function renderClientsManageTable() {
    if (!el.clientsManageTable) return;
    const colleges = getAllColleges();
    if (el.globalClientCount) {
      el.globalClientCount.textContent = `${colleges.length} Clients`;
    }

    if (colleges.length === 0) {
      el.clientsManageTable.innerHTML = `<div class="empty-state">No clients available. Add one using the form above.</div>`;
      return;
    }

    const rowsHtml = colleges
      .map(
        (college, idx) => `
        <tr data-client-row="${idx}">
          <td style="width:50px;color:var(--muted);">${idx + 1}</td>
          <td>
            <div class="client-name-display" data-name-display="${idx}" style="font-weight:600;">
              ${escapeHtml(college)}
            </div>
            <div class="client-edit-form hidden" data-edit-form="${idx}" style="display:flex;gap:0.4rem;align-items:center;">
              <input type="text" data-edit-input="${idx}" value="${escapeHtml(college)}" style="max-width:240px;padding:0.35rem 0.55rem;font-size:0.88rem;" />
              <button type="button" class="btn btn-primary btn-sm" data-save-edit="${idx}">Save</button>
              <button type="button" class="btn btn-ghost btn-sm" data-cancel-edit="${idx}">Cancel</button>
            </div>
          </td>
          <td style="width:160px;text-align:right;">
            <div style="display:inline-flex;gap:0.4rem;">
              <button type="button" class="btn btn-ghost btn-sm" data-trigger-edit="${idx}">Edit</button>
              <button type="button" class="btn btn-danger-ghost btn-sm" data-delete-client="${idx}">Delete</button>
            </div>
          </td>
        </tr>`
      )
      .join("");

    el.clientsManageTable.innerHTML = `
      <table class="checklist-table">
        <thead>
          <tr>
            <th style="width:50px;">#</th>
            <th>Client / College Name</th>
            <th style="width:160px;text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;

    // Hook edit triggers
    el.clientsManageTable.querySelectorAll("[data-trigger-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.dataset.triggerEdit;
        const display = el.clientsManageTable.querySelector(`[data-name-display="${idx}"]`);
        const form = el.clientsManageTable.querySelector(`[data-edit-form="${idx}"]`);
        if (display && form) {
          display.classList.add("hidden");
          form.classList.remove("hidden");
          const input = form.querySelector(`[data-edit-input="${idx}"]`);
          if (input) input.focus();
        }
      });
    });

    // Hook cancel edit
    el.clientsManageTable.querySelectorAll("[data-cancel-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.dataset.cancelEdit;
        const display = el.clientsManageTable.querySelector(`[data-name-display="${idx}"]`);
        const form = el.clientsManageTable.querySelector(`[data-edit-form="${idx}"]`);
        if (display && form) {
          form.classList.add("hidden");
          display.classList.remove("hidden");
        }
      });
    });

    // Hook save edit
    el.clientsManageTable.querySelectorAll("[data-save-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.saveEdit);
        const input = el.clientsManageTable.querySelector(`[data-edit-input="${idx}"]`);
        const newName = input ? input.value.trim() : "";
        const oldName = colleges[idx];
        if (!newName) {
          showToast("Client name cannot be blank.");
          return;
        }
        if (newName.toLowerCase() !== oldName.toLowerCase() && colleges.some((c) => c.toLowerCase() === newName.toLowerCase())) {
          showToast(`"${newName}" already exists.`);
          return;
        }

        // Update in customClients
        if (!Array.isArray(state.customClients)) state.customClients = [...colleges];
        const cIdx = state.customClients.findIndex((c) => c.toLowerCase() === oldName.toLowerCase());
        if (cIdx >= 0) {
          state.customClients[cIdx] = newName;
        } else {
          state.customClients.push(newName);
        }

        // Update in faculties clients
        state.users.forEach((u) => {
          if (Array.isArray(u.clients)) {
            u.clients = u.clients.map((c) => (c.toLowerCase() === oldName.toLowerCase() ? newName : c));
          }
        });

        // Update in reports clients
        state.reports.forEach((r) => {
          if (Array.isArray(r.clients)) {
            r.clients.forEach((c) => {
              if (c.name.toLowerCase() === oldName.toLowerCase()) c.name = newName;
            });
          }
        });

        saveState(state);
        renderClientsManageTable();
        renderAdminCompletionDashboard();
        renderFacultyDirectory();
        showToast(`Renamed "${oldName}" to "${newName}".`);
      });
    });

    // Hook delete client
    el.clientsManageTable.querySelectorAll("[data-delete-client]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.deleteClient);
        const targetName = colleges[idx];
        if (!confirm(`Delete client "${targetName}"? This removes it from the client list.`)) return;

        if (!Array.isArray(state.customClients)) state.customClients = [...colleges];
        state.customClients = state.customClients.filter((c) => c.toLowerCase() !== targetName.toLowerCase());

        // Remove from faculty client lists
        state.users.forEach((u) => {
          if (Array.isArray(u.clients)) {
            u.clients = u.clients.filter((c) => c.toLowerCase() !== targetName.toLowerCase());
          }
        });

        saveState(state);
        renderClientsManageTable();
        renderAdminCompletionDashboard();
        renderFacultyDirectory();
        showToast(`Deleted client "${targetName}".`);
      });
    });
  }

  if (el.addGlobalClientForm) {
    el.addGlobalClientForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = el.newGlobalClientInput.value.trim();
      if (!name) return;

      const colleges = getAllColleges();
      if (colleges.some((c) => c.toLowerCase() === name.toLowerCase())) {
        showToast(`"${name}" is already in the clients list.`);
        return;
      }

      if (!Array.isArray(state.customClients)) state.customClients = [...colleges];
      state.customClients.push(name);
      saveState(state);

      el.newGlobalClientInput.value = "";
      renderClientsManageTable();
      renderAdminCompletionDashboard();
      showToast(`Added client "${name}".`);
    });
  }

  function computeActivitySummary(activityYears, legacyStatus, legacyRemarks) {
    if (!activityYears) {
      const s = legacyStatus || "";
      const r = legacyRemarks || "";
      return {
        status: s,
        isCompleted: s === "completed",
        isIncomplete: s === "not_completed",
        isNotMarked: !s,
        years: {
          y1: { status: s, remarks: r },
          y2: { status: s, remarks: r },
          y3: { status: s, remarks: r }
        }
      };
    }

    const statuses = ACTIVITY_YEARS.map((y) => (activityYears[y.key] && activityYears[y.key].status) || "");
    const hasNotCompleted = statuses.some((st) => st === "not_completed");
    const allCompleted = statuses.every((st) => st === "completed");
    const allUnmarked = statuses.every((st) => !st);

    let overallStatus = "not_marked";
    if (hasNotCompleted) {
      overallStatus = "not_completed";
    } else if (allCompleted) {
      overallStatus = "completed";
    } else if (!allUnmarked && statuses.some((st) => st === "completed")) {
      overallStatus = "completed";
    }

    return {
      status: overallStatus,
      isCompleted: overallStatus === "completed",
      isIncomplete: overallStatus === "not_completed",
      isNotMarked: overallStatus === "not_marked",
      years: activityYears
    };
  }

  function getCollegeStatusForDate(collegeName, targetDate) {
    const reportsForDate = state.reports
      .filter((r) => r.date === targetDate)
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

    for (const report of reportsForDate) {
      if (!Array.isArray(report.clients)) continue;
      const found = report.clients.find(
        (c) =>
          c.name.toLowerCase() === collegeName.toLowerCase() &&
          (c.status || c.activityYears || c.calendarStatus || (c.grievance || "").trim())
      );
      if (found) {
        const actSummary = computeActivitySummary(found.activityYears, found.status, found.remarks);
        return {
          activityStatus: actSummary.status,
          activityYears: actSummary.years,
          activityRemarks: found.remarks || "",
          calendarStatus: found.calendarStatus || "not_marked",
          calendarRemarks: found.calendarRemarks || "",
          grievance: (found.grievance || "").trim()
        };
      }
    }

    return {
      activityStatus: "not_marked",
      activityYears: null,
      activityRemarks: "",
      calendarStatus: "not_marked",
      calendarRemarks: "",
      grievance: ""
    };
  }

  function renderCollegeDashboardTable(container, items) {
    if (!container) return;
    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state">No colleges found.</div>`;
      return;
    }

    const total = items.length;
    const actDone = items.filter((i) => i.activityStatus === "completed").length;
    const actNotDone = items.filter((i) => i.activityStatus === "not_completed").length;
    const actNotMarked = total - actDone - actNotDone;

    const calDone = items.filter((i) => i.calendarStatus === "completed").length;
    const calNotDone = items.filter((i) => i.calendarStatus === "not_completed").length;
    const calNotMarked = total - calDone - calNotDone;

    // Overall college completion (both Activity and Calendar completed)
    const collegeDone = items.filter(
      (i) => i.activityStatus === "completed" && i.calendarStatus === "completed"
    ).length;
    const collegeIncomplete = items.filter(
      (i) => i.activityStatus === "not_completed" || i.calendarStatus === "not_completed"
    ).length;
    const incompleteColleges = items.filter(
      (i) => i.activityStatus === "not_completed" || i.calendarStatus === "not_completed"
    );
    const collegeNotMarked = total - collegeDone - collegeIncomplete;
    const collegePct = total ? Math.round((collegeDone / total) * 100) : 0;
    const circumference = 251.327;
    const dashOffset = (circumference * (1 - collegePct / 100)).toFixed(1);
    const strokeColor = collegePct === 100 ? "#16a34a" : collegePct > 0 ? "#2563eb" : "#94a3b8";

    const incompleteListHtml = incompleteColleges.length
      ? incompleteColleges
          .map((col) => {
            const reasons = [];
            if (col.activityStatus === "not_completed") {
              if (col.activityYears) {
                const yearNotes = ACTIVITY_YEARS.filter(
                  (y) => col.activityYears[y.key] && col.activityYears[y.key].status === "not_completed"
                ).map((y) => {
                  const rem = col.activityYears[y.key].remarks;
                  return `${y.label}: ${rem || "Not Done"}`;
                });
                reasons.push("Activity (" + (yearNotes.join(", ") || "Incomplete") + ")");
              } else {
                reasons.push("Activity: " + (col.activityRemarks || "Not Done"));
              }
            }
            if (col.calendarStatus === "not_completed") {
              reasons.push("Calendar: " + (col.calendarRemarks || "Not Done"));
            }
            return `
            <li class="incomplete-college-item">
              <strong>${escapeHtml(col.name)}</strong>
              <span class="muted" style="font-size:0.75rem;">${escapeHtml(reasons.join(" | "))}</span>
            </li>`;
          })
          .join("")
      : `<li class="small-text muted">No incomplete colleges.</li>`;

    const summaryHtml = `
      <div class="progress-summary-grid">
        <div class="progress-card circular-summary-card">
          <div class="circular-chart-wrap">
            <svg width="86" height="86" viewBox="0 0 100 100" class="circular-chart" aria-label="${collegePct}% college completion">
              <circle cx="50" cy="50" r="40" stroke="#e2e8f0" stroke-width="10" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="${strokeColor}"
                stroke-width="10"
                stroke-linecap="round"
                fill="none"
                stroke-dasharray="251.327"
                stroke-dashoffset="${dashOffset}"
                transform="rotate(-90 50 50)"
                style="transition: stroke-dashoffset 0.4s ease;"
              />
              <text x="50" y="47" text-anchor="middle" font-size="18" font-weight="700" fill="var(--text)">${collegePct}%</text>
              <text x="50" y="64" text-anchor="middle" font-size="10" font-weight="600" fill="var(--muted)">${collegeDone}/${total}</text>
            </svg>
            <div class="circular-info" style="flex:1;">
              <strong style="font-size:0.95rem;">College Completion</strong>
              <span class="muted small-text">${collegeDone} of ${total} colleges fully completed</span>
              <div class="progress-meta" style="margin-top:0.35rem;align-items:center;">
                <span class="badge badge-success">${collegeDone} Completed</span>
                <span
                  class="badge badge-danger ${incompleteColleges.length ? "badge-interactive" : ""}"
                  data-toggle-incomplete
                  title="${incompleteColleges.length ? "Click down arrow to view incomplete colleges" : ""}"
                >
                  ${collegeIncomplete} Incomplete ${incompleteColleges.length ? '<span class="badge-arrow">▼</span>' : ""}
                </span>
                <span class="badge badge-neutral">${collegeNotMarked} Not Marked</span>
              </div>
              <div class="incomplete-colleges-dropdown hidden" data-incomplete-popup>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <strong style="font-size:0.8rem;color:var(--danger);">Incomplete Colleges:</strong>
                  <span class="muted" style="font-size:0.75rem;">(${incompleteColleges.length})</span>
                </div>
                <ul class="incomplete-colleges-list">${incompleteListHtml}</ul>
              </div>
            </div>
          </div>
        </div>

        <div class="progress-card">
          <div class="progress-head">
            <strong>Activities Status</strong>
            <span class="progress-pct">${actDone} / ${total}</span>
          </div>
          <div class="progress-meta">
            <span class="badge badge-success">${actDone} Completed</span>
            <span class="badge badge-danger">${actNotDone} Not Completed</span>
            <span class="badge badge-neutral">${actNotMarked} Not Marked</span>
          </div>
        </div>

        <div class="progress-card">
          <div class="progress-head">
            <strong>Calendar Status</strong>
            <span class="progress-pct">${calDone} / ${total}</span>
          </div>
          <div class="progress-meta">
            <span class="badge badge-success">${calDone} Completed</span>
            <span class="badge badge-danger">${calNotDone} Not Completed</span>
            <span class="badge badge-neutral">${calNotMarked} Not Marked</span>
          </div>
        </div>
      </div>`;

    const rowsHtml = items
      .map((item) => {
        let actBadge = `<span class="badge badge-neutral">Not Marked</span>`;
        if (item.activityYears) {
          const yearRows = ACTIVITY_YEARS.map((y) => {
            const yr = item.activityYears[y.key] || { status: "", remarks: "" };
            let yrBadge = `<span class="badge badge-neutral">Not Marked</span>`;
            if (yr.status === "completed") {
              yrBadge = `<span class="badge badge-success">Completed</span>`;
            } else if (yr.status === "not_completed") {
              yrBadge = `<span class="badge badge-danger">Not Completed</span>` +
                (yr.remarks ? `<div class="remark-line">${escapeHtml(yr.remarks)}</div>` : "");
            }
            return `
              <div class="activity-year-dash-row">
                <span class="activity-year-dash-label">${escapeHtml(y.label)}:</span>
                <div>${yrBadge}</div>
              </div>`;
          }).join("");
          actBadge = `<div class="activity-dashboard-pills">${yearRows}</div>`;
        } else if (item.activityStatus === "completed") {
          actBadge = `<span class="badge badge-success">Completed</span>`;
        } else if (item.activityStatus === "not_completed") {
          actBadge = `<span class="badge badge-danger">Not Completed</span>` +
            (item.activityRemarks ? `<div class="remark-line">${escapeHtml(item.activityRemarks)}</div>` : "");
        }

        let calBadge = `<span class="badge badge-neutral">Not Marked</span>`;
        if (item.calendarStatus === "completed") {
          calBadge = `<span class="badge badge-success">Completed</span>`;
        } else if (item.calendarStatus === "not_completed") {
          calBadge = `<span class="badge badge-danger">Not Completed</span>` +
            (item.calendarRemarks ? `<div class="remark-line">${escapeHtml(item.calendarRemarks)}</div>` : "");
        }

        let grievanceBadge = `<span class="badge badge-neutral">Not Marked</span>`;
        if (item.grievance.length > 0) {
          grievanceBadge = `<span class="badge badge-warn">Yes</span>
            <div class="small-text" style="margin-top:0.3rem;">${escapeHtml(item.grievance)}</div>`;
        }

        return `
        <tr>
          <td class="col-client" style="font-weight:700;font-size:0.95rem;">${escapeHtml(item.name)}</td>
          <td>${actBadge}</td>
          <td>${calBadge}</td>
          <td>${grievanceBadge}</td>
        </tr>`;
      })
      .join("");

    container.innerHTML = `
      ${summaryHtml}
      <div class="table-wrap mt-md">
        <table class="checklist-table">
          <thead>
            <tr>
              <th>College Name</th>
              <th>Activity</th>
              <th>Calendar</th>
              <th>Grievance</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;

    const toggleBtn = container.querySelector("[data-toggle-incomplete]");
    const dropdown = container.querySelector("[data-incomplete-popup]");
    const arrow = container.querySelector(".badge-arrow");
    if (toggleBtn && dropdown && incompleteColleges.length) {
      toggleBtn.addEventListener("click", () => {
        const isHidden = dropdown.classList.contains("hidden");
        dropdown.classList.toggle("hidden", !isHidden);
        if (arrow) arrow.classList.toggle("open", isHidden);
      });
    }
  }

  function renderAdminCompletionDashboard() {
    const selectedDate = el.dashFilterDate.value || todayISO();
    const colleges = getAllColleges();
    const items = colleges.map((collegeName) => ({
      name: collegeName,
      ...getCollegeStatusForDate(collegeName, selectedDate)
    }));

    renderCollegeDashboardTable(el.adminCompletionDashboard, items);
  }

  function renderAdminStats() {
    const facList = faculties();
    const today = todayISO();
    const todayReports = state.reports.filter((r) => r.date === today);
    const incompleteCount = state.reports.filter(hasIncomplete).length;
    const grievanceCount = state.reports.filter(hasGrievance).length;

    const stats = [
      { label: "Total Faculties", value: facList.length },
      { label: "Submitted Today", value: todayReports.length },
      { label: "Reports With Incomplete Items", value: incompleteCount },
      { label: "Grievances Logged", value: grievanceCount }
    ];

    el.adminStats.innerHTML = stats
      .map(
        (s) => `
      <div class="stat-card">
        <div class="stat-label">${escapeHtml(s.label)}</div>
        <div class="stat-value">${s.value}</div>
      </div>`
      )
      .join("");
  }

  function renderFacultyFilterOptions() {
    const facList = faculties();
    const optionsHtml =
      `<option value="all">All Faculties</option>` +
      facList
        .map((f) => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.name)}</option>`)
        .join("");

    const selected = el.filterFaculty.value || "all";
    el.filterFaculty.innerHTML = optionsHtml;
    el.filterFaculty.value = facList.some((f) => f.id === selected) ? selected : "all";
  }

  function renderFacultyDirectory() {
    const facList = faculties();
    el.facultyCountPill.textContent = String(facList.length);

    if (facList.length === 0) {
      el.facultyDirectory.innerHTML = `<div class="empty-state">No faculties created yet.</div>`;
      return;
    }

    el.facultyDirectory.innerHTML = facList
      .map((f) => {
        const chipsHtml = f.clients.length
          ? f.clients
              .map(
                (clientName, idx) => `
              <span class="client-chip">
                <span>${escapeHtml(clientName)}</span>
                <button
                  type="button"
                  class="chip-remove"
                  title="Remove ${escapeHtml(clientName)}"
                  aria-label="Remove ${escapeHtml(clientName)}"
                  data-remove-client-idx="${idx}"
                  data-faculty-id="${escapeHtml(f.id)}"
                >&times;</button>
              </span>`
              )
              .join("")
          : `<span class="muted small-text">No clients assigned yet.</span>`;

        return `
      <div class="faculty-row">
        <div class="faculty-row-head">
          <div>
            <strong>${escapeHtml(f.name)}</strong>
            <div class="muted small-text">${escapeHtml(f.department)}</div>
            <div class="small-text mt-md">
              Login: <code>${escapeHtml(f.username)}</code> / <code>${escapeHtml(f.password)}</code>
            </div>
          </div>
          <button type="button" class="btn btn-danger-ghost btn-sm" data-delete-faculty="${escapeHtml(f.id)}">
            Delete
          </button>
        </div>

        <div>
          <div class="small-text muted">Assigned Clients:</div>
          <div class="client-chips">${chipsHtml}</div>
          <form class="admin-client-add" data-add-client-form="${escapeHtml(f.id)}">
            <input type="text" placeholder="Add client (e.g. XYZ)..." required />
            <button type="submit" class="btn btn-ghost btn-sm">+ Add Client</button>
          </form>
        </div>
      </div>`;
      })
      .join("");

    el.facultyDirectory.querySelectorAll("[data-remove-client-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const facId = btn.dataset.facultyId;
        const idx = Number(btn.dataset.removeClientIdx);
        const target = state.users.find((u) => u.id === facId);
        if (!target || idx < 0 || idx >= target.clients.length) return;
        const removedName = target.clients[idx];
        target.clients.splice(idx, 1);
        saveState(state);
        renderFacultyDirectory();
        renderAdminCompletionDashboard();
        showToast(`Removed client "${removedName}" from ${target.name}.`);

        sheetPost({ action: "updateFacultyClients", facultyId: target.id, clients: target.clients }).catch(
          (err) => showToast(`Sheet client sync failed: ${err.message}`)
        );
      });
    });

    el.facultyDirectory.querySelectorAll("[data-add-client-form]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const facId = form.dataset.addClientForm;
        const target = state.users.find((u) => u.id === facId);
        const input = form.querySelector("input");
        const name = input ? input.value.trim() : "";
        if (!target || !name) return;

        if (target.clients.some((c) => c.toLowerCase() === name.toLowerCase())) {
          showToast(`"${name}" is already assigned to ${target.name}.`);
          return;
        }

        target.clients.push(name);
        saveState(state);
        renderFacultyDirectory();
        renderAdminCompletionDashboard();
        showToast(`Added client "${name}" to ${target.name}.`);

        sheetPost({ action: "updateFacultyClients", facultyId: target.id, clients: target.clients }).catch(
          (err) => showToast(`Sheet client sync failed: ${err.message}`)
        );
      });
    });

    el.facultyDirectory.querySelectorAll("[data-delete-faculty]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const facId = btn.dataset.deleteFaculty;
        const target = state.users.find((u) => u.id === facId);
        if (!target) return;
        if (!confirm(`Delete faculty "${target.name}" and their submitted reports?`)) return;
        state.users = state.users.filter((u) => u.id !== facId);
        state.reports = state.reports.filter((r) => r.facultyId !== facId);
        saveState(state);
        renderAdminView();
        showToast(`Deleted faculty "${target.name}".`);

        sheetPost({ action: "deleteFaculty", facultyId: facId }).catch((err) =>
          showToast(`Sheet delete sync failed: ${err.message}`)
        );
      });
    });
  }

  function renderReportClientRows(clients, statusKey, remarksKey) {
    return clients
      .map((c) => {
        if (statusKey === "activityYears") {
          let innerHtml = "";
          if (c.activityYears) {
            const yrItems = ACTIVITY_YEARS.map((y) => {
              const yr = c.activityYears[y.key] || { status: "", remarks: "" };
              const ok = yr.status === "completed";
              const notDone = yr.status === "not_completed";
              const label = ok ? "Completed" : notDone ? "Not Completed" : "Not Marked";
              const badgeClass = ok ? "badge-success" : notDone ? "badge-danger" : "badge-neutral";
              return `
                <div style="display:flex;justify-content:space-between;gap:0.4rem;align-items:center;margin-top:0.25rem;">
                  <span class="muted small-text">${escapeHtml(y.label)}:</span>
                  <span class="badge ${badgeClass}">${label}</span>
                </div>
                ${notDone && yr.remarks ? `<div class="remark-line" style="font-size:0.75rem;">${escapeHtml(yr.remarks)}</div>` : ""}`;
            }).join("");
            innerHtml = `<div style="margin-top:0.25rem;">${yrItems}</div>`;
          } else {
            const ok = c.status === "completed";
            innerHtml = `
              <div style="display:flex;justify-content:space-between;gap:0.5rem;align-items:center;">
                <span class="badge ${ok ? "badge-success" : "badge-danger"}">
                  ${ok ? "Completed" : "Not Completed"}
                </span>
              </div>
              ${!ok && c.remarks ? `<div class="remark-line">Remark: ${escapeHtml(c.remarks)}</div>` : ""}`;
          }

          return `
          <li>
            <strong style="font-size:0.88rem;">${escapeHtml(c.name)}</strong>
            ${innerHtml}
          </li>`;
        }

        const ok = c[statusKey] === "completed";
        const remark = c[remarksKey];
        return `
        <li>
          <div style="display:flex;justify-content:space-between;gap:0.5rem;align-items:center;">
            <span>${escapeHtml(c.name)}</span>
            <span class="badge ${ok ? "badge-success" : "badge-danger"}">
              ${ok ? "Completed" : "Not Completed"}
            </span>
          </div>
          ${!ok && remark ? `<div class="remark-line">Remark: ${escapeHtml(remark)}</div>` : ""}
        </li>`;
      })
      .join("");
  }

  function renderReportCard(report, showFacultyName) {
    const fac = state.users.find((u) => u.id === report.facultyId);
    const facTitle = fac ? `${fac.name} (${fac.department})` : "Deleted Faculty";
    const incomplete = hasIncomplete(report);
    const grievanceFlag = hasGrievance(report);

    const activitiesHtml = renderReportClientRows(report.clients, "activityYears", "");
    const calendarHtml = renderReportClientRows(report.clients, "calendarStatus", "calendarRemarks");
    const grievanceItems = report.clients.filter((c) => (c.grievance || "").trim().length > 0);
    const grievancesHtml = grievanceItems.length
      ? `<ul class="mini-client-list">${grievanceItems
          .map(
            (c) => `
          <li>
            <strong>${escapeHtml(c.name)}:</strong> ${escapeHtml(c.grievance)}
          </li>`
          )
          .join("")}</ul>`
      : `<div class="grievance-box"><span class='muted'>No grievances mentioned.</span></div>`;

    return `
      <article class="report-card">
        <div class="report-header">
          <div>
            ${showFacultyName ? `<strong>${escapeHtml(facTitle)}</strong> · ` : ""}
            <span>Date: <strong>${escapeHtml(report.date)}</strong></span>
            <div class="muted small-text">Updated ${escapeHtml(formatTimestamp(report.updatedAt))}</div>
          </div>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
            <span class="badge ${incomplete ? "badge-danger" : "badge-success"}">
              ${incomplete ? "Action / Remarks Logged" : "All Completed"}
            </span>
            ${grievanceFlag ? `<span class="badge badge-warn">Grievance Reported</span>` : ""}
          </div>
        </div>

        <div class="report-grid">
          <div>
            <div class="report-block-title">1. Client Activities</div>
            <ul class="mini-client-list">${activitiesHtml}</ul>
          </div>

          <div>
            <div class="report-block-title">2. Calendar</div>
            <ul class="mini-client-list">${calendarHtml}</ul>
          </div>

          <div>
            <div class="report-block-title">3. Grievances</div>
            ${grievancesHtml}
          </div>
        </div>
      </article>`;
  }

  function renderAdminReports() {
    const facFilter = el.filterFaculty.value;
    const dateFilter = el.filterDate.value;
    const statusFilter = el.filterStatus.value;

    const filtered = state.reports
      .filter((r) => (facFilter === "all" ? true : r.facultyId === facFilter))
      .filter((r) => (!dateFilter ? true : r.date === dateFilter))
      .filter((r) => {
        if (statusFilter === "incomplete") return hasIncomplete(r);
        if (statusFilter === "complete") return !hasIncomplete(r);
        if (statusFilter === "grievance") return hasGrievance(r);
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));

    if (filtered.length === 0) {
      el.adminReportsList.innerHTML = `<div class="empty-state">No faculty submissions match the selected filters.</div>`;
      return;
    }

    el.adminReportsList.innerHTML = filtered.map((r) => renderReportCard(r, true)).join("");
  }

  // ---- FACULTY VIEW ----
  el.reportDate.addEventListener("change", () => {
    const user = currentUser();
    if (user && user.role === "faculty") {
      loadFacultyDraftForDate(user, el.reportDate.value || todayISO());
    }
  });

  function loadFacultyDraftForDate(user, date) {
    el.facultyFormError.classList.add("hidden");
    const existing = state.reports.find((r) => r.facultyId === user.id && r.date === date);

    const assignedClients = Array.isArray(user.clients) ? user.clients : DEFAULT_CLIENTS;

    draftClients = assignedClients.map((name) => {
      const match = existing
        ? existing.clients.find((c) => c.name.toLowerCase() === name.toLowerCase())
        : null;

      const actYears = {
        y1: { status: "", remarks: "" },
        y2: { status: "", remarks: "" },
        y3: { status: "", remarks: "" }
      };

      if (match && match.activityYears) {
        ACTIVITY_YEARS.forEach((y) => {
          if (match.activityYears[y.key]) {
            actYears[y.key] = {
              status: match.activityYears[y.key].status || "",
              remarks: match.activityYears[y.key].remarks || ""
            };
          }
        });
      } else if (match && match.status) {
        // Fallback for legacy single status
        ACTIVITY_YEARS.forEach((y) => {
          actYears[y.key] = {
            status: match.status,
            remarks: match.remarks || ""
          };
        });
      }

      return {
        name,
        activityYears: actYears,
        calendarStatus: match ? match.calendarStatus || "" : "",
        calendarRemarks: match ? match.calendarRemarks || "" : "",
        grievance: match ? match.grievance || "" : ""
      };
    });

    renderAllFacultyTables();
  }

  function renderAllFacultyTables(invalidActivities = new Set(), invalidCalendar = new Set()) {
    renderActivityYearsTable(invalidActivities);
    renderStatusTable({
      container: el.calendarTableList,
      prefix: "calendar",
      statusKey: "calendarStatus",
      remarksKey: "calendarRemarks",
      invalidSet: invalidCalendar
    });
    renderGrievanceTable();
    renderFacultyCompletionDashboard();
  }

  function renderActivityYearsTable(invalidActivities = new Set()) {
    if (!el.clientActivitiesList) return;
    if (draftClients.length === 0) {
      el.clientActivitiesList.innerHTML = `<div class="empty-state">No clients assigned by Admin yet.</div>`;
      return;
    }

    const rowsHtml = draftClients
      .map((client, idx) => {
        const isInvalid = invalidActivities.has(idx);

        const yearBlocksHtml = ACTIVITY_YEARS.map((y) => {
          const yrData = client.activityYears[y.key] || { status: "", remarks: "" };
          const showRemarks = yrData.status === "not_completed";
          return `
            <div class="activity-year-box">
              <div class="activity-year-header">
                <span class="activity-year-label">${escapeHtml(y.label)}</span>
                <div class="status-group">
                  <label class="choice-card">
                    <input type="radio" name="actYearStatus-${idx}-${y.key}" value="completed" ${
                      yrData.status === "completed" ? "checked" : ""
                    } />
                    <span>Completed</span>
                  </label>
                  <label class="choice-card">
                    <input type="radio" name="actYearStatus-${idx}-${y.key}" value="not_completed" ${
                      yrData.status === "not_completed" ? "checked" : ""
                    } />
                    <span>Not Completed</span>
                  </label>
                  <label class="choice-card">
                    <input type="radio" name="actYearStatus-${idx}-${y.key}" value="" ${
                      !yrData.status ? "checked" : ""
                    } />
                    <span class="muted">None / Skip</span>
                  </label>
                </div>
              </div>
              <div data-act-year-remarks-wrap="${idx}-${y.key}" class="${showRemarks ? "" : "hidden"}" style="margin-top:0.35rem;">
                <input
                  id="act-year-remark-${idx}-${y.key}"
                  type="text"
                  placeholder="Remarks for ${escapeHtml(client.name)} (${escapeHtml(y.label)}) *"
                  value="${escapeHtml(yrData.remarks || "")}"
                />
              </div>
            </div>`;
        }).join("");

        return `
        <tr class="${isInvalid ? "invalid" : ""}" data-activity-row="${idx}">
          <td class="col-client" style="vertical-align:top;padding-top:1rem;">
            <strong>${escapeHtml(client.name)}</strong>
          </td>
          <td>
            <div class="activity-years-stack">
              ${yearBlocksHtml}
            </div>
          </td>
        </tr>`;
      })
      .join("");

    el.clientActivitiesList.innerHTML = `
      <table class="checklist-table">
        <thead>
          <tr>
            <th style="width:160px;">Client</th>
            <th>Year-wise Activity Status (1st, 2nd &amp; 3rd Year)</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;

    draftClients.forEach((_c, idx) => {
      const row = el.clientActivitiesList.querySelector(`[data-activity-row="${idx}"]`);
      ACTIVITY_YEARS.forEach((y) => {
        const radios = el.clientActivitiesList.querySelectorAll(`input[name="actYearStatus-${idx}-${y.key}"]`);
        const remarkWrap = el.clientActivitiesList.querySelector(`[data-act-year-remarks-wrap="${idx}-${y.key}"]`);
        const remarkInput = el.clientActivitiesList.querySelector(`#act-year-remark-${idx}-${y.key}`);

        radios.forEach((radio) => {
          radio.addEventListener("change", () => {
            draftClients[idx].activityYears[y.key].status = radio.value;
            const notDone = radio.value === "not_completed";
            if (remarkWrap) remarkWrap.classList.toggle("hidden", !notDone);
            if (!notDone) {
              draftClients[idx].activityYears[y.key].remarks = "";
              if (remarkInput) remarkInput.value = "";
            }
            if (row) row.classList.remove("invalid");
            renderFacultyCompletionDashboard();
          });
        });

        if (remarkInput) {
          remarkInput.addEventListener("input", () => {
            draftClients[idx].activityYears[y.key].remarks = remarkInput.value;
            if (remarkInput.value.trim() && row) {
              row.classList.remove("invalid");
            }
          });
        }
      });
    });
  }

  function renderFacultyCompletionDashboard() {
    const targetDate = el.reportDate.value || todayISO();
    const colleges = getAllColleges();
    const items = colleges.map((collegeName) => {
      const draft = draftClients.find((c) => c.name.toLowerCase() === collegeName.toLowerCase());
      if (draft) {
        const actSummary = computeActivitySummary(draft.activityYears);
        if (!actSummary.isNotMarked || draft.calendarStatus || (draft.grievance || "").trim()) {
          return {
            name: collegeName,
            activityStatus: actSummary.status,
            activityYears: draft.activityYears,
            activityRemarks: "",
            calendarStatus: draft.calendarStatus || "not_marked",
            calendarRemarks: draft.calendarRemarks || "",
            grievance: (draft.grievance || "").trim()
          };
        }
      }
      return {
        name: collegeName,
        ...getCollegeStatusForDate(collegeName, targetDate)
      };
    });

    renderCollegeDashboardTable(el.facultyCompletionDashboard, items);
  }

  function renderStatusTable({ container, prefix, statusKey, remarksKey, invalidSet }) {
    if (draftClients.length === 0) {
      container.innerHTML = `<div class="empty-state">No clients assigned by Admin yet.</div>`;
      return;
    }

    const rowsHtml = draftClients
      .map((client, idx) => {
        const showRemarks = client[statusKey] === "not_completed";
        const isInvalid = invalidSet.has(idx);
        return `
        <tr class="${isInvalid ? "invalid" : ""}" data-${prefix}-row="${idx}">
          <td class="col-client">${escapeHtml(client.name)}</td>
          <td class="col-status">
            <div class="status-group">
              <label class="choice-card">
                <input type="radio" name="${prefix}Status-${idx}" value="completed" ${
                  client[statusKey] === "completed" ? "checked" : ""
                } />
                <span>Completed</span>
              </label>
              <label class="choice-card">
                <input type="radio" name="${prefix}Status-${idx}" value="not_completed" ${
                  client[statusKey] === "not_completed" ? "checked" : ""
                } />
                <span>Not Completed</span>
              </label>
              <label class="choice-card">
                <input type="radio" name="${prefix}Status-${idx}" value="" ${
                  !client[statusKey] ? "checked" : ""
                } />
                <span class="muted">None / Skip</span>
              </label>
            </div>
          </td>
          <td>
            <div data-${prefix}-remarks-wrap="${idx}" class="${showRemarks ? "" : "hidden"}">
              <input
                id="${prefix}-remark-${idx}"
                type="text"
                placeholder="Remarks required for ${escapeHtml(client.name)} *"
                value="${escapeHtml(client[remarksKey])}"
              />
            </div>
            <span data-${prefix}-dash="${idx}" class="muted small-text ${showRemarks ? "hidden" : ""}">—</span>
          </td>
        </tr>`;
      })
      .join("");

    container.innerHTML = `
      <table class="checklist-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Status</th>
            <th>Remarks (if Not Completed)</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;

    draftClients.forEach((_c, idx) => {
      const radios = container.querySelectorAll(`input[name="${prefix}Status-${idx}"]`);
      const remarkWrap = container.querySelector(`[data-${prefix}-remarks-wrap="${idx}"]`);
      const dash = container.querySelector(`[data-${prefix}-dash="${idx}"]`);
      const remarkInput = container.querySelector(`#${prefix}-remark-${idx}`);
      const row = container.querySelector(`[data-${prefix}-row="${idx}"]`);

      radios.forEach((radio) => {
        radio.addEventListener("change", () => {
          draftClients[idx][statusKey] = radio.value;
          const notDone = radio.value === "not_completed";
          remarkWrap.classList.toggle("hidden", !notDone);
          dash.classList.toggle("hidden", notDone);
          if (!notDone) {
            draftClients[idx][remarksKey] = "";
            remarkInput.value = "";
            row.classList.remove("invalid");
          }
          renderFacultyCompletionDashboard();
        });
      });

      remarkInput.addEventListener("input", () => {
        draftClients[idx][remarksKey] = remarkInput.value;
        if (remarkInput.value.trim()) {
          row.classList.remove("invalid");
        }
      });
    });
  }

  function renderGrievanceTable() {
    if (draftClients.length === 0) {
      el.grievanceTableList.innerHTML = `<div class="empty-state">No clients assigned by Admin yet.</div>`;
      return;
    }

    const rowsHtml = draftClients
      .map(
        (client, idx) => `
        <tr>
          <td class="col-client">${escapeHtml(client.name)}</td>
          <td>
            <input
              type="text"
              data-grievance-idx="${idx}"
              placeholder="Type grievance for ${escapeHtml(client.name)} (optional)..."
              value="${escapeHtml(client.grievance)}"
            />
          </td>
        </tr>`
      )
      .join("");

    el.grievanceTableList.innerHTML = `
      <table class="checklist-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Grievance Details</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;

    el.grievanceTableList.querySelectorAll("[data-grievance-idx]").forEach((input) => {
      input.addEventListener("input", () => {
        const idx = Number(input.dataset.grievanceIdx);
        draftClients[idx].grievance = input.value;
        renderFacultyCompletionDashboard();
      });
    });
  }

  el.facultyChecklistForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = currentUser();
    if (!user || user.role !== "faculty") return;

    const date = el.reportDate.value || todayISO();
    const invalidActivities = new Set();
    const invalidCalendar = new Set();
    const errors = [];

    // Find colleges where faculty actually selected a status or typed a grievance
    const markedColleges = draftClients.filter((c) => {
      const actSummary = computeActivitySummary(c.activityYears);
      return !actSummary.isNotMarked || Boolean(c.calendarStatus) || Boolean((c.grievance || "").trim());
    });

    if (markedColleges.length === 0) {
      errors.push("Please mark at least one college before submitting.");
    }

    // Only validate remarks for colleges marked as not_completed
    draftClients.forEach((c, idx) => {
      ACTIVITY_YEARS.forEach((y) => {
        const yr = c.activityYears && c.activityYears[y.key];
        if (yr && yr.status === "not_completed" && !yr.remarks.trim()) {
          invalidActivities.add(idx);
          errors.push(`Add Activity remarks for "${c.name}" (${y.label}) because it is marked Not Completed.`);
        }
      });

      if (c.calendarStatus === "not_completed" && !c.calendarRemarks.trim()) {
        invalidCalendar.add(idx);
        errors.push(`Add Calendar remarks for "${c.name}" because it is marked Not Completed.`);
      }
    });

    if (errors.length > 0) {
      renderAllFacultyTables(invalidActivities, invalidCalendar);
      el.facultyFormError.textContent = errors[0];
      el.facultyFormError.classList.remove("hidden");
      return;
    }

    el.facultyFormError.classList.add("hidden");

    const payload = {
      id: "r-" + Date.now(),
      facultyId: user.id,
      date,
      clients: markedColleges.map((c) => {
        const actSummary = computeActivitySummary(c.activityYears);
        const firstIncompleteYear = ACTIVITY_YEARS.find(
          (y) => c.activityYears && c.activityYears[y.key] && c.activityYears[y.key].status === "not_completed"
        );
        const legacyRemark = firstIncompleteYear
          ? `${firstIncompleteYear.label}: ${c.activityYears[firstIncompleteYear.key].remarks.trim()}`
          : "";

        return {
          name: c.name,
          status: actSummary.status === "not_marked" ? "" : actSummary.status,
          remarks: legacyRemark,
          activityYears: {
            y1: {
              status: (c.activityYears && c.activityYears.y1 && c.activityYears.y1.status) || "",
              remarks: (c.activityYears && c.activityYears.y1 && c.activityYears.y1.remarks.trim()) || ""
            },
            y2: {
              status: (c.activityYears && c.activityYears.y2 && c.activityYears.y2.status) || "",
              remarks: (c.activityYears && c.activityYears.y2 && c.activityYears.y2.remarks.trim()) || ""
            },
            y3: {
              status: (c.activityYears && c.activityYears.y3 && c.activityYears.y3.status) || "",
              remarks: (c.activityYears && c.activityYears.y3 && c.activityYears.y3.remarks.trim()) || ""
            }
          },
          calendarStatus: c.calendarStatus || "",
          calendarRemarks: c.calendarStatus === "not_completed" ? c.calendarRemarks.trim() : "",
          grievance: (c.grievance || "").trim()
        };
      }),
      updatedAt: new Date().toISOString()
    };

    const existingIdx = state.reports.findIndex(
      (r) => r.facultyId === user.id && r.date === date
    );
    if (existingIdx >= 0) {
      payload.id = state.reports[existingIdx].id;
      const prevClients = state.reports[existingIdx].clients || [];
      const mergedClients = [...payload.clients];
      prevClients.forEach((prev) => {
        if (!mergedClients.some((m) => m.name.toLowerCase() === prev.name.toLowerCase())) {
          mergedClients.push(prev);
        }
      });
      payload.clients = mergedClients;
      state.reports[existingIdx] = payload;
    } else {
      state.reports.push(payload);
    }

    saveState(state);
    renderFacultyHistory(user);
    renderFacultyCompletionDashboard();
    showToast(`Report for ${date} saved locally.`);

    sheetPost({
      action: "saveReport",
      report: payload,
      faculty: { name: user.name, department: user.department }
    })
      .then((res) => {
        if (!res.skipped) {
          showToast(`Report for ${date} stored in Google Sheet!`);
        }
      })
      .catch((err) => {
        showToast(`Google Sheet save failed: ${err.message}`);
      });
  });

  function renderFacultyHistory(user) {
    const mine = state.reports
      .filter((r) => r.facultyId === user.id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));

    if (mine.length === 0) {
      el.facultyHistoryList.innerHTML = `<div class="empty-state">No submissions yet. Complete the 3 tasks above and submit.</div>`;
      return;
    }

    el.facultyHistoryList.innerHTML = mine.map((r) => renderReportCard(r, false)).join("");
  }

  // Initialize
  renderApp();
  syncFromSheet({ quiet: true });
})();
