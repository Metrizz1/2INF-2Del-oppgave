const DOM = {
  loginPage: document.getElementById("login-page"),
  app: document.getElementById("app"),
  authTabs: Array.from(document.querySelectorAll("[data-auth-tab]")),
  authError: document.getElementById("auth-error"),
  infoBox: document.getElementById("info-box"),
  loginPanel: document.getElementById("login-panel"),
  registerPanel: document.getElementById("register-panel"),
  otpPanel: document.getElementById("otp-panel"),
  otpDescription: document.getElementById("otp-description"),

  loginForm: document.getElementById("login-form"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  loginSendCode: document.getElementById("login-send-code"),
  forgotBtn: document.getElementById("forgot-btn"),

  registerForm: document.getElementById("register-form"),
  regName: document.getElementById("reg-name"),
  regEmail: document.getElementById("reg-email"),
  regPassword: document.getElementById("reg-password"),
  regCardId: document.getElementById("reg-kortid"),

  otpForm: document.getElementById("otp-form"),
  otpCode: document.getElementById("otp-code"),
  otpBack: document.getElementById("otp-back"),

  topbarName: document.getElementById("topbar-name"),
  topbarRole: document.getElementById("topbar-role"),
  themeToggle: document.getElementById("theme-toggle"),
  logoutBtn: document.getElementById("logout-btn"),
  adminNavBtn: document.getElementById("admin-nav-btn"),
  navItems: Array.from(document.querySelectorAll(".nav-item")),

  dashboardPage: document.getElementById("page-dashboard"),
  logPage: document.getElementById("page-log"),
  usersPage: document.getElementById("page-users"),
  adminPage: document.getElementById("page-admin"),

  alarmStatus: document.getElementById("alarm-status"),
  alarmSub: document.getElementById("alarm-sub"),
  lastUnlock: document.getElementById("last-unlock"),
  lastUnlockSub: document.getElementById("last-unlock-sub"),
  lastDeact: document.getElementById("last-deact"),
  lastDeactSub: document.getElementById("last-deact-sub"),
  eventCount: document.getElementById("event-count"),
  eventsFeed: document.getElementById("events-feed"),

  simForm: document.getElementById("sim-form"),
  simCardId: document.getElementById("sim-kortid"),
  simAction: document.getElementById("sim-action"),
  simRoom: document.getElementById("sim-room"),
  simClear: document.getElementById("sim-clear"),

  logSearch: document.getElementById("log-search"),
  logTypeFilter: document.getElementById("log-type-filter"),
  logTimeFilter: document.getElementById("log-time-filter"),
  exportBtn: document.getElementById("export-btn"),
  logBody: document.getElementById("log-body"),
  logCount: document.getElementById("log-count"),
  logPrev: document.getElementById("log-prev"),
  logNext: document.getElementById("log-next"),

  usersSearch: document.getElementById("users-search"),
  roleTabs: Array.from(document.querySelectorAll("[data-role-filter]")),
  usersBody: document.getElementById("users-body"),
  usersCount: document.getElementById("users-count"),

  adminNote: document.getElementById("admin-note"),
  adminContent: document.getElementById("admin-content"),
  adminAddForm: document.getElementById("admin-add-form"),
  addName: document.getElementById("add-name"),
  addCardId: document.getElementById("add-kortid"),
  addRole: document.getElementById("add-role"),
  addEmail: document.getElementById("add-email"),
  autoCardId: document.getElementById("auto-kortid"),
  clearEventsBtn: document.getElementById("clear-events-btn"),
  adminBody: document.getElementById("admin-body"),
  saveRolesBtn: document.getElementById("save-roles-btn"),
  adminSaveRow: document.getElementById("admin-save-row"),

  toastContainer: document.getElementById("toast-container")
};

const TOKEN_KEY = "sa_token";
const THEME_KEY = "sa_theme";
const PAGE_IDS = ["dashboard", "log", "users", "admin"];
const ACTION_META = {
  unlock_door: { label: "Låste opp dør", badgeClass: "unlock", badgeText: "opplåst" },
  lock_door: { label: "Låste dør", badgeClass: "alarm", badgeText: "låst" },
  activate_alarm: { label: "Alarm aktivert", badgeClass: "alarm", badgeText: "alarm på" },
  deactivate_alarm: { label: "Alarm deaktivert", badgeClass: "alarm", badgeText: "alarm av" },
  deny_access: { label: "Tilgang nektet", badgeClass: "deny", badgeText: "avvist" }
};

const state = {
  currentUser: null,
  users: [],
  events: [],
  pendingEmail: "",
  activePage: "dashboard",
  roleFilter: "",
  logPage: 0,
  logPageSize: 10
};

const storage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
  getTheme() {
    return localStorage.getItem(THEME_KEY);
  },
  setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
  }
};

