// js/magic-link-request.js

// Ako je korisnik vec ulogovan, ne treba da bude ovde
checkAuthStatus();

const magicForm = document.getElementById("magicLinkForm");

if (magicForm) {
  magicForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById("recoveryEmail");
    const emailError = document.getElementById("emailError");
    const submitBtn = magicForm.querySelector('button[type="submit"]');
    const alertBox = document.getElementById("alertMessage");

    // 1. Reset UI
    if (alertBox) alertBox.style.display = "none";
    emailError.style.display = "none";

    // 2. INPUT SANITIZATION & VALIDATION (XSS ZASTITA)
    // Oduzimamo opasne karaktere pre nego sto bilo sta uradimo
    let rawEmail = emailInput.value.trim();

    // Jednostavna sanitizacija: ukloni < > " ' /
    // Ovo sprecava ubacivanje HTML tagova
    const sanitizedEmail = rawEmail.replace(/[<>"'/]/g, "");

    // Regex za validaciju email formata
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(sanitizedEmail)) {
      emailError.innerText = "Invalid email format.";
      emailError.style.display = "block";
      return;
    }

    // 3. Slanje na Backend
    submitBtn.disabled = true;
    submitBtn.innerText = "Sending...";

    try {
      // Backend endpoint: /api/auth/magic-link
      // Telo zahteva: MagicLinkRequestDto { email: ... }
      const response = await fetch(`${API_URL}/magic-link/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sanitizedEmail }),
      });

      if (response.ok) {
        showAlert("Magic Link sent! Please check your inbox.", "success");
        magicForm.reset();
        submitBtn.innerText = "SENT";
      } else {
        const message = await response.text();
        showAlert("Error: " + message, "danger");
        submitBtn.disabled = false;
        submitBtn.innerText = "SEND MAGIC LINK";
      }
    } catch (error) {
      console.error(error);
      showAlert("Server unreachable.", "danger");
      submitBtn.disabled = false;
      submitBtn.innerText = "SEND MAGIC LINK";
    }
  });
}
