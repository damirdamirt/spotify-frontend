// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  // 1. Zastita (Pozivamo funkciju samo da odradi check, ne ocekujemo return)
  checkAuthStatus();

  // Rucno uzimamo token da bismo znali da li da nastavimo
  const token = localStorage.getItem("spotify_token");
  if (!token) return; // Ako nema tokena, prekidamo (checkAuthStatus ce vec prebaciti na login)

  // 2. Prikaz imena korisnika
  const user = localStorage.getItem("spotify_user");
  const welcomeElement = document.getElementById("welcomeUser");
  if (user && welcomeElement) {
    welcomeElement.innerText = "Hi, " + user;
  }

  // 3. ADMIN PROVERA (Cita role iz LocalStorage-a)
  checkAdminAccess();

  // 4. Inicijalizacija dugmeta za promenu sifre
  setupChangePasswordListener();

  // 5. Logout dugme
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
});

// --- SEKCIJA 1: ADMIN LOGIKA ---

function checkAdminAccess() {
  // Uzimamo onaj JSON string koji si video u inspect element (npr. '["ROLE_USER", "ROLE_ADMIN"]')
  const rolesString = localStorage.getItem("user_roles");
  let roles = [];

  try {
    if (rolesString) {
      roles = JSON.parse(rolesString); // Pretvaramo string u pravi JavaScript niz
    }
  } catch (e) {
    console.error("Greska pri citanju rola:", e);
  }

  console.log("Ulogovani korisnik ima role:", roles);

  // Proveravamo da li taj niz sadrzi 'ROLE_ADMIN'
  // .includes radi tacno to - trazi string u nizu
  if (roles && roles.includes("ROLE_ADMIN")) {
    console.log("✅ Admin detektovan! Prikazujem panel.");

    const adminSection = document.getElementById("admin-section");
    if (adminSection) {
      adminSection.style.display = "block"; // Otkrivamo skrivenu sekciju
      loadArtists(); // Ucitavamo umetnike u dropdown
      setupAlbumUploadListener(); // Aktiviramo formu za upload
    }
  } else {
    console.log("ℹ️ Korisnik nije admin ili nema rolu.");
  }
}

async function loadArtists() {
  // fetchWithAuth automatski dodaje token u header
  // endpoint je '/artists' (utils.js ce dodati BASE_URL)
  const response = await fetchWithAuth("/artists");

  if (response && response.ok) {
    const artists = await response.json();
    const select = document.getElementById("artist-select");

    if (select) {
      select.innerHTML = '<option value="">-- Select Artist --</option>'; // Reset

      artists.forEach((artist) => {
        const option = document.createElement("option");
        option.value = artist.id; // ID saljemo bazi
        option.textContent = artist.name; // Ime prikazujemo korisniku
        select.appendChild(option);
      });
    }
  } else {
    console.error("Neuspesno ucitavanje umetnika.");
  }
}

// js/dashboard.js - Ažurirana funkcija