const api = {
  async request(path, options = {}) {
    const headers = new Headers(options.headers || {});

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const token = storage.getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    let response;

    try {
      response = await fetch(`/api${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
    } catch (error) {
      throw new Error("Fikk ikke kontakt med serveren. Åpne siden via http://localhost:3000.");
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      if (payload?.error) {
        throw new Error(payload.error);
      }

      if (response.status === 404) {
        throw new Error("Fant ikke tjenesten. Åpne siden via http://localhost:3000.");
      }

      throw new Error(`Serverfeil (${response.status}).`);
    }

    return payload;
  },
  login(email, password) {
    return this.request("/auth/login", {
      method: "POST",
      body: { email, password }
    });
  },
  signup(payload) {
    return this.request("/auth/signup", {
      method: "POST",
      body: payload
    });
  },
  verifyOtp(email, otp) {
    return this.request("/auth/verify-otp", {
      method: "POST",
      body: { email, otp }
    });
  },
  logout() {
    return this.request("/auth/logout", { method: "POST" });
  },
  bootstrap() {
    return this.request("/bootstrap");
  },
  me() {
    return this.request("/auth/me");
  },
  createEvent(payload) {
    return this.request("/events", {
      method: "POST",
      body: payload
    });
  },
  addUser(payload) {
    return this.request("/admin/users", {
      method: "POST",
      body: payload
    });
  },
  updateUser(cardId, payload) {
    return this.request(`/admin/users/${encodeURIComponent(cardId)}`, {
      method: "PATCH",
      body: payload
    });
  },
  deleteUser(cardId) {
    return this.request(`/admin/users/${encodeURIComponent(cardId)}`, {
      method: "DELETE"
    });
  },
  clearEvents() {
    return this.request("/admin/events", {
      method: "DELETE"
    });
  }
};

function normalizeRole(role) {
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  return "gjest";
}

function roleLabel(role) {
  const safeRole = normalizeRole(role);
  if (safeRole === "owner") return "Eier";
  if (safeRole === "admin") return "Admin";
  return "Gjest";
}

function roleBadgeLabel(role) {
  return roleLabel(role).toUpperCase();
}

function normalizeAction(action) {
  if (ACTION_META[action]) {
    return action;
  }

  const lower = String(action || "").trim().toLowerCase();

  if (lower === "låste opp dør" || lower === "laste opp dor") return "unlock_door";
  if (lower === "låste dør" || lower === "laste dor") return "lock_door";
  if (lower === "alarm aktivert") return "activate_alarm";
  if (lower === "alarm deaktivert") return "deactivate_alarm";
  if (lower === "tilgang nektet") return "deny_access";

  return "unlock_door";
}

function normalizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email || "",
    role: normalizeRole(user.role),
    cardId: user.cardId || user.kortid || ""
  };
}

function normalizeEvent(event) {
  return {
    id: event.id,
    name: event.name || "Ukjent kort",
    cardId: event.cardId || event.kortid || "",
    action: normalizeAction(event.action),
    room: event.room || "",
    ts: event.timestamp || event.ts
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function actionLabel(action) {
  return ACTION_META[normalizeAction(action)].label;
}

function actionBadge(action) {
  return ACTION_META[normalizeAction(action)];
}

function themeIcon(theme) {
  if (theme === "light") {
    return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="2.5" stroke="currentColor" stroke-width="1.2"></circle><path d="M7 1.2v1.4M7 11.4v1.4M1.2 7h1.4M11.4 7h1.4M2.9 2.9l1 1M10.1 10.1l1 1M11.1 2.9l-1 1M3.9 10.1l-1 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"></path></svg>`;
  }

  return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9.9 1.4A5.7 5.7 0 108.7 12.6 5.3 5.3 0 019.9 1.4z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"></path></svg>`;
}

function applyTheme(theme) {
  const safeTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = safeTheme;
  storage.setTheme(safeTheme);

  DOM.themeToggle.innerHTML = themeIcon(safeTheme);
  DOM.themeToggle.title = safeTheme === "light" ? "Bytt til mørk modus" : "Bytt til lys modus";
  DOM.themeToggle.setAttribute("aria-label", DOM.themeToggle.title);
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  applyTheme(nextTheme);
}

function initTheme() {
  const savedTheme = storage.getTheme();
  applyTheme(savedTheme === "light" ? "light" : "dark");
}

function joinMeta(parts) {
  return parts.filter(Boolean).join(", ");
}

function fmtTime(ts) {
  const date = new Date(ts);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function fmtDate(ts) {
  const date = new Date(ts);
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function initialsFor(name) {
  return String(name || "Ukjent")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function sortedEvents() {
  return [...state.events].sort((left, right) => new Date(right.ts) - new Date(left.ts));
}

function isAdmin() {
  return state.currentUser?.role === "admin" || state.currentUser?.role === "owner";
}

function setAuthError(message = "") {
  DOM.authError.textContent = message;
  DOM.authError.classList.toggle("hidden", !message);
}

function setInfo(message) {
  DOM.infoBox.innerHTML = message;
}

function showAuthTab(tab) {
  const safeTab = tab === "register" ? "register" : "login";

  DOM.authTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.authTab === safeTab);
  });

  DOM.loginPanel.classList.toggle("hidden", safeTab !== "login");
  DOM.registerPanel.classList.toggle("hidden", safeTab !== "register");
  DOM.otpPanel.classList.add("hidden");
  state.pendingEmail = "";
  DOM.otpForm.reset();
  setAuthError("");
}

function showOtpPanel(email, otpPreview, contextLabel) {
  state.pendingEmail = email;
  DOM.loginPanel.classList.add("hidden");
  DOM.registerPanel.classList.add("hidden");
  DOM.otpPanel.classList.remove("hidden");
  DOM.otpDescription.textContent = `${contextLabel} for ${email}. Bekreftelseskode: ${otpPreview}`;
  setInfo(`Bruk koden <strong>${escapeHtml(otpPreview)}</strong> for å bekrefte handlingen.`);
}

function showPage(pageName) {
  const safePage = PAGE_IDS.includes(pageName) ? pageName : "dashboard";
  state.activePage = safePage;

  PAGE_IDS.forEach((pageId) => {
    const element = document.getElementById(`page-${pageId}`);
    element.classList.toggle("hidden", pageId !== safePage);
  });

  DOM.navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.page === safePage);
  });

  if (safePage === "log") renderLog();
  if (safePage === "users") renderUsers();
  if (safePage === "admin") renderAdmin();
}

