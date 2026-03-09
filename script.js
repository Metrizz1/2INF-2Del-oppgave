const loginSection = document.getElementById("login-section");
const otpSection = document.getElementById("otp-section");
const loginForm = document.getElementById("login-form");
const otpForm = document.getElementById("otp-form");
const backBtn = document.getElementById("back-btn");
const messageBox = document.getElementById("message-box");

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

    showMessage(data.message || "Koden ble sendt til e-post.", "success");
    loginSection.classList.add("hidden");
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

    showMessage(data.message || "Innlogging fullført.", "success");
  } catch (error) {
    showMessage("Kunne ikke koble til serveren.", "error");
  }
});

backBtn.addEventListener("click", () => {
  hideMessage();
  otpSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
  document.getElementById("otp").value = "";
});