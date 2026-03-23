const DOM = {
  authPanel: document.getElementById("auth-panel"),
  appPanel: document.getElementById("app-panel"),
  topbar: document.getElementById("app-topbar"),

  authSwitchButtons: Array.from(document.querySelectorAll(".auth-switch-btn")),
  loginSection: document.getElementById("login-section"),
  signUpSection: document.getElementById("signup-section"),
  otpSection: document.getElementById("otp-section"),
  loginForm: document.getElementById("login-form"),
  signUpForm: document.getElementById("signup-form"),
  otpForm: document.getElementById("otp-form"),
  backBtn: document.getElementById("back-btn"),
  otpHint: document.getElementById("otp-hint"),

  emailInput: document.getElementById("email"),
  passwordInput: document.getElementById("password"),
  signUpNameInput: document.getElementById("signup-name"),
  signUpEmailInput: document.getElementById("signup-email"),
  signUpPasswordInput: document.getElementById("signup-password"),
  signUpConfirmPasswordInput: document.getElementById("signup-confirm-password"),
  otpInput: document.getElementById("otp"),

  authMessage: document.getElementById("auth-message"),
  appMessage: document.getElementById("app-message"),
  welcomeText: document.getElementById("welcome-text"),
  rolePill: document.getElementById("role-pill"),
  logoutBtn: document.getElementById("logout-btn"),

  popup: document.getElementById("welcome-popup"),
  popupText: document.getElementById("welcome-popup-text"),
  popupCloseBtn: document.getElementById("welcome-popup-close"),

  tabs: Array.from(document.querySelectorAll(".tab-btn")),
  views: Array.from(document.querySelectorAll(".view")),

  dashboard: {
    alarmStatusText: document.getElementById("alarm-status-text"),
    alarmStatusMeta: document.getElementById("alarm-status-meta"),
    lastUnlockTime: document.getElementById("last-unlock-time"),
    lastUnlockUser: document.getElementById("last-unlock-user"),
    lastDeactivateTime: document.getElementById("last-deactivate-time"),
    lastDeactivateUser: document.getElementById("last-deactivate-user"),
    eventsLastDay: document.getElementById("events-last-day"),
    recentOpenList: document.getElementById("recent-open-list")
  },

  log: {
    searchInput: document.getElementById("log-search"),
    timeFilter: document.getElementById("time-filter"),
    tableBody: document.getElementById("log-table-body")
  },

  users: {
    tableBody: document.getElementById("users-table-body")
  },

  admin: {
    lockedNote: document.getElementById("admin-locked"),
    content: document.getElementById("admin-content"),
    addUserForm: document.getElementById("add-user-form"),
    tableBody: document.getElementById("admin-users-body"),
    newNameInput: document.getElementById("new-name"),
    newCardIdInput: document.getElementById("new-card-id"),
    newRoleInput: document.getElementById("new-role"),
    newEmailInput: document.getElementById("new-email")
  },

  simulator: {
    form: document.getElementById("simulate-event-form"),
    cardIdInput: document.getElementById("sim-card-id"),
    actionInput: document.getElementById("sim-action"),
    roomInput: document.getElementById("sim-room")
  }
};

const POPUP_TIMEOUT_MS = 2600;
const HOURS_24_MS = 24 * 60 * 60 * 1000;
const FILTER_WINDOWS = {
  "24h": HOURS_24_MS,
  week: 7 * HOURS_24_MS,
  all: Number.POSITIVE_INFINITY
};

const ACTION_LABELS = {
  unlock_door: "Låste opp dør",
  deactivate_alarm: "Deaktiverte alarmen",
  activate_alarm: "Aktiverte alarmen"
};

const DATE_FORMATTER = new Intl.DateTimeFormat("nb-NO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const TIME_FORMATTER = new Intl.DateTimeFormat("nb-NO", {
  hour: "2-digit",
  minute: "2-digit"
});