function showLoginPage() {
  DOM.app.classList.remove("active");
  DOM.loginPage.classList.add("active");
}

function showAppShell() {
  DOM.loginPage.classList.remove("active");
  DOM.app.classList.add("active");
}

function applyBootstrap(payload) {
  state.currentUser = normalizeUser(payload.currentUser);
  state.users = (payload.users || []).map(normalizeUser);
  state.events = (payload.events || []).map(normalizeEvent);
}

async function refreshData() {
  const payload = await api.bootstrap();
  applyBootstrap(payload);
  renderAll();
}

function renderTopbar() {
  DOM.topbarName.textContent = state.currentUser?.name || "Bruker";
  DOM.topbarRole.textContent = roleBadgeLabel(state.currentUser?.role);
  DOM.adminNavBtn.classList.toggle("hidden", !isAdmin());
}

function renderDashboard() {
  const events = sortedEvents();
  const now = Date.now();
  const eventsLast24Hours = events.filter((event) => now - new Date(event.ts).getTime() < 24 * 60 * 60 * 1000);
  const lastUnlock = events.find((event) => event.action === "unlock_door");
  const lastDeactivate = events.find((event) => event.action === "deactivate_alarm");
  const lastAlarmChange = events.find((event) => event.action === "activate_alarm" || event.action === "deactivate_alarm");

  DOM.eventCount.textContent = String(eventsLast24Hours.length);

  if (lastUnlock) {
    DOM.lastUnlock.textContent = fmtTime(lastUnlock.ts);
    DOM.lastUnlockSub.textContent = joinMeta([lastUnlock.name, lastUnlock.room, fmtDate(lastUnlock.ts)]);
  } else {
    DOM.lastUnlock.textContent = "-";
    DOM.lastUnlockSub.textContent = "Ingen opplåsinger registrert";
  }

  if (lastDeactivate) {
    DOM.lastDeact.textContent = fmtTime(lastDeactivate.ts);
    DOM.lastDeactSub.textContent = joinMeta([lastDeactivate.name, lastDeactivate.room, fmtDate(lastDeactivate.ts)]);
  } else {
    DOM.lastDeact.textContent = "-";
    DOM.lastDeactSub.textContent = "Ingen deaktiveringer registrert";
  }

  if (lastAlarmChange) {
    const isActive = lastAlarmChange.action === "activate_alarm";
    DOM.alarmStatus.textContent = isActive ? "Aktivert" : "Deaktivert";
    DOM.alarmStatus.style.color = isActive ? "var(--red)" : "var(--green)";
    DOM.alarmSub.textContent = joinMeta([
      `${isActive ? "Aktivert" : "Deaktivert"} av ${lastAlarmChange.name}`,
      lastAlarmChange.room,
      `${fmtDate(lastAlarmChange.ts)} kl. ${fmtTime(lastAlarmChange.ts)}`
    ]);
  } else {
    DOM.alarmStatus.textContent = "Ukjent";
    DOM.alarmStatus.style.color = "var(--hint)";
    DOM.alarmSub.textContent = "Ingen alarmhendelser registrert";
  }

  renderFeed(events.slice(0, 8));
}

