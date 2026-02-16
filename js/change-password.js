// js/change-password.js

// Ovde NE RADIMO checkAuthStatus() jer korisnik dolazi sa linka,
// mozda mu je sesija istekla, ali ima token u URL-u koji je dovoljan.

const changeForm = document.getElementById("changePasswordForm");

if (changeForm) {
  changeForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. Uzmi Token iz URL-a
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
      showAlert("Error: Token is missing from the link.", "danger");
      return;
    }

    // 2. Pokupi podatke iz forme
    const oldPassword = document.getElementById("oldPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const submitBtn = changeForm.querySelector('button[type="submit"]');

    // 3. Frontend Validacija
    if (newPassword !== confirmPassword) {
      showAlert("New passwords do not match!", "danger");
      return;
    }

    // Regex za lozinku (isti kao kod registracije)
    const passwordRegex =
      /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      showAlert(
        "Password too weak! Needs 8+ chars, Uppercase, Lowercase, Digit, Special char.",
        "danger",
      );
      return;
    }

    // 4. Slanje na Backend
    submitBtn.disabled = true;
    submitBtn.innerText = "Updating...";

    try {
      // Backend endpoint: /api/auth/change-password-finalize
      const response = await fetch(`${API_URL}/password-change/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          oldPassword: oldPassword,
          newPassword: newPassword,
          confirmPassword: confirmPassword,
        }),
      });

      if (response.ok) {
        showAlert(
          "Password changed successfully! Redirecting to login...",
          "success",
        );

        localStorage.removeItem("spotify_token");
        localStorage.removeItem("spotify_user");

        setTimeout(() => {
          logout();
        }, 4000);
      } else {
        const msg = await response.text();
        let cleanMsg = msg;
        try {
          cleanMsg = JSON.parse(msg).error || msg;
        } catch (e) {}

        showAlert(cleanMsg, "danger");
        submitBtn.disabled = false;
        submitBtn.innerText = "UPDATE PASSWORD";
      }
    } catch (error) {
      console.error(error);
      showAlert("Server unreachable.", "danger");
      submitBtn.disabled = false;
      submitBtn.innerText = "UPDATE PASSWORD";
    }
  });
}