const INITIAL_ACCOUNTS = [
  { email: "admin@example.com", password: "1234", otp: "123456", name: "admin", role: "admin", cardId: "7A3B21" },
  { email: "kevin@example.com", password: "1234", otp: "654321", name: "Kevin", role: "gjest", cardId: "9F8C11" },
  { email: "dawid@example.com", password: "1234", otp: "111111", name: "Dawid", role: "gjest", cardId: "AB19F2" },
  { email: "philip@example.com", password: "1234", otp: "222222", name: "Philip", role: "gjest", cardId: "4DA221" },
  { email: "andreas@example.com", password: "1234", otp: "333333", name: "andreas", role: "gjest", cardId: "6BC452" },
  { email: "ludvig@example.com", password: "1234", otp: "444444", name: "ludvig", role: "gjest", cardId: "2ED783" },
  { email: "bedrihan@example.com", password: "1234", otp: "555555", name: "bedrihan", role: "gjest", cardId: "5FA904" }
];

const state = {
  accounts: INITIAL_ACCOUNTS.map((account) => ({ ...account })),
  users: INITIAL_ACCOUNTS.map(mapAccountToUser),
  events: [
    createEvent("Dawid", "AB19F2", "deactivate_alarm", "Gang B", hoursAgo(1.5)),
    createEvent("Kevin", "9F8C11", "unlock_door", "Inngang A", hoursAgo(0.7)),
    createEvent("Philip", "4DA221", "activate_alarm", "Lab 2", hoursAgo(4)),
    createEvent("admin", "7A3B21", "unlock_door", "Resepsjon", hoursAgo(18)),
    createEvent("ludvig", "2ED783", "unlock_door", "Inngang A", hoursAgo(27))
  ],
  alarmActive: false,
  currentUser: null,
  pendingAccount: null,
  activeView: "dashboard",
  activeAuthView: "login",
  popupTimer: null
};

state.alarmActive = inferAlarmStateFromEvents(state.events);

