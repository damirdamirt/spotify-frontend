// js/utils.js

const API_URL = "http://localhost:8080/api/auth";
const BASE_URL = "http://localhost:8080/api";

/**
 * Prikazuje Bootstrap alert poruku
 * @param {string} message - Tekst poruke
 * @param {string} type - Tip (success, danger, warning, info)
 */
function showAlert(message, type) {
  const alertBox = document.getElementById("alertMessage");
  if (alertBox) {
    alertBox.style.display = "block";
    alertBox.className = "mt-3"; // Reset klase
    alertBox.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;

    // Auto-hide posle 5 sekundi
    setTimeout(() => {
      alertBox.style.display = "none";
    }, 5000);
  }
}

/**
 * AUTH GUARD
 */
function checkAuthStatus() {
  const token = localStorage.getItem("spotify_token");

  // Uzimamo ceo URL (npr. "http://localhost:5500/verify.html?token=123")
  const fullUrl = window.location.href;
  const pathname = window.location.pathname; // (npr. "/verify.html")

  // Proveravamo da li URL sadrzi kljucne reci, bez obzira na query parametre (?token=...)
  const isLoginPage =
    pathname.endsWith("index.html") ||
    pathname === "/" ||
    pathname.endsWith("/");
  const isRegisterPage = fullUrl.includes("register.html");
  const isVerifyPage = fullUrl.includes("verify.html"); // <--- OVO JE BITNO

  // 1. SCENARIO: Korisnik je ULOGOVAN
  if (token) {
    // Ako pokusa da ode na Login, Register ili Verify -> MARŠ NA DASHBOARD
    if (isLoginPage || isRegisterPage || isVerifyPage) {
      console.log("Vec si ulogovan! Prebacujem na Dashboard.");
      window.location.href = "dashboard.html";
      return; // Obavezno return da prekine dalje izvrsavanje
    }
  }
  // 2. SCENARIO: Korisnik NIJE ULOGOVAN
  else {
    // Ako pokusa da ode na Dashboard (bilo sta sto NIJE javna stranica)
    if (!isLoginPage && !isRegisterPage && !isVerifyPage) {
      console.log("Nisi ulogovan! Vracam na Login.");
      window.location.href = "index.html";
      return;
    }
  }
}

/**
 * LOGOUT FUNKCIJA
 */
function logout() {
  localStorage.removeItem("spotify_token");
  localStorage.removeItem("spotify_user");
  window.location.href = "index.html";
}

/**
 * POJEDNOSTAVLJENA VERZIJA fetchWithAuth
 * Ovo je funkcija koju pozivamo KAD GOD nam trebaju podaci sa servera.
 * * @param {string} endpoint - Gde gadjamo? (npr. "/demo")
 * @param {object} options - Dodatna podesavanja (npr. method: "POST", body: "...")
 */
async function fetchWithAuth(endpoint, options) {
  // 1. Uzmi token iz fioke (LocalStorage)
  const token = localStorage.getItem("spotify_token");

  // 2. Ako token NE POSTOJI, znaci nismo ulogovani.
  // Odmah prekinemo sve i izbacimo korisnika na login.
  if (!token) {
    console.log("Nema tokena! Izbacujem korisnika...");
    logout();
    return null; // Prekini funkciju
  }

  // 3. Priprema zaglavlja (Headers)
  // Ovo nam sluzi da kazemo serveru: "Saljem ti JSON i evo ti moj Token"
  const myHeaders = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token, // <--- OVO JE KLJUCNO!
  };

  // 4. Spajanje opcija
  // Ako nismo poslali nikakve opcije (npr. za GET zahtev), napravi prazan objekat
  if (!options) {
    options = {};
  }

  // Ubacujemo nase headere u opcije
  options.headers = myHeaders;

  // 5. POZIVANJE PRAVOG FETCH-A
  try {
    // Spajamo osnovni URL i endpoint (npr. "http://localhost:8080/api" + "/demo")
    const fullUrl = BASE_URL + endpoint;

    console.log("Saljem zahtev na:", fullUrl);

    const response = await fetch(fullUrl, options);

    // 6. PROVERA ODGOVORA
    // Ako server vrati 401 (Unauthorized) ili 403 (Forbidden),
    // to znaci da je token istekao ili je lazan.
    if (response.status === 401 || response.status === 403) {
      console.warn("Token nije vazeci! Izbacujem korisnika...");
      logout(); // Brisi token i idi na login
      return null;
    }

    // Ako je sve OK, vrati odgovor onome ko je pozvao funkciju
    return response;
  } catch (error) {
    // Ako pukne internet ili server ne radi
    console.error("Doslo je do greske u mrezi:", error);
    return null;
  }
}