function renderFeed(events) {
  if (!events.length) {
    DOM.eventsFeed.innerHTML = `<div class="empty-state"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="4" width="24" height="24" rx="4" stroke="currentColor" stroke-width="1.5"></rect><path d="M10 12h12M10 16h8M10 20h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg><p>Ingen hendelser ennå</p></div>`;
    return;
  }

  DOM.eventsFeed.innerHTML = events
    .map((event) => {
      const badge = actionBadge(event.action);
      return `<div class="event-item action-${escapeHtml(normalizeAction(event.action))}">
        <div class="avatar">${escapeHtml(initialsFor(event.name))}</div>
        <div class="event-body">
          <div class="event-top">
            <span class="event-name">${escapeHtml(event.name)}</span>
            <span class="type-badge ${badge.badgeClass}">${escapeHtml(badge.badgeText)}</span>
          </div>
          <div class="event-meta">${escapeHtml(joinMeta([actionLabel(event.action), event.room || "Ukjent plassering", fmtTime(event.ts), fmtDate(event.ts)]))}</div>
        </div>
      </div>`;
    })
    .join("");
}

function filteredEvents() {
  const query = DOM.logSearch.value.trim().toLowerCase();
  const actionFilter = DOM.logTypeFilter.value;
  const hours = Number(DOM.logTimeFilter.value || "0");
  const threshold = hours > 0 ? Date.now() - hours * 60 * 60 * 1000 : 0;

  return sortedEvents().filter((event) => {
    const matchesQuery =
      !query ||
      event.name.toLowerCase().includes(query) ||
      actionLabel(event.action).toLowerCase().includes(query);
    const matchesAction = !actionFilter || event.action === actionFilter;
    const matchesTime = !hours || new Date(event.ts).getTime() >= threshold;
    return matchesQuery && matchesAction && matchesTime;
  });
}