function setupAlbumUploadListener() {
  const form = document.getElementById("create-album-form");
  const message = document.getElementById("upload-message");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 0. RESET PORUKA
    if (message) {
      message.textContent = "";
      message.style.color = "inherit";
    }

    // 1. PREUZIMANJE VREDNOSTI
    const titleInput = document.getElementById("album-title");
    const yearInput = document.getElementById("release-year");
    const artistInput = document.getElementById("artist-select");
    const fileInput = document.getElementById("album-cover");

    const title = titleInput.value.trim();
    const year = parseInt(yearInput.value);
    const artistId = artistInput.value;
    const file = fileInput.files[0];

    // --- 2. FRONTEND VALIDACIJA (Mora da se poklapa sa Backend DTO) ---

    // A) Whitelisting & Special Characters (Regex)
    // Dozvoljavamo samo slova, brojeve i razmake (Isto kao Java @Pattern)
    const allowedPattern = /^[a-zA-Z0-9 ]+$/;

    if (!allowedPattern.test(title)) {
      showError(
        message,
        "❌ Invalid Title: Only letters, numbers and spaces allowed.",
      );
      return; // Prekini slanje
    }

    // B) Boundary Checking (String Length)
    // Isto kao Java @Size(min=2, max=50)
    if (title.length < 2 || title.length > 50) {
      showError(message, "❌ Title must be between 2 and 50 characters.");
      return;
    }

    // C) Numeric Validation & Boundary Checking (Year)
    // Isto kao Java @Min(1900) i @Max(2026)
    if (isNaN(year) || year < 1900 || year > 2026) {
      showError(message, "❌ Year must be between 1900 and 2026.");
      return;
    }

    // D) Required Checks
    if (!artistId) {
      showError(message, "❌ Please select an artist.");
      return;
    }

    if (!file) {
      showError(message, "❌ Cover image is required.");
      return;
    }

    // E) File Size Check (UX dodatak)
    // Npr. zabrani fajlove vece od 5MB da ne gušimo mrezu
    const maxSizeInBytes = 10 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      showError(message, "❌ Image is too large! Max size is 5MB.");
      return;
    }

    // --- 3. SLANJE NA BACKEND (Ako je sve proslo) ---

    if (message) {
      message.textContent = "Uploading... ⏳";
      message.style.color = "yellow";
    }

    // 1. Izracunaj Hash fajla (INTEGRITET)
    const fileHash = await calculateFileHash(file);
    console.log("Frontend Hash:", fileHash);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("releaseYear", year);
    formData.append("artistId", artistId);
    formData.append("coverImage", file);
    // formData.append("fileHash", fileHash);
    formData.append("fileHash", fileHash);

    const token = localStorage.getItem("spotify_token");

    try {
      const url = BASE_URL + "/albums/create";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
        },
        body: formData,
      });

      if (response.ok) {
        const responseData = await response.text();
        if (message) {
          message.textContent = "✅ " + responseData;
          message.style.color = "#1db954";
        }
        form.reset(); // Ocisti formu nakon uspeha
      } else {
        // Ako Backend ipak vrati gresku (npr. validacija ipak pukne tamo)
        // Ovo hvata onaj JSON mapu gresaka koju smo napravili u GlobalExceptionHandler
        let errorText = await response.text();
        try {
          // Pokusaj da parsiras JSON greske (ono sto vraca handleBindException)
          const errorObj = JSON.parse(errorText);
          // Ako je mapa (field: error), pretvori u citljiv string
          if (typeof errorObj === "object") {
            errorText = Object.values(errorObj).join(", ");
          }
        } catch (e) {
          // Nije JSON, ostavi text
        }

        showError(message, "❌ Error: " + errorText);
      }
    } catch (error) {
      console.error(error);
      showError(message, "❌ Network Error: Server unreachable.");
    }
  });
}

// Pomocna funkcija za prikaz greske
function showError(element, msg) {
  if (element) {
    element.textContent = msg;
    element.style.color = "red";
  }
}
// --- SEKCIJA 2: PROMENA SIFRE ---

function setupChangePasswordListener() {
  const changePassBtn = document.getElementById("changePassBtn");

  if (changePassBtn) {
    changePassBtn.addEventListener("click", async () => {
      const username = localStorage.getItem("spotify_user");

      if (!username) {
        alert("Error: User not found. Please login again.");
        logout(); // iz utils.js
        return;
      }

      changePassBtn.disabled = true;
      changePassBtn.innerText = "Sending...";

      try {
        // Koristimo API_URL iz utils.js (za auth rute)
        const authUrl =
          typeof API_URL !== "undefined"
            ? API_URL
            : "https://localhost:8443/api/auth";

        const response = await fetch(`${authUrl}/password-change/initiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username }),
        });

        if (response.ok) {
          alert("Email sent! Check your inbox to finish password change.");
        } else {
          const msg = await response.text();
          let cleanMsg = msg;
          try {
            cleanMsg = JSON.parse(msg).error || msg;
          } catch (e) {}
          alert("Error: " + cleanMsg);
        }
      } catch (error) {
        console.error(error);
        alert("Server unreachable.");
      } finally {
        changePassBtn.disabled = false;
        changePassBtn.innerText = "Change Password";
      }
    });
  }
}

// Pomocna funkcija za racunanje SHA-256 hasha fajla
async function calculateFileHash(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}
