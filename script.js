const loginSection = document.getElementById("login-section");
const otpSection = document.getElementById("otp-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const otpForm = document.getElementById("otp-form");
const backBtn = document.getElementById("back-btn");
const messageBox = document.getElementById("message-box");
const greetingText = document.getElementById("greeting-text");
const roleText = document.getElementById("role-text");

// Temporary local role map until backend/database role management is connected.
const localAdmins = ["kevin@example.com"];
let pendingUser = null;

function showMessage(text, type = "info") {
  messageBox.textContent = text;
  messageBox.className = "message";
  messageBox.classList.add(type);
  messageBox.classList.remove("hidden");
}

function hideMessage() {
  messageBox.textContent = "";
  messageBox.className = "message hidden";
}

function toDisplayName(value) {
  if (!value) return "Bruker";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function inferUserFromEmail(email) {
  const localPart = (email.split("@")[0] || "").trim();
  const firstChunk = localPart.split(/[._-]/)[0] || localPart;
  return toDisplayName(firstChunk || "Bruker");
}

function resolveRole(email, apiRole) {
  const normalizedRole = String(apiRole || "").toLowerCase();
  if (normalizedRole === "admin" || normalizedRole === "gjest") {
    return normalizedRole;
  }

  return localAdmins.includes((email || "").toLowerCase()) ? "admin" : "gjest";
}

function showDashboard(user) {
  const safeName = user?.name || "Bruker";
  const safeRole = user?.role || "gjest";

  greetingText.textContent = `Hallo ${safeName}`;
  roleText.textContent = safeRole;

  otpSection.classList.add("hidden");
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.message || "Feil ved innlogging.", "error");
      return;
    }

    pendingUser = {
      email,
      name: data?.name ? toDisplayName(data.name) : inferUserFromEmail(email),
      role: resolveRole(email, data?.role)
    };

    showMessage(data.message || "Koden ble sendt til e-post.", "success");
    loginSection.classList.add("hidden");
    dashboardSection.classList.add("hidden");
    otpSection.classList.remove("hidden");
  } catch (error) {
    showMessage("Kunne ikke koble til serveren.", "error");
  }
});

otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage();

  const code = document.getElementById("otp").value.trim();

  try {
    const response = await fetch("/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ code })
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.message || "Ugyldig kode.", "error");
      return;
    }

    const userFromResponse = {
      email: pendingUser?.email,
      name: data?.name ? toDisplayName(data.name) : pendingUser?.name,
      role: resolveRole(pendingUser?.email, data?.role || pendingUser?.role)
    };

    showMessage(data.message || "Innlogging fullført.", "success");
    showDashboard(userFromResponse);
  } catch (error) {
    showMessage("Kunne ikke koble til serveren.", "error");
  }
});

backBtn.addEventListener("click", () => {
  hideMessage();
  pendingUser = null;
  dashboardSection.classList.add("hidden");
  otpSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
  document.getElementById("otp").value = "";
});