function mapAccountToUser({ name, cardId, role, email }) {
  return { name, cardId, role, email };
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function createEvent(name, cardId, action, room, timestamp = new Date()) {
  return {
    name,
    cardId,
    action,
    room,
    timestamp: timestamp instanceof Date ? timestamp : new Date(timestamp)
  };
}

function inferAlarmStateFromEvents(events) {
  const latestAlarmEvent = events.find((entry) => entry.action === "activate_alarm" || entry.action === "deactivate_alarm");
  if (!latestAlarmEvent) return true;
  return latestAlarmEvent.action === "activate_alarm";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCardId(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function toTitleCase(value) {
  const text = String(value || "").trim();
  if (!text) return "Ukjent";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderRoleBadge(role) {
  const normalizedRole = role === "admin" ? "admin" : "gjest";
  const roleClass = normalizedRole === "admin" ? "role-admin" : "role-guest";
  return `<span class="role-badge ${roleClass}">${escapeHtml(normalizedRole)}</span>`;
}

function getActionLabel(action) {
  return ACTION_LABELS[action] || action;
}

function formatDate(value) {
  return DATE_FORMATTER.format(value);
}

function formatTime(value) {
  return TIME_FORMATTER.format(value);
}

function generateUniqueCardId() {
  let cardId = "";

  do {
    cardId = Math.random().toString(16).slice(2, 8).toUpperCase();
  } while (state.users.some((user) => normalizeCardId(user.cardId) === cardId));

  return cardId;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function showMessage(element, text, type = "info") {
  element.textContent = text;
  element.className = "message";
  element.classList.add(type);
  element.classList.remove("hidden");
}

function hideMessage(element) {
  element.textContent = "";
  element.className = "message hidden";
}

function hideWelcomePopup() {
  if (state.popupTimer) {
    clearTimeout(state.popupTimer);
    state.popupTimer = null;
  }

  DOM.popup.classList.add("hidden");
}

function showWelcomePopup(name) {
  hideWelcomePopup();
  DOM.popupText.textContent = `Hallo ${toTitleCase(name)}`;
  DOM.popup.classList.remove("hidden");
  state.popupTimer = window.setTimeout(hideWelcomePopup, POPUP_TIMEOUT_MS);
}

function isAdmin() {
  return state.currentUser?.role === "admin";
}

function findUserByCardId(cardId) {
  const targetCardId = normalizeCardId(cardId);
  return state.users.find((user) => normalizeCardId(user.cardId) === targetCardId) || null;
}

function findUserAndAccountIndexes(cardId) {
  const targetCardId = normalizeCardId(cardId);
  return {
    userIndex: state.users.findIndex((user) => normalizeCardId(user.cardId) === targetCardId),
    accountIndex: state.accounts.findIndex((account) => normalizeCardId(account.cardId) === targetCardId)
  };
}

function findLatestEventByAction(action) {
  return state.events.find((entry) => entry.action === action) || null;
}

function findLatestAlarmChange() {
  return state.events.find((entry) => entry.action === "activate_alarm" || entry.action === "deactivate_alarm") || null;
}

function getAdminCount() {
  return state.users.filter((user) => user.role === "admin").length;
}

function addEvent(eventInput) {
  const event = createEvent(eventInput.name, eventInput.cardId, eventInput.action, eventInput.room, new Date());
  state.events.unshift(event);

  if (event.action === "activate_alarm") {
    state.alarmActive = true;
  }

  if (event.action === "deactivate_alarm") {
    state.alarmActive = false;
  }

  renderAll();
}

function getEventsInLast24Hours() {
  const cutoff = Date.now() - HOURS_24_MS;
  return state.events.filter((entry) => entry.timestamp.getTime() >= cutoff);
}

function getFilteredEvents() {
  const searchQuery = DOM.log.searchInput.value.trim().toLowerCase();
  const windowMs = FILTER_WINDOWS[DOM.log.timeFilter.value] ?? FILTER_WINDOWS.all;
  const cutoff = Date.now() - windowMs;

  return state.events.filter((entry) => {
    const isWithinTimeRange = Number.isFinite(windowMs) ? entry.timestamp.getTime() >= cutoff : true;
    if (!isWithinTimeRange) return false;

    if (!searchQuery) return true;

    const payload = `${entry.name} ${getActionLabel(entry.action)}`.toLowerCase();
    return payload.includes(searchQuery);
  });
}

function renderTopbar() {
  const name = state.currentUser?.name || "bruker";
  const role = state.currentUser?.role || "gjest";

  DOM.welcomeText.textContent = toTitleCase(name);
  DOM.rolePill.textContent = role;
}

function renderDashboard() {
  const lastUnlock = findLatestEventByAction("unlock_door");
  const lastDeactivate = findLatestEventByAction("deactivate_alarm");
  const lastAlarmChange = findLatestAlarmChange();

  DOM.dashboard.alarmStatusText.textContent = state.alarmActive ? "AKTIVERT" : "DEAKTIVERT";
  DOM.dashboard.alarmStatusText.classList.toggle("status-on", state.alarmActive);
  DOM.dashboard.alarmStatusText.classList.toggle("status-off", !state.alarmActive);

  if (lastAlarmChange) {
    DOM.dashboard.alarmStatusMeta.textContent = `Sist endret av: ${lastAlarmChange.name} (${formatTime(lastAlarmChange.timestamp)})`;
  } else {
    DOM.dashboard.alarmStatusMeta.textContent = "Sist endret: -";
  }

  if (lastUnlock) {
    DOM.dashboard.lastUnlockTime.textContent = `${formatTime(lastUnlock.timestamp)}`;
    DOM.dashboard.lastUnlockUser.textContent = `Bruker: ${lastUnlock.name}`;
  } else {
    DOM.dashboard.lastUnlockTime.textContent = "-";
    DOM.dashboard.lastUnlockUser.textContent = "Bruker: -";
  }

  if (lastDeactivate) {
    DOM.dashboard.lastDeactivateTime.textContent = `${formatTime(lastDeactivate.timestamp)}`;
    DOM.dashboard.lastDeactivateUser.textContent = `Bruker: ${lastDeactivate.name}`;
  } else {
    DOM.dashboard.lastDeactivateTime.textContent = "-";
    DOM.dashboard.lastDeactivateUser.textContent = "Bruker: -";
  }

  DOM.dashboard.eventsLastDay.textContent = String(getEventsInLast24Hours().length);

  const recentRows = state.events.slice(0, 6);
  DOM.dashboard.recentOpenList.innerHTML = recentRows.length
    ? recentRows
        .map((entry) => {
          const name = escapeHtml(entry.name);
          const action = escapeHtml(getActionLabel(entry.action));
          const time = escapeHtml(formatTime(entry.timestamp));
          const date = escapeHtml(formatDate(entry.timestamp));
          return `<li><strong>${name}</strong> — ${action} <span style="opacity:0.6;font-size:0.8em;font-family:var(--font-mono)">${time} · ${date}</span></li>`;
        })
        .join("")
    : "<li>Ingen hendelser registrert.</li>";
}

function renderLog() {
  const rows = getFilteredEvents();

  if (!rows.length) {
    DOM.log.tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px">Ingen hendelser funnet.</td></tr>';
    return;
  }

  DOM.log.tableBody.innerHTML = rows
    .map((entry) => {
      const name = escapeHtml(entry.name);
      const action = escapeHtml(getActionLabel(entry.action));
      const date = escapeHtml(formatDate(entry.timestamp));
      const time = escapeHtml(formatTime(entry.timestamp));

      return `
        <tr>
          <td>${name}</td>
          <td>${action}</td>
          <td>${date}</td>
          <td style="font-family:var(--font-mono);font-size:0.82rem">${time}</td>
        </tr>
      `;
    })
    .join("");
}

function renderUsers() {
  DOM.users.tableBody.innerHTML = state.users
    .map((user) => {
      const name = escapeHtml(user.name);
      const cardId = escapeHtml(user.cardId);
      const roleBadge = renderRoleBadge(user.role);
      const email = escapeHtml(user.email);

      return `
        <tr>
          <td>${name}</td>
          <td><code>${cardId}</code></td>
          <td>${roleBadge}</td>
          <td style="font-family:var(--font-mono);font-size:0.82rem;color:var(--muted)">${email}</td>
        </tr>
      `;
    })
    .join("");
}

function renderAdmin() {
  DOM.admin.lockedNote.classList.toggle("hidden", isAdmin());
  DOM.admin.content.classList.toggle("hidden", !isAdmin());

  if (!isAdmin()) {
    return;
  }

  DOM.admin.tableBody.innerHTML = state.users
    .map((user) => {
      const name = escapeHtml(user.name);
      const cardId = escapeHtml(user.cardId);
      const role = user.role;

      return `
        <tr data-card="${cardId}">
          <td><input class="inline-input" data-field="name" value="${name}" /></td>
          <td><code>${cardId}</code></td>
          <td>
            <select class="inline-select" data-field="role">
              <option value="gjest" ${role === "gjest" ? "selected" : ""}>gjest</option>
              <option value="admin" ${role === "admin" ? "selected" : ""}>admin</option>
            </select>
          </td>
          <td>
            <div class="admin-actions">
              <button class="btn tiny ghost" data-action="save" type="button">Lagre</button>
              <button class="btn tiny danger" data-action="remove" type="button">Fjern</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderAll() {
  renderTopbar();
  renderDashboard();
  renderLog();
  renderUsers();
  renderAdmin();
}

function setAuthView(viewName) {
  const safeView = viewName === "signup" ? "signup" : "login";
  state.activeAuthView = safeView;

  DOM.authSwitchButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.authView === safeView);
  });

  DOM.loginSection.classList.toggle("hidden", safeView !== "login");
  DOM.signUpSection.classList.toggle("hidden", safeView !== "signup");
  DOM.otpSection.classList.add("hidden");
  state.pendingAccount = null;
  DOM.otpForm.reset();
}

function setView(viewName) {
  state.activeView = viewName;

  DOM.tabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  DOM.views.forEach((view) => {
    view.classList.toggle("active", view.id === `view-${viewName}`);
  });
}

function showApp() {
  DOM.authPanel.classList.add("hidden");
  DOM.appPanel.classList.remove("hidden");
  DOM.topbar.classList.remove("hidden");

  setView(state.activeView);
  renderAll();
}

function showAuth() {
  DOM.authPanel.classList.remove("hidden");
  DOM.appPanel.classList.add("hidden");
  DOM.topbar.classList.add("hidden");

  hideWelcomePopup();
  hideMessage(DOM.authMessage);
  hideMessage(DOM.appMessage);

  DOM.loginForm.reset();
  DOM.signUpForm.reset();
  DOM.otpForm.reset();
  setAuthView("login");
}

function handleLoginSubmit(event) {
  event.preventDefault();
  hideMessage(DOM.authMessage);

  const email = normalizeEmail(DOM.emailInput.value);
  const password = DOM.passwordInput.value;

  const account = state.accounts.find((item) => item.email === email && item.password === password);

  if (!account) {
    showMessage(DOM.authMessage, "Feil brukernavn eller passord.", "error");
    return;
  }

  state.pendingAccount = account;
  DOM.loginSection.classList.add("hidden");
  DOM.otpSection.classList.remove("hidden");
  DOM.otpHint.textContent = `Kode sendt til ${account.email}. Bekreftelseskode: ${account.otp}`;
  showMessage(DOM.authMessage, "Kode sendt til e-post.", "success");
}

function handleSignUpSubmit(event) {
  event.preventDefault();
  hideMessage(DOM.authMessage);

  const name = normalizeName(DOM.signUpNameInput.value);
  const email = normalizeEmail(DOM.signUpEmailInput.value);
  const password = DOM.signUpPasswordInput.value;
  const confirmPassword = DOM.signUpConfirmPasswordInput.value;

  if (name.length < 2) {
    showMessage(DOM.authMessage, "Skriv inn et gyldig navn.", "error");
    return;
  }

  if (password.length < 4) {
    showMessage(DOM.authMessage, "Passordet må være minst 4 tegn.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage(DOM.authMessage, "Passordene er ikke like.", "error");
    return;
  }

  if (state.accounts.some((account) => account.email === email)) {
    showMessage(DOM.authMessage, "E-postadressen finnes allerede.", "error");
    return;
  }

  const cardId = generateUniqueCardId();
  const otp = generateOtp();
  const account = {
    email,
    password,
    otp,
    name,
    role: "gjest",
    cardId
  };

  state.accounts.push(account);
  state.users.push(mapAccountToUser(account));

  DOM.signUpForm.reset();
  DOM.emailInput.value = email;
  setAuthView("login");
  showMessage(DOM.authMessage, `Konto opprettet. Bekreftelseskode: ${otp}`, "success");
}

function handleOtpSubmit(event) {
  event.preventDefault();
  hideMessage(DOM.authMessage);

  const otp = DOM.otpInput.value.trim();

  if (!state.pendingAccount) {
    showMessage(DOM.authMessage, "Innloggingen utløp. Prøv igjen.", "error");
    DOM.loginSection.classList.remove("hidden");
    DOM.otpSection.classList.add("hidden");
    return;
  }

  if (otp !== state.pendingAccount.otp) {
    showMessage(DOM.authMessage, "Ugyldig bekreftelseskode.", "error");
    return;
  }

  state.currentUser = {
    email: state.pendingAccount.email,
    name: state.pendingAccount.name,
    role: state.pendingAccount.role,
    cardId: state.pendingAccount.cardId
  };

  state.pendingAccount = null;
  showMessage(DOM.authMessage, "Innlogging fullført.", "success");
  showApp();
  showWelcomePopup(state.currentUser.name);
}

function handleBackFromOtp() {
  state.pendingAccount = null;
  hideMessage(DOM.authMessage);
  DOM.otpForm.reset();
  DOM.otpSection.classList.add("hidden");
  setAuthView("login");
}

function handleLogout() {
  state.currentUser = null;
  state.pendingAccount = null;
  showAuth();
}

function handleAuthSwitch(event) {
  const target = event.currentTarget;
  const viewName = target.dataset.authView;
  hideMessage(DOM.authMessage);
  setAuthView(viewName);
}

function handleTabClick(event) {
  const target = event.currentTarget;
  setView(target.dataset.view);
  hideMessage(DOM.appMessage);
}

function handleSimulateEvent(event) {
  event.preventDefault();
  hideMessage(DOM.appMessage);

  const cardId = normalizeCardId(DOM.simulator.cardIdInput.value);
  const action = DOM.simulator.actionInput.value;
  const room = DOM.simulator.roomInput.value.trim();
  const matchedUser = findUserByCardId(cardId);

  addEvent({
    name: matchedUser ? matchedUser.name : "Ukjent kort",
    cardId,
    action,
    room
  });

  DOM.simulator.form.reset();
  showMessage(DOM.appMessage, "Ny hendelse lagt til i loggen.", "success");
}

function handleAddUser(event) {
  event.preventDefault();

  if (!isAdmin()) {
    showMessage(DOM.appMessage, "Kun admin kan legge til brukere.", "error");
    return;
  }

  const name = DOM.admin.newNameInput.value.trim();
  const cardId = normalizeCardId(DOM.admin.newCardIdInput.value);
  const role = DOM.admin.newRoleInput.value;
  const email = normalizeEmail(DOM.admin.newEmailInput.value);

  if (state.users.some((user) => normalizeCardId(user.cardId) === cardId)) {
    showMessage(DOM.appMessage, "Kort-ID finnes allerede.", "error");
    return;
  }

  if (state.accounts.some((account) => account.email === email)) {
    showMessage(DOM.appMessage, "E-post finnes allerede.", "error");
    return;
  }

  state.users.push({ name, cardId, role, email });

  const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
  state.accounts.push({
    name,
    cardId,
    role,
    email,
    password: "1234",
    otp: generatedOtp
  });

  DOM.admin.addUserForm.reset();
  renderAll();
  showMessage(DOM.appMessage, `Bruker ${name} lagt til. OTP-kode: ${generatedOtp}`, "success");
}

function handleAdminTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const action = target.dataset.action;
  if (!action) return;

  if (!isAdmin()) {
    showMessage(DOM.appMessage, "Kun admin kan gjøre endringer her.", "error");
    return;
  }

  const row = target.closest("tr");
  if (!row) return;

  const cardId = row.dataset.card;
  if (!cardId) return;

  const { userIndex, accountIndex } = findUserAndAccountIndexes(cardId);
  if (userIndex === -1 || accountIndex === -1) {
    showMessage(DOM.appMessage, "Fant ikke brukeren.", "error");
    return;
  }

  if (action === "remove") {
    const removedUser = state.users[userIndex];

    if (removedUser.role === "admin" && getAdminCount() === 1) {
      showMessage(DOM.appMessage, "Du kan ikke slette den siste admin-brukeren.", "error");
      return;
    }

    state.users.splice(userIndex, 1);
    state.accounts.splice(accountIndex, 1);

    if (state.currentUser?.cardId === removedUser.cardId) {
      handleLogout();
      return;
    }

    renderAll();
    showMessage(DOM.appMessage, `Bruker ${removedUser.name} fjernet.`, "success");
    return;
  }

  if (action !== "save") {
    return;
  }

  const nameInput = row.querySelector('input[data-field="name"]');
  const roleInput = row.querySelector('select[data-field="role"]');
  if (!(nameInput instanceof HTMLInputElement) || !(roleInput instanceof HTMLSelectElement)) {
    return;
  }

  const newName = nameInput.value.trim();
  const newRole = roleInput.value;

  if (!newName) {
    showMessage(DOM.appMessage, "Navn kan ikke være tomt.", "error");
    return;
  }

  if (state.users[userIndex].role === "admin" && newRole !== "admin" && getAdminCount() === 1) {
    showMessage(DOM.appMessage, "Du kan ikke fjerne admin fra den siste admin-brukeren.", "error");
    return;
  }

  state.users[userIndex].name = newName;
  state.users[userIndex].role = newRole;
  state.accounts[accountIndex].name = newName;
  state.accounts[accountIndex].role = newRole;

  if (state.currentUser?.cardId === cardId) {
    state.currentUser.name = newName;
    state.currentUser.role = newRole;
  }

  renderAll();
  showMessage(DOM.appMessage, `Oppdatert ${newName}.`, "success");
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  }
}

function initDemoHint() {
  const adminEmail = ["admin", "@", "example.com"].join("");
  const guestEmail = ["kevin", "@", "example.com"].join("");

  // Fill email spans via JS so Cloudflare doesn't scramble them
  document.querySelectorAll(".demo-email-admin").forEach(el => { el.textContent = adminEmail; });
  document.querySelectorAll(".demo-email-guest").forEach(el => { el.textContent = guestEmail; });

  // Admin fill button
  const fillAdminBtn = document.getElementById("fill-demo-btn");
  if (fillAdminBtn) {
    fillAdminBtn.addEventListener("click", () => {
      setAuthView("login");
      DOM.emailInput.value = adminEmail;
      DOM.passwordInput.value = "1234";
      DOM.passwordInput.focus();
    });
  }

  // Guest fill button
  const fillGuestBtn = document.getElementById("fill-demo-guest-btn");
  if (fillGuestBtn) {
    fillGuestBtn.addEventListener("click", () => {
      setAuthView("login");
      DOM.emailInput.value = guestEmail;
      DOM.passwordInput.value = "1234";
      DOM.passwordInput.focus();
    });
  }

  // Close button — hides the bar
}

function toggleTheme() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  if (isLight) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  }
}

function bindEvents() {
  DOM.authSwitchButtons.forEach((button) => {
    button.addEventListener("click", handleAuthSwitch);
  });

  DOM.loginForm.addEventListener("submit", handleLoginSubmit);
  DOM.signUpForm.addEventListener("submit", handleSignUpSubmit);
  DOM.otpForm.addEventListener("submit", handleOtpSubmit);
  DOM.backBtn.addEventListener("click", handleBackFromOtp);
  DOM.logoutBtn.addEventListener("click", handleLogout);
  DOM.popupCloseBtn.addEventListener("click", hideWelcomePopup);

  const themeBtn = document.getElementById("theme-toggle-btn");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  DOM.tabs.forEach((tab) => {
    tab.addEventListener("click", handleTabClick);
  });

  DOM.simulator.form.addEventListener("submit", handleSimulateEvent);
  DOM.log.searchInput.addEventListener("input", renderLog);
  DOM.log.timeFilter.addEventListener("change", renderLog);

  DOM.admin.addUserForm.addEventListener("submit", handleAddUser);
  DOM.admin.tableBody.addEventListener("click", handleAdminTableClick);
}

function init() {
  initTheme();
  initDemoHint();
  bindEvents();
  showAuth();
}

init();