function renderLog() {
  const rows = filteredEvents();
  const total = rows.length;
  const maxPage = Math.max(0, Math.ceil(total / state.logPageSize) - 1);

  if (state.logPage > maxPage) {
    state.logPage = maxPage;
  }

  const start = state.logPage * state.logPageSize;
  const pageRows = rows.slice(start, start + state.logPageSize);
  const from = total ? start + 1 : 0;
  const to = Math.min(start + state.logPageSize, total);

  DOM.logCount.textContent = `Viser ${from}-${to} av ${total} hendelser`;

  if (!pageRows.length) {
    DOM.logBody.innerHTML = `<div class="empty-state" style="padding:32px"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="4" stroke="currentColor" stroke-width="1.5"></rect><path d="M9 11h10M9 15h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg><p>Ingen hendelser funnet</p></div>`;
    return;
  }

  DOM.logBody.innerHTML = pageRows
    .map((event) => {
      const badge = actionBadge(event.action);
      return `<div class="log-row">
        <div class="log-name">
          <div class="avatar" style="width:26px;height:26px;font-size:9px">${escapeHtml(initialsFor(event.name))}</div>
          <span class="log-name-text">${escapeHtml(event.name)}</span>
        </div>
        <div class="log-action">
          <span class="type-badge ${badge.badgeClass}">${escapeHtml(badge.badgeText)}</span>
          <span>${escapeHtml(actionLabel(event.action))}</span>
        </div>
        <div class="log-cell">${escapeHtml(event.room || "-")}</div>
        <div class="log-cell">${escapeHtml(fmtDate(event.ts))}</div>
        <div class="log-cell">${escapeHtml(fmtTime(event.ts))}</div>
      </div>`;
    })
    .join("");
}

function renderUsers() {
  const query = DOM.usersSearch.value.trim().toLowerCase();
  const filtered = state.users.filter((user) => {
    const matchesQuery =
      !query ||
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.cardId.toLowerCase().includes(query);
    const matchesRole = !state.roleFilter || user.role === state.roleFilter;
    return matchesQuery && matchesRole;
  });

  DOM.usersCount.textContent = `${filtered.length} bruker${filtered.length === 1 ? "" : "e"}`;

  if (!filtered.length) {
    DOM.usersBody.innerHTML = `<div class="empty-state" style="padding:28px"><p>Ingen brukere funnet</p></div>`;
    return;
  }

  DOM.usersBody.innerHTML = filtered
    .map((user) => {
      const roleClass = user.role === "owner" ? "owner" : user.role === "admin" ? "admin" : "guest";
      return `<div class="users-row">
        <div class="user-cell">
          <div class="avatar" style="width:30px;height:30px;font-size:10px">${escapeHtml(initialsFor(user.name))}</div>
          <div class="user-cell-text">
            <div class="name">${escapeHtml(user.name)}</div>
            <div class="email">${escapeHtml(user.email || "-")}</div>
          </div>
        </div>
        <span class="kortid-badge">${escapeHtml(user.cardId || "-")}</span>
        <span class="role-pill ${roleClass}">${escapeHtml(roleLabel(user.role))}</span>
        <span style="font-size:12px;color:var(--muted);font-family:var(--mono)">${escapeHtml(user.email || "-")}</span>
      </div>`;
    })
    .join("");
}

