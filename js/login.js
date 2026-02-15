// js/login.js

checkAuthStatus();

const loginForm = document.getElementById("loginForm");
const otpForm = document.getElementById("otpForm");

let tempUsername = "";

// KORAK 1: Username + Password
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const usernameInput = document.getElementById("loginUsername").value.trim();
    const passwordInput = document.getElementById("loginPassword").value;

    // Sakrij stari alert
    const alertBox = document.getElementById("alertMessage");
    if (alertBox) alertBox.style.display = "none";

    submitBtn.disabled = true;
    submitBtn.innerText = "Checking...";

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput,
        }),
      });

      if (response.ok) {
        tempUsername = usernameInput; // Pamtimo ko se loguje

        // UI Switch: Sakrij Login, Prikazi OTP
        document.getElementById("loginStep").style.display = "none";
        document.getElementById("otpStep").style.display = "block";

        showAlert("OTP code sent to your email!", "info");
        document.getElementById("otpCode").focus();
      } else {
        const message = await response.text();
        let cleanMsg = message;
        try {
          cleanMsg = JSON.parse(message).error || message;
        } catch (e) {}
        showAlert(cleanMsg, "danger");
        submitBtn.disabled = false;
        submitBtn.innerText = "LOGIN";
      }
    } catch (error) {
      console.error(error);
      showAlert("Server unreachable.", "danger");
      submitBtn.disabled = false;
      submitBtn.innerText = "LOGIN";
    }
  });
}

// KORAK 2: OTP Unos
if (otpForm) {
  otpForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = otpForm.querySelector('button[type="submit"]');
    const otpInput = document.getElementById("otpCode").value.trim();

    submitBtn.disabled = true;
    submitBtn.innerText = "Verifying...";

    try {
      const response = await fetch(`${API_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: tempUsername,
          otp: otpInput,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Cuvamo Token
        localStorage.setItem("spotify_token", data.accessToken);
        localStorage.setItem("spotify_user", tempUsername);

        showAlert("Success! Redirecting...", "success");

        setTimeout(() => {
          window.location.href = "dashboard.html"; // Tvoja glavna stranica
        }, 1000);
      } else {
        const message = await response.text();
        let cleanMsg = message;
        try {
          cleanMsg = JSON.parse(message).error || message;
        } catch (e) {}
        showAlert(cleanMsg, "danger");
        submitBtn.disabled = false;
        submitBtn.innerText = "VERIFY";
      }
    } catch (error) {
      console.error(error);
      showAlert("Error verifying OTP.", "danger");
      submitBtn.disabled = false;
      submitBtn.innerText = "VERIFY";
    }
  });
}
