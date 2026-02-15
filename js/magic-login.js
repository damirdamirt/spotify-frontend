// js/magic-login.js

checkAuthStatus();

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Uzmi token iz URL-a (?token=...)
  const urlParams = new URLSearchParams(window.location.search);
  // Trazimo parametar "token" jer ga tako salje tvoj backend u linku
  const token = urlParams.get("token");

  const statusText = document.getElementById("statusText");
  const loader = document.getElementById("loader");
  const backBtn = document.getElementById("backBtn");

  // Validacija tokena pre slanja (Basic XSS check)
  if (!token) {
    showError("Error: Token is missing in the URL.");
    return;
  }

  // Sanitizacija tokena (smeju biti samo slova, brojevi i crtice)
  // UUID format je obicno heksadecimalni sa crticama
  const sanitizedToken = token.replace(/[^a-zA-Z0-9-]/g, "");

  if (sanitizedToken !== token) {
    showError("Error: Invalid token format.");
    return;
  }

  try {
    // 2. Salji token backendu da dobijes JWT
    // Backend endpoint: /api/auth/magic-login
    // Telo zahteva: MagicLinkLoginDto { token: ... }
    const response = await fetch(`${API_URL}/magic-link/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: sanitizedToken }),
    });

    if (response.ok) {
      // Backend vraca AuthResponseDto (accessToken, username...)
      const data = await response.json();

      // 3. Sacuvaj JWT i Username
      localStorage.setItem("spotify_token", data.accessToken);

      // Ako backend ne vrati username, stavljamo genericno,
      // ali tvoj backend verovatno vraca DTO sa username-om
      if (data.username) {
        localStorage.setItem("spotify_user", data.username);
      } else {
        localStorage.setItem("spotify_user", "User");
      }

      // 4. USPEH!
      statusText.innerText = "Success! Redirecting to Dashboard...";
      statusText.className = "text-success fw-bold";
      loader.style.display = "none";

      // Prebaci na Dashboard posle 1.5 sekunde
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);
    } else {
      // GRESKA (Token istekao ili nevazeci)
      const msg = await response.text();
      showError("Login failed: " + msg);
    }
  } catch (error) {
    console.error(error);
    showError("Network error. Server unreachable.");
  }

  // Pomocna funkcija za prikaz greske
  function showError(message) {
    statusText.innerText = message;
    statusText.className = "text-danger fw-bold";
    loader.style.display = "none";
    backBtn.style.display = "inline-block"; // Prikazi dugme za nazad
  }
});