function renderAdmin() {
  const adminView = isAdmin();

  DOM.adminNote.classList.toggle("hidden", adminView);
  DOM.adminContent.classList.toggle("hidden", !adminView);

  if (!adminView) {
    return;
  }

  if (!state.users.length) {
    DOM.adminBody.innerHTML = `<div class="empty-state" style="padding:24px"><p>Ingen brukere registrert</p></div>`;
    DOM.adminSaveRow.classList.add("hidden");
    return;
  }

  DOM.adminBody.innerHTML = state.users
    .map((user) => {
      return `<div class="admin-row" data-card-id="${escapeHtml(user.cardId)}">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="avatar" style="width:26px;height:26px;font-size:9px">${escapeHtml(initialsFor(user.name))}</div>
          <input class="inline-input" data-field="name" value="${escapeHtml(user.name)}" aria-label="Navn">
        </div>
        <span class="kortid-badge">${escapeHtml(user.cardId || "-")}</span>
        <select class="inline-select" data-field="role" aria-label="Rolle" ${user.role === "owner" ? "disabled" : ""}>
          <option value="owner" ${user.role === "owner" ? "selected" : ""}>Eier</option>
          <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
          <option value="gjest" ${user.role === "gjest" ? "selected" : ""}>Gjest</option>
        </select>
        <div style="display:flex;gap:6px">
          <button class="btn-remove" type="button" data-remove-card="${escapeHtml(user.cardId)}" ${user.role === "owner" ? "disabled" : ""}>Fjern</button>
        </div>
      </div>`;
    })
    .join("");

  DOM.adminSaveRow.classList.remove("hidden");
}

function renderAll() {
  renderTopbar();
  renderDashboard();
  renderUsers();
  renderAdmin();
  if (state.activePage === "log") renderLog();
}

async function handleLogin(event) {
  event.preventDefault();
  setAuthError("");

  const email = DOM.loginEmail.value.trim();
  const password = DOM.loginPassword.value;

  if (!email || !password) {
    setAuthError("Fyll inn e-postadresse og passord.");
    return;
  }

  try {
    const result = await api.login(email, password);
    showOtpPanel(result.email, result.otpPreview, "Bekreftelseskode sendt");
    toast(result.message, "success");
  } catch (error) {
    setAuthError(error.message);
  }
}

async function handleSendCode() {
  if (!DOM.loginEmail.value.trim() || !DOM.loginPassword.value) {
    setAuthError("Skriv inn e-postadresse og passord først.");
    return;
  }

  await handleLogin(new Event("submit", { cancelable: true }));
}

async function handleRegister(event) {
  event.preventDefault();
  setAuthError("");

  const name = DOM.regName.value.trim();
  const email = DOM.regEmail.value.trim();
  const password = DOM.regPassword.value;
  const cardId = DOM.regCardId.value.trim().toUpperCase();

  if (!name || !email || !password) {
    setAuthError("Fyll inn alle feltene.");
    return;
  }

  try {
    const result = await api.signup({ name, email, password, cardId });
    showOtpPanel(result.email, result.otpPreview, "Konto opprettet");
    toast(result.message, "success");
  } catch (error) {
    setAuthError(error.message);
  }
}

async function handleOtp(event) {
  event.preventDefault();
  setAuthError("");

  const code = DOM.otpCode.value.trim();
  if (!state.pendingEmail || !code) {
    setAuthError("Skriv inn bekreftelseskoden.");
    return;
  }

  try {
    const result = await api.verifyOtp(state.pendingEmail, code);
    storage.setToken(result.token);
    await refreshData();
    showAppShell();
    showPage("dashboard");
    toast("Innlogging fullført", "success");
  } catch (error) {
    setAuthError(error.message);
  }
}

function handleOtpBack() {
  DOM.otpForm.reset();
  showAuthTab("login");
  setInfo("Systemet bruker ekte brukere. Opprett den første kontoen under <strong>Opprett konto</strong>.");
}

async function handleLogout() {
  try {
    if (storage.getToken()) {
      await api.logout();
    }
  } catch (error) {
    // Ignore logout errors.
  }

  storage.clearToken();
  state.currentUser = null;
  state.users = [];
  state.events = [];
  state.pendingEmail = "";
  showLoginPage();
  showAuthTab("login");
}

async function handleSimSubmit(event) {
  event.preventDefault();

  const cardId = DOM.simCardId.value.trim().toUpperCase();
  const action = DOM.simAction.value;
  const room = DOM.simRoom.value.trim();

  if (!cardId || !room) {
    toast("Fyll inn kort-ID og rom.", "error");
    return;
  }

  try {
    await api.createEvent({ cardId, action, room });
    await refreshData();
    DOM.simForm.reset();
    toast("Hendelsen ble registrert.", "success");
  } catch (error) {
    toast(error.message, "error");
  }
}

function handleSimClear() {
  DOM.simForm.reset();
}

function resetLogPage() {
  state.logPage = 0;
  renderLog();
}

function changeLogPage(delta) {
  const rows = filteredEvents();
  const maxPage = Math.max(0, Math.ceil(rows.length / state.logPageSize) - 1);
  state.logPage = Math.max(0, Math.min(maxPage, state.logPage + delta));
  renderLog();
}

function exportCsv() {
  const rows = filteredEvents();
  const header = "Navn,Handling,Rom,Dato,Tid";
  const body = rows.map((event) => `"${event.name}","${actionLabel(event.action)}","${event.room || ""}","${fmtDate(event.ts)}","${fmtTime(event.ts)}"`);
  const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `hendelseslogg_${fmtDate(new Date().toISOString()).replaceAll(".", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast("CSV-filen ble eksportert.", "success");
}

function setRoleFilter(role, button) {
  state.roleFilter = role;
  DOM.roleTabs.forEach((tab) => {
    tab.classList.toggle("active", tab === button);
  });
  renderUsers();
}

function generateCardId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function handleAddUser(event) {
  event.preventDefault();

  const name = DOM.addName.value.trim();
  const email = DOM.addEmail.value.trim();
  const role = DOM.addRole.value === "admin" ? "admin" : "gjest";
  const cardId = (DOM.addCardId.value.trim() || generateCardId()).toUpperCase();

  if (!name || !email) {
    toast("Navn og e-postadresse er påkrevd.", "error");
    return;
  }

  try {
    const result = await api.addUser({ name, email, role, cardId });
    await refreshData();
    DOM.adminAddForm.reset();
    toast(`${result.message} Midlertidig passord: ${result.defaultPassword}. Bekreftelseskode: ${result.otpPreview}`, "success");
  } catch (error) {
    toast(error.message, "error");
  }
}

async function handleAdminBodyClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const removeCardId = target.getAttribute("data-remove-card");
  if (!removeCardId) {
    return;
  }

  if (!confirm("Er du sikker på at du vil fjerne denne brukeren?")) {
    return;
  }

  try {
    await api.deleteUser(removeCardId);
    if (state.currentUser?.cardId === removeCardId) {
      storage.clearToken();
      state.currentUser = null;
      state.users = [];
      state.events = [];
      showLoginPage();
      showAuthTab("login");
      toast("Brukeren din ble fjernet. Du er logget ut.", "success");
      return;
    }

    await refreshData();
    toast("Brukeren ble fjernet.", "success");
  } catch (error) {
    toast(error.message, "error");
  }
}

function handleAdminBodyChange() {
  DOM.adminSaveRow.classList.remove("hidden");
}

async function handleSaveRoles() {
  const rows = Array.from(DOM.adminBody.querySelectorAll("[data-card-id]"));

  try {
    for (const row of rows) {
      const cardId = row.getAttribute("data-card-id");
      const nameInput = row.querySelector('[data-field="name"]');
      const roleInput = row.querySelector('[data-field="role"]');

      if (!(nameInput instanceof HTMLInputElement) || !(roleInput instanceof HTMLSelectElement)) {
        continue;
      }

      await api.updateUser(cardId, {
        name: nameInput.value.trim(),
        role: roleInput.value
      });
    }

    await refreshData();
    DOM.adminSaveRow.classList.add("hidden");
    toast("Endringene ble lagret.", "success");
  } catch (error) {
    toast(error.message, "error");
  }
}

async function handleClearEvents() {
  if (!confirm("Slett alle hendelser? Dette kan ikke angres.")) {
    return;
  }

  try {
    await api.clearEvents();
    await refreshData();
    toast("Alle hendelser ble slettet.", "success");
  } catch (error) {
    toast(error.message, "error");
  }
}

function togglePassword(button) {
  const inputId = button.dataset.togglePassword;
  const input = document.getElementById(inputId);

  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  input.type = input.type === "password" ? "text" : "password";
  button.style.opacity = input.type === "text" ? "1" : "0.5";
}

function toast(message, type = "success") {
  const toastElement = document.createElement("div");
  toastElement.className = `toast ${type}`;
  const icon =
    type === "success"
      ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="#22c55e" opacity=".2"></circle><path d="M4 7l2 2 4-4" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round"></path></svg>`
      : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="#ef4444" opacity=".2"></circle><path d="M5 5l4 4M9 5l-4 4" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round"></path></svg>`;

  toastElement.innerHTML = `${icon}${escapeHtml(message)}`;
  DOM.toastContainer.appendChild(toastElement);
  window.setTimeout(() => toastElement.remove(), 3000);
}

async function restoreSession() {
  const token = storage.getToken();
  if (!token) {
    showLoginPage();
    showAuthTab("login");
    return;
  }

  try {
    await refreshData();
    showAppShell();
    showPage(state.activePage);
  } catch (error) {
    storage.clearToken();
    showLoginPage();
    showAuthTab("login");
  }
}

function bindEvents() {
  DOM.authTabs.forEach((button) => {
    button.addEventListener("click", () => showAuthTab(button.dataset.authTab));
  });

  DOM.loginForm.addEventListener("submit", handleLogin);
  DOM.loginSendCode.addEventListener("click", handleSendCode);
  DOM.forgotBtn.addEventListener("click", () => toast("Kontakt en administrator for å bytte passord.", "success"));
  DOM.registerForm.addEventListener("submit", handleRegister);
  DOM.otpForm.addEventListener("submit", handleOtp);
  DOM.otpBack.addEventListener("click", handleOtpBack);

  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => togglePassword(button));
  });

  DOM.themeToggle.addEventListener("click", toggleTheme);
  DOM.logoutBtn.addEventListener("click", handleLogout);

  DOM.navItems.forEach((item) => {
    item.addEventListener("click", () => showPage(item.dataset.page));
  });

  DOM.simForm.addEventListener("submit", handleSimSubmit);
  DOM.simClear.addEventListener("click", handleSimClear);

  DOM.logSearch.addEventListener("input", resetLogPage);
  DOM.logTypeFilter.addEventListener("change", resetLogPage);
  DOM.logTimeFilter.addEventListener("change", resetLogPage);
  DOM.logPrev.addEventListener("click", () => changeLogPage(-1));
  DOM.logNext.addEventListener("click", () => changeLogPage(1));
  DOM.exportBtn.addEventListener("click", exportCsv);

  DOM.usersSearch.addEventListener("input", renderUsers);
  DOM.roleTabs.forEach((button) => {
    button.addEventListener("click", () => setRoleFilter(button.dataset.roleFilter, button));
  });

  DOM.autoCardId.addEventListener("click", () => {
    DOM.addCardId.value = generateCardId();
  });
  DOM.adminAddForm.addEventListener("submit", handleAddUser);
  DOM.adminBody.addEventListener("click", handleAdminBodyClick);
  DOM.adminBody.addEventListener("change", handleAdminBodyChange);
  DOM.saveRolesBtn.addEventListener("click", handleSaveRoles);
  DOM.clearEventsBtn.addEventListener("click", handleClearEvents);
}

async function init() {
  initTheme();
  bindEvents();
  await restoreSession();
}

init();
